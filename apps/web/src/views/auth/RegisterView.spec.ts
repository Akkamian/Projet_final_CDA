import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../../api/client'
import { calls, makeRouter, sentBody, stubFetch } from '../../test/helpers'
import RegisterView from './RegisterView.vue'

async function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/register')
  return mount(RegisterView, { global: { plugins: [pinia, router] } })
}

async function fill(
  wrapper: Awaited<ReturnType<typeof mountView>>,
  values: { email?: string; password?: string; confirm?: string; accept?: boolean } = {},
) {
  await wrapper.find('input[name="email"]').setValue(values.email ?? 'foo@bar.fr')
  await wrapper.find('input[name="password"]').setValue(values.password ?? 'password123')
  await wrapper.find('input[name="confirmPassword"]').setValue(values.confirm ?? values.password ?? 'password123')
  await wrapper.find('input[name="acceptTerms"]').setValue(values.accept ?? true)
}

async function submit(wrapper: Awaited<ReturnType<typeof mountView>>) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('RegisterView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('RG-CPT-16 l’inscription est bloquée si la confirmation diffère', async () => {
    const fetchMock = stubFetch(() => ({ status: 201 }))
    const wrapper = await mountView()

    await fill(wrapper, { password: 'password123', confirm: 'password124' })
    await submit(wrapper)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('ne correspondent pas')
  })

  it('RG-CPT-17 l’inscription est bloquée sans acceptation des CGV', async () => {
    const fetchMock = stubFetch(() => ({ status: 201 }))
    const wrapper = await mountView()

    await fill(wrapper, { accept: false })
    await submit(wrapper)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('Conditions Générales')
  })

  it('RG-CPT-03 l’inscription est bloquée avec un mot de passe de 7 caractères', async () => {
    const fetchMock = stubFetch(() => ({ status: 201 }))
    const wrapper = await mountView()

    await fill(wrapper, { password: '1234567' })
    await submit(wrapper)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('8 caractères')
  })

  it('S1 envoie l’inscription, sans la confirmation, puis invite à vérifier la boîte mail (aucune session)', async () => {
    const fetchMock = stubFetch(() => ({ status: 201 }))
    const wrapper = await mountView()

    await fill(wrapper, { email: ' Foo@Bar.fr ' })
    await submit(wrapper)

    expect(calls(fetchMock)).toEqual(['POST /auth/register'])
    expect(sentBody(fetchMock, 0)).toEqual({ email: 'Foo@Bar.fr', password: 'password123', acceptTerms: true })
    expect(wrapper.text()).toContain('Vérifiez votre boîte mail')
    expect(wrapper.text()).toContain('Foo@Bar.fr')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('RG-CPT-01 affiche « adresse déjà utilisée » sur un 409', async () => {
    stubFetch(() => ({ status: 409, body: { statusCode: 409, code: 'EMAIL_ALREADY_USED', message: 'x' } }))
    const wrapper = await mountView()

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('déjà utilisée')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('S39 le bouton « Renvoyer le lien » redemande un email pour l’adresse saisie', async () => {
    const fetchMock = stubFetch((url) => ({ status: url.pathname === '/auth/register' ? 201 : 204 }))
    const wrapper = await mountView()
    await fill(wrapper)
    await submit(wrapper)

    await wrapper.find('button[data-test="resend"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['POST /auth/register', 'POST /auth/resend-verification'])
    expect(sentBody(fetchMock, 1)).toEqual({ email: 'foo@bar.fr' })
    expect(wrapper.text()).toContain('nouveau lien')
  })

  it('affiche un message générique quand l’API est indisponible', async () => {
    stubFetch(() => ({ status: 500, body: {} }))
    const wrapper = await mountView()

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Réessayez')
  })

  it('les deux champs mot de passe ont un bouton œil', async () => {
    const wrapper = await mountView()
    expect(wrapper.findAll('[data-test="toggle-password"]')).toHaveLength(2)
  })

  it('la mention des CGV et de la confidentialité ne contient aucun lien', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('label.choice a').exists()).toBe(false)
    expect(wrapper.find('label.choice').text()).toContain('Conditions Générales de Vente')
  })

  it('la confirmation d’envoi affiche la pastille de confirmation', async () => {
    stubFetch(() => ({ status: 201 }))
    const wrapper = await mountView()
    await fill(wrapper, {})
    await submit(wrapper)
    expect(wrapper.find('.confirm-badge').exists()).toBe(true)
  })
})
