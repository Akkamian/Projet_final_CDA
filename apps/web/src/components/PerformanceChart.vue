<script setup lang="ts">
// Import ciblé (D7) : seuls les éléments d'un graphique en lignes entrent dans le bundle.
import { CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatDate } from '../format'
import type { MeasurementDetail } from '../stores/watches'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

const props = defineProps<{ measurements: MeasurementDetail[] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

// RG-PER-04 : ordre chronologique, à date égale l'ordre de saisie.
const sorted = computed(() => [...props.measurements].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id - b.id))

// Les trois grandeurs n'ont pas la même unité : chacune a son axe, seul celui de la marche est affiché (les valeurs sont dans l'infobulle).
const series = [
  { label: 'Marche (s/j)', color: '--accent', key: 'rateSecondsPerDay', axis: 'y' },
  { label: 'Beat error (ms)', color: '--warning', key: 'beatErrorMs', axis: 'y1' },
  { label: 'Amplitude (°)', color: '--success', key: 'amplitudeDegrees', axis: 'y2' },
] as const

// Le canvas ne lit pas les variables CSS : on les résout une fois pour rester alignés sur les jetons du thème.
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined

function config() {
  const grid = token('--border')
  const text = token('--text-secondary')
  return {
    type: 'line' as const,
    data: {
      labels: sorted.value.map((m) => formatDate(m.measuredAt)),
      datasets: series.map((s) => ({
        label: s.label,
        data: sorted.value.map((m) => Number(m[s.key])),
        borderColor: token(s.color),
        backgroundColor: token(s.color),
        yAxisID: s.axis,
        tension: 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: grid }, ticks: { color: text } },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          title: { display: true, text: 's/j', color: text },
          grid: { color: grid },
          ticks: { color: text },
        },
        y1: { type: 'linear' as const, display: false, min: 0 },
        y2: { type: 'linear' as const, display: false },
      },
    },
  }
}

onMounted(() => {
  if (canvas.value) chart = new Chart(canvas.value, config())
})
// Les mesures changent (ajout, correction, suppression) : le graphique est reconstruit avec les nouvelles séries.
watch(sorted, () => {
  chart?.destroy()
  chart = canvas.value ? new Chart(canvas.value, config()) : null
})
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div class="chart-wrap">
    <canvas ref="canvas" role="img" aria-label="Évolution de la marche, du beat error et de l’amplitude au fil des mesures"></canvas>
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  height: 220px;
}
</style>
