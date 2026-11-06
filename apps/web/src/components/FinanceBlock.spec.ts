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

  it('RG-FIN-13 le coût de revient du bloc est celui de l’API, « — » sans prix d’achat', () => {
    const withCost = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')], { costPrice: '195.00' }))
    const without = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')], { purchasePrice: null, costPrice: null }))

    expect(withCost.find('[data-test="cost-price"]').text()).toBe('195 €')
    expect(without.find('[data-test="cost-price"]').text()).toBe('—')
    expect(without.text()).not.toMatch(/null|NaN/)
  })

  it('montre vendue : bloc de revente avec prix et date, sans encart « non renseignée »', () => {
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-04-01T10:00:00Z')], { resalePrice: '350.00', resaleDate: '2025-06-01', margin: '185.00' }),
    )

    expect(wrapper.find('[data-test="resale-box"]').text()).toContain('350 €')
    expect(wrapper.find('[data-test="resale-box"]').text()).toContain('01/06/2025')
    expect(wrapper.find('[data-test="resale-empty"]').exists()).toBe(false)
  })

  it('montre non vendue : encart « Revente non renseignée »', () => {
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')]))

    expect(wrapper.find('[data-test="resale-empty"]').text()).toContain('Revente non renseignée')
    expect(wrapper.find('[data-test="resale-box"]').exists()).toBe(false)
  })

  it('RG-FIN-06 la marge affiche sa formule avec les coûts des deux projets', () => {
    const wrapper = mountBlock(
      watch(
        [
          project(2, 'completed', '2025-05-10T10:00:00Z', [expense(3, 'Joint de fond', '15.00')]),
          project(1, 'completed', '2025-03-16T10:00:00Z', [
            expense(1, 'Joint de couronne', '12.00'),
            expense(2, 'Tube de couronne', '18.00'),
          ]),
        ],
        { purchasePrice: '120.00', resalePrice: '350.00', resaleDate: '2025-06-01', margin: '185.00' },
      ),
    )

    expect(wrapper.find('[data-test="margin"]').text()).toBe('+185 €')
    expect(wrapper.find('[data-test="margin-formula"]').text()).toBe('350 − 120 − 45 (coûts des 2 projets)')
  })

  it('RG-FIN-06 un seul projet avec des coûts : « coûts du projet » ; aucun coût : pas de terme de coûts', () => {
    const one = mountBlock(
      watch([project(1, 'completed', '2025-03-16T10:00:00Z', [expense(1, 'Joint', '45.50')])], {
        purchasePrice: '120.00',
        resalePrice: '350.50',
        resaleDate: '2025-06-01',
        margin: '185.00',
      }),
    )
    const none = mountBlock(
      watch([project(1, 'completed', '2025-03-16T10:00:00Z')], {
        purchasePrice: '120.00',
        resalePrice: '350.00',
        resaleDate: '2025-06-01',
        margin: '230.00',
      }),
    )

    expect(one.find('[data-test="margin-formula"]').text()).toBe('350,50 − 120 − 45,50 (coûts du projet)')
    expect(none.find('[data-test="margin-formula"]').text()).toBe('350 − 120')
  })

  it('S23 une marge négative prend le vrai signe moins', () => {
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-03-16T10:00:00Z')], {
        purchasePrice: '80.00',
        resalePrice: '55.00',
        resaleDate: '2025-06-01',
        margin: '-25.00',
      }),
    )

    expect(wrapper.find('[data-test="margin"]').text()).toBe('−25 €')
  })

  it('S24 vendue sans prix d’achat : ni marge ni formule, la raison est donnée', () => {
    const wrapper = mountBlock(
      watch([project(1, 'completed', '2025-03-16T10:00:00Z')], {
        purchasePrice: null,
        costPrice: null,
        resalePrice: '55.00',
        resaleDate: '2025-06-01',
        margin: null,
      }),
    )

    expect(wrapper.find('[data-test="margin"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="margin-formula"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Marge non calculable')
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

  it('S21 « + Coût » ouvre la feuille « Ajouter un coût » et reste affiché pendant qu’elle est ouverte', async () => {
    const wrapper = mountBlock(watch([project(1, 'in_progress', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="expense-add"]').trigger('click')

    expect(wrapper.find('dialog.sheet h2').text()).toBe('Ajouter un coût')
    expect(wrapper.find('dialog.sheet [data-test="expense-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="expense-add"]').exists()).toBe(true)
  })

  it('S32 « Modifier » un coût ouvre la feuille « Modifier le coût »', async () => {
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-03-16T10:00:00Z', [expense(1, 'Joint', '12.00')])]))

    await wrapper.find('[data-test="expense-edit-1"]').trigger('click')

    expect(wrapper.find('dialog.sheet h2').text()).toBe('Modifier le coût')
  })

  it('S22 la revente se renseigne et se corrige dans la feuille', async () => {
    const free = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')]))
    await free.find('[data-test="resale-open"]').trigger('click')
    expect(free.find('dialog.sheet h2').text()).toBe('Renseigner la revente')
    expect(free.find('dialog.sheet [data-test="resale-form"]').exists()).toBe(true)

    const sold = mountBlock(
      watch([project(1, 'completed', '2025-04-01T10:00:00Z')], { resalePrice: '200.00', resaleDate: '2025-06-01', margin: '120.00' }),
    )
    await sold.find('[data-test="resale-edit"]').trigger('click')
    expect(sold.find('dialog.sheet h2').text()).toBe('Corriger la revente')
    expect(sold.find('[data-test="resale-box"]').exists()).toBe(true)
  })

  it('une seule feuille à la fois : ouvrir la revente remplace celle du coût', async () => {
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z', [expense(1, 'Joint', '12.00')])]))

    await wrapper.find('[data-test="expense-add"]').trigger('click')
    await wrapper.find('[data-test="resale-open"]').trigger('click')

    expect(wrapper.findAll('dialog.sheet')).toHaveLength(1)
    expect(wrapper.find('dialog.sheet h2').text()).toBe('Renseigner la revente')

    await wrapper.find('[data-test="expense-add"]').trigger('click')

    expect(wrapper.findAll('dialog.sheet')).toHaveLength(1)
    expect(wrapper.find('dialog.sheet h2').text()).toBe('Ajouter un coût')
  })

  it('Annuler et Échap ferment la feuille de coût et celle de revente sans appel réseau', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: {} }))
    const wrapper = mountBlock(watch([project(1, 'completed', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="expense-add"]').trigger('click')
    await wrapper.find('[data-test="e-cancel"]').trigger('click')
    expect(wrapper.find('dialog').exists()).toBe(false)

    await wrapper.find('[data-test="resale-open"]').trigger('click')
    await wrapper.find('dialog.sheet').trigger('cancel')
    expect(wrapper.find('dialog').exists()).toBe(false)

    await wrapper.find('[data-test="resale-open"]').trigger('click')
    await wrapper.find('[data-test="resale-cancel"]').trigger('click')
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(calls(fetchMock)).toEqual([])
  })

  it('pendant l’enregistrement d’un coût, Échap ne ferme pas la feuille : le coût créé n’est pas perdu', async () => {
    const added = expense(5, 'Poussoirs', '34.00', '2025-05-02')
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    stubFetch(async () => {
      await gate
      return { status: 201, body: added }
    })
    const wrapper = mountBlock(watch([project(1, 'in_progress', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="expense-add"]').trigger('click')
    await wrapper.find('[data-test="e-label"]').setValue('Poussoirs')
    await wrapper.find('[data-test="e-amount"]').setValue('34')
    await wrapper.find('[data-test="e-date"]').setValue('2025-05-02')
    await wrapper.find('[data-test="expense-form"]').trigger('submit')
    await wrapper.find('dialog.sheet').trigger('cancel')
    expect(wrapper.find('dialog.sheet').exists()).toBe(true)

    release()
    await flushPromises()

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.emitted('update:expenses')![0]![0]).toEqual({ projectId: 1, expenses: [added] })
  })

  it('une erreur de validation laisse la feuille de coût ouverte avec la saisie', async () => {
    const wrapper = mountBlock(watch([project(1, 'in_progress', '2025-04-01T10:00:00Z')]))

    await wrapper.find('[data-test="expense-add"]').trigger('click')
    await wrapper.find('[data-test="e-label"]').setValue('Poussoirs')
    await wrapper.find('[data-test="expense-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('dialog.sheet').exists()).toBe(true)
    expect(wrapper.find('dialog.sheet [role="alert"]').exists()).toBe(true)
    expect((wrapper.find('[data-test="e-label"]').element as HTMLInputElement).value).toBe('Poussoirs')
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
