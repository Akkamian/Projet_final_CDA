<script setup lang="ts">
import { STATUS_LABELS } from '../format'
import type { DashboardStatus, StatusCounts } from '../stores/watches'

defineProps<{ counts: StatusCounts; selected: DashboardStatus | null }>()
defineEmits<{ select: [status: DashboardStatus | null] }>()

const statuses = Object.keys(STATUS_LABELS) as DashboardStatus[]
</script>

<template>
  <!-- Une seule ligne de pastilles qui défile horizontalement (maquette « filtre par statut »). -->
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
  gap: var(--space-2);
  padding-bottom: var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
}

.filter::-webkit-scrollbar {
  display: none;
}

button {
  flex: none;
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--accent-secondary);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.count {
  margin-left: var(--space-1);
  font-weight: 600;
}
</style>
