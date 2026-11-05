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

  // Une réponse tardive (déconnexion ou chargement plus récent entre-temps) ne doit jamais remplacer l'état courant.
  let generation = 0

  /** Ne lève jamais : sans profil, la navigation reste utilisable et l'avatar affiche l'icône de repli. */
  async function load(): Promise<void> {
    const current = ++generation
    try {
      const loaded = await apiFetch<AccountProfile>('/account')
      if (current === generation) profile.value = loaded
    } catch {
      if (current === generation) profile.value = null
    }
  }

  function clear(): void {
    generation++
    profile.value = null
  }

  return { profile, email, initial, load, clear }
})
