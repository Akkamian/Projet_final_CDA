<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatMargin, MOVEMENT_LABELS, STATUS_LABELS } from '../format'
import type { WatchCard } from '../stores/watches'

defineProps<{ watch: WatchCard }>()

const marginClass = (margin: string) =>
  margin.startsWith('-') ? 'margin-negative' : Number(margin) > 0 ? 'margin-positive' : ''
</script>

<template>
  <li class="card" data-test="watch-card">
    <RouterLink :to="{ name: 'watch-detail', params: { id: watch.id } }" class="card-link">
      <!-- Vignette vide : les photos arrivent avec les tâches 21 à 23 (thumbnailUrl est un nom de fichier). -->
      <span class="thumb" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="12" cy="12" r="6.5" />
          <path d="M12 9v3.2l2 1.3M9 2.5h6M9 21.5h6" stroke-linecap="round" />
        </svg>
      </span>
      <span class="body">
        <h2>{{ watch.brand }} {{ watch.model }}</h2>
        <span class="meta">
          {{ MOVEMENT_LABELS[watch.movementCode] }}
          <template v-if="watch.complicationLabels.length > 0"> · {{ watch.complicationLabels.join(', ') }}</template>
        </span>
        <span class="line">
          <span class="status" :class="`status-${watch.status}`">{{ STATUS_LABELS[watch.status] }}</span>
          <span
            v-if="watch.margin !== null"
            class="margin"
            :class="marginClass(watch.margin)"
            data-test="margin"
            :aria-label="`Marge ${formatMargin(watch.margin)}`"
          >
            {{ formatMargin(watch.margin) }}
          </span>
        </span>
      </span>
    </RouterLink>
  </li>
</template>

<style scoped>
.card {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.card-link {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  color: inherit;
  text-decoration: none;
}

.card-link:focus-visible {
  outline: 2px solid var(--accent);
  border-radius: var(--radius);
}

.card:hover {
  border-color: var(--border-strong);
}

.thumb {
  display: grid;
  flex: none;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text-secondary);
}

.body {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  min-width: 0;
}

h2 {
  margin: 0;
  font-size: 1rem;
}

.meta {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

/* Pastille de statut avec un point de couleur (le texte porte le sens, la couleur seulement l'appui). */
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-3);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  font-size: 0.8125rem;
  font-weight: 600;
}

.status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  content: '';
}

.status-in_progress::before {
  background: var(--warning);
}

.status-sold::before {
  background: var(--success);
}

.margin {
  font-weight: 600;
}

.margin-positive {
  color: var(--success);
}

.margin-negative {
  color: var(--danger-text);
}
</style>
