import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, makeRouter, stubFetch, type StubResponse } from '../test/helpers'
import AppShell from './AppShell.vue'

async function mountShell(respond: () => StubResponse) {
  const fetchMock = stubFetch(respond)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter('/')
  const wrapper = mount(AppShell, { slots: { default: '<p data-test="content">Contenu</p>' }, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, fetchMock }
}

const PROFILE = { email: 'amateur@example.com', createdAt: '', emailVerifiedAt: null, passwordChangedAt: null }

describe('AppShell', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
  })

  it('affiche le contenu et les deux barres de navigation (le CSS n’en montre qu’une)', async () => {
    const { wrapper } = await mountShell(() => ({ status: 200, body: PROFILE }))

    expect(wrapper.get('[data-test="content"]').text()).toBe('Contenu')
    expect(wrapper.findAll('nav[aria-label="Navigation principale"]')).toHaveLength(2)
  })

  it('charge le profil une fois au montage', async () => {
    const { wrapper, fetchMock } = await mountShell(() => ({ status: 200, body: PROFILE }))

    expect(calls(fetchMock)).toEqual(['GET /account'])
    expect(wrapper.get('[data-test="account-email"]').text()).toBe('amateur@example.com')
  })

  it('la navigation reste là si le profil ne se charge pas', async () => {
    const { wrapper } = await mountShell(() => ({ status: 500, body: { message: 'Erreur interne' } }))

    expect(wrapper.findAll('nav[aria-label="Navigation principale"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="account-email"]').exists()).toBe(false)
  })
})
