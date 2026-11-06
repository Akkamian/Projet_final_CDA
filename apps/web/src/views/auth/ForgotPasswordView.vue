<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError, apiFetch } from '../../api/client'
import AuthLayout from '../../components/AuthLayout.vue'

const email = ref('')
const sent = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.'

// RG-CPT-10 : la même confirmation, que l'adresse corresponde ou non à un compte.
async function submit() {
  if (busy.value) return
  error.value = null
  busy.value = true
  try {
    await apiFetch<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.value.trim() }) })
    sent.value = true
  } catch (e) {
    error.value = e instanceof ApiError && e.status === 429 ? e.message : GENERIC_ERROR
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h1>Mot de passe oublié</h1>
    <template v-if="sent">
      <p class="notice" role="status">
        Si cette adresse correspond à un compte, un email contenant un lien de réinitialisation vient d’être envoyé. Il est valable 1 h.
      </p>
    </template>
    <template v-else>
      <p class="auth-lead">Saisissez l’adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <p v-if="error" class="alert banner" role="alert">{{ error }}</p>
      <form @submit.prevent="submit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" name="email" type="email" autocomplete="email" required />
        </div>
        <button class="btn" type="submit" :disabled="busy">Envoyer le lien</button>
      </form>
    </template>
    <p class="auth-footer"><RouterLink to="/login">Retour à la connexion</RouterLink></p>
  </AuthLayout>
</template>
