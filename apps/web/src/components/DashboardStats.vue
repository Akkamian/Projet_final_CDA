<script setup lang="ts">
import { computed } from 'vue'
import { formatMargin } from '../format'
import type { StatusCounts } from '../stores/watches'

const props = defineProps<{ counts: StatusCounts; totalMargin: string }>()

// Les tuiles portent sur toutes les montres, quels que soient le filtre et la recherche (RG-AFF-10).
const tiles = computed(() => [
  { label: 'Montres', value: String(props.counts.all), positive: false },
  { label: 'En cours', value: String(props.counts.in_progress), positive: false },
  { label: 'Terminées', value: String(props.counts.completed), positive: false },
  { label: 'Vendues', value: String(props.counts.sold), positive: false },
  { label: 'Sans projet', value: String(props.counts.no_project), positive: false },
  { label: 'Marge cumulée', value: formatMargin(props.totalMargin), positive: Number(props.totalMargin) > 0 },
])
</script>

<template>
  <div class="stats">
    <div v-for="tile in tiles" :key="tile.label" class="tile" :class="{ positive: tile.positive }" data-test="stat">
      <span class="label">{{ tile.label }}</span>
      <span class="value tabular">{{ tile.value }}</span>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-4);
}

.tile {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.label {
  color: var(--text-secondary);
  font-size: 13px;
}

.value {
  font-size: 22px;
  font-weight: 600;
}

.positive .value {
  color: var(--success);
}

@media (max-width: 1180px) {
  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
