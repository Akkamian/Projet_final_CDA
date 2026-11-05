import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../../api/client'
import { calls, makeRouter, sentBody, stubFetch, type StubResponse } from '../../test/helpers'
import ResetPasswordView from './ResetPasswordView.vue'

async function mountView(respond: () => StubResponse = () => ({ status: 204 }), path = '/reset-password?token=abc.def') {
  const fetchMock = stubFetch(respond)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter(path, [{ path: '/forgot-password', name: 'forgot-password', component: { template: '<div />' } }])
  const wrapper = mount(ResetPasswordView, { global: { plugins: [pinia, router] } })
  return { wrapper, fetchMock }
}

async function submit(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], password = 'nouveau-mdp-1', confirm = password) {
  await wrapper.find('input[name="password"]').setValue(password)
  await wrapper.find('input[name="confirmPassword"]').setValue(confirm)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('ResetPasswordView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('S3 envoie le jeton du lien et le nouveau mot de passe, puis propose de se connecter', async () => {
    const { wrapper, fetchMock } = await mountView()

    await submit(wrapper)

    expect(calls(fetchMock)).toEqual(['POST /auth/reset-password'])
    expect(sentBody(fetchMock, 0)).toEqual({ token: 'abc.def', password: 'nouveau-mdp-1' })
    expect(wrapper.text()).toContain('Mot de passe modifié')
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('RG-CPT-03 refuse moins de 8 caractères ou une confirmation différente, sans appeler l’API', async () => {
    const { wrapper, fetchMock } = await mountView()

    await submit(wrapper, 'court')
    expect(wrapper.find('[role="alert"]').text()).toContain('8 caractères')

    await submit(wrapper, 'nouveau-mdp-1', 'autre-mdp-123')
    expect(wrapper.find('[role="alert"]').text()).toContain('ne correspondent pas')
    expect(calls(fetchMock)).toEqual([])
  })

  it('RG-CPT-09 un lien invalide ou expiré (INVALID_LINK) propose d’en demander un nouveau', async () => {
    const { wrapper } = await mountView(() => ({
      status: 400,
      body: { statusCode: 400, code: 'INVALID_LINK', message: 'Ce lien est invalide ou a expiré' },
    }))

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('invalide ou a expiré')
    expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
  })

  it('un lien sans jeton n’affiche pas le formulaire', async () => {
    const { wrapper, fetchMock } = await mountView(() => ({ status: 204 }), '/reset-password')

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toContain('invalide ou a expiré')
    expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
    expect(calls(fetchMock)).toEqual([])
  })

  it('affiche une erreur générique si l’API ne répond pas', async () => {
    const { wrapper } = await mountView(() => ({ status: 500, body: {} }))

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Une erreur est survenue')
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
