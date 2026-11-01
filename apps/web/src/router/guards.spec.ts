import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setAccessToken } from '../api/client'
import { stubFetch } from '../test/helpers'
import { authGuard } from './guards'

const Empty = { template: '<div />' }

function makeGuardedRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/login', name: 'login', component: Empty, meta: { public: true } },
      { path: '/register', name: 'register', component: Empty, meta: { public: true } },
    ],
  })
  router.beforeEach(authGuard)
  return router
}

describe('garde de route', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('RG-SEC-03 une page privée sans session redirige vers /login en gardant la destination', async () => {
    stubFetch(() => ({ status: 401, body: {} }))
    const router = makeGuardedRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/')
  })

  it('une page publique reste accessible sans session', async () => {
    stubFetch(() => ({ status: 401, body: {} }))
    const router = makeGuardedRouter()

    await router.push('/register')

    expect(router.currentRoute.value.name).toBe('register')
  })

  it('une page privée s’ouvre quand le cookie de renouvellement est valide', async () => {
    stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const router = makeGuardedRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('home')
  })
})
