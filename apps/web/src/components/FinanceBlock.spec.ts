import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, sentBody, stubFetch } from '../test/helpers'
import type { ExpenseDetail, ProjectDetail, WatchDetail } from '../stores/watches'
import FinanceBlock from './FinanceBlock.vue'

const expense = (id: number, label: string, amount: string, expenseDate = '2025-05-02'): ExpenseDetail => ({
  id,
  label,
  amount,
  expenseDate,
})
const project = (id: number, status: 'in_progress' | 'completed', createdAt: string, expenses: ExpenseDetail[] = []): ProjectDetail => ({
  id,
  status,
  createdAt,
  completedAt: null,
  photoBefore: null,
  photoAfter: null,
  steps: [],
  measurements: [],
  expenses,
})
const watch = (projects: ProjectDetail[], extra: Partial<WatchDetail> = {}): WatchDetail => ({
  id: 7,
  brand: 'Seiko',
  model: '6119-8100',
  movementCode: 'automatic',
  complications: [],
  purchasePrice: '80.00',
  purchaseDate: '2025-03-01',
  resalePrice: null,
  resaleDate: null,
  margin: null,
  costPrice: '80.00',
  projects,
  ...extra,
})

function mountBlock(w: WatchDetail, selectedProjectId: number | null = w.projects[0]?.id ?? null) {
  setActivePinia(createPinia())
  return mount(FinanceBlock, { props: { watch: w, selectedProjectId }, attachTo: document.body })
}

describe('FinanceBlock', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    setAccessToken('tok')
  })

  it('S23 le bloc Finances affiche la marge de 80 €', () => {
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-04-01T10:00:00Z')], { resalePrice: '200.00', resaleDate: '2025-06-01', margin: '80.00' }),
    )

    expect(wrapper.find('[data-test="margin"]').text()).toContain('80 €')
    expect(wrapper.text()).toContain('200 €')
  })

  it('S24 pas de marge affichée si la montre n’est pas vendue', () => {
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')]))

    expect(wrapper.find('[data-test="margin"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Marge : calculée dès la saisie de la revente')
  })

  it('RG-FIN-09 les coûts sont regroupés par projet, avec un total par projet et un total général', () => {
    const wrapper = mountBlock(
      watch([
        project(2, 'completed', '2025-05-10T10:00:00Z', [expense(3, 'Joint de fond', '15.00')]),
        project(1, 'completed', '2025-03-16T10:00:00Z', [
          expense(1, 'Joint de couronne', '12.00'),
          expense(2, 'Tube de couronne', '18.00'),
        ]),
      ]),
    )

    const groups = wrapper.findAll('[data-test="expense-group"]')
    expect(groups).toHaveLength(2)
    expect(groups[0]!.text()).toContain('Joint de fond')
    expect(groups[0]!.find('[data-test="group-total"]').text()).toBe('15 €')
    expect(groups[1]!.text()).toContain('Tube de couronne')
    expect(groups[1]!.find('[data-test="group-total"]').text()).toBe('30 €')
    expect(wrapper.find('[data-test="expenses-total"]').text()).toContain('45 €')
  })

  it('S22 le formulaire de revente est absent tant qu’un projet est en cours', () => {
    const wrapper = mountBlock(watch([project(1, 'in_progress', '2025-04-01T10:00:00Z')]))

    expect(wrapper.find('[data-test="resale-open"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('projet est en cours')
  })

  it('S22 la saisie de la revente envoie le prix et la date puis émet la fiche', async () => {
    const sold = watch([project(1, 'completed', '2025-04-01T10:00:00Z')], {
      resalePrice: '200.00',
      resaleDate: '2025-06-01',
      margin: '120.00',
    })
    const fetchMock = stubFetch(() => ({ status: 200, body: sold }))
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="resale-open"]').trigger('click')
    await wrapper.find('[data-test="resale-price"]').setValue('200')
    await wrapper.find('[data-test="resale-date"]').setValue('2025-06-01')
    await wrapper.find('[data-test="resale-form"]').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PUT /watches/7/resale'])
    expect(sentBody(fetchMock, 0)).toEqual({ price: '200', date: '2025-06-01' })
    expect(wrapper.emitted('update:resale')![0]![0]).toEqual(sold)
  })

  it('la revente est refusée avant la date d’achat', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: {} }))
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="resale-open"]').trigger('click')
    await wrapper.find('[data-test="resale-price"]').setValue('200')
    await wrapper.find('[data-test="resale-date"]').setValue('2025-02-01')
    await wrapper.find('[data-test="resale-form"]').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual([])
    expect(wrapper.find('[role="alert"]').text()).toContain('achat')
  })

  it('S31 annuler la revente demande confirmation puis appelle DELETE', async () => {
    const unsold = watch([project(1, 'completed', '2025-04-01T10:00:00Z')])
    const fetchMock = stubFetch(() => ({ status: 200, body: unsold }))
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-04-01T10:00:00Z')], { resalePrice: '200.00', resaleDate: '2025-06-01', margin: '120.00' }),
    )

    await wrapper.find('[data-test="resale-clear"]').trigger('click')
    expect(calls(fetchMock)).toEqual([])
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['DELETE /watches/7/resale'])
    expect(wrapper.emitted('update:resale')![0]![0]).toEqual(unsold)
  })

  it('S21 ajouter un coût l’envoie au projet choisi et émet les coûts du projet', async () => {
    const added = expense(5, 'Poussoirs', '34.00', '2025-05-02')
    const fetchMock = stubFetch(() => ({ status: 201, body: added }))
    const wrapper = mountBlock(watch([project(1, 'in_progress', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="expense-add"]').trigger('click')
    await wrapper.find('[data-test="e-label"]').setValue('Poussoirs')
    await wrapper.find('[data-test="e-amount"]').setValue('34')
    await wrapper.find('[data-test="e-date"]').setValue('2025-05-02')
    await wrapper.find('[data-test="expense-form"]').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['POST /projects/1/expenses'])
    expect(sentBody(fetchMock, 0)).toEqual({ label: 'Poussoirs', amount: '34', expenseDate: '2025-05-02' })
    expect(wrapper.emitted('update:expenses')![0]![0]).toEqual({ projectId: 1, expenses: [added] })
  })

  it('S32 corriger un coût envoie le PATCH et remplace le coût dans la liste émise', async () => {
    const fixed = expense(2, 'Tube de couronne', '20.00')
    const fetchMock = stubFetch(() => ({ status: 200, body: fixed }))
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-03-16T10:00:00Z', [expense(1, 'Joint', '12.00'), expense(2, 'Tube de couronne', '18.00')])]),
    )

    await wrapper.find('[data-test="expense-edit-2"]').trigger('click')
    await wrapper.find('[data-test="e-amount"]').setValue('20')
    await wrapper.find('[data-test="expense-form"]').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PATCH /projects/1/expenses/2'])
    expect(sentBody(fetchMock, 0)).toEqual({ amount: '20' })
    expect(wrapper.emitted('update:expenses')![0]![0]).toEqual({ projectId: 1, expenses: [expense(1, 'Joint', '12.00'), fixed] })
  })

  it('supprimer un coût demande confirmation, puis émet la liste sans lui', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-03-16T10:00:00Z', [expense(1, 'Joint', '12.00'), expense(2, 'Tube', '18.00')])]),
    )

    await wrapper.find('[data-test="expense-remove-1"]').trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['DELETE /projects/1/expenses/1'])
    expect(wrapper.emitted('update:expenses')![0]![0]).toEqual({ projectId: 1, expenses: [expense(2, 'Tube', '18.00')] })
  })

  it('l’échec d’une suppression ferme le dialogue et montre l’alerte', async () => {
    stubFetch(() => ({ status: 500, body: { message: 'Erreur serveur' } }))
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-03-16T10:00:00Z', [expense(1, 'Joint', '12.00')])]))

    await wrapper.find('[data-test="expense-remove-1"]').trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toContain('Erreur serveur')
  })
})
