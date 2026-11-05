import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { makeRouter, stubFetch, type StubResponse } from '../test/helpers'
import WatchDetailView from './WatchDetailView.vue'

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

  it('S23 affiche la marge d’une montre vendue, et rien sinon', async () => {
    const sold = await mountView(() => ({
      status: 200,
      body: watch([project(1, 'completed', '2025-01-01T10:00:00Z')], { resalePrice: '200.00', resaleDate: '2025-06-01', margin: '80.00' }),
    }))
    expect(sold.find('[data-test="margin"]').text()).toContain('80,00 €')
    expect(sold.text()).toContain('Vendue')

    const unsold = await mountView(() => ({ status: 200, body: watch([project(1, 'in_progress', '2025-01-01T10:00:00Z')]) }))
    expect(unsold.find('[data-test="margin"]').exists()).toBe(false)
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
