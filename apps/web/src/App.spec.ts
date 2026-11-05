import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { routes } from './router'
import { setAccessToken } from './api/client'
import { calls, stubFetch } from './test/helpers'

describe('App', () => {
  it('monte l’application et affiche la vue du routeur', async () => {
    // La page d'accueil (tableau de bord) charge la liste des montres : on ne sort pas sur le réseau.
    stubFetch((url) =>
      url.pathname === '/account'
        ? { status: 200, body: { email: 'amateur@example.com', createdAt: '', emailVerifiedAt: null, passwordChangedAt: null } }
        : { status: 200, body: { items: [], counts: { all: 0, in_progress: 0, completed: 0, sold: 0, no_project: 0 } } },
    )
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('.shell').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Tableau de bord')
  })
})

describe('App : coque de navigation', () => {
  const Page = { render: () => null }

  async function mountApp(path: string) {
    const fetchMock = stubFetch(() => ({
      status: 200,
      body: { email: 'amateur@example.com', createdAt: '', emailVerifiedAt: null, passwordChangedAt: null },
    }))
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Page },
        { path: '/login', component: Page, meta: { public: true } },
      ],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return { wrapper, fetchMock }
  }

  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken('tok')
  })

  it('une page publique n’a aucune navigation et n’appelle pas GET /account', async () => {
    const { wrapper, fetchMock } = await mountApp('/login')

    expect(wrapper.find('nav').exists()).toBe(false)
    expect(calls(fetchMock)).toEqual([])
  })

  it('une page privée affiche la navigation', async () => {
    const { wrapper } = await mountApp('/')

    expect(wrapper.findAll('nav[aria-label="Navigation principale"]')).toHaveLength(2)
  })
})
