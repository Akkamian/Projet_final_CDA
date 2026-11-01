import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch, getAccessToken, onAccessTokenChange, refreshSession, setAccessToken } from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(getAccessToken())
  const isAuthenticated = computed(() => accessToken.value !== null)

  // Le client change le jeton seul (renouvellement automatique, session perdue) : le store le suit.
  onAccessTokenChange((token) => {
    accessToken.value = token
  })

  let bootstrapping: Promise<void> | null = null

  /** Rouvre la session grâce au cookie de renouvellement ; ne s'exécute qu'une fois, au premier chargement. */
  function bootstrap(): Promise<void> {
    bootstrapping ??= refreshSession().then(() => undefined)
    return bootstrapping
  }

  async function login(email: string, password: string): Promise<void> {
    const result = await apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(result.accessToken)
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' })
    } catch {
      // Même si l'API ne répond pas, l'utilisateur est déconnecté de cet écran.
    }
    setAccessToken(null)
  }

  return { accessToken, isAuthenticated, bootstrap, login, logout }
})
