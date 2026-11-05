import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../../api/client'
import { calls, makeRouter, sentBody, stubFetch, type StubResponse } from '../../test/helpers'
import ForgotPasswordView from './ForgotPasswordView.vue'

async function mountView(respond: () => StubResponse = () => ({ status: 204 })) {
  const fetchMock = stubFetch(respond)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/forgot-password')
  const wrapper = mount(ForgotPasswordView, { global: { plugins: [pinia, router] } })
  return { wrapper, fetchMock }
}

async function submit(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], email = ' Foo@Bar.fr ') {
  await wrapper.find('input[name="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('ForgotPasswordView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('S3 envoie l’adresse saisie et affiche la même confirmation, que le compte existe ou non', async () => {
    const { wrapper, fetchMock } = await mountView()

    await submit(wrapper)

    expect(calls(fetchMock)).toEqual(['POST /auth/forgot-password'])
    expect(sentBody(fetchMock, 0)).toEqual({ email: 'Foo@Bar.fr' })
    expect(wrapper.find('[role="status"]').text()).toContain('Si cette adresse correspond à un compte')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('affiche le message de l’API quand la limite de tentatives est atteinte (429)', async () => {
    const { wrapper } = await mountView(() => ({
      status: 429,
      body: { statusCode: 429, code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives : réessayez dans un instant' },
    }))

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Trop de tentatives')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('affiche une erreur générique si l’API ne répond pas', async () => {
    const { wrapper } = await mountView(() => ({ status: 500, body: {} }))

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Une erreur est survenue')
  })

  it('propose de revenir à la connexion', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })
})
