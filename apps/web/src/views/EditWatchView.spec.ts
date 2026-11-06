import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, makeRouter, sentBody, stubFetch, type StubResponse } from '../test/helpers'
import EditWatchView from './EditWatchView.vue'

const WATCH = {
  id: 7,
  brand: 'Seiko',
  model: '6119-8100',
  movementCode: 'automatic',
  complications: [{ code: 'date', label: 'Date' }],
  purchasePrice: '120.00',
  purchaseDate: '2025-03-01',
  resalePrice: null,
  resaleDate: null,
  margin: null,
  costPrice: '120.00',
  projects: [],
}

const MOVEMENTS = [
  { movementCode: 'manual', label: 'Mécanique manuelle' },
  { movementCode: 'automatic', label: 'Mécanique automatique' },
]
const COMPLICATIONS = [
  { complicationCode: 'date', label: 'Date' },
  { complicationCode: 'chronograph', label: 'Chronographe' },
]

type Handler = (method: string, body: unknown) => StubResponse

async function mountEdit(onPatch: Handler = () => ({ status: 200, body: WATCH }), watch: StubResponse = { status: 200, body: WATCH }) {
  vi.unstubAllGlobals()
  setAccessToken('tok')
  const fetchMock = stubFetch((url, init): StubResponse => {
    if (url.pathname === '/movement-types') return { status: 200, body: MOVEMENTS }
    if (url.pathname === '/complications') return { status: 200, body: COMPLICATIONS }
    if (url.pathname === '/watches/7') {
      return init.method === 'PATCH' ? onPatch('PATCH', JSON.parse(String(init.body))) : watch
    }
    return { status: 404, body: {} }
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/watches/7/edit', [
    { path: '/watches/:id/edit', name: 'edit-watch', component: EditWatchView },
    { path: '/watches/:id', name: 'watch-detail', component: { template: '<div />' } },
  ])
  const wrapper = mount(EditWatchView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, fetchMock, router }
}

const submit = async (wrapper: Awaited<ReturnType<typeof mountEdit>>['wrapper']) => {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}
const patches = (fetchMock: ReturnType<typeof stubFetch>) => calls(fetchMock).filter((c) => c.startsWith('PATCH'))

describe('EditWatchView (S10)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('charge la fiche et préremplit marque, modèle, mouvement, complications, prix et date', async () => {
    const { wrapper } = await mountEdit()

    expect((wrapper.find('#brand').element as HTMLInputElement).value).toBe('Seiko')
    expect((wrapper.find('#model').element as HTMLInputElement).value).toBe('6119-8100')
    expect((wrapper.find('input[name="movement"][value="automatic"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.find('input[value="date"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.find('input[value="chronograph"]').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.find('#purchasePrice').element as HTMLInputElement).value).toBe('120.00')
    expect((wrapper.find('#purchaseDate').element as HTMLInputElement).value).toBe('2025-03-01')
  })

  it('enregistrer n’envoie que les champs modifiés puis revient à la fiche', async () => {
    const { wrapper, fetchMock, router } = await mountEdit()

    await wrapper.find('#model').setValue('6119-8100 Chronograph')
    await submit(wrapper)

    expect(patches(fetchMock)).toEqual(['PATCH /watches/7'])
    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toEqual({ model: '6119-8100 Chronograph' })
    expect(router.currentRoute.value.fullPath).toBe('/watches/7')
  })

  it('une complication ajoutée envoie la liste complète, jamais une liste partielle', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('input[value="chronograph"]').setValue(true)
    await submit(wrapper)

    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toEqual({ complicationCodes: ['date', 'chronograph'] })
  })

  it('décocher la seule complication envoie une liste vide', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('input[value="date"]').setValue(false)
    await submit(wrapper)

    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toEqual({ complicationCodes: [] })
  })

  it('changer le mouvement envoie le nouveau code', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('input[name="movement"][value="manual"]').setValue(true)
    await submit(wrapper)

    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toEqual({ movementCode: 'manual' })
  })

  it('vider le prix et la date les envoie à null ; la virgule française est acceptée', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('#purchasePrice').setValue('')
    await wrapper.find('#purchaseDate').setValue('')
    await submit(wrapper)
    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toEqual({ purchasePrice: null, purchaseDate: null })

    await wrapper.find('#purchasePrice').setValue('95,5')
    await submit(wrapper)
    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toMatchObject({ purchasePrice: '95.5' })
  })

  it('sans modification, aucun envoi : on revient simplement à la fiche', async () => {
    const { wrapper, fetchMock, router } = await mountEdit()

    await submit(wrapper)

    expect(patches(fetchMock)).toEqual([])
    expect(router.currentRoute.value.fullPath).toBe('/watches/7')
  })

  it('une marque vide est refusée sans appel', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('#brand').setValue('   ')
    await submit(wrapper)

    expect(patches(fetchMock)).toEqual([])
    expect(wrapper.find('[role="alert"]').text()).toBe('La marque est obligatoire.')
  })

  it('un prix invalide et une date d’achat future sont refusés sans appel', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('#purchasePrice').setValue('12,345')
    await submit(wrapper)
    expect(wrapper.find('[role="alert"]').text()).toContain('prix d’achat')

    await wrapper.find('#purchasePrice').setValue('120')
    await wrapper.find('#purchaseDate').setValue('2999-01-01')
    await submit(wrapper)
    expect(wrapper.find('[role="alert"]').text()).toContain('futur')
    expect(patches(fetchMock)).toEqual([])
  })

  it('le refus de l’API (date d’achat après la revente) s’affiche tel quel et on reste sur l’écran', async () => {
    const { wrapper, router } = await mountEdit(() => ({
      status: 400,
      body: { code: 'PURCHASE_AFTER_RESALE', message: 'La date d’achat ne peut pas être postérieure à la date de revente' },
    }))

    await wrapper.find('#purchaseDate').setValue('2025-04-01')
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('postérieure à la date de revente')
    expect(router.currentRoute.value.fullPath).toBe('/watches/7/edit')
  })

  it('RG-SEC-01 une montre introuvable (404) affiche un message sans formulaire', async () => {
    const { wrapper } = await mountEdit(undefined, { status: 404, body: { message: 'x' } })

    expect(wrapper.find('[role="alert"]').text()).toBe('Cette montre est introuvable.')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('« Annuler » revient à la fiche sans rien envoyer', async () => {
    const { wrapper, fetchMock, router } = await mountEdit()

    await wrapper.find('#model').setValue('Autre')
    await wrapper.find('[data-test="cancel"]').trigger('click')
    await flushPromises()

    expect(patches(fetchMock)).toEqual([])
    expect(router.currentRoute.value.fullPath).toBe('/watches/7')
  })

  it('un second envoi pendant l’enregistrement est ignoré', async () => {
    const { wrapper, fetchMock } = await mountEdit()

    await wrapper.find('#model').setValue('Autre')
    void wrapper.find('form').trigger('submit')
    void wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(patches(fetchMock)).toEqual(['PATCH /watches/7'])
  })
})
