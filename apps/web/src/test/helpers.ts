import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { vi } from 'vitest'

export interface StubResponse {
  status: number
  body?: unknown
}

export type StubHandler = (url: URL, init: RequestInit) => StubResponse | Promise<StubResponse>

/** Remplace `fetch` : le gestionnaire reçoit l'URL et les options, et répond par un statut et un corps JSON. */
export function stubFetch(handler: StubHandler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const { status, body } = await handler(new URL(String(input)), init)
    return { ok: status >= 200 && status < 300, status, json: async () => body }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Chemins appelés, dans l'ordre (ex. `POST /auth/login`). */
export function calls(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls.map(([input, init]) => `${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`)
}

/** Corps JSON envoyé par l'appel numéro `index` du mock. */
export function sentBody(fetchMock: ReturnType<typeof stubFetch>, index: number): unknown {
  return JSON.parse(String(fetchMock.mock.calls[index]![1]?.body))
}

const Empty = { template: '<div />' }

/** Routeur en mémoire avec les routes d'authentification, pour monter une vue seule. */
export async function makeRouter(initial: string, extra: RouteRecordRaw[] = []) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/login', name: 'login', component: Empty },
      { path: '/register', name: 'register', component: Empty },
      { path: '/verify-email', name: 'verify-email', component: Empty },
      ...extra,
    ],
  })
  await router.push(initial)
  await router.isReady()
  return router
}
