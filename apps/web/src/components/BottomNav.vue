<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isHomeActive } from '../navigation'
import NavIcon from './NavIcon.vue'

const route = useRoute()

// « Nouveau projet » est une action (pastille « + »), jamais une page active ; « Recherche » non plus.
const entries = computed(() => [
  { label: 'Accueil', to: '/', icon: 'home' as const, active: isHomeActive(route.path), add: false },
  { label: 'Recherche', to: '/?recherche=1', icon: 'search' as const, active: false, add: false },
  { label: 'Nouveau projet', to: '/watches/new', icon: 'plus' as const, active: false, add: true },
])
</script>

<template>
  <nav class="bottomnav" aria-label="Navigation principale">
    <RouterLink v-for="entry in entries" :key="entry.label" v-slot="{ href, navigate }" :to="entry.to" custom>
      <a :href="href" :aria-current="entry.active ? 'page' : undefined" :class="{ active: entry.active }" @click="navigate">
        <span v-if="entry.add" class="add"><NavIcon :name="entry.icon" /></span>
        <NavIcon v-else :name="entry.icon" />
        <span class="label">{{ entry.label }}</span>
      </a>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottomnav {
  display: flex;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

a {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 60px;
  padding: var(--space-2) 0;
  color: var(--text-secondary);
  font-size: 12px;
  text-decoration: none;
}

a.active {
  color: var(--text);
}

/* Filet d'accent en haut de l'entrée active, sur 40 % de sa largeur. */
a.active::before {
  content: '';
  position: absolute;
  top: -1px;
  right: 30%;
  left: 30%;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: var(--accent);
}

.add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--accent-ink);
}
</style>
