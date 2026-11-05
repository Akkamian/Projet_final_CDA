import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../../api/client'
import { calls, makeRouter, sentBody, stubFetch } from '../../test/helpers'
import LoginView from './LoginView.vue'

async function mountView(path = '/login') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter(path)
  const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

async function submit(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], email = ' Foo@Bar.fr ') {
  await wrapper.find('input[name="email"]').setValue(email)
  await wrapper.find('input[name="password"]').setValue('password123')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('S2 affiche un message distinct pour EMAIL_NOT_VERIFIED, avec le renvoi du lien', async () => {
    stubFetch(() => ({ status: 403, body: { statusCode: 403, code: 'EMAIL_NOT_VERIFIED', message: 'x' } }))
    const { wrapper } = await mountView()

    await submit(wrapper)

    const alert = wrapper.find('[role="alert"]').text()
    expect(alert).toContain('pas encore vérifiée')
    expect(alert).not.toContain('incorrect')
    expect(wrapper.find('button[data-test="resend"]').exists()).toBe(true)
  })

  it('S3 propose « Mot de passe oublié ? » vers la demande de réinitialisation', async () => {
    stubFetch(() => ({ status: 404, body: {} }))
    const { wrapper } = await mountView()

    expect(wrapper.find('a[href="/forgot-password"]').text()).toContain('Mot de passe oublié')
  })

  it('RG-CPT-07 affiche un seul message pour des identifiants invalides, sans proposer le renvoi', async () => {
    stubFetch(() => ({ status: 401, body: { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'x' } }))
    const { wrapper } = await mountView()

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Adresse email ou mot de passe incorrect')
    expect(wrapper.find('button[data-test="resend"]').exists()).toBe(false)
  })

  it('S39 « Renvoyer le lien de vérification » envoie l’adresse saisie et confirme sans rien révéler', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname === '/auth/login'
        ? { status: 403, body: { statusCode: 403, code: 'EMAIL_NOT_VERIFIED', message: 'x' } }
        : { status: 204 },
    )
    const { wrapper } = await mountView()
    await submit(wrapper)

    await wrapper.find('button[data-test="resend"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['POST /auth/login', 'POST /auth/resend-verification'])
    expect(sentBody(fetchMock, 1)).toEqual({ email: 'Foo@Bar.fr' })
    expect(wrapper.text()).toContain('nouveau lien')
  })

  it('S2 une connexion réussie ouvre la session et mène à l’accueil', async () => {
    stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const { wrapper, router } = await mountView()

    await submit(wrapper)

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('une connexion réussie ramène à la page demandée avant la redirection', async () => {
    stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const { wrapper, router } = await mountView('/login?redirect=/apercu-etapes')

    await submit(wrapper)

    expect(router.currentRoute.value.path).toBe('/apercu-etapes')
  })

  it('ignore une redirection vers un autre site', async () => {
    stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const { wrapper, router } = await mountView('/login?redirect=//evil.example')

    await submit(wrapper)

    expect(router.currentRoute.value.path).toBe('/')
  })
})
