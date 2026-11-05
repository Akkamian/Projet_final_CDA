import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch, getAccessToken, onAccessTokenChange, refreshSession, setAccessToken } from '../api/client'
import { useAccountStore } from './account'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(getAccessToken())
  const isAuthenticated = computed(() => accessToken.value !== null)

  // Le client change le jeton seul (renouvellement automatique, session perdue) : le store le suit.
  onAccessTokenChange((token) => {
    accessToken.value = token
    if (token === null) useAccountStore().clear()
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

  /** Supprime le compte et ses données après confirmation du mot de passe (S35) ; l'API efface aussi le cookie de renouvellement. */
  async function deleteAccount(password: string): Promise<void> {
    await apiFetch<void>('/account', { method: 'DELETE', body: JSON.stringify({ password }) })
    setAccessToken(null)
  }

  /** L'API ferme les autres sessions et renvoie celle de cet appareil : on la garde pour ne pas être déconnecté. */
  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const result = await apiFetch<{ accessToken: string }>('/account/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setAccessToken(result.accessToken)
  }

  return { accessToken, isAuthenticated, bootstrap, login, logout, deleteAccount, changePassword }
})
