<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, formatDelta, formatMeasure, formatRate } from '../format'
import { useWatchesStore, type MeasurementDetail } from '../stores/watches'
import { errorMessage } from '../utils/today'
import ConfirmDialog from './ConfirmDialog.vue'
import MeasurementForm from './MeasurementForm.vue'
import PerformanceScales from './PerformanceScales.vue'

const props = defineProps<{ projectId: number; measurements: MeasurementDetail[] }>()
const emit = defineEmits<{ 'update:measurements': [value: MeasurementDetail[]] }>()

const watches = useWatchesStore()
// `adding` : formulaire de saisie ; `editing` : mesure en cours de correction ; `removing` : mesure à confirmer.
const adding = ref(false)
const editing = ref<MeasurementDetail | null>(null)
const removing = ref<MeasurementDetail | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
// Choix de l'utilisateur pour le filtre de position : undefined = pas encore choisi, null = « Toutes ».
const choice = ref<string | null | undefined>(undefined)

const chronological = (list: MeasurementDetail[]) => [...list].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id - b.id)

// Positions présentes, de la plus fréquente à la moins fréquente : une pastille par position.
const positions = computed(() => {
  const counts = new Map<string, number>()
  for (const m of props.measurements) if (m.watchPosition) counts.set(m.watchPosition, (counts.get(m.watchPosition) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

// Comme la maquette, les échelles comparent par défaut la position la plus fréquente : une première mesure en « Cadran haut » ne se compare
// pas à une dernière mesure en « Couronne à gauche ». Une position qui n'existe plus (mesure supprimée ou corrigée) revient à ce défaut.
const position = computed<string | null>(() => {
  const chosen = choice.value
  if (chosen === null) return null
  if (chosen !== undefined && positions.value.some((p) => p.name === chosen)) return chosen
  return positions.value[0]?.name ?? null
})

// Seules les échelles sont filtrées : le tableau garde toutes les mesures (une mesure qu'on vient d'ajouter doit toujours s'y voir).
const compared = computed(() =>
  position.value === null ? props.measurements : props.measurements.filter((m) => m.watchPosition === position.value),
)

// L'écart de marche se calcule avec la mesure précédente à la même position, sur toutes les mesures (pas seulement celles du filtre).
const deltas = computed(() => {
  const last = new Map<string, string>()
  const result = new Map<number, string | null>()
  for (const m of chronological(props.measurements)) {
    const previous = m.watchPosition ? (last.get(m.watchPosition) ?? null) : null
    result.set(m.id, formatDelta(m.rateSecondsPerDay, previous))
    if (m.watchPosition) last.set(m.watchPosition, m.rateSecondsPerDay)
  }
  return result
})

const rateText = (m: MeasurementDetail) => {
  const delta = deltas.value.get(m.id)
  return delta ? `${formatRate(m.rateSecondsPerDay)} (${delta})` : formatRate(m.rateSecondsPerDay)
}

// La liste montre toutes les mesures, les plus récentes d'abord (RG-PER-04) ; les échelles reçoivent celles du filtre.
const latestFirst = computed(() => chronological(props.measurements).reverse())

function saved(m: MeasurementDetail): void {
  const next = editing.value ? props.measurements.map((x) => (x.id === m.id ? m : x)) : [...props.measurements, m]
  emit('update:measurements', chronological(next))
  adding.value = false
  editing.value = null
  error.value = null
}

async function confirmRemove(): Promise<void> {
  const target = removing.value
  if (!target || busy.value) return
  busy.value = true
  error.value = null
  try {
    await watches.removeMeasurement(props.projectId, target.id)
    emit(
      'update:measurements',
      props.measurements.filter((m) => m.id !== target.id),
    )
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
    // Le dialogue se ferme aussi en cas d'échec : l'alerte, derrière un dialogue modal, resterait invisible.
    removing.value = null
  }
}
</script>

<template>
  <section class="performance">
    <div class="header">
      <h3>Performances du mouvement</h3>
      <button v-if="!adding && !editing" type="button" class="ghost" data-test="measurement-add" @click="adding = true">+ Mesure</button>
    </div>

    <MeasurementForm
      v-if="adding || editing"
      :key="editing?.id ?? 'new'"
      :project-id="projectId"
      :measurement="editing ?? undefined"
      @saved="saved"
      @cancel="((adding = false), (editing = null))"
    />

    <p v-if="measurements.length === 0" class="hint">Aucune mesure : ajoutez un relevé au timegrapher pour suivre l’évolution.</p>
    <template v-else>
      <div v-if="positions.length > 0" class="pos-filter" role="group" aria-label="Position de mesure">
        <button type="button" class="pos-chip" data-test="position-chip" :aria-pressed="position === null" @click="choice = null">
          Toutes
        </button>
        <button
          v-for="p in positions"
          :key="p.name"
          type="button"
          class="pos-chip"
          data-test="position-chip"
          :aria-pressed="position === p.name"
          @click="choice = p.name"
        >
          {{ p.name }} <span>{{ p.count }}</span>
        </button>
      </div>
      <p v-if="position !== null" class="perf-context">
        Première → dernière mesure, position <strong>{{ position }}</strong>
      </p>
      <PerformanceScales :measurements="compared" />
      <div class="table-wrap">
        <table class="measurements">
          <thead>
            <tr>
              <th>Date</th>
              <th>Position</th>
              <th>Marche (s/j)</th>
              <th>Beat error</th>
              <th>Amplitude</th>
              <th><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in latestFirst" :key="m.id" data-test="measurement-row">
              <td class="tabular">{{ formatDate(m.measuredAt) }}</td>
              <td>{{ m.watchPosition ?? '—' }}</td>
              <td class="tabular">{{ rateText(m) }}</td>
              <td class="tabular">{{ formatMeasure(m.beatErrorMs, 'ms') }}</td>
              <td class="tabular">{{ formatMeasure(m.amplitudeDegrees, '°') }}</td>
              <td class="row-end">
                <button
                  type="button"
                  class="ghost"
                  :data-test="`measurement-edit-${m.id}`"
                  :disabled="busy"
                  @click="((editing = m), (adding = false))"
                >
                  Modifier
                </button>
                <button type="button" class="ghost danger" :data-test="`measurement-remove-${m.id}`" :disabled="busy" @click="removing = m">
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <ConfirmDialog
      v-if="removing"
      title="Supprimer cette mesure ?"
      :message="`La mesure du ${formatDate(removing.measuredAt)} sera définitivement supprimée.`"
      confirm-label="Supprimer"
      @confirm="confirmRemove"
      @cancel="removing = null"
    />
  </section>
</template>

<style scoped>
.performance {
  display: grid;
  gap: var(--space-3);
}

h3,
p {
  margin: 0;
}

h3 {
  color: var(--text-secondary);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pos-filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pos-chip {
  min-height: 30px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.pos-chip span {
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.pos-chip[aria-pressed='true'] {
  border-color: var(--accent-text);
  background: var(--accent);
  color: var(--accent-ink);
}

.perf-context {
  color: var(--text-secondary);
  font-size: 12px;
}

.perf-context strong {
  color: var(--text);
  font-weight: 600;
}

.table-wrap {
  overflow-x: auto;
}

.measurements {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: var(--space-2) var(--space-1);
  border-bottom: 1px solid var(--border);
  text-align: left;
}

th {
  position: relative;
  color: var(--text-secondary);
  font-weight: 600;
}

.row-end {
  text-align: right;
  white-space: nowrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.ghost {
  min-height: var(--touch-min);
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-2);
  border: 0;
  background: transparent;
  color: var(--accent-text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ghost.danger {
  color: var(--danger-text);
}
</style>
