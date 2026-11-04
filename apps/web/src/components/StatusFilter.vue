<script setup lang="ts">
import { STATUS_LABELS } from '../format'
import type { DashboardStatus, StatusCounts } from '../stores/watches'

defineProps<{ counts: StatusCounts; selected: DashboardStatus | null }>()
defineEmits<{ select: [status: DashboardStatus | null] }>()

const statuses = Object.keys(STATUS_LABELS) as DashboardStatus[]
</script>

<template>
  <div class="filter" data-test="status-filter" role="group" aria-label="Filtrer par statut">
    <button type="button" :aria-pressed="selected === null" @click="$emit('select', null)">
      Toutes <span class="count">{{ counts.all }}</span>
    </button>
    <button
      v-for="status in statuses"
      :key="status"
      type="button"
      :aria-pressed="selected === status"
      @click="$emit('select', status)"
    >
      {{ STATUS_LABELS[status] }} <span class="count">{{ counts[status] }}</span>
    </button>
  </div>
</template>

<style scoped>
.filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

button {
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}

.count {
  margin-left: var(--space-1);
  font-weight: 600;
}
</style>
