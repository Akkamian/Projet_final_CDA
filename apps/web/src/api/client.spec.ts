import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calls, stubFetch } from '../test/helpers'
import { ApiError, apiFetch, fileUrl, getAccessToken, setAccessToken } from './client'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('ajoute le jeton d’accès et envoie les cookies', async () => {
    setAccessToken('tok')
    const fetchMock = stubFetch(() => ({ status: 200, body: { ok: true } }))

    await expect(apiFetch('/movement-types')).resolves.toEqual({ ok: true })

    const init = fetchMock.mock.calls[0]![1]!
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok')
    expect(init.credentials).toBe('include')
  })

  it('n’envoie pas d’en-tête Authorization sans session', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: [] }))
    await apiFetch('/health')
    expect(new Headers(fetchMock.mock.calls[0]![1]!.headers).has('Authorization')).toBe(false)
  })

  it('apiFetch rejoue la requête après un refresh réussi sur 401', async () => {
    setAccessToken('old')
    const fetchMock = stubFetch((url, init) => {
      if (url.pathname === '/auth/refresh') return { status: 200, body: { accessToken: 'new' } }
      const bearer = new Headers(init.headers).get('Authorization')
      return bearer === 'Bearer new' ? { status: 200, body: ['ok'] } : { status: 401, body: {} }
    })

    await expect(apiFetch('/complications')).resolves.toEqual(['ok'])

    expect(calls(fetchMock)).toEqual(['GET /complications', 'POST /auth/refresh', 'GET /complications'])
    expect(getAccessToken()).toBe('new')
  })

  it('apiFetch ne boucle pas si le refresh échoue', async () => {
    setAccessToken('old')
    const fetchMock = stubFetch(() => ({ status: 401, body: { code: 'UNAUTHENTICATED', message: 'Connexion requise' } }))

    await expect(apiFetch('/complications')).rejects.toMatchObject({ status: 401 })

    expect(calls(fetchMock)).toEqual(['GET /complications', 'POST /auth/refresh'])
    expect(getAccessToken()).toBeNull()
  })

  it('apiFetch ne tente qu’un refresh quand la requête rejouée échoue encore en 401', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname === '/auth/refresh' ? { status: 200, body: { accessToken: 'new' } } : { status: 401, body: {} },
    )

    await expect(apiFetch('/complications')).rejects.toMatchObject({ status: 401 })

    expect(calls(fetchMock)).toEqual(['GET /complications', 'POST /auth/refresh', 'GET /complications'])
  })

  it('apiFetch partage un seul refresh entre des requêtes simultanées', async () => {
    const fetchMock = stubFetch((url, init) => {
      if (url.pathname === '/auth/refresh') return { status: 200, body: { accessToken: 'new' } }
      return new Headers(init.headers).get('Authorization') === 'Bearer new'
        ? { status: 200, body: [] }
        : { status: 401, body: {} }
    })

    await Promise.all([apiFetch('/movement-types'), apiFetch('/complications')])

    expect(calls(fetchMock).filter((c) => c === 'POST /auth/refresh')).toHaveLength(1)
  })

  it('une réponse 401 de /auth/login (identifiants invalides) ne déclenche pas de refresh', async () => {
    const fetchMock = stubFetch(() => ({ status: 401, body: { code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect' } }))

    await expect(apiFetch('/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })

    expect(calls(fetchMock)).toEqual(['POST /auth/login'])
  })

  it('lève une ApiError portant le statut, le code et le message du serveur', async () => {
    stubFetch(() => ({ status: 409, body: { statusCode: 409, code: 'EMAIL_ALREADY_USED', message: 'Adresse déjà utilisée' } }))

    const error = await apiFetch('/auth/register', { method: 'POST', body: '{}' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_ALREADY_USED', message: 'Adresse déjà utilisée' })
  })

  it('assemble les messages de validation (tableau Nest) en un seul texte', async () => {
    stubFetch(() => ({
      status: 400,
      body: { statusCode: 400, message: ['La marque est obligatoire', 'Le modèle est obligatoire'], error: 'Bad Request' },
    }))

    await expect(apiFetch('/watches', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 400,
      message: 'La marque est obligatoire ; Le modèle est obligatoire',
    })
  })

  it('lève une ApiError même si le corps de l’erreur n’est pas du JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('pas du JSON')
        },
      })),
    )

    await expect(apiFetch('/complications')).rejects.toMatchObject({ status: 502, code: undefined })
  })

  it('envoie un corps texte en JSON et accepte une réponse 204 sans corps', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))

    await expect(apiFetch('/auth/verify-email', { method: 'POST', body: '{"token":"t"}' })).resolves.toBeUndefined()

    expect(new Headers(fetchMock.mock.calls[0]![1]!.headers).get('Content-Type')).toBe('application/json')
  })
})

describe('fileUrl', () => {
  it('préfixe une URL relative par l’origine de l’API (le front est servi ailleurs)', () => {
    expect(fileUrl('/uploads/abc.png')).toMatch(/^https?:\/\/[^/]+\/uploads\/abc\.png$/)
  })

  it('laisse une URL absolue (stockage S3) telle quelle', () => {
    expect(fileUrl('https://s3.example.test/photos/abc.png')).toBe('https://s3.example.test/photos/abc.png')
  })
})
