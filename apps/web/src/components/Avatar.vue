<script setup lang="ts">
import NavIcon from './NavIcon.vue'

/** Initiale de l'email (bouton compte mobile) ou icône personne (pied de la barre latérale) ; l'icône sert aussi de repli sans profil. */
defineProps<{ variant: 'initial' | 'icon' | 'large'; initial: string | null }>()
</script>

<template>
  <span class="avatar" :class="variant" aria-hidden="true">
    <template v-if="variant !== 'icon' && initial">{{ initial }}</template>
    <NavIcon v-else name="person" />
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: var(--surface);
  color: var(--accent-secondary);
  font-weight: 600;
}

.initial {
  width: 40px;
  height: 40px;
  color: var(--text);
}

.large {
  width: 52px;
  height: 52px;
  color: var(--text);
  font-size: 1.25rem;
}

.icon {
  width: 30px;
  height: 30px;
}
</style>
