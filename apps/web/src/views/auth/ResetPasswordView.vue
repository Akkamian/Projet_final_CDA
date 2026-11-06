<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, apiFetch } from '../../api/client'
import AuthLayout from '../../components/AuthLayout.vue'
import PasswordField from '../../components/PasswordField.vue'

const route = useRoute()
// Le lien de l'email est /reset-password?token=… (1 h, usage unique).
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirmPassword = ref('')
const error = ref<string | null>(null)
const invalidLink = ref(token.value === '')
const done = ref(false)
const busy = ref(false)

const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.'

// RG-CPT-03 est vérifié ici avant tout appel ; l'API le revérifie.
function validate(): string | null {
  if (password.value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (password.value !== confirmPassword.value) return 'Les mots de passe ne correspondent pas.'
  return null
}

async function submit() {
  if (busy.value) return
  error.value = validate()
  if (error.value) return
  busy.value = true
  try {
    await apiFetch<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: token.value, password: password.value }),
    })
    done.value = true
  } catch (e) {
    if (e instanceof ApiError && e.code === 'INVALID_LINK') invalidLink.value = true
    else error.value = GENERIC_ERROR
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <template v-if="done">
      <h1>Mot de passe modifié</h1>
      <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
      <RouterLink class="btn" to="/login">Connexion</RouterLink>
    </template>
    <template v-else-if="invalidLink">
      <h1>Nouveau mot de passe</h1>
      <p class="alert banner" role="alert">Ce lien est invalide ou a expiré. Demandez-en un nouveau.</p>
      <RouterLink class="btn" to="/forgot-password">Demander un nouveau lien</RouterLink>
    </template>
    <template v-else>
      <h1>Nouveau mot de passe</h1>
      <p v-if="error" class="alert banner" role="alert">{{ error }}</p>
      <form @submit.prevent="submit">
        <PasswordField
          id="password"
          v-model="password"
          name="password"
          label="Nouveau mot de passe"
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
        <button class="btn" type="submit" :disabled="busy">Modifier le mot de passe</button>
      </form>
    </template>
  </AuthLayout>
</template>
