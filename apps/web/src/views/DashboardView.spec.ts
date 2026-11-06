import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { makeRouter, stubFetch, type StubResponse } from '../test/helpers'
import { useWatchesStore } from '../stores/watches'
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
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resaleDate: null,
  progress: null,
})
const all = [card(1, 'A', 'in_progress'), card(2, 'B', 'completed'), card(3, 'C', 'sold', '80.00')]

const countsOf = (list: ReturnType<typeof card>[]) => ({
  all: list.length,
  in_progress: list.filter((w) => w.status === 'in_progress').length,
  completed: list.filter((w) => w.status === 'completed').length,
  sold: list.filter((w) => w.status === 'sold').length,
  no_project: list.filter((w) => w.status === 'no_project').length,
})

/** Faux GET /watches : filtre par statut et recherche, puis découpe en pages comme l'API. */
function api(list = all, override?: (url: URL) => StubResponse | undefined) {
  return stubFetch((url): StubResponse => {
    if (url.pathname !== '/watches') return { status: 404, body: {} }
    const forced = override?.(url)
    if (forced) return forced
    const p = url.searchParams
    const q = p.get('q')?.toLowerCase()
    const rows = list.filter(
      (w) => (!p.get('status') || w.status === p.get('status')) && (!q || `${w.brand} ${w.model}`.toLowerCase().includes(q)),
    )
    const page = Number(p.get('page'))
    const size = Number(p.get('pageSize'))
    return {
      status: 200,
      body: {
        items: rows.slice((page - 1) * size, page * size),
        counts: countsOf(list),
        total: rows.length,
        page,
        pageSize: size,
        totalMargin: '60.00',
      },
    }
  })
}

const routes = [
  { path: '/watches/new', name: 'new-watch', component: { template: '<div />' } },
  { path: '/watches/:id', name: 'watch-detail', component: { template: '<div />' } },
]

async function mountView(path = '/') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter(path, routes)
  const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}
type Wrapper = Awaited<ReturnType<typeof mountView>>

const cards = (wrapper: Wrapper) => wrapper.findAll('[data-test="watch-card"]')
const rows = (wrapper: Wrapper) => wrapper.findAll('[data-test="table-row"]')
const subtitle = (wrapper: Wrapper) => wrapper.find('[data-test="subtitle"]')
const filter = (wrapper: Wrapper, label: string) =>
  wrapper.findAll('[data-test="status-filter"] button').find((b) => b.text().startsWith(label))!
const requested = (fetchMock: ReturnType<typeof stubFetch>, index = -1) =>
  Object.fromEntries(new URL(String(fetchMock.mock.calls.at(index)![0])).searchParams)

const many = Array.from({ length: 12 }, (_, i) => card(i + 1, `M${String(i + 1).padStart(2, '0')}`, 'completed'))

function useDesktop() {
  window.matchMedia = (() => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

describe('DashboardView, mobile', () => {
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
    expect(cards(wrapper)[2]!.text()).toContain('+80 €')
    expect(cards(wrapper)[0]!.text()).not.toContain('Marge')
  })

  it('S25 le titre est « Tableau de bord » et le sous-titre donne le nombre de montres', async () => {
    api()
    const wrapper = await mountView()
    expect(wrapper.find('h1').text()).toBe('Tableau de bord')
    expect(subtitle(wrapper).text()).toBe('3 montres')
  })

  it('S40 le sous-titre rappelle le filtre actif (« 1 montre · Vendue »)', async () => {
    api()
    const wrapper = await mountView()
    await filter(wrapper, 'Vendue').trigger('click')
    await flushPromises()
    expect(subtitle(wrapper).text()).toBe('1 montre · Vendue')
  })

  it('S23 la marge est signée et colorée : +80 € en positif, −25 € en négatif', async () => {
    api([card(1, 'gain', 'sold', '80.00'), card(2, 'perte', 'sold', '-25.00'), card(3, 'nulle', 'sold', '0.00')])
    const wrapper = await mountView()
    const margin = (i: number) => cards(wrapper)[i]!.find('[data-test="margin"]')

    expect(margin(0).text()).toBe('+80 €')
    expect(margin(0).classes()).toContain('margin-positive')
    expect(margin(1).text()).toBe('−25 €')
    expect(margin(1).classes()).toContain('margin-negative')
    expect(margin(2).text()).toBe('0 €')
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

  it('S40 le filtre affiche les montres du statut, met à jour le sous-titre et garde les compteurs globaux', async () => {
    api()
    const wrapper = await mountView()

    await filter(wrapper, 'Vendue').trigger('click')
    await flushPromises()

    expect(cards(wrapper)).toHaveLength(1)
    expect(cards(wrapper)[0]!.text()).toContain('Seiko C')
    expect(subtitle(wrapper).text()).toContain('1 montre')
    expect(subtitle(wrapper).text()).not.toContain('1 montres')
    expect(filter(wrapper, 'Vendue').attributes('aria-pressed')).toBe('true')
    expect(filter(wrapper, 'Toutes').text()).toContain('3')
  })

  it('S40 message quand aucun statut ne correspond', async () => {
    api()
    const wrapper = await mountView()

    await filter(wrapper, 'Sans projet').trigger('click')
    await flushPromises()

    expect(cards(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-test="empty"]').text()).toContain('Aucune montre ne correspond à ce statut')
    expect(subtitle(wrapper).text()).toContain('0 montre')
  })

  it('S25 sans aucune montre, propose d’en créer une', async () => {
    api([])
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="empty"]').text()).toContain('Aucune montre')
    expect(wrapper.find('a[href="/watches/new"]').exists()).toBe(true)
  })

  it('pendant le premier chargement, ni « 0 montre » ni message « Aucune montre »', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    stubFetch(async (url) => {
      await gate
      const p = url.searchParams
      return {
        status: 200,
        body: { items: all, counts: countsOf(all), total: 3, page: Number(p.get('page')), pageSize: 8, totalMargin: '0.00' },
      }
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter('/', routes)
    const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(subtitle(wrapper).exists()).toBe(false)
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)

    release()
    await flushPromises()
    expect(subtitle(wrapper).text()).toBe('3 montres')
  })

  it('une erreur de l’API affiche un message, pas une liste vide trompeuse', async () => {
    api(all, () => ({ status: 500, body: {} }))
    const wrapper = await mountView()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
  })

  it('un « Voir plus » en échec garde la liste affichée, ajoute le message et laisse réessayer', async () => {
    let failMore = true
    api(many, (url) => {
      if (url.searchParams.get('page') === '2' && failMore) {
        failMore = false
        return { status: 500, body: {} }
      }
    })
    const wrapper = await mountView()

    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')
    expect(cards(wrapper)).toHaveLength(8)

    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flushPromises()
    expect(cards(wrapper)).toHaveLength(12)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('une recherche conservée d’une visite à l’autre garde son champ affiché quand on l’efface', async () => {
    api()
    const pinia = createPinia()
    setActivePinia(pinia)
    useWatchesStore().params.q = 'seiko'
    const router = await makeRouter('/', routes)
    const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)

    await wrapper.get('input[type="search"]').setValue('')

    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
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

    expect(wrapper.get('a[aria-label^="Mon compte"]').attributes('href')).toBe('/account')
  })

  it('l’en-tête mobile n’a pas de bouton « Nouvelle montre » : la barre du bas le porte', async () => {
    api()
    const wrapper = await mountView()
    expect(wrapper.find('header a[href="/watches/new"]').exists()).toBe(false)
  })

  it('RG-AFF-11 « Voir plus » ajoute la page suivante et disparaît quand tout est affiché', async () => {
    const fetchMock = api(many)
    const wrapper = await mountView()
    expect(cards(wrapper)).toHaveLength(8)
    expect(subtitle(wrapper).text()).toBe('12 montres')

    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flushPromises()

    expect(cards(wrapper)).toHaveLength(12)
    expect(requested(fetchMock)).toMatchObject({ page: '2' })
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
  })

  describe('recherche', () => {
    afterEach(() => vi.useRealTimers())

    it('S40 sans ?recherche=1 le champ de recherche est absent', async () => {
      api()
      expect((await mountView()).find('input[type="search"]').exists()).toBe(false)
    })

    it('S40 avec ?recherche=1 le champ est affiché et focalisé', async () => {
      api()
      const wrapper = await mountView('/?recherche=1')
      const input = wrapper.get('input[type="search"]')
      expect(document.activeElement).toBe(input.element)
    })

    it('RG-AFF-08 la saisie lance une seule requête après 300 ms, page 1, puis effacer retire q', async () => {
      const fetchMock = api()
      const wrapper = await mountView('/?recherche=1')
      const before = fetchMock.mock.calls.length
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      await wrapper.get('input[type="search"]').setValue('s')
      await wrapper.get('input[type="search"]').setValue('seiko c')
      await vi.advanceTimersByTimeAsync(299)
      expect(fetchMock.mock.calls.length).toBe(before)
      await vi.advanceTimersByTimeAsync(1)
      vi.useRealTimers()
      await flushPromises()

      expect(fetchMock.mock.calls.length).toBe(before + 1)
      expect(requested(fetchMock)).toMatchObject({ q: 'seiko c', page: '1' })
      expect(cards(wrapper).map((c) => c.text())).toEqual([expect.stringContaining('Seiko C')])

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await wrapper.get('input[type="search"]').setValue('')
      await vi.advanceTimersByTimeAsync(300)
      vi.useRealTimers()
      await flushPromises()
      expect(requested(fetchMock)).not.toHaveProperty('q')
      expect(cards(wrapper)).toHaveLength(3)
    })

    it('RG-AFF-08 sans résultat, le message parle de la recherche', async () => {
      api()
      const wrapper = await mountView('/?recherche=1')
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await wrapper.get('input[type="search"]').setValue('omega')
      await vi.advanceTimersByTimeAsync(300)
      vi.useRealTimers()
      await flushPromises()

      expect(wrapper.find('[data-test="empty"]').text()).toContain('Aucune montre ne correspond à votre recherche')
    })
  })
})

describe('DashboardView, desktop', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
    useDesktop()
  })
  afterEach(() => {
    // @ts-expect-error jsdom ne définit pas matchMedia
    delete window.matchMedia
  })

  it('S25 affiche la barre d’outils, les six tuiles et le tableau, sans pastilles ni « Voir plus »', async () => {
    api(many)
    const wrapper = await mountView()

    expect(wrapper.find('select[aria-label="Statut"]').exists()).toBe(true)
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="stat"]')).toHaveLength(6)
    expect(rows(wrapper)).toHaveLength(8)
    expect(wrapper.find('[data-test="status-filter"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="watch-card"]').exists()).toBe(false)
    expect(wrapper.find('a[aria-label^="Mon compte"]').exists()).toBe(false)
    expect(wrapper.find('header a[href="/watches/new"]').text()).toContain('Nouvelle montre')
    expect(wrapper.get('[data-test="range"]').text()).toBe('1–8 sur 12')
  })

  it('RG-AFF-11 « Suivant » remplace les lignes par la page 2', async () => {
    const fetchMock = api(many)
    const wrapper = await mountView()

    await wrapper.get('[data-test="page-next"]').trigger('click')
    await flushPromises()

    expect(requested(fetchMock)).toMatchObject({ page: '2' })
    expect(rows(wrapper)).toHaveLength(4)
    expect(wrapper.get('[data-test="range"]').text()).toBe('9–12 sur 12')
  })

  it('RG-AFF-09 la colonne Achat bascule décroissant, croissant puis ordre par défaut', async () => {
    const fetchMock = api(many)
    const wrapper = await mountView()
    const sort = () =>
      wrapper
        .get('[data-test="sort-purchase"]')
        .trigger('click')
        .then(() => flushPromises())

    await sort()
    expect(requested(fetchMock)).toMatchObject({ sort: 'purchase_date', order: 'desc' })
    await sort()
    expect(requested(fetchMock)).toMatchObject({ sort: 'purchase_date', order: 'asc' })
    await sort()
    expect(requested(fetchMock)).not.toHaveProperty('sort')
    expect(requested(fetchMock)).not.toHaveProperty('order')
  })

  it('RG-AFF-11 changer de statut ramène à la page 1, et les tuiles restent globales', async () => {
    const fetchMock = api([...many, card(13, 'Z', 'sold', '80.00')])
    const wrapper = await mountView()
    await wrapper.get('[data-test="page-next"]').trigger('click')
    await flushPromises()
    const tilesBefore = wrapper.findAll('[data-test="stat"]').map((t) => t.text())

    await wrapper.get('select[aria-label="Statut"]').setValue('sold')
    await flushPromises()

    expect(requested(fetchMock)).toMatchObject({ status: 'sold', page: '1' })
    expect(rows(wrapper)).toHaveLength(1)
    expect(wrapper.findAll('[data-test="stat"]').map((t) => t.text())).toEqual(tilesBefore)
    expect(wrapper.findAll('[data-test="stat"]')[5]!.text()).toBe('+60 €Marge cumulée')
  })
})
