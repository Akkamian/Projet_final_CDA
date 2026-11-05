import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch } from '../api/client'

export interface AccountProfile {
  email: string
  createdAt: string
  emailVerifiedAt: string | null
  passwordChangedAt: string | null
}

/** Profil de la session (avatar et email de la navigation) ; vidé à la perte du jeton pour ne jamais montrer l'email d'un autre utilisateur. */
export const useAccountStore = defineStore('account', () => {
  const profile = ref<AccountProfile | null>(null)
  const email = computed(() => profile.value?.email ?? null)
  const initial = computed(() => profile.value?.email.charAt(0).toUpperCase() || null)

  /** Ne lève jamais : sans profil, la navigation reste utilisable et l'avatar affiche l'icône de repli. */
  async function load(): Promise<void> {
    try {
      profile.value = await apiFetch<AccountProfile>('/account')
    } catch {
      profile.value = null
    }
  }

  function clear(): void {
    profile.value = null
  }

  return { profile, email, initial, load, clear }
})
