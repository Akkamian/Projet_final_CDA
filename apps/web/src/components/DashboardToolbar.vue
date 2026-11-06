<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { STATUS_LABELS } from '../format'
import type { DashboardStatus } from '../stores/watches'
import SearchField from './SearchField.vue'

defineProps<{ query: string; status: DashboardStatus | null }>()
const emit = defineEmits<{ 'update:query': [value: string]; 'update:status': [value: DashboardStatus | null] }>()

const statuses = Object.keys(STATUS_LABELS) as DashboardStatus[]
</script>

<template>
  <div class="toolbar">
    <SearchField class="search" :model-value="query" @update:model-value="emit('update:query', $event)" />
    <select
      aria-label="Statut"
      :value="status ?? ''"
      @change="emit('update:status', (($event.target as HTMLSelectElement).value || null) as DashboardStatus | null)"
    >
      <option value="">Tous</option>
      <option v-for="value in statuses" :key="value" :value="value">{{ STATUS_LABELS[value] }}</option>
    </select>
    <RouterLink class="btn new" to="/watches/new"> <span aria-hidden="true">+</span> Nouvelle montre </RouterLink>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.search {
  width: 260px;
}

select {
  min-height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 14px;
}

.new {
  width: auto;
  min-height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .search {
    width: 160px;
  }
}
</style>
