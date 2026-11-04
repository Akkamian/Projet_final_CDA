<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatMoney, MOVEMENT_LABELS, STATUS_LABELS } from '../format'
import type { WatchCard } from '../stores/watches'

defineProps<{ watch: WatchCard }>()
</script>

<template>
  <li class="card" data-test="watch-card">
    <RouterLink :to="{ name: 'watch-detail', params: { id: watch.id } }" class="card-link">
      <h2>{{ watch.brand }} {{ watch.model }}</h2>
      <p class="meta">
        {{ MOVEMENT_LABELS[watch.movementCode] }}
        <template v-if="watch.complicationLabels.length > 0"> · {{ watch.complicationLabels.join(', ') }}</template>
      </p>
      <p class="line">
        <span class="status" :class="`status-${watch.status}`">{{ STATUS_LABELS[watch.status] }}</span>
        <span v-if="watch.margin !== null" class="margin">Marge : {{ formatMoney(watch.margin) }}</span>
      </p>
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
  display: block;
  padding: var(--space-4);
  color: inherit;
  text-decoration: none;
}

.card-link:hover,
.card-link:focus-visible {
  outline: 2px solid var(--accent);
  border-radius: var(--radius);
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: 1.0625rem;
}

.meta {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.status {
  padding: 0 var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
}

.status-in_progress {
  border-color: var(--accent);
  color: var(--accent-text);
}

.status-sold {
  border-color: var(--accent-warm);
  color: var(--accent-warm-text);
}

.margin {
  font-weight: 600;
}
</style>
