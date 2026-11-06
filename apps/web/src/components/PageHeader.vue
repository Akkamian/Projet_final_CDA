<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

/** Barre du haut d'un écran : barre d'application sous 640 px, barre collante à partir de 640 px. Premier utilisateur : le tableau de bord (sous-projet B). */
/** `parent` : fil d'Ariane à partir de 640 px (« Tableau de bord / Seiko 6119-8100 »), qui remplace alors le bouton retour. */
defineProps<{ title: string; subtitle?: string; back?: RouteLocationRaw; parent?: { label: string; to: RouteLocationRaw } }>()
</script>

<template>
  <header class="page-header" :class="{ 'has-parent': parent }">
    <RouterLink v-if="back" class="back" :to="back" aria-label="Retour">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </RouterLink>
    <nav v-if="parent" class="crumb" aria-label="Fil d’Ariane">
      <RouterLink :to="parent.to">{{ parent.label }}</RouterLink>
      <span aria-hidden="true">/</span>
    </nav>
    <div class="titles">
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="subtitle tabular" data-test="subtitle" aria-live="polite">{{ subtitle }}</p>
    </div>
    <div class="actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
}

.back {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--touch-min);
  height: var(--touch-min);
  color: var(--text);
}

.crumb {
  display: none;
}

.titles {
  flex: 1;
  min-width: 0;
}

h1 {
  margin: 0;
  overflow: hidden;
  font-size: 17px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-3);
}

@media (min-width: 640px) {
  .page-header {
    position: sticky;
    top: 0;
    z-index: 1;
    min-height: var(--topbar-h);
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--border);
    background: var(--page-bg);
  }

  h1 {
    font-size: 18px;
  }

  .has-parent .back {
    display: none;
  }

  .crumb {
    display: flex;
    flex: none;
    gap: var(--space-2);
    margin-right: calc(var(--space-2) * -1);
    color: var(--text-secondary);
    font-size: 14px;
  }

  .crumb a {
    color: inherit;
    text-decoration: none;
  }

  .crumb a:hover {
    color: var(--text);
  }
}
</style>
