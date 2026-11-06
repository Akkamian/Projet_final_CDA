import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStepPreviewStore } from './stepPreview'

const movementTypes = [
  { movementCode: 'automatic', label: 'Mécanique automatique' },
  { movementCode: 'manual', label: 'Mécanique à remontage manuel' },
]
const complications = [
  { complicationCode: 'chronograph', label: 'Chronographe' },
  { complicationCode: 'date', label: 'Date' },
]
const step = (label: string, stepOrder: number, complicationCode: string | null = null) => ({
  label,
  stepOrder,
  complicationCode,
  complicationLabel: complicationCode === 'chronograph' ? 'Chronographe' : null,
})

type Handler = (url: URL) => unknown | Promise<unknown>

function stubApi(handler: Handler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
    ok: true,
    status: 200,
    json: async () => handler(new URL(String(input))),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('stepPreview store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('S5 charge les données de référence et propose un aperçu du premier mouvement', async () => {
    stubApi((url) => {
      if (url.pathname === '/movement-types') return movementTypes
      if (url.pathname === '/complications') return complications
      return [step('Désarmer le ressort de barillet', 100)]
    })
    const store = useStepPreviewStore()

    await store.loadReferenceData()

    expect(store.movementTypes).toHaveLength(2)
    expect(store.complications).toHaveLength(2)
    expect(store.movementCode).toBe('automatic')
    expect(store.steps.map((s) => s.label)).toEqual(['Désarmer le ressort de barillet'])
  })

  it('S7 refreshPreview envoie le mouvement et les complications cochées', async () => {
    const fetchMock = stubApi(() => [])
    const store = useStepPreviewStore()
    store.movementCode = 'manual'
    store.complicationCodes = ['chronograph', 'date']

    await store.refreshPreview()

    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/step-previews')
    expect(url.searchParams.get('movementCode')).toBe('manual')
    expect(url.searchParams.get('complicationCodes')).toBe('chronograph,date')
  })

  it('toggleComplication coche puis décoche une complication et relance l’aperçu', async () => {
    const fetchMock = stubApi(() => [])
    const store = useStepPreviewStore()
    store.movementCode = 'manual'

    await store.toggleComplication('date')
    expect(store.complicationCodes).toEqual(['date'])
    await store.toggleComplication('date')
    expect(store.complicationCodes).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ignore la réponse d’un aperçu périmé quand une demande plus récente est partie', async () => {
    let releaseFirst: (value: unknown) => void = () => {}
    const first = new Promise((resolve) => (releaseFirst = resolve))
    let call = 0
    stubApi(() => {
      call += 1
      return call === 1 ? first : [step('Aperçu récent', 100)]
    })
    const store = useStepPreviewStore()
    store.movementCode = 'manual'

    const slow = store.refreshPreview()
    await store.refreshPreview()
    releaseFirst([step('Aperçu périmé', 100)])
    await slow

    expect(store.steps.map((s) => s.label)).toEqual(['Aperçu récent'])
  })

  it('expose un message d’erreur quand l’API échoue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    )
    const store = useStepPreviewStore()
    store.movementCode = 'manual'

    await store.refreshPreview()

    expect(store.error).toBe('Impossible de charger l’aperçu des étapes.')
    expect(store.steps).toEqual([])
  })
})
