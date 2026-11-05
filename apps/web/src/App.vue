<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'

// Les pages publiques (connexion, inscription…) n'ont pas de navigation ; toutes les autres sont dans la coque.
const route = useRoute()
const showShell = computed(() => route.matched.length > 0 && !route.meta.public)
</script>

<template>
  <AppShell v-if="showShell"><RouterView /></AppShell>
  <div v-else class="app"><RouterView /></div>
</template>
