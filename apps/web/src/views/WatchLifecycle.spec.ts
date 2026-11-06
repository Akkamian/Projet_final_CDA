import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, makeRouter, sentBody, stubFetch, type StubResponse } from '../test/helpers'
import NewWatchView from './NewWatchView.vue'
import WatchDetailView from './WatchDetailView.vue'

const project = (id: number, status: 'in_progress' | 'completed', createdAt = '2025-05-01T10:00:00Z') => ({
  id,
  status,
  createdAt,
  completedAt: status === 'completed' ? '2025-06-01T10:00:00Z' : null,
  photoBefore: null,
  photoAfter: null,
  steps: [{ id: id * 10, stepOrder: 1, label: `Étape ${id}`, notes: null, isCompleted: false, completedAt: null, photos: [] }],
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
  costPrice: null,
  projects,
  ...extra,
})
const sold = { resalePrice: '200.00', resaleDate: '2025-07-01', margin: '120.00' }

async function mountDetail(initial: object, respond: (url: URL, init: RequestInit) => StubResponse = () => ({ status: 404, body: {} })) {
  const fetchMock = stubFetch((url, init) => {
    if (url.pathname === '/watches/7' && (init.method ?? 'GET') === 'GET') return { status: 200, body: initial }
    return respond(url, init)
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/watches/7', [
    { path: '/watches/:id', name: 'watch-detail', component: WatchDetailView },
    { path: '/watches/:id/edit', name: 'edit-watch', component: { template: '<div />' } },
  ])
  const wrapper = mount(WatchDetailView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router, fetchMock }
}

const button = (wrapper: VueWrapper, label: string) => wrapper.findAll('button').find((b) => b.text() === label)
const link = (wrapper: VueWrapper, label: string) => wrapper.findAll('a').find((a) => a.text() === label)
const COMPLETE = 'Marquer le projet terminé'
// Les actions du menu « ⋯ » : on l'ouvre puis on cherche l'entrée (son texte peut inclure une note).
async function menuItem(wrapper: VueWrapper, label: string) {
  if (!wrapper.find('[role="menu"]').exists()) await wrapper.get('[data-test="menu-toggle"]').trigger('click')
  return wrapper.findAll('[role="menuitem"]').find((i) => i.text().startsWith(label))
}

describe('Cycle de vie des projets (fiche montre)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
    document.body.innerHTML = ''
  })

  it('S11 « Marquer le projet terminé » apparaît sur un projet en cours et le termine', async () => {
    const { wrapper, fetchMock } = await mountDetail(watch([project(1, 'in_progress')]), (url, init) => {
      if (url.pathname === '/projects/1/complete' && init.method === 'POST') return { status: 200, body: project(1, 'completed') }
      return { status: 404, body: {} }
    })

    await button(wrapper, COMPLETE)!.trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain('POST /projects/1/complete')
    expect(wrapper.text()).toContain('Terminé')
    expect(button(wrapper, COMPLETE)).toBeUndefined()
  })

  it('S11 « Marquer le projet terminé » est absent sur un projet terminé', async () => {
    const { wrapper } = await mountDetail(watch([project(1, 'completed')]))

    expect(button(wrapper, COMPLETE)).toBeUndefined()
  })

  it('S11 affiche le refus de l’API (409) sans changer l’état', async () => {
    const { wrapper } = await mountDetail(watch([project(1, 'in_progress')]), () => ({
      status: 409,
      body: { statusCode: 409, code: 'PROJECT_ALREADY_COMPLETED', message: 'Ce projet est déjà terminé' },
    }))

    await button(wrapper, COMPLETE)!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Ce projet est déjà terminé')
    expect(button(wrapper, COMPLETE)).toBeDefined()
  })

  it('S28 « Rouvrir » apparaît sur un projet terminé et le remet en cours', async () => {
    const { wrapper, fetchMock } = await mountDetail(watch([project(1, 'completed')]), (url, init) => {
      if (url.pathname === '/projects/1/reopen' && init.method === 'POST') return { status: 200, body: project(1, 'in_progress') }
      return { status: 404, body: {} }
    })

    await (await menuItem(wrapper, 'Rouvrir ce projet'))!.trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain('POST /projects/1/reopen')
    expect(wrapper.get('[data-test="status-badge"]').text()).toBe('En cours')
    expect((await menuItem(wrapper, 'Rouvrir ce projet'))!.attributes('aria-disabled')).toBe('true')
    expect(button(wrapper, COMPLETE)).toBeDefined()
  })

  it('S28 « Rouvrir ce projet » est désactivé, avec sa raison, si la montre est vendue', async () => {
    const { wrapper, fetchMock } = await mountDetail(watch([project(1, 'completed')], sold))

    const reopen = (await menuItem(wrapper, 'Rouvrir ce projet'))!
    expect(reopen.attributes('aria-disabled')).toBe('true')
    expect(reopen.text()).toContain('vendue')
    await reopen.trigger('click')
    expect(calls(fetchMock).some((c) => c.includes('/reopen'))).toBe(false)
  })

  it('S28 « Rouvrir ce projet » est désactivé si un autre projet est en cours', async () => {
    const { wrapper } = await mountDetail(watch([project(2, 'in_progress', '2025-08-01T10:00:00Z'), project(1, 'completed')]))
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(wrapper.get('[data-test="status-badge"]').text()).toBe('Terminé')
    const reopen = (await menuItem(wrapper, 'Rouvrir ce projet'))!
    expect(reopen.attributes('aria-disabled')).toBe('true')
    expect(reopen.text()).toContain('en cours')
  })

  it('S28 « Rouvrir ce projet » est désactivé sur un projet déjà en cours', async () => {
    const { wrapper } = await mountDetail(watch([project(1, 'in_progress')]))

    expect((await menuItem(wrapper, 'Rouvrir ce projet'))!.attributes('aria-disabled')).toBe('true')
  })

  it('sans projet, le menu ne propose ni « Rouvrir » ni « Supprimer ce projet »', async () => {
    const { wrapper } = await mountDetail(watch([]))

    await wrapper.get('[data-test="menu-toggle"]').trigger('click')

    expect(wrapper.findAll('[role="menuitem"]').map((i) => i.text())).toEqual(['Modifier la montre', 'Supprimer la montre'])
  })

  it('montre vendue : une note remplace « Nouvelle révision », « + Mesure » reste proposé', async () => {
    const { wrapper } = await mountDetail(watch([project(1, 'completed')], sold))

    expect(link(wrapper, 'Nouvelle révision')).toBeUndefined()
    expect(wrapper.text()).toContain('Montre vendue : aucun nouveau projet')
    expect(wrapper.find('[data-test="measurement-add"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="status-badge"]').text()).toBe('Vendue')
  })

  it('un projet terminé affiche sa date de fin', async () => {
    const { wrapper } = await mountDetail(watch([project(1, 'completed')]))

    expect(wrapper.text()).toContain('Terminé le 01/06/2025')
  })

  it('RG-AFF-04 « Nouvelle révision » est mise en avant sur une montre libre (terminée ou sans projet)', async () => {
    for (const projects of [[project(1, 'completed')], []]) {
      const { wrapper } = await mountDetail(watch(projects))
      const revision = link(wrapper, 'Nouvelle révision')

      expect(revision, `${projects.length} projet(s)`).toBeDefined()
      expect(revision!.classes()).toContain('btn')
      expect(revision!.attributes('href')).toBe('/watches/new?watch=7')
      wrapper.unmount()
    }
  })

  it('RG-AFF-04 « Nouvelle révision » est absente si la montre est vendue ou si un projet est en cours', async () => {
    const vendue = await mountDetail(watch([project(1, 'completed')], sold))
    expect(link(vendue.wrapper, 'Nouvelle révision')).toBeUndefined()
    vendue.wrapper.unmount()

    const enCours = await mountDetail(watch([project(1, 'in_progress')]))
    expect(link(enCours.wrapper, 'Nouvelle révision')).toBeUndefined()
  })

  it('S37 supprimer un projet demande confirmation, garde la montre et relit la marge', async () => {
    const { wrapper, fetchMock } = await mountDetail(
      watch([project(2, 'in_progress', '2025-08-01T10:00:00Z'), project(1, 'completed')]),
      (url, init) => {
        if (url.pathname === '/projects/2' && init.method === 'DELETE') return { status: 204 }
        return { status: 404, body: {} }
      },
    )
    expect(wrapper.text()).toContain('Étape 2')

    await (await menuItem(wrapper, 'Supprimer ce projet'))!.trigger('click')
    expect(wrapper.find('dialog').exists()).toBe(true)
    expect(calls(fetchMock)).not.toContain('DELETE /projects/2')

    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain('DELETE /projects/2')
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.text()).toContain('Seiko 6119-8100')
    expect(wrapper.text()).toContain('Étape 1')
    expect(wrapper.text()).not.toContain('Étape 2')
    expect(calls(fetchMock).filter((c) => c === 'GET /watches/7')).toHaveLength(2)
  })

  it('S37 supprimer le seul projet laisse la montre « Sans projet »', async () => {
    const { wrapper } = await mountDetail(watch([project(1, 'completed')]), (url, init) => {
      if (url.pathname === '/projects/1' && init.method === 'DELETE') return { status: 204 }
      return { status: 404, body: {} }
    })

    await (await menuItem(wrapper, 'Supprimer ce projet'))!.trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="status-badge"]').text()).toBe('Sans projet')
    expect(wrapper.text()).toContain('Aucun projet')
    expect(wrapper.find('[data-test="step"]').exists()).toBe(false)
  })

  it('changer d’onglet ne garde ni l’étape dépliée ni le filtre de position de l’autre projet', async () => {
    const withMeasures = (id: number, createdAt: string, positions: string[]) => ({
      ...project(id, 'completed', createdAt),
      measurements: positions.map((position, i) => ({
        id: id * 100 + i,
        measuredAt: `2025-0${i + 1}-01T00:00:00.000Z`,
        rateSecondsPerDay: '5.00',
        beatErrorMs: '0.30',
        amplitudeDegrees: '260.00',
        watchPosition: position,
      })),
    })
    const { wrapper } = await mountDetail(
      watch([
        withMeasures(2, '2025-08-01T10:00:00Z', ['Cadran haut', 'Cadran bas']),
        withMeasures(1, '2025-01-01T10:00:00Z', ['Cadran haut', 'Cadran bas']),
      ] as unknown as ReturnType<typeof project>[]),
    )
    const pressed = () => wrapper.get('[data-test="position-chip"][aria-pressed="true"]').text()
    await wrapper.get('[data-test="expand"]').trigger('click')
    await wrapper.findAll('[data-test="position-chip"]')[2]!.trigger('click')
    expect(wrapper.get('[data-test="expand"]').attributes('aria-expanded')).toBe('true')
    expect(pressed()).toBe('Cadran haut 1')

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(wrapper.get('[data-test="expand"]').attributes('aria-expanded')).toBe('false')
    expect(pressed()).toBe('Cadran bas 1')
  })

  it('S37 annuler la confirmation ne supprime rien', async () => {
    const { wrapper, fetchMock } = await mountDetail(watch([project(1, 'in_progress')]))

    await (await menuItem(wrapper, 'Supprimer ce projet'))!.trigger('click')
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(calls(fetchMock).some((c) => c.startsWith('DELETE'))).toBe(false)
  })

  it('S38 supprimer la montre demande confirmation puis redirige vers le tableau de bord', async () => {
    const { wrapper, router, fetchMock } = await mountDetail(watch([project(1, 'completed')], sold), (url, init) => {
      if (url.pathname === '/watches/7' && init.method === 'DELETE') return { status: 204 }
      return { status: 404, body: {} }
    })

    await (await menuItem(wrapper, 'Supprimer la montre'))!.trigger('click')
    expect(calls(fetchMock)).not.toContain('DELETE /watches/7')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain('DELETE /watches/7')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('S38 si la suppression de la montre échoue, l’erreur est affichée et on reste sur la fiche', async () => {
    const { wrapper, router } = await mountDetail(watch([project(1, 'completed')]), () => ({
      status: 500,
      body: { statusCode: 500, message: 'Erreur interne' },
    }))

    await (await menuItem(wrapper, 'Supprimer la montre'))!.trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/watches/7')
  })
})

describe('Nouveau projet sur une montre existante (S9)', () => {
  const card = (id: number, model: string, status: string) => ({
    id,
    brand: 'Seiko',
    model,
    movementCode: 'automatic',
    complicationLabels: [],
    status,
    thumbnailUrl: null,
    margin: null,
    costPrice: null,
  })
  const steps = [
    { label: 'Déposer le cadran', stepOrder: 400, complicationCode: null, complicationLabel: null },
    { label: 'Déposer le balancier', stepOrder: 500, complicationCode: null, complicationLabel: null },
  ]

  function api(items: object[], onRevision: () => StubResponse = () => ({ status: 201, body: project(9, 'in_progress') })) {
    return stubFetch((url, init): StubResponse => {
      if (url.pathname === '/movement-types') return { status: 200, body: [{ movementCode: 'automatic', label: 'Mécanique automatique' }] }
      if (url.pathname === '/complications') return { status: 200, body: [{ complicationCode: 'chronograph', label: 'Chronographe' }] }
      if (url.pathname === '/step-previews') {
        return {
          status: 200,
          body: url.searchParams.get('complicationCodes') ? steps : [{ ...steps[0]!, label: 'Étape d’une nouvelle montre' }],
        }
      }
      if (url.pathname === '/watches' && !init.method) return { status: 200, body: { items, counts: {} } }
      if (url.pathname === '/watches/7') return { status: 200, body: watch([project(1, 'completed')]) }
      if (url.pathname === '/watches/7/projects' && init.method === 'POST') return onRevision()
      return { status: 404, body: {} }
    })
  }

  async function mountNew(items: object[], initial = '/watches/new', onRevision?: () => StubResponse) {
    vi.unstubAllGlobals()
    setAccessToken('tok')
    const fetchMock = api(items, onRevision)
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter(initial, [{ path: '/watches/new', name: 'new-watch', component: NewWatchView }])
    const wrapper = mount(NewWatchView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return { wrapper, fetchMock }
  }

  const options = (wrapper: VueWrapper) => wrapper.findAll('#existing-watch option').map((o) => o.text())

  it('la liste « Montre existante » ne contient que les montres non vendues sans projet en cours', async () => {
    const { wrapper } = await mountNew([
      card(1, 'En cours', 'in_progress'),
      card(2, 'Terminée', 'completed'),
      card(3, 'Vendue', 'sold'),
      card(4, 'Sans projet', 'no_project'),
    ])

    const list = options(wrapper).join('|')
    expect(list).toContain('Terminée')
    expect(list).toContain('Sans projet')
    expect(list).not.toContain('En cours')
    expect(list).not.toContain('Vendue')
  })

  it('la liste est désactivée et explique pourquoi s’il n’y a aucune montre disponible', async () => {
    const { wrapper } = await mountNew([card(1, 'En cours', 'in_progress'), card(3, 'Vendue', 'sold')])

    expect(wrapper.find('#existing-watch').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Aucune montre disponible')
  })

  it('choisir une montre affiche son récapitulatif en lecture seule, puis crée le projet avec les étapes proposées', async () => {
    const { wrapper, fetchMock } = await mountNew([card(7, '6119-8100', 'completed')])

    await wrapper.find('#existing-watch').setValue('7')
    await flushPromises()
    expect(wrapper.find('[data-test="existing-summary"]').text()).toContain('Seiko 6119-8100')
    expect(wrapper.find('[data-test="existing-summary"]').text()).toContain('Chronographe')
    expect(wrapper.find('#brand').exists() && wrapper.find('#brand').isVisible()).toBe(false)

    await wrapper.find('[data-test="existing-next"]').trigger('click')
    await flushPromises()
    const preview = fetchMock.mock.calls
      .map(([u]) => new URL(String(u)))
      .filter((u) => u.pathname === '/step-previews')
      .at(-1)!
    expect(preview.searchParams.get('complicationCodes')).toBe('chronograph')
    expect(wrapper.text()).toContain('Déposer le cadran')

    await wrapper.find('[data-test="create"]').trigger('click')
    await flushPromises()

    const index = calls(fetchMock).indexOf('POST /watches/7/projects')
    expect(index).toBeGreaterThan(-1)
    expect(sentBody(fetchMock, index)).toEqual({ steps: [{ label: 'Déposer le cadran' }, { label: 'Déposer le balancier' }] })
    expect(wrapper.text()).toContain('Projet créé')
    expect(wrapper.find('a[href="/watches/7"]').exists()).toBe(true)
  })

  it('la montre est présélectionnée depuis la fiche (« Nouvelle révision »)', async () => {
    const { wrapper } = await mountNew([card(7, '6119-8100', 'completed')], '/watches/new?watch=7')

    expect((wrapper.find('#existing-watch').element as HTMLSelectElement).value).toBe('7')
    expect(wrapper.find('[data-test="existing-summary"]').text()).toContain('Seiko 6119-8100')
  })

  it('« Saisir une nouvelle montre » ramène au formulaire', async () => {
    const { wrapper } = await mountNew([card(7, '6119-8100', 'completed')], '/watches/new?watch=7')

    await wrapper.find('#existing-watch').setValue('')
    await flushPromises()

    expect(wrapper.find('[data-test="existing-summary"]').exists()).toBe(false)
    expect(wrapper.find('#brand').isVisible()).toBe(true)
  })

  it('revenir à « Saisir une nouvelle montre » après avoir vu les étapes d’une montre existante régénère les étapes', async () => {
    const { wrapper } = await mountNew([card(7, '6119-8100', 'completed')])
    const newWatchSteps = async () => {
      await wrapper.find('#brand').setValue('Orient')
      await wrapper.find('#model').setValue('Bambino')
      await wrapper.find('[data-test="identity"]').trigger('submit')
      await flushPromises()
    }

    await newWatchSteps()
    await wrapper.find('[data-test="back"]').trigger('click')
    await wrapper.find('#existing-watch').setValue('7')
    await flushPromises()
    await wrapper.find('[data-test="existing-next"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Déposer le cadran')
    await wrapper.find('[data-test="back"]').trigger('click')
    await wrapper.find('#existing-watch').setValue('')
    await flushPromises()
    await newWatchSteps()

    expect(wrapper.text()).toContain('Étape d’une nouvelle montre')
    expect(wrapper.text()).not.toContain('Déposer le cadran')
  })

  it('affiche le refus de l’API (409) à la création', async () => {
    const { wrapper } = await mountNew([card(7, '6119-8100', 'completed')], '/watches/new?watch=7', () => ({
      status: 409,
      body: { statusCode: 409, code: 'PROJECT_ALREADY_IN_PROGRESS', message: 'Un projet est déjà en cours sur cette montre' },
    }))

    await wrapper.find('[data-test="existing-next"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="create"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Un projet est déjà en cours sur cette montre')
  })
})
