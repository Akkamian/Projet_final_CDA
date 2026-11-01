import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StepPreviewView from './StepPreviewView.vue'

const base = [
  { label: 'Déposer les aiguilles', stepOrder: 300, complicationCode: null, complicationLabel: null },
  { label: 'Déposer le cadran', stepOrder: 400, complicationCode: null, complicationLabel: null },
]
const withChrono = [
  base[0],
  { label: 'Déposer les aiguilles chrono', stepOrder: 350, complicationCode: 'chronograph', complicationLabel: 'Chronographe' },
  base[1],
]

function stubApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    let body: unknown = []
    if (url.pathname === '/movement-types') {
      body = [
        { movementCode: 'automatic', label: 'Mécanique automatique' },
        { movementCode: 'manual', label: 'Mécanique à remontage manuel' },
      ]
    } else if (url.pathname === '/complications') {
      body = [
        { complicationCode: 'chronograph', label: 'Chronographe' },
        { complicationCode: 'date', label: 'Date' },
      ]
    } else if (url.pathname === '/step-previews') {
      body = url.searchParams.get('complicationCodes')?.includes('chronograph') ? withChrono : base
    }
    return { ok: true, status: 200, json: async () => body }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function mountView() {
  const wrapper = mount(StepPreviewView, { global: { plugins: [createPinia()] } })
  await flushPromises()
  return wrapper
}

describe('StepPreviewView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('S5 affiche les types de mouvement, les complications et l’aperçu initial', async () => {
    stubApi()
    const wrapper = await mountView()

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Mécanique à remontage manuel')
    expect(wrapper.findAll('ol li')).toHaveLength(2)
  })

  it('S7 cocher le chronographe intercale ses étapes et affiche son nom sur elles seules', async () => {
    stubApi()
    const wrapper = await mountView()

    await wrapper.find('input[type="checkbox"][value="chronograph"]').setValue(true)
    await flushPromises()

    const items = wrapper.findAll('ol li')
    expect(items.map((li) => li.find('.step-label').text())).toEqual([
      'Déposer les aiguilles',
      'Déposer les aiguilles chrono',
      'Déposer le cadran',
    ])
    expect(items.map((li) => li.find('.badge').exists())).toEqual([false, true, false])
    expect(items[1]!.find('.badge').text()).toBe('Chronographe')
  })

  it('S6 changer de type de mouvement relance l’aperçu', async () => {
    const fetchMock = stubApi()
    const wrapper = await mountView()
    const before = fetchMock.mock.calls.length

    await wrapper.find('input[type="radio"][value="manual"]').setValue(true)
    await flushPromises()

    const urls = fetchMock.mock.calls.slice(before).map((call) => new URL(String(call[0])))
    expect(urls).toHaveLength(1)
    expect(urls[0]!.searchParams.get('movementCode')).toBe('manual')
  })

  it('affiche un message quand l’API est indisponible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    )
    const wrapper = await mountView()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')
  })
})
