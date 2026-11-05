import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { makeRouter, stubFetch, type StubResponse } from '../test/helpers'
import WatchDetailView from './WatchDetailView.vue'

// jsdom n'a pas de canvas : le graphique est testé à part (PerformanceChart.spec.ts).
vi.mock('chart.js', () => {
  const stub = class {}
  const Chart = Object.assign(class { destroy() {} }, { register: () => {} })
  return { Chart, LineController: stub, LineElement: stub, PointElement: stub, LinearScale: stub, CategoryScale: stub, Tooltip: stub }
})

const step = (id: number, label: string, done = false) => ({
  id,
  stepOrder: id,
  label,
  notes: null,
  isCompleted: done,
  completedAt: null,
  photos: [],
})
const project = (id: number, status: string, createdAt: string, steps = [step(id * 10, `Étape du projet ${id}`)]) => ({
  id,
  status,
  createdAt,
  completedAt: null,
  photoBefore: null,
  photoAfter: null,
  steps,
  measurements: [],
  expenses: [],
})
const watch = (projects: ReturnType<typeof project>[], extra: object = {}) => ({
  id: 7,
  brand: 'Seiko',
  model: '6119-8100',
  movementCode: 'automatic',
  complications: [{ code: 'chronograph', label: 'Chronographe' }],
  purchasePrice: '80.00',
  purchaseDate: '2025-03-01',
  resalePrice: null,
  resaleDate: null,
  margin: null,
  projects,
  ...extra,
})

async function mountView(respond: () => StubResponse) {
  stubFetch(respond)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/watches/7', [
    { path: '/watches/:id', name: 'watch-detail', component: WatchDetailView },
  ])
  const wrapper = mount(WatchDetailView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

describe('WatchDetailView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
  })

  it('S25 affiche la montre, ses complications, son prix d’achat et les étapes du projet', async () => {
    const wrapper = await mountView(() => ({
      status: 200,
      body: watch([project(1, 'in_progress', '2025-05-01T10:00:00Z')]),
    }))

    const text = wrapper.text()
    expect(text).toContain('Seiko 6119-8100')
    expect(text).toContain('Chronographe')
    expect(text).toContain('80,00 €')
    expect(text).toContain('En cours')
    expect(wrapper.findAll('[data-test="step-label"]').map((s) => s.text())).toEqual(['Étape du projet 1'])
  })

  it('S26 le sélecteur de projet n’apparaît qu’avec 2 projets ou plus', async () => {
    const one = await mountView(() => ({ status: 200, body: watch([project(1, 'in_progress', '2025-05-01T10:00:00Z')]) }))
    expect(one.find('[data-test="project-selector"]').exists()).toBe(false)

    const none = await mountView(() => ({ status: 200, body: watch([]) }))
    expect(none.find('[data-test="project-selector"]').exists()).toBe(false)
    expect(none.text()).toContain('Aucun projet')

    const two = await mountView(() => ({
      status: 200,
      body: watch([project(2, 'in_progress', '2025-06-01T10:00:00Z'), project(1, 'completed', '2025-01-01T10:00:00Z')]),
    }))
    expect(two.find('[data-test="project-selector"]').exists()).toBe(true)
    expect(two.findAll('[data-test="project-selector"] option')).toHaveLength(2)
  })

  it('S26 le projet le plus récent est affiché d’abord, le sélecteur change de projet', async () => {
    const wrapper = await mountView(() => ({
      status: 200,
      body: watch([project(2, 'in_progress', '2025-06-01T10:00:00Z'), project(1, 'completed', '2025-01-01T10:00:00Z')]),
    }))
    expect(wrapper.findAll('[data-test="step-label"]').map((s) => s.text())).toEqual(['Étape du projet 2'])

    await wrapper.find('[data-test="project-selector"] select').setValue('1')

    expect(wrapper.findAll('[data-test="step-label"]').map((s) => s.text())).toEqual(['Étape du projet 1'])
    // Le titre du projet affiché suit le sélecteur (« Terminé » figure aussi dans les options : on cible le h2).
    expect(wrapper.find('h2').text()).toBe('Terminé')
  })

  it('S12 cocher une étape sur la fiche l’envoie à l’API et met à jour le décompte', async () => {
    const steps = [step(10, 'Désarmer'), step(11, 'Sortir le mouvement')]
    const fetchMock = stubFetch((_url, init) =>
      init.method === 'PATCH'
        ? { status: 200, body: { ...steps[0], isCompleted: true, completedAt: '2025-05-02T10:00:00Z' } }
        : { status: 200, body: watch([project(1, 'in_progress', '2025-05-01T10:00:00Z', steps)]) },
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter('/watches/7', [{ path: '/watches/:id', name: 'watch-detail', component: WatchDetailView }])
    const wrapper = mount(WatchDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('0/2 terminées')

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await flushPromises()

    expect(fetchMock.mock.calls.map(([u, i]) => `${i?.method ?? 'GET'} ${new URL(String(u)).pathname}`)).toContain('PATCH /projects/1/steps/10')
    expect(wrapper.text()).toContain('1/2 terminées')
  })

  it('une réponse tardive d’un projet n’écrase pas les étapes du projet affiché ensuite', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const a = [step(20, 'A1'), step(21, 'A2')]
    stubFetch(async (_url, init) => {
      if (init.method === 'PUT') {
        await gate
        return { status: 200, body: [{ ...a[1]!, stepOrder: 1 }, { ...a[0]!, stepOrder: 2 }] }
      }
      return {
        status: 200,
        body: watch([project(2, 'in_progress', '2025-06-01T10:00:00Z', a), project(1, 'completed', '2025-01-01T10:00:00Z', [step(10, 'B1')])]),
      }
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter('/watches/7', [{ path: '/watches/:id', name: 'watch-detail', component: WatchDetailView }])
    const wrapper = mount(WatchDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('[data-test="move-up"]').trigger('click')
    await wrapper.find('[data-test="project-selector"] select').setValue('1')
    release()
    await flushPromises()

    expect(wrapper.findAll('[data-test="step-label"]').map((s) => s.text())).toEqual(['B1'])
  })

  it('S18 la fiche affiche l’avant/après du projet et suit un nouvel envoi', async () => {
    const fetchMock = stubFetch((_url, init) =>
      init.method === 'PUT'
        ? { status: 200, body: { url: '/uploads/apres.webp' } }
        : { status: 200, body: watch([{ ...project(1, 'in_progress', '2025-05-01T10:00:00Z'), photoBefore: '/uploads/avant.webp' } as unknown as ReturnType<typeof project>]) },
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter('/watches/7', [{ path: '/watches/:id', name: 'watch-detail', component: WatchDetailView }])
    const wrapper = mount(WatchDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.findAll('figure img').map((i) => i.attributes('src'))).toEqual([expect.stringMatching(/\/uploads\/avant\.webp$/)])

    const input = wrapper.find('[data-test="photo-input-after"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })], configurable: true })
    await input.trigger('change')
    await flushPromises()

    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === 'PUT' && new URL(String(u)).pathname === '/projects/1/photos/after')).toBe(true)
    expect(wrapper.findAll('figure img')).toHaveLength(2)
  })

  it('S23 affiche la marge d’une montre vendue, et rien sinon', async () => {
    const sold = await mountView(() => ({
      status: 200,
      body: watch([project(1, 'completed', '2025-01-01T10:00:00Z')], { resalePrice: '200.00', resaleDate: '2025-06-01', margin: '80.00' }),
    }))
    expect(sold.find('[data-test="margin"]').text()).toContain('80,00 €')
    expect(sold.text()).toContain('Revente')

    const unsold = await mountView(() => ({ status: 200, body: watch([project(1, 'in_progress', '2025-01-01T10:00:00Z')]) }))
    expect(unsold.find('[data-test="margin"]').exists()).toBe(false)
  })

  it('S21 ajouter un coût met à jour la liste et relit la fiche pour recalculer la marge', async () => {
    let reads = 0
    const sold = { resalePrice: '200.00', resaleDate: '2025-06-01' }
    const wrapper = await mountView(() => {
      reads++
      return { status: 200, body: watch([project(1, 'completed', '2025-01-01T10:00:00Z')], { ...sold, margin: reads === 1 ? '120.00' : '86.00' }) }
    })
    // Les réponses d'écriture : le coût créé (POST), puis la relecture de la fiche (GET).
    stubFetch((_url, init) =>
      init.method === 'POST'
        ? { status: 201, body: { id: 5, label: 'Poussoirs', amount: '34.00', expenseDate: '2025-05-02' } }
        : { status: 200, body: watch([project(1, 'completed', '2025-01-01T10:00:00Z')], { ...sold, margin: '86.00' }) },
    )

    await wrapper.find('[data-test="expense-add"]').trigger('click')
    await wrapper.find('[data-test="e-label"]').setValue('Poussoirs')
    await wrapper.find('[data-test="e-amount"]').setValue('34')
    await wrapper.find('[data-test="e-date"]').setValue('2025-05-02')
    await wrapper.find('[data-test="expense-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="expense-group"]').text()).toContain('Poussoirs')
    expect(wrapper.find('[data-test="margin"]').text()).toContain('86,00 €')
  })

  it('S22 la revente enregistrée met à jour la marge sans recharger les projets', async () => {
    const wrapper = await mountView(() => ({ status: 200, body: watch([project(1, 'completed', '2025-01-01T10:00:00Z')]) }))
    stubFetch(() => ({
      status: 200,
      body: watch([], { resalePrice: '200.00', resaleDate: '2025-06-01', margin: '120.00' }),
    }))

    await wrapper.find('[data-test="resale-open"]').trigger('click')
    await wrapper.find('[data-test="resale-price"]').setValue('200')
    await wrapper.find('[data-test="resale-date"]').setValue('2025-06-01')
    await wrapper.find('[data-test="resale-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="margin"]').text()).toContain('120,00 €')
    expect(wrapper.findAll('[data-test="step-label"]')).toHaveLength(1)
  })

  it('S19 ajouter une mesure l’affiche dans la liste des mesures du projet', async () => {
    const wrapper = await mountView(() => ({ status: 200, body: watch([project(1, 'in_progress', '2025-05-01T10:00:00Z')]) }))
    stubFetch(() => ({
      status: 201,
      body: { id: 9, measuredAt: '2025-05-02', rateSecondsPerDay: '4.00', beatErrorMs: '0.40', amplitudeDegrees: '260.00', watchPosition: null },
    }))

    await wrapper.find('[data-test="measurement-add"]').trigger('click')
    await wrapper.find('[data-test="m-date"]').setValue('2025-05-02')
    await wrapper.find('[data-test="m-rate"]').setValue('4')
    await wrapper.find('[data-test="m-beat"]').setValue('0.4')
    await wrapper.find('[data-test="m-amp"]').setValue('260')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('[data-test="measurement-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="measurement-row"]').text()).toContain('02/05/2025')
  })

  it('S23 une marge négative s’affiche avec son signe', async () => {
    const wrapper = await mountView(() => ({
      status: 200,
      body: watch([], { resalePrice: '70.00', resaleDate: '2025-06-01', margin: '-20.00' }),
    }))
    expect(wrapper.find('[data-test="margin"]').text()).toContain('-20,00 €')
  })

  it('RG-SEC-01 une montre introuvable (404) affiche un message sans rien révéler', async () => {
    const wrapper = await mountView(() => ({ status: 404, body: {} }))

    expect(wrapper.find('[role="alert"]').text()).toContain('introuvable')
    expect(wrapper.find('[data-test="step"]').exists()).toBe(false)
  })

  it('une autre erreur de l’API affiche un message de chargement', async () => {
    const wrapper = await mountView(() => ({ status: 500, body: {} }))
    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')
  })
})
