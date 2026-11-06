import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, sentBody, stubFetch } from '../test/helpers'
import { useWatchesStore } from './watches'

const counts = { all: 3, in_progress: 1, completed: 1, sold: 1, no_project: 0 }
const card = (id: number, status: string) => ({
  id,
  brand: 'Seiko',
  model: `M${id}`,
  movementCode: 'manual',
  complicationLabels: [],
  status,
  thumbnailUrl: null,
  margin: null,
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resaleDate: null,
  progress: null,
})
/** Réponse de GET /watches : `total` et `totalMargin` par défaut, page 1. */
const reply = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { items, counts, total: items.length, page: 1, pageSize: 8, totalMargin: '0.00', ...extra },
})
const params = (fetchMock: ReturnType<typeof stubFetch>, index = 0) =>
  Object.fromEntries(new URL(String(fetchMock.mock.calls[index]![0])).searchParams)

describe('useWatchesStore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setActivePinia(createPinia())
    setAccessToken('tok')
  })

  it('S25 list() charge les cartes et les compteurs', async () => {
    const fetchMock = stubFetch(() => reply([card(1, 'sold')], { totalMargin: '60.00', total: 12 }))
    const store = useWatchesStore()

    await store.list()

    expect(calls(fetchMock)).toEqual(['GET /watches'])
    expect(store.items).toHaveLength(1)
    expect(store.counts).toEqual(counts)
    expect(store.total).toBe(12)
    expect(store.totalMargin).toBe('60.00')
    expect(store.page).toBe(1)
    expect(store.error).toBeNull()
  })

  it('S25 list() n’envoie aucun paramètre superflu : ni q vide, ni sort, ni status', async () => {
    const fetchMock = stubFetch(() => reply([]))
    const store = useWatchesStore()

    await store.list()

    expect(params(fetchMock)).toEqual({ page: '1', pageSize: '8' })
  })

  it('RG-AFF-08 list({ q, status }) envoie la recherche rognée et le statut', async () => {
    const fetchMock = stubFetch(() => reply([]))
    const store = useWatchesStore()

    await store.list({ q: '  seiko ', status: 'sold' })

    expect(params(fetchMock)).toEqual({ q: 'seiko', status: 'sold', page: '1', pageSize: '8' })
  })

  it('RG-AFF-09 envoie sort et order ensemble, jamais order seul', async () => {
    const fetchMock = stubFetch(() => reply([]))
    const store = useWatchesStore()

    await store.list({ sort: 'purchase_date', order: 'asc' })
    await store.list({ sort: null })

    expect(params(fetchMock, 0)).toMatchObject({ sort: 'purchase_date', order: 'asc' })
    expect(params(fetchMock, 1)).not.toHaveProperty('sort')
    expect(params(fetchMock, 1)).not.toHaveProperty('order')
  })

  it('RG-AFF-11 changer la recherche, le statut ou le tri ramène à la page 1, changer de page conserve le reste', async () => {
    const fetchMock = stubFetch(() => reply([]))
    const store = useWatchesStore()

    await store.list({ page: 3 })
    await store.list({ q: 'omega' })
    await store.list({ page: 2 })
    await store.list({ status: 'sold' })
    await store.list({ page: 2 })
    await store.list({ sort: 'purchase_date' })

    expect([0, 1, 2, 3, 4, 5].map((i) => params(fetchMock, i).page)).toEqual(['3', '1', '2', '1', '2', '1'])
    expect(params(fetchMock, 2)).toMatchObject({ q: 'omega', page: '2' })
    expect(params(fetchMock, 4)).toMatchObject({ q: 'omega', status: 'sold', page: '2' })
  })

  it('RG-AFF-11 loadMore ajoute la page suivante et s’arrête quand tout est chargé', async () => {
    const fetchMock = stubFetch((url) =>
      url.searchParams.get('page') === '1' ? reply([card(1, 'sold'), card(2, 'sold')], { total: 3 }) : reply([card(3, 'sold')], { total: 3, page: 2 }),
    )
    const store = useWatchesStore()

    await store.list()
    await store.loadMore()
    await store.loadMore()

    expect(store.items.map((i) => i.id)).toEqual([1, 2, 3])
    expect(store.page).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('une erreur pendant loadMore garde les montres déjà affichées', async () => {
    stubFetch((url) => (url.searchParams.get('page') === '1' ? reply([card(1, 'sold')], { total: 2 }) : { status: 500, body: {} }))
    const store = useWatchesStore()

    await store.list()
    await store.loadMore()

    expect(store.items.map((i) => i.id)).toEqual([1])
    expect(store.error).toContain('Impossible de charger')
  })

  it('une erreur pendant loadMore n’avance pas la page : réessayer redemande la même', async () => {
    let failNext = true
    const fetchMock = stubFetch((url) => {
      if (url.searchParams.get('page') === '1') return reply([card(1, 'sold')], { total: 2 })
      if (failNext) {
        failNext = false
        return { status: 500, body: {} }
      }
      return reply([card(2, 'sold')], { total: 2, page: 2 })
    })
    const store = useWatchesStore()

    await store.list()
    await store.loadMore()
    expect(store.page).toBe(1)
    await store.loadMore()

    expect(params(fetchMock, 1)).toMatchObject({ page: '2' })
    expect(params(fetchMock, 2)).toMatchObject({ page: '2' })
    expect(store.items.map((i) => i.id)).toEqual([1, 2])
  })

  it('une demande lancée pendant qu’une autre est en vol garde les paramètres de la première', async () => {
    let release!: () => void
    const slow = new Promise<void>((resolve) => (release = resolve))
    const fetchMock = stubFetch(async (url) => {
      if (url.searchParams.get('q') === 'seiko' && !url.searchParams.get('status')) await slow
      return reply([])
    })
    const store = useWatchesStore()

    const first = store.list({ q: 'seiko' })
    const second = store.list({ status: 'sold' })
    release()
    await Promise.all([first, second])

    expect(params(fetchMock, 1)).toMatchObject({ q: 'seiko', status: 'sold', page: '1' })
    expect(store.params).toMatchObject({ q: 'seiko', status: 'sold' })
  })

  it('les paramètres choisis sont connus tout de suite, sans attendre la réponse (deux clics rapides sur Achat)', async () => {
    stubFetch(() => reply([]))
    const store = useWatchesStore()

    void store.list({ sort: 'purchase_date', order: 'desc' })

    expect(store.params).toMatchObject({ sort: 'purchase_date', order: 'desc' })
  })

  it('reset() remet la liste et les paramètres à l’état initial', async () => {
    stubFetch(() => reply([card(1, 'sold')], { total: 12, totalMargin: '60.00' }))
    const store = useWatchesStore()
    await store.list({ q: 'seiko', status: 'sold', sort: 'purchase_date', order: 'asc' })

    store.reset()

    expect(store.items).toEqual([])
    expect(store.total).toBe(0)
    expect(store.totalMargin).toBe('0.00')
    expect(store.counts.all).toBe(0)
    expect(store.error).toBeNull()
    expect(store.params).toEqual({ status: null, q: '', sort: null, order: 'desc', page: 1 })
  })

  it('S40 list(status) envoie le filtre et garde les compteurs globaux de la réponse', async () => {
    const fetchMock = stubFetch(() => reply([card(2, 'completed')]))
    const store = useWatchesStore()

    await store.list({ status: 'completed' })

    expect(params(fetchMock)).toMatchObject({ status: 'completed' })
    expect(store.counts.all).toBe(3)
  })

  it('une erreur de l’API vide la liste et affiche un message', async () => {
    stubFetch(() => ({ status: 500, body: {} }))
    const store = useWatchesStore()

    await store.list()

    expect(store.items).toEqual([])
    expect(store.error).toContain('Impossible de charger')
  })

  it('une réponse plus ancienne n’écrase pas la plus récente', async () => {
    let release!: () => void
    const slow = new Promise<void>((resolve) => (release = resolve))
    stubFetch(async (url) => {
      if (url.searchParams.get('status') === 'sold') {
        await slow
        return reply([card(1, 'sold')])
      }
      return reply([card(2, 'completed')])
    })
    const store = useWatchesStore()

    const first = store.list({ status: 'sold' })
    await store.list({ status: 'completed' })
    release()
    await first

    expect(store.items.map((i) => i.id)).toEqual([2])
  })

  it('RG-AFF-04 listOpenable parcourt toutes les pages et ne garde que les montres sans projet ou terminées', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => card(i + 1, i % 2 === 0 ? 'completed' : 'sold'))
    const page2 = Array.from({ length: 10 }, (_, i) => card(51 + i, i === 0 ? 'no_project' : 'in_progress'))
    const fetchMock = stubFetch((url) =>
      url.searchParams.get('page') === '1' ? reply(page1, { total: 60, pageSize: 50 }) : reply(page2, { total: 60, page: 2, pageSize: 50 }),
    )
    const store = useWatchesStore()

    const openable = await store.listOpenable()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(params(fetchMock, 0)).toMatchObject({ page: '1', pageSize: '50' })
    expect(openable.map((w) => w.id)).toEqual([...Array.from({ length: 25 }, (_, i) => 2 * i + 1), 51])
  })

  it('S26 get(id) renvoie le détail de la montre', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { id: 7, brand: 'Seiko', projects: [] } }))
    const store = useWatchesStore()

    const watch = await store.get(7)

    expect(calls(fetchMock)).toEqual(['GET /watches/7'])
    expect(watch.brand).toBe('Seiko')
  })

  it('S5 create(payload) envoie le corps tel quel en POST', async () => {
    const fetchMock = stubFetch(() => ({ status: 201, body: { id: 9 } }))
    const store = useWatchesStore()
    const payload = { brand: 'Seiko', model: '6119', movementCode: 'manual', steps: [{ label: 'Ouvrir' }] }

    await store.create(payload)

    expect(calls(fetchMock)).toEqual(['POST /watches'])
    expect(sentBody(fetchMock, 0)).toEqual(payload)
  })

  it('S6 fetchPreview(mouvement, complications) interroge l’aperçu', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: [] }))
    const store = useWatchesStore()

    await store.fetchPreview('manual', ['chronograph', 'date'])

    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/step-previews')
    expect(url.searchParams.get('movementCode')).toBe('manual')
    expect(url.searchParams.get('complicationCodes')).toBe('chronograph,date')
  })

  it('S17 addStepPhoto envoie le fichier en multipart (champ file)', async () => {
    const fetchMock = stubFetch(() => ({ status: 201, body: { id: 9, url: '/uploads/a.webp' } }))
    const store = useWatchesStore()
    const blob = new Blob(['webp'], { type: 'image/webp' })

    const photo = await store.addStepPhoto(5, 2, blob)

    expect(calls(fetchMock)).toEqual(['POST /projects/5/steps/2/photos'])
    const init = fetchMock.mock.calls[0]![1]!
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('file')).toBeInstanceOf(Blob)
    // Le navigateur fixe lui-même le Content-Type multipart (avec sa frontière).
    expect(new Headers(init.headers).has('Content-Type')).toBe(false)
    expect(photo).toEqual({ id: 9, url: '/uploads/a.webp' })
  })

  it('S34 removeStepPhoto, setProjectPhoto et removeProjectPhoto appellent les bonnes routes', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { url: '/uploads/b.webp' } }))
    const store = useWatchesStore()

    await store.removeStepPhoto(5, 2, 9)
    await store.setProjectPhoto(5, 'before', new Blob(['x']))
    await store.removeProjectPhoto(5, 'after')

    expect(calls(fetchMock)).toEqual(['DELETE /projects/5/steps/2/photos/9', 'PUT /projects/5/photos/before', 'DELETE /projects/5/photos/after'])
  })

  it('S19 S33 les méthodes de mesure appellent les bonnes routes avec le bon corps', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: {} }))
    const store = useWatchesStore()
    const body = { measuredAt: '2025-05-01', rateSecondsPerDay: 4, beatErrorMs: 0.4, amplitudeDegrees: 260 }

    await store.addMeasurement(5, body)
    await store.updateMeasurement(5, 8, { beatErrorMs: 0.3 })
    await store.removeMeasurement(5, 8)

    expect(calls(fetchMock)).toEqual(['POST /projects/5/measurements', 'PATCH /projects/5/measurements/8', 'DELETE /projects/5/measurements/8'])
    expect(sentBody(fetchMock, 0)).toEqual(body)
    expect(sentBody(fetchMock, 1)).toEqual({ beatErrorMs: 0.3 })
  })

  it('S21 S32 les méthodes de coût appellent les bonnes routes avec le bon corps', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: {} }))
    const store = useWatchesStore()
    const body = { label: 'Poussoirs', amount: '34.00', expenseDate: '2025-05-02' }

    await store.addExpense(5, body)
    await store.updateExpense(5, 3, { amount: '30.00' })
    await store.removeExpense(5, 3)

    expect(calls(fetchMock)).toEqual(['POST /projects/5/expenses', 'PATCH /projects/5/expenses/3', 'DELETE /projects/5/expenses/3'])
    expect(sentBody(fetchMock, 0)).toEqual(body)
    expect(sentBody(fetchMock, 1)).toEqual({ amount: '30.00' })
  })

  it('S10 update envoie le PATCH de la montre avec le corps donné et renvoie la fiche', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { id: 7, model: 'Nouveau' } }))
    const store = useWatchesStore()

    const result = await store.update(7, { model: 'Nouveau', purchasePrice: null })

    expect(calls(fetchMock)).toEqual(['PATCH /watches/7'])
    expect(sentBody(fetchMock, 0)).toEqual({ model: 'Nouveau', purchasePrice: null })
    expect(result).toMatchObject({ id: 7 })
  })

  it('S22 S31 setResale et clearResale appellent PUT et DELETE sur la montre', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { id: 7 } }))
    const store = useWatchesStore()

    await store.setResale(7, { price: '200.00', date: '2025-06-01' })
    await store.clearResale(7)

    expect(calls(fetchMock)).toEqual(['PUT /watches/7/resale', 'DELETE /watches/7/resale'])
    expect(sentBody(fetchMock, 0)).toEqual({ price: '200.00', date: '2025-06-01' })
  })
})
