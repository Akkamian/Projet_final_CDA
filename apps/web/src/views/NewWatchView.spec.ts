import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, makeRouter, sentBody, stubFetch, type StubResponse } from '../test/helpers'
import NewWatchView from './NewWatchView.vue'

const base = [
  { label: 'Déposer les aiguilles', stepOrder: 300, complicationCode: null, complicationLabel: null },
  { label: 'Déposer le cadran', stepOrder: 400, complicationCode: null, complicationLabel: null },
  { label: 'Déposer le balancier', stepOrder: 500, complicationCode: null, complicationLabel: null },
]
const withChrono = [
  base[0],
  { label: 'Déposer les aiguilles chrono', stepOrder: 350, complicationCode: 'chronograph', complicationLabel: 'Chronographe' },
  base[1],
  base[2],
]

// Jours locaux, comme le formulaire : « aujourd'hui » est celui de l'utilisateur.
const localDay = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n, i) => (i === 0 ? n : String(n).padStart(2, '0'))).join('-')
}
const today = () => localDay(0)
const tomorrow = () => localDay(1)

function api(
  onCreate: () => StubResponse = () => ({
    status: 201,
    body: { id: 7, brand: 'Seiko', model: '6119', projects: [{ steps: [{}, {}, {}] }] },
  }),
) {
  return stubFetch((url, init): StubResponse => {
    if (url.pathname === '/movement-types') {
      return {
        status: 200,
        body: [
          { movementCode: 'automatic', label: 'Mécanique automatique' },
          { movementCode: 'manual', label: 'Mécanique à remontage manuel' },
        ],
      }
    }
    if (url.pathname === '/complications') {
      return {
        status: 200,
        body: [
          { complicationCode: 'chronograph', label: 'Chronographe' },
          { complicationCode: 'date', label: 'Date' },
        ],
      }
    }
    if (url.pathname === '/step-previews') {
      return { status: 200, body: url.searchParams.get('complicationCodes')?.includes('chronograph') ? withChrono : base }
    }
    if (url.pathname === '/watches' && init.method === 'POST') return onCreate()
    return { status: 404, body: {} }
  })
}

async function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/watches/new')
  const wrapper = mount(NewWatchView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

type Wrapper = VueWrapper

async function fillIdentity(wrapper: Wrapper, brand = 'Seiko', model = '6119') {
  await wrapper.find('input[name="brand"]').setValue(brand)
  await wrapper.find('input[name="model"]').setValue(model)
}

async function toSteps(wrapper: Wrapper) {
  await wrapper.find('form[data-test="identity"]').trigger('submit')
  await flushPromises()
}

const labels = (wrapper: Wrapper) => wrapper.findAll('ol.steps li .step-label').map((li) => li.text())
const alertText = (wrapper: Wrapper) => wrapper.find('[role="alert"]').text()

describe('NewWatchView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
  })

  it('S5 propose les types de mouvement et les complications du référentiel', async () => {
    api()
    const wrapper = await mountView()

    expect(wrapper.findAll('input[name="movement"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Mécanique à remontage manuel')
    expect(wrapper.text()).toContain('Chronographe')
  })

  it('RG-MON-01 refuse de passer aux étapes sans marque ni modèle', async () => {
    api()
    const wrapper = await mountView()

    await toSteps(wrapper)
    expect(alertText(wrapper)).toContain('marque')
    expect(wrapper.find('ol.steps').exists()).toBe(false)

    await wrapper.find('input[name="brand"]').setValue('   ')
    await wrapper.find('input[name="model"]').setValue('6119')
    await toSteps(wrapper)
    expect(alertText(wrapper)).toContain('marque')

    await fillIdentity(wrapper, 'Seiko', '')
    await toSteps(wrapper)
    expect(alertText(wrapper)).toContain('modèle')
    expect(wrapper.find('ol.steps').exists()).toBe(false)
  })

  it('RG-MON-06 le prix et la date d’achat sont facultatifs', async () => {
    api()
    const wrapper = await mountView()

    await fillIdentity(wrapper)
    await toSteps(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(labels(wrapper)).toHaveLength(3)
  })

  it('RG-MON-07 refuse un prix négatif, à trois décimales ou qui n’est pas un nombre', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)

    for (const price of ['-5', '12.345', 'abc', '100000000']) {
      await wrapper.find('input[name="purchasePrice"]').setValue(price)
      await toSteps(wrapper)
      expect(alertText(wrapper), price).toContain('prix d’achat')
      expect(wrapper.find('ol.steps').exists(), price).toBe(false)
    }
  })

  it('RG-MON-07 accepte 0, 80,50 (virgule) et 99999999.99', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)

    for (const price of ['0', '80,50', '99999999.99']) {
      await wrapper.find('input[name="purchasePrice"]').setValue(price)
      await toSteps(wrapper)
      expect(wrapper.find('ol.steps').exists(), price).toBe(true)
      await wrapper.find('button[data-test="back"]').trigger('click')
    }
  })

  it('S5 refuse une date d’achat dans le futur et accepte aujourd’hui', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)

    await wrapper.find('input[name="purchaseDate"]').setValue(tomorrow())
    await toSteps(wrapper)
    expect(alertText(wrapper)).toContain('futur')
    expect(wrapper.find('ol.steps').exists()).toBe(false)

    await wrapper.find('input[name="purchaseDate"]').setValue(today())
    await toSteps(wrapper)
    expect(wrapper.find('ol.steps').exists()).toBe(true)
  })

  it('S6 et S7 les étapes proposées suivent le mouvement et les complications cochées', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await wrapper.find('input[type="checkbox"][value="chronograph"]').setValue(true)
    await flushPromises()

    await toSteps(wrapper)

    expect(labels(wrapper)).toEqual(['Déposer les aiguilles', 'Déposer les aiguilles chrono', 'Déposer le cadran', 'Déposer le balancier'])
    const tags = wrapper.findAll('ol.steps li').map((li) => li.find('.step-tag').exists())
    expect(tags).toEqual([false, true, false, false])
    expect(wrapper.find('ol.steps li .step-tag').text()).toBe('Chronographe')
  })

  it('les étapes proposées sont numérotées 01, 02, 03', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    expect(wrapper.findAll('ol.steps li .step-order').map((n) => n.text())).toEqual(['01', '02', '03'])
  })

  it('le bouton « + » ajoute l’étape saisie, comme la touche Entrée', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    const add = wrapper.find('button[data-test="add-step"]')
    expect(add.attributes('aria-label')).toBe('Ajouter une étape')
    await wrapper.find('input[name="newStep"]').setValue('Polir le verre')
    await add.trigger('click')
    await wrapper.find('input[name="newStep"]').setValue('Régler la marche')
    await wrapper.find('input[name="newStep"]').trigger('keydown.enter')

    expect(labels(wrapper).slice(-2)).toEqual(['Polir le verre', 'Régler la marche'])
  })

  it('le mouvement est un contrôle segmenté et les complications des pastilles', async () => {
    api()
    const wrapper = await mountView()

    expect(wrapper.findAll('.segmented input[name="movement"]')).toHaveLength(2)
    expect(wrapper.findAll('.chip-group input[type="checkbox"]')).toHaveLength(2)
    expect(wrapper.find('.pair #purchasePrice').exists()).toBe(true)
    expect(wrapper.find('.pair #purchaseDate').exists()).toBe(true)
  })

  it('S8 supprimer, déplacer et ajouter une étape modifie la liste envoyée', async () => {
    const fetchMock = api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    const items = () => wrapper.findAll('ol.steps li')
    await items()[0]!.find('button[data-test="remove"]').trigger('click') // retire « aiguilles »
    await items()[1]!.find('button[data-test="up"]').trigger('click') // « balancier » avant « cadran »
    await wrapper.find('input[name="newStep"]').setValue('  Polir le verre ')
    await wrapper.find('button[data-test="add-step"]').trigger('click')
    expect(labels(wrapper)).toEqual(['Déposer le balancier', 'Déposer le cadran', 'Polir le verre'])

    await wrapper.find('button[data-test="create"]').trigger('click')
    await flushPromises()

    const body = sentBody(fetchMock, fetchMock.mock.calls.length - 1) as { steps: { label: string }[] }
    expect(body.steps).toEqual([{ label: 'Déposer le balancier' }, { label: 'Déposer le cadran' }, { label: 'Polir le verre' }])
  })

  it('S8 les boutons de déplacement sont inactifs aux extrémités', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    const items = wrapper.findAll('ol.steps li')
    expect(items[0]!.find('button[data-test="up"]').attributes('disabled')).toBeDefined()
    expect(items[0]!.find('button[data-test="down"]').attributes('disabled')).toBeUndefined()
    expect(items[2]!.find('button[data-test="down"]').attributes('disabled')).toBeDefined()
  })

  it('S8 ne crée pas de projet sans aucune étape', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    for (let i = 0; i < 3; i++) await wrapper.find('button[data-test="remove"]').trigger('click')

    expect(wrapper.find('button[data-test="create"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('au moins une étape')
  })

  it('S5 envoie la montre complète et confirme la création (aucune autre navigation)', async () => {
    const fetchMock = api()
    const wrapper = await mountView()
    await fillIdentity(wrapper, ' Seiko ', '6119-8100')
    await wrapper.find('input[name="movement"][value="manual"]').setValue(true)
    await wrapper.find('input[type="checkbox"][value="chronograph"]').setValue(true)
    await wrapper.find('input[name="purchasePrice"]').setValue('80,50')
    await wrapper.find('input[name="purchaseDate"]').setValue('2025-03-01')
    await flushPromises()
    await toSteps(wrapper)

    await wrapper.find('button[data-test="create"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock).at(-1)).toBe('POST /watches')
    expect(sentBody(fetchMock, fetchMock.mock.calls.length - 1)).toEqual({
      brand: 'Seiko',
      model: '6119-8100',
      movementCode: 'manual',
      complicationCodes: ['chronograph'],
      purchasePrice: '80.50',
      purchaseDate: '2025-03-01',
      steps: withChrono.map((s) => ({ label: s.label })),
    })
    expect(wrapper.text()).toContain('Montre créée')
    expect(wrapper.text()).toContain('Seiko')
    expect(wrapper.find('ol.steps').exists()).toBe(false)
  })

  it('RG-MON-06 omet le prix et la date quand ils sont vides', async () => {
    const fetchMock = api()
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    await wrapper.find('button[data-test="create"]').trigger('click')
    await flushPromises()

    const body = sentBody(fetchMock, fetchMock.mock.calls.length - 1) as Record<string, unknown>
    expect('purchasePrice' in body).toBe(false)
    expect('purchaseDate' in body).toBe(false)
  })

  it('« Retour » conserve les saisies et les ajustements tant que la sélection ne change pas', async () => {
    api()
    const wrapper = await mountView()
    await fillIdentity(wrapper, 'Seiko', '6119')
    await toSteps(wrapper)
    await wrapper.find('ol.steps li button[data-test="remove"]').trigger('click')

    await wrapper.find('button[data-test="back"]').trigger('click')
    expect((wrapper.find('input[name="brand"]').element as HTMLInputElement).value).toBe('Seiko')
    await toSteps(wrapper)
    expect(labels(wrapper)).toHaveLength(2)

    // Un autre choix de complication régénère la liste proposée.
    await wrapper.find('button[data-test="back"]').trigger('click')
    await wrapper.find('input[type="checkbox"][value="chronograph"]').setValue(true)
    await flushPromises()
    await toSteps(wrapper)
    expect(labels(wrapper)).toHaveLength(4)
  })

  it('une erreur de l’API garde le formulaire et la liste pour réessayer', async () => {
    api(() => ({ status: 500, body: {} }))
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    await wrapper.find('button[data-test="create"]').trigger('click')
    await flushPromises()

    expect(alertText(wrapper)).toContain('Impossible de créer la montre')
    expect(labels(wrapper)).toHaveLength(3)
    expect(wrapper.text()).not.toContain('Montre créée')
  })

  it('une session expirée invite à se reconnecter', async () => {
    api(() => ({ status: 401, body: { code: 'UNAUTHENTICATED' } }))
    const wrapper = await mountView()
    await fillIdentity(wrapper)
    await toSteps(wrapper)

    await wrapper.find('button[data-test="create"]').trigger('click')
    await flushPromises()

    expect(alertText(wrapper)).toContain('session')
    expect(wrapper.find('a[href^="/login"]').exists()).toBe(true)
  })
})
