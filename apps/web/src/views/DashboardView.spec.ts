import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { makeRouter, stubFetch, type StubResponse } from '../test/helpers'
import DashboardView from './DashboardView.vue'

const card = (id: number, model: string, status: string, margin: string | null = null) => ({
  id,
  brand: 'Seiko',
  model,
  movementCode: 'automatic',
  complicationLabels: ['Chronographe'],
  status,
  thumbnailUrl: null,
  margin,
})
const all = [card(1, 'A', 'in_progress'), card(2, 'B', 'completed'), card(3, 'C', 'sold', '80.00')]
const counts = { all: 3, in_progress: 1, completed: 1, sold: 1, no_project: 0 }

function api(respond?: (status: string | null) => StubResponse) {
  return stubFetch((url): StubResponse => {
    if (url.pathname !== '/watches') return { status: 404, body: {} }
    const status = url.searchParams.get('status')
    if (respond) return respond(status)
    return { status: 200, body: { items: status ? all.filter((w) => w.status === status) : all, counts } }
  })
}

async function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/', [
    { path: '/watches/new', name: 'new-watch', component: { template: '<div />' } },
    { path: '/watches/:id', name: 'watch-detail', component: { template: '<div />' } },
  ])
  const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

const cards = (wrapper: Awaited<ReturnType<typeof mountView>>) => wrapper.findAll('[data-test="watch-card"]')
const filter = (wrapper: Awaited<ReturnType<typeof mountView>>, label: string) =>
  wrapper.findAll('[data-test="status-filter"] button').find((b) => b.text().startsWith(label))!

describe('DashboardView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
  })

  it('S25 affiche une carte par montre avec statut et marge', async () => {
    api()
    const wrapper = await mountView()

    expect(cards(wrapper)).toHaveLength(3)
    expect(cards(wrapper)[0]!.text()).toContain('Seiko A')
    expect(cards(wrapper)[0]!.text()).toContain('En cours')
    expect(cards(wrapper)[1]!.text()).toContain('Terminé')
    expect(cards(wrapper)[2]!.text()).toContain('Vendue')
    expect(cards(wrapper)[2]!.text()).toContain('+80,00 €')
    expect(cards(wrapper)[0]!.text()).not.toContain('Marge')
  })

  it('S25 le titre est « Tableau de bord » et le sous-titre donne le nombre de montres', async () => {
    api()
    const wrapper = await mountView()
    expect(wrapper.find('h1').text()).toBe('Tableau de bord')
    expect(wrapper.find('[data-test="shown-count"]').text()).toBe('3 montres')
  })

  it('S40 le sous-titre rappelle le filtre actif (« 1 montre · Vendue »)', async () => {
    api()
    const wrapper = await mountView()
    await filter(wrapper, 'Vendue').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="shown-count"]').text()).toBe('1 montre · Vendue')
  })

  it('S23 la marge est signée et colorée : +80,00 € en positif, −25,00 € en négatif', async () => {
    api(() => ({
      status: 200,
      body: { items: [card(1, 'gain', 'sold', '80.00'), card(2, 'perte', 'sold', '-25.00'), card(3, 'nulle', 'sold', '0.00')], counts },
    }))
    const wrapper = await mountView()
    const margin = (i: number) => cards(wrapper)[i]!.find('[data-test="margin"]')

    expect(margin(0).text()).toBe('+80,00 €')
    expect(margin(0).classes()).toContain('margin-positive')
    expect(margin(1).text()).toBe('−25,00 €')
    expect(margin(1).classes()).toContain('margin-negative')
    expect(margin(2).text()).toBe('0,00 €')
    expect(margin(2).classes()).not.toContain('margin-positive')
    expect(margin(2).classes()).not.toContain('margin-negative')
  })

  it('S25 chaque carte mène à la fiche de la montre', async () => {
    api()
    const wrapper = await mountView()
    expect(cards(wrapper)[1]!.find('a').attributes('href')).toBe('/watches/2')
  })

  it('S25 le filtre « Toutes » affiche les compteurs de chaque statut', async () => {
    api()
    const wrapper = await mountView()

    expect(filter(wrapper, 'Toutes').text()).toContain('3')
    expect(filter(wrapper, 'En cours').text()).toContain('1')
    expect(filter(wrapper, 'Sans projet').text()).toContain('0')
    expect(filter(wrapper, 'Toutes').attributes('aria-pressed')).toBe('true')
  })

  it('S40 le filtre affiche les montres du statut et met à jour le compteur', async () => {
    api()
    const wrapper = await mountView()
    expect(wrapper.find('[data-test="shown-count"]').text()).toContain('3 montres')

    await filter(wrapper, 'Vendue').trigger('click')
    await flushPromises()

    expect(cards(wrapper)).toHaveLength(1)
    expect(cards(wrapper)[0]!.text()).toContain('Seiko C')
    expect(wrapper.find('[data-test="shown-count"]').text()).toContain('1 montre')
    expect(wrapper.find('[data-test="shown-count"]').text()).not.toContain('1 montres')
    expect(filter(wrapper, 'Vendue').attributes('aria-pressed')).toBe('true')
    // Les compteurs des boutons restent globaux.
    expect(filter(wrapper, 'Toutes').text()).toContain('3')
  })

  it('S40 message quand aucun statut ne correspond', async () => {
    api()
    const wrapper = await mountView()

    await filter(wrapper, 'Sans projet').trigger('click')
    await flushPromises()

    expect(cards(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-test="empty"]').text()).toContain('Aucune montre')
    expect(wrapper.find('[data-test="shown-count"]').text()).toContain('0 montre')
  })

  it('S25 sans aucune montre, propose d’en créer une', async () => {
    api(() => ({ status: 200, body: { items: [], counts: { all: 0, in_progress: 0, completed: 0, sold: 0, no_project: 0 } } }))
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="empty"]').text()).toContain('Aucune montre')
    expect(wrapper.find('a[href="/watches/new"]').exists()).toBe(true)
  })

  it('pendant le premier chargement, ni « 0 montre » ni message « Aucune montre »', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    // Réponse retardée jusqu'à `release()`.
    stubFetch(async () => {
      await gate
      return { status: 200, body: { items: all, counts } }
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter('/', [
      { path: '/watches/new', name: 'new-watch', component: { template: '<div />' } },
      { path: '/watches/:id', name: 'watch-detail', component: { template: '<div />' } },
    ])
    const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.find('[data-test="shown-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)

    release()
    await flushPromises()
    expect(wrapper.find('[data-test="shown-count"]').text()).toContain('3 montres')
  })

  it('une erreur de l’API affiche un message, pas une liste vide trompeuse', async () => {
    api(() => ({ status: 500, body: {} }))
    const wrapper = await mountView()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
  })

  it('le tableau de bord n’a plus de texte « Mon compte » ni de bouton Se déconnecter (la déconnexion est dans l’écran compte)', async () => {
    api()
    const wrapper = await mountView()

    expect(wrapper.text()).not.toContain('Mon compte')
    expect(wrapper.text()).not.toContain('Se déconnecter')
  })

  it('un bouton avatar mène à Mon compte : seul accès au compte en mobile, où la barre du bas n’en porte pas', async () => {
    api()
    const wrapper = await mountView()

    const link = wrapper.get('a[aria-label^="Mon compte"]')
    expect(link.attributes('href')).toBe('/account')
  })
})
