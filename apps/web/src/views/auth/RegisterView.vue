<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError, apiFetch } from '../../api/client'
import AuthLayout from '../../components/AuthLayout.vue'
import PasswordField from '../../components/PasswordField.vue'

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
  <AuthLayout>
    <template v-if="sentTo">
      <div class="confirm-badge" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5" />
          <path d="M3.5 7l8.5 6 8.5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h1>Vérifiez votre boîte mail</h1>
      <p>
        Nous avons envoyé un lien de vérification à <strong>{{ sentTo }}</strong
        >. Il est valable 24 h.
      </p>
      <p v-if="error" class="alert banner" role="alert">{{ error }}</p>
      <p v-if="resent" class="notice" role="status">
        Si cette adresse correspond à un compte non vérifié, un nouveau lien vient d’être envoyé.
      </p>
      <button class="btn btn-secondary" type="button" data-test="resend" @click="resend">
        Renvoyer le lien
      </button>
      <p class="auth-footer"><RouterLink to="/login">Retour à la connexion</RouterLink></p>
    </template>

    <template v-else>
      <h1>Création de compte</h1>
      <p class="auth-lead">Un email de vérification vous sera envoyé.</p>

      <p v-if="error" class="alert banner" role="alert">{{ error }}</p>

      <form @submit.prevent="submit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" name="email" type="email" autocomplete="email" required />
        </div>
        <PasswordField
          id="password"
          v-model="password"
          name="password"
          label="Mot de passe"
          autocomplete="new-password"
          :maxlength="72"
          hint="8 caractères minimum."
          required
        />
        <PasswordField
          id="confirmPassword"
          v-model="confirmPassword"
          name="confirmPassword"
          label="Confirmation du mot de passe"
          autocomplete="new-password"
          :maxlength="72"
          required
        />
        <label class="choice">
          <input v-model="acceptTerms" name="acceptTerms" type="checkbox" />
          <span>
            J’ai lu et j’accepte les Conditions Générales de Vente et la Politique de Confidentialité
          </span>
        </label>
        <button class="btn" type="submit" :disabled="busy">Créer mon compte</button>
      </form>

      <p class="auth-footer">Vous avez déjà un compte ? <RouterLink to="/login">Connexion</RouterLink></p>
    </template>
  </AuthLayout>
</template>
