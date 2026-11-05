import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, stubFetch } from '../test/helpers'
import { useAccountStore } from './account'
import { useAuthStore } from './auth'

const PROFILE = {
  email: 'amateur@example.com',
  createdAt: '2026-03-01T10:00:00.000Z',
  emailVerifiedAt: '2026-03-04T10:00:00.000Z',
  passwordChangedAt: null,
}

describe('account store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('load lit GET /account et expose l’email et l’initiale en majuscule', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: PROFILE }))
    const account = useAccountStore()

    await account.load()

    expect(calls(fetchMock)).toEqual(['GET /account'])
    expect(account.email).toBe('amateur@example.com')
    expect(account.initial).toBe('A')
  })

  it('un échec de chargement laisse email et initiale à null sans lever', async () => {
    stubFetch(() => ({ status: 500, body: { message: 'Erreur interne' } }))
    const account = useAccountStore()

    await expect(account.load()).resolves.toBeUndefined()

    expect(account.email).toBeNull()
    expect(account.initial).toBeNull()
  })

  it('clear vide le profil', async () => {
    stubFetch(() => ({ status: 200, body: PROFILE }))
    const account = useAccountStore()
    await account.load()

    account.clear()

    expect(account.email).toBeNull()
  })

  it('la perte du jeton vide le profil : l’email d’un utilisateur ne reste pas pour le suivant', async () => {
    stubFetch(() => ({ status: 200, body: PROFILE }))
    useAuthStore()
    const account = useAccountStore()
    await account.load()
    expect(account.email).toBe('amateur@example.com')

    setAccessToken(null)

    expect(account.email).toBeNull()
  })
})
