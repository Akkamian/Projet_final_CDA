<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, apiFetch } from '../../api/client'

type State = 'loading' | 'verified' | 'invalid' | 'error'

const route = useRoute()
const state = ref<State>('loading')

// Le lien de l'email est /verify-email?token=… (24 h, usage unique).
onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || token === '') {
    state.value = 'invalid'
    return
  }
  try {
    await apiFetch<void>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
    state.value = 'verified'
  } catch (e) {
    state.value = e instanceof ApiError && e.code === 'INVALID_LINK' ? 'invalid' : 'error'
  }
})
</script>

<template>
  <section class="auth-card">
    <p class="brand">Watch Restoration Tracker</p>

    <p v-if="state === 'loading'" role="status">Vérification de votre adresse…</p>

    <template v-else-if="state === 'verified'">
      <h1>Adresse vérifiée</h1>
      <p>Votre compte est activé. Vous pouvez maintenant vous connecter.</p>
      <RouterLink class="btn" to="/login">Connexion</RouterLink>
    </template>

    <template v-else>
      <h1>Vérification de l’adresse</h1>
      <p v-if="state === 'invalid'" class="alert" role="alert">
        Ce lien est invalide ou a expiré. Connectez-vous pour recevoir un nouveau lien.
      </p>
      <p v-else class="alert" role="alert">Une erreur est survenue. Réessayez dans un instant.</p>
      <p class="switch"><RouterLink to="/login">Retour à la connexion</RouterLink></p>
    </template>
  </section>
</template>
