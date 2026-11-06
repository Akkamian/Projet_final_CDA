import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, sentBody, stubFetch } from '../test/helpers'
import { useAuthStore } from './auth'
import { useWatchesStore } from './watches'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('bootstrap ouvre la session si le cookie est valide', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const auth = useAuthStore()

    await auth.bootstrap()

    expect(calls(fetchMock)).toEqual(['POST /auth/refresh'])
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.accessToken).toBe('tok')
  })

  it('bootstrap laisse l’utilisateur déconnecté sans cookie valide', async () => {
    stubFetch(() => ({ status: 401, body: { code: 'INVALID_SESSION' } }))
    const auth = useAuthStore()

    await auth.bootstrap()

    expect(auth.isAuthenticated).toBe(false)
  })

  it('bootstrap ne demande la session qu’une fois', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const auth = useAuthStore()

    await Promise.all([auth.bootstrap(), auth.bootstrap()])
    await auth.bootstrap()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('S2 login ouvre la session avec le jeton d’accès reçu', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    const auth = useAuthStore()

    await auth.login('foo@bar.fr', 'password123')

    expect(calls(fetchMock)).toEqual(['POST /auth/login'])
    expect(sentBody(fetchMock, 0)).toEqual({ email: 'foo@bar.fr', password: 'password123' })
    expect(auth.isAuthenticated).toBe(true)
  })

  it('login propage l’erreur de l’API et reste déconnecté', async () => {
    stubFetch(() => ({ status: 403, body: { code: 'EMAIL_NOT_VERIFIED', message: 'Adresse non vérifiée' } }))
    const auth = useAuthStore()

    await expect(auth.login('foo@bar.fr', 'password123')).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout prévient l’API puis efface la session', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname === '/auth/login' ? { status: 200, body: { accessToken: 'tok' } } : { status: 204 },
    )
    const auth = useAuthStore()
    await auth.login('foo@bar.fr', 'password123')

    await auth.logout()

    expect(calls(fetchMock)).toEqual(['POST /auth/login', 'POST /auth/logout'])
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout efface la session même si l’API est injoignable', async () => {
    const auth = useAuthStore()
    stubFetch(() => ({ status: 200, body: { accessToken: 'tok' } }))
    await auth.login('foo@bar.fr', 'password123')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('réseau coupé')
      }),
    )

    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
  })

  it('la session se ferme quand le renouvellement échoue en cours d’usage', async () => {
    const auth = useAuthStore()
    stubFetch((url) =>
      url.pathname === '/auth/login' ? { status: 200, body: { accessToken: 'tok' } } : { status: 401, body: {} },
    )
    await auth.login('foo@bar.fr', 'password123')
    expect(auth.isAuthenticated).toBe(true)

    const { apiFetch } = await import('../api/client')
    await apiFetch('/complications').catch(() => undefined)

    expect(auth.isAuthenticated).toBe(false)
  })

  it('la déconnexion vide le tableau de bord : filtres et montres du précédent utilisateur ne passent pas au suivant', async () => {
    const auth = useAuthStore()
    const watches = useWatchesStore()
    stubFetch((url) =>
      url.pathname === '/watches'
        ? { status: 200, body: { items: [], counts: { all: 3, in_progress: 0, completed: 0, sold: 3, no_project: 0 }, total: 3, page: 1, pageSize: 8, totalMargin: '60.00' } }
        : { status: 200, body: { accessToken: 'tok' } },
    )
    await auth.login('foo@bar.fr', 'password123')
    await watches.list({ q: 'rolex', status: 'sold' })
    expect(watches.params.q).toBe('rolex')

    await auth.logout()

    expect(watches.params).toEqual({ status: null, q: '', sort: null, order: 'desc', page: 1 })
    expect(watches.counts.all).toBe(0)
    expect(watches.totalMargin).toBe('0.00')
  })

  it('changePassword garde la session : le nouveau jeton d’accès renvoyé par l’API remplace l’ancien', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { accessToken: 'nouveau' } }))
    const auth = useAuthStore()
    setAccessToken('ancien')

    await auth.changePassword('ancien-mdp-1', 'nouveau-mdp-1')

    expect(calls(fetchMock)).toEqual(['PATCH /account/password'])
    expect(sentBody(fetchMock, 0)).toEqual({ currentPassword: 'ancien-mdp-1', newPassword: 'nouveau-mdp-1' })
    expect(auth.accessToken).toBe('nouveau')
  })
})
