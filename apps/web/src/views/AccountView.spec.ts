import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken, setAccessToken } from '../api/client'
import { useAccountStore, type AccountProfile } from '../stores/account'
import { calls, makeRouter, sentBody, stubFetch, type StubHandler } from '../test/helpers'
import AccountView from './AccountView.vue'

async function mountView(respond: StubHandler = () => ({ status: 404, body: {} }), profile: Partial<AccountProfile> | null = {}) {
  vi.unstubAllGlobals()
  setAccessToken('tok')
  document.body.innerHTML = ''
  const fetchMock = stubFetch(respond)
  const pinia = createPinia()
  setActivePinia(pinia)
  useAccountStore().profile = profile === null ? null : { ...PROFILE, ...profile }
  const router = await makeRouter('/account', [{ path: '/account', name: 'account', component: AccountView }])
  const wrapper = mount(AccountView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router, fetchMock }
}

const PROFILE = { email: 'horloger@example.com', createdAt: '2026-03-12T10:00:00Z', emailVerifiedAt: '2026-03-12T10:05:00Z', passwordChangedAt: '2026-08-02T09:00:00Z' }
const COUNTS = { all: 12, in_progress: 3, completed: 2, sold: 6, no_project: 1 }

/** Appels qui modifient quelque chose : les lectures de l'écran (statistiques, profil) ne comptent pas. */
const writes = (fetchMock: ReturnType<typeof stubFetch>) => calls(fetchMock).filter((c) => !c.startsWith('GET '))

const button = (wrapper: VueWrapper, label: string) => wrapper.findAll('button').find((b) => b.text() === label)

describe('AccountView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('S35 la suppression du compte demande le mot de passe avant tout appel', async () => {
    const { wrapper, fetchMock } = await mountView()

    await button(wrapper, 'Supprimer mon compte')!.trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(true)
    expect(wrapper.find('dialog input[type="password"]').exists()).toBe(true)
    expect(writes(fetchMock)).toEqual([])

    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    expect(writes(fetchMock)).toEqual([])
    expect(wrapper.find('dialog [role="alert"]').exists()).toBe(true)
  })

  it('S35 envoie le mot de passe, ferme la session et redirige vers la connexion', async () => {
    const { wrapper, router, fetchMock } = await mountView((url, init) =>
      url.pathname === '/account' && init.method === 'DELETE' ? { status: 204 } : { status: 404, body: {} },
    )

    await button(wrapper, 'Supprimer mon compte')!.trigger('click')
    await wrapper.find('dialog input[type="password"]').setValue('secret-123')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(sentBody(fetchMock, calls(fetchMock).indexOf('DELETE /account'))).toEqual({ password: 'secret-123' })
    expect(getAccessToken()).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('S35 un mot de passe incorrect est signalé dans la fenêtre, la session reste ouverte', async () => {
    const { wrapper, router } = await mountView(() => ({
      status: 400,
      body: { statusCode: 400, code: 'WRONG_PASSWORD', message: 'Le mot de passe est incorrect' },
    }))

    await button(wrapper, 'Supprimer mon compte')!.trigger('click')
    await wrapper.find('dialog input[type="password"]').setValue('mauvais')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog [role="alert"]').text()).toContain('Le mot de passe est incorrect')
    expect(getAccessToken()).toBe('tok')
    expect(router.currentRoute.value.fullPath).toBe('/account')
  })

  it('S35 annuler ne supprime rien', async () => {
    const { wrapper, fetchMock } = await mountView()

    await button(wrapper, 'Supprimer mon compte')!.trigger('click')
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(writes(fetchMock)).toEqual([])
  })

  it('S4 le changement de mot de passe affiche l’erreur d’un mot de passe actuel incorrect', async () => {
    const { wrapper, fetchMock } = await mountView(() => ({
      status: 400,
      body: { statusCode: 400, code: 'WRONG_PASSWORD', message: 'Le mot de passe actuel est incorrect' },
    }))

    await wrapper.find('[data-test="password-open"]').trigger('click')
    await wrapper.find('#current-password').setValue('mauvais')
    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('#confirm-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    await flushPromises()

    expect(writes(fetchMock)).toEqual(['PATCH /account/password'])
    expect(sentBody(fetchMock, calls(fetchMock).indexOf('PATCH /account/password'))).toEqual({ currentPassword: 'mauvais', newPassword: 'nouveau-mdp-1' })
    expect(wrapper.find('dialog.sheet').exists()).toBe(true)
    expect(wrapper.find('[data-test="change-password"] [role="alert"]').text()).toContain('Le mot de passe actuel est incorrect')
  })

  it('S4 refuse un nouveau mot de passe trop court ou non confirmé sans appeler l’API', async () => {
    const { wrapper, fetchMock } = await mountView()

    await wrapper.find('[data-test="password-open"]').trigger('click')
    await wrapper.find('#current-password').setValue('ancien-mdp-1')
    await wrapper.find('#new-password').setValue('court')
    await wrapper.find('#confirm-password').setValue('court')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    expect(wrapper.find('[data-test="change-password"] [role="alert"]').text()).toContain('8 caractères')

    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    expect(wrapper.find('[data-test="change-password"] [role="alert"]').text()).toContain('ne correspondent pas')
    expect(writes(fetchMock)).toEqual([])
  })

  it('S4 confirme le changement réussi, ferme la feuille et vide les champs à la réouverture', async () => {
    const { wrapper } = await mountView((url) => (url.pathname === '/account' ? { status: 200, body: PROFILE } : { status: 200, body: { accessToken: 'nouveau' } }))

    await wrapper.find('[data-test="password-open"]').trigger('click')
    await wrapper.find('#current-password').setValue('ancien-mdp-1')
    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('#confirm-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toContain('Mot de passe modifié')
    expect(wrapper.find('dialog.sheet').exists()).toBe(false)

    await wrapper.find('[data-test="password-open"]').trigger('click')
    expect((wrapper.find('#current-password').element as HTMLInputElement).value).toBe('')
  })

  it('a pour titre « Mon compte » et un retour vers le tableau de bord', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('h1').text()).toBe('Mon compte')
    expect(wrapper.find('a.back').attributes('href')).toBe('/')
  })

  it('affiche l’email, « Membre depuis » et « Adresse vérifiée le »', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('[data-test="account-email"]').text()).toBe('horloger@example.com')
    expect(wrapper.text()).toContain('Membre depuis mars 2026')
    expect(wrapper.text()).toContain('Adresse vérifiée le 12/03/2026')
  })

  it('n’affiche pas « Adresse vérifiée le » sans date de vérification', async () => {
    const { wrapper } = await mountView(undefined, { emailVerifiedAt: null })
    expect(wrapper.text()).not.toContain('Adresse vérifiée le')
  })

  it('les quatre tuiles affichent les compteurs de GET /watches?page=1&pageSize=1', async () => {
    const { wrapper, fetchMock } = await mountView((url) =>
      url.pathname === '/watches' ? { status: 200, body: { items: [], counts: COUNTS, total: 12, page: 1, pageSize: 1, totalMargin: '0.00' } } : { status: 404, body: {} },
    )
    const stats = fetchMock.mock.calls.map(([input]) => new URL(String(input))).find((u) => u.pathname === '/watches')!
    expect(stats.searchParams.get('page')).toBe('1')
    expect(stats.searchParams.get('pageSize')).toBe('1')
    expect(wrapper.find('[data-test="stat-total"]').text()).toBe('12')
    expect(wrapper.find('[data-test="stat-in-progress"]').text()).toBe('3')
    expect(wrapper.find('[data-test="stat-finished"]').text()).toBe('2')
    expect(wrapper.find('[data-test="stat-sold"]').text()).toBe('6')
  })

  it('les tuiles affichent – si l’appel échoue, la page reste utilisable', async () => {
    const { wrapper } = await mountView(() => ({ status: 500, body: { statusCode: 500, message: 'x' } }))
    expect(wrapper.find('[data-test="stat-total"]').text()).toBe('–')
    expect(button(wrapper, 'Se déconnecter')).toBeDefined()
  })

  it('« Dernier changement » affiche la date, ou « Jamais modifié » sans date', async () => {
    const withDate = await mountView()
    expect(withDate.wrapper.find('[data-test="password-changed-at"]').text()).toContain('02/08/2026')
    const never = await mountView(undefined, { passwordChangedAt: null })
    expect(never.wrapper.find('[data-test="password-changed-at"]').text()).toContain('Jamais modifié')
  })

  it('sans profil chargé, « Dernier changement » n’affirme pas « Jamais modifié »', async () => {
    const { wrapper } = await mountView(() => ({ status: 404, body: {} }), null)
    expect(wrapper.find('[data-test="password-changed-at"]').text()).toBe('–')
  })

  it('charge le profil au montage quand il est absent (ouverture directe ou rechargement)', async () => {
    const { wrapper, fetchMock } = await mountView((url) => (url.pathname === '/account' ? { status: 200, body: PROFILE } : { status: 404, body: {} }), null)
    expect(calls(fetchMock)).toContain('GET /account')
    expect(wrapper.find('[data-test="account-email"]').text()).toBe('horloger@example.com')
    expect(wrapper.find('[data-test="password-changed-at"]').text()).toContain('02/08/2026')
  })

  it('le formulaire de mot de passe n’est affiché qu’après « Modifier »', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('form[data-test="change-password"]').exists()).toBe(false)
    await wrapper.find('[data-test="password-open"]').trigger('click')
    expect(wrapper.find('dialog.sheet form[data-test="change-password"]').exists()).toBe(true)
  })

  it('pendant l’enregistrement, la feuille du mot de passe ne se ferme pas (Échap)', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const { wrapper } = await mountView(async (_url, init) => {
      if (init.method === 'PATCH') {
        await gate
        return { status: 200, body: { accessToken: 'nouveau' } }
      }
      return { status: 404, body: {} }
    })
    await wrapper.find('[data-test="password-open"]').trigger('click')
    await wrapper.find('#current-password').setValue('ancien-mdp-1')
    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('#confirm-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    await wrapper.find('dialog.sheet').trigger('cancel')
    expect(wrapper.find('dialog.sheet').exists()).toBe(true)

    release()
    await flushPromises()
    expect(wrapper.find('dialog.sheet').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').text()).toContain('Mot de passe modifié')
  })

  it('« Annuler » ferme la feuille sans appeler l’API', async () => {
    const { wrapper, fetchMock } = await mountView()
    await wrapper.find('[data-test="password-open"]').trigger('click')
    await wrapper.find('[data-test="password-cancel"]').trigger('click')
    expect(wrapper.find('dialog.sheet').exists()).toBe(false)
    expect(writes(fetchMock)).toEqual([])
  })

  it('« Se déconnecter » ferme la session et redirige vers la connexion', async () => {
    const { wrapper, router, fetchMock } = await mountView(() => ({ status: 204 }))

    await button(wrapper, 'Se déconnecter')!.trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain('POST /auth/logout')
    expect(router.currentRoute.value.name).toBe('login')
  })
})
