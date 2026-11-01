import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calls, makeRouter, sentBody, stubFetch } from '../../test/helpers'
import VerifyEmailView from './VerifyEmailView.vue'

async function mountView(path: string) {
  const router = await makeRouter(path)
  const wrapper = mount(VerifyEmailView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('VerifyEmailView', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('S1 confirme l’adresse avec le jeton du lien (?token=) et propose de se connecter', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))
    const wrapper = await mountView('/verify-email?token=abc.def')

    expect(calls(fetchMock)).toEqual(['POST /auth/verify-email'])
    expect(sentBody(fetchMock, 0)).toEqual({ token: 'abc.def' })
    expect(wrapper.text()).toContain('Adresse vérifiée')
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })

  it('RG-CPT-08 affiche que le lien est invalide ou expiré sur un 400 INVALID_LINK', async () => {
    stubFetch(() => ({ status: 400, body: { statusCode: 400, code: 'INVALID_LINK', message: 'x' } }))
    const wrapper = await mountView('/verify-email?token=vieux')

    expect(wrapper.find('[role="alert"]').text()).toContain('invalide ou a expiré')
    expect(wrapper.text()).not.toContain('Adresse vérifiée')
  })

  it('sans jeton dans l’adresse, n’appelle pas l’API et affiche le même message', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))
    const wrapper = await mountView('/verify-email')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('invalide ou a expiré')
  })

  it('affiche un message d’erreur générique quand l’API est indisponible', async () => {
    stubFetch(() => ({ status: 500, body: {} }))
    const wrapper = await mountView('/verify-email?token=abc')

    expect(wrapper.find('[role="alert"]').text()).toContain('Réessayez')
  })
})
