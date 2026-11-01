<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <h1>Watch Restoration Tracker</h1>
  <p><RouterLink to="/apercu-etapes">Aperçu des étapes d’une restauration</RouterLink></p>
  <p v-if="auth.isAuthenticated"><button type="button" @click="logout">Se déconnecter</button></p>
</template>
