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
})

describe('useWatchesStore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setActivePinia(createPinia())
    setAccessToken('tok')
  })

  it('S25 list() charge les cartes et les compteurs', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { items: [card(1, 'sold')], counts } }))
    const store = useWatchesStore()

    await store.list()

    expect(calls(fetchMock)).toEqual(['GET /watches'])
    expect(store.items).toHaveLength(1)
    expect(store.counts).toEqual(counts)
    expect(store.error).toBeNull()
  })

  it('S40 list(status) envoie le filtre et garde les compteurs globaux de la réponse', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { items: [card(2, 'completed')], counts } }))
    const store = useWatchesStore()

    await store.list('completed')

    expect(new URL(String(fetchMock.mock.calls[0]![0])).search).toBe('?status=completed')
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
        return { status: 200, body: { items: [card(1, 'sold')], counts } }
      }
      return { status: 200, body: { items: [card(2, 'completed')], counts } }
    })
    const store = useWatchesStore()

    const first = store.list('sold')
    await store.list('completed')
    release()
    await first

    expect(store.items.map((i) => i.id)).toEqual([2])
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
})
