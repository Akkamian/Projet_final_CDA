<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError, apiFetch } from '../../api/client'

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)
const error = ref<string | null>(null)
const sentTo = ref<string | null>(null)
const resent = ref(false)
const busy = ref(false)

const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.'

// Les règles RG-CPT-03, 16 et 17 sont vérifiées ici avant tout appel ; l'API les revérifie.
function validate(): string | null {
  if (password.value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (password.value !== confirmPassword.value) return 'Les mots de passe ne correspondent pas.'
  if (!acceptTerms.value) {
    return 'Vous devez accepter les Conditions Générales de Vente et la Politique de Confidentialité.'
  }
  return null
}

async function submit() {
  error.value = validate()
  if (error.value) return
  busy.value = true
  const address = email.value.trim()
  try {
    await apiFetch<void>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: address, password: password.value, acceptTerms: true }),
    })
    sentTo.value = address
  } catch (e) {
    error.value =
      e instanceof ApiError && e.code === 'EMAIL_ALREADY_USED'
        ? 'Cette adresse est déjà utilisée par un compte.'
        : GENERIC_ERROR
  } finally {
    busy.value = false
  }
}

async function resend() {
  try {
    await apiFetch<void>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: sentTo.value }),
    })
    resent.value = true
  } catch {
    error.value = GENERIC_ERROR
  }
}
</script>

<template>
  <section class="auth-card">
    <p class="brand">Watch Restoration Tracker</p>

    <template v-if="sentTo">
      <h1>Vérifiez votre boîte mail</h1>
      <p>
        Nous avons envoyé un lien de vérification à <strong>{{ sentTo }}</strong
        >. Il est valable 24 h.
      </p>
      <p v-if="error" class="alert" role="alert">{{ error }}</p>
      <p v-if="resent" class="notice" role="status">
        Si cette adresse correspond à un compte non vérifié, un nouveau lien vient d’être envoyé.
      </p>
      <button class="btn btn-secondary" type="button" data-test="resend" @click="resend">
        Renvoyer le lien
      </button>
      <p class="switch"><RouterLink to="/login">Retour à la connexion</RouterLink></p>
    </template>

    <template v-else>
      <h1>Création de compte</h1>
      <p class="hint">Un email de vérification vous sera envoyé.</p>

      <p v-if="error" class="alert" role="alert">{{ error }}</p>

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
            autocomplete="new-password"
            maxlength="72"
            required
          />
          <span class="field-hint">8 caractères minimum.</span>
        </div>
        <div class="field">
          <label for="confirmPassword">Confirmation du mot de passe</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            maxlength="72"
            required
          />
        </div>
        <label class="choice">
          <input v-model="acceptTerms" name="acceptTerms" type="checkbox" />
          <span>
            J’ai lu et j’accepte les Conditions Générales de Vente et la Politique de Confidentialité
          </span>
        </label>
        <button class="btn" type="submit" :disabled="busy">Créer mon compte</button>
      </form>

      <p class="switch">Vous avez déjà un compte ? <RouterLink to="/login">Connexion</RouterLink></p>
    </template>
  </section>
</template>
