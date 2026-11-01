<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, apiFetch } from '../../api/client'
import { useAuthStore } from '../../stores/auth'

type LoginError = 'invalid' | 'unverified' | 'other'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref<LoginError | null>(null)
const resent = ref(false)
const busy = ref(false)

// Seule une page de l'application est acceptée : « //site.example » ou « /\site.example » sortiraient du site.
function destination(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && /^\/(?![/\\])/.test(redirect) ? redirect : '/'
}

async function submit() {
  error.value = null
  resent.value = false
  busy.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    await router.push(destination())
  } catch (e) {
    if (e instanceof ApiError && e.code === 'INVALID_CREDENTIALS') error.value = 'invalid'
    else if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') error.value = 'unverified'
    else error.value = 'other'
  } finally {
    busy.value = false
  }
}

async function resend() {
  try {
    await apiFetch<void>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: email.value.trim() }),
    })
    resent.value = true
  } catch {
    error.value = 'other'
  }
}
</script>

<template>
  <section class="auth-card">
    <p class="brand">Watch Restoration Tracker</p>
    <h1>Bienvenue</h1>
    <p class="hint">Connectez-vous pour retrouver vos montres.</p>

    <div v-if="error === 'invalid'" class="alert" role="alert">
      <p>Adresse email ou mot de passe incorrect.</p>
    </div>
    <div v-else-if="error === 'unverified'" class="alert" role="alert">
      <p><strong>Votre adresse n’est pas encore vérifiée.</strong></p>
      <p>Ouvrez le lien reçu par email pour vous connecter. Il est valable 24 h.</p>
    </div>
    <div v-else-if="error === 'other'" class="alert" role="alert">
      <p>Une erreur est survenue. Réessayez dans un instant.</p>
    </div>

    <form @submit.prevent="submit">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="email" name="email" type="email" autocomplete="email" required />
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <button class="btn" type="submit" :disabled="busy">Connexion</button>
    </form>

    <template v-if="error === 'unverified'">
      <button class="btn btn-secondary" type="button" data-test="resend" @click="resend">
        Renvoyer le lien de vérification
      </button>
    </template>
    <p v-if="resent" class="notice" role="status">
      Si cette adresse correspond à un compte non vérifié, un nouveau lien vient d’être envoyé.
    </p>

    <p class="switch">Pas encore de compte ? <RouterLink to="/register">Créer un compte</RouterLink></p>
  </section>
</template>
