<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, formatMargin, formatMoney, formatRate } from '../format'
import type { ProjectDetail, WatchDetail } from '../stores/watches'

const props = defineProps<{ watch: WatchDetail; project: ProjectDetail | null }>()

const NONE = '—'

const sold = computed(() => props.watch.resaleDate !== null)

// Prix et date d'un fait : « 120 € · 02/07/2026 », ou « — » quand ni l'un ni l'autre n'est connu (jamais « null »).
function priceAndDate(price: string | null, date: string | null): string {
  const parts = [price === null ? null : formatMoney(price), date === null ? null : formatDate(date)].filter((p) => p !== null)
  return parts.length === 0 ? NONE : parts.join(' · ')
}

const progress = computed(() => {
  const steps = props.project?.steps
  return steps ? `${steps.filter((s) => s.isCompleted).length}/${steps.length}` : NONE
})

const lastMeasure = computed(() => {
  const list = [...(props.project?.measurements ?? [])].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id - b.id)
  const last = list[list.length - 1]
  return last ? `${formatRate(last.rateSecondsPerDay)} s/j` : NONE
})

const facts = computed(() => {
  const w = props.watch
  const common = [
    { label: 'Achat', value: priceAndDate(w.purchasePrice, w.purchaseDate) },
    { label: 'Coût de revient', value: w.costPrice === null ? NONE : formatMoney(w.costPrice) },
  ]
  return sold.value
    ? [
        ...common,
        { label: 'Revente', value: priceAndDate(w.resalePrice, w.resaleDate) },
        { label: 'Marge', value: w.margin === null ? NONE : formatMargin(w.margin) },
      ]
    : [...common, { label: 'Progression', value: progress.value }, { label: 'Dernière mesure', value: lastMeasure.value }]
})
</script>

<template>
  <dl class="facts">
    <div v-for="fact in facts" :key="fact.label" class="fact" data-test="fact">
      <dt>{{ fact.label }}</dt>
      <dd class="tabular">{{ fact.value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

@media (min-width: 900px) {
  .facts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Valeur puis libellé (comme les tuiles du tableau de bord) ; le DOM garde le libellé d'abord. */
.fact {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  min-width: 0;
}

dt {
  color: var(--text-secondary);
  font-size: 12px;
}

dd {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
