import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken, setAccessToken } from '../api/client'
import { calls, makeRouter, sentBody, stubFetch, type StubResponse } from '../test/helpers'
import AccountView from './AccountView.vue'

async function mountView(respond: (url: URL, init: RequestInit) => StubResponse = () => ({ status: 404, body: {} })) {
  vi.unstubAllGlobals()
  setAccessToken('tok')
  document.body.innerHTML = ''
  const fetchMock = stubFetch(respond)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/account', [{ path: '/account', name: 'account', component: AccountView }])
  const wrapper = mount(AccountView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router, fetchMock }
}

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
    expect(calls(fetchMock)).toEqual([])

    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    expect(calls(fetchMock)).toEqual([])
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

    expect(sentBody(fetchMock, 0)).toEqual({ password: 'secret-123' })
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
    expect(calls(fetchMock)).toEqual([])
  })

  it('S4 le changement de mot de passe affiche l’erreur d’un mot de passe actuel incorrect', async () => {
    const { wrapper, fetchMock } = await mountView(() => ({
      status: 400,
      body: { statusCode: 400, code: 'WRONG_PASSWORD', message: 'Le mot de passe actuel est incorrect' },
    }))

    await wrapper.find('#current-password').setValue('mauvais')
    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('#confirm-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PATCH /account/password'])
    expect(sentBody(fetchMock, 0)).toEqual({ currentPassword: 'mauvais', newPassword: 'nouveau-mdp-1' })
    expect(wrapper.find('[data-test="change-password"] [role="alert"]').text()).toContain('Le mot de passe actuel est incorrect')
  })

  it('S4 refuse un nouveau mot de passe trop court ou non confirmé sans appeler l’API', async () => {
    const { wrapper, fetchMock } = await mountView()

    await wrapper.find('#current-password').setValue('ancien-mdp-1')
    await wrapper.find('#new-password').setValue('court')
    await wrapper.find('#confirm-password').setValue('court')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    expect(wrapper.find('[data-test="change-password"] [role="alert"]').text()).toContain('8 caractères')

    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    expect(wrapper.find('[data-test="change-password"] [role="alert"]').text()).toContain('ne correspondent pas')
    expect(calls(fetchMock)).toEqual([])
  })

  it('S4 confirme le changement réussi et vide les champs', async () => {
    const { wrapper } = await mountView(() => ({ status: 200, body: { accessToken: 'nouveau' } }))

    await wrapper.find('#current-password').setValue('ancien-mdp-1')
    await wrapper.find('#new-password').setValue('nouveau-mdp-1')
    await wrapper.find('#confirm-password').setValue('nouveau-mdp-1')
    await wrapper.find('form[data-test="change-password"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toContain('Mot de passe modifié')
    expect((wrapper.find('#current-password').element as HTMLInputElement).value).toBe('')
  })

  it('« Se déconnecter » ferme la session et redirige vers la connexion', async () => {
    const { wrapper, router, fetchMock } = await mountView(() => ({ status: 204 }))

    await button(wrapper, 'Se déconnecter')!.trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain('POST /auth/logout')
    expect(router.currentRoute.value.name).toBe('login')
  })
})
