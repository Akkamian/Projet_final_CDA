<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate } from '../format'
import { useWatchesStore, type MeasurementDetail } from '../stores/watches'
import { errorMessage } from '../utils/today'
import ConfirmDialog from './ConfirmDialog.vue'
import MeasurementForm from './MeasurementForm.vue'
import PerformanceChart from './PerformanceChart.vue'

const props = defineProps<{ projectId: number; measurements: MeasurementDetail[] }>()
const emit = defineEmits<{ 'update:measurements': [value: MeasurementDetail[]] }>()

const watches = useWatchesStore()
// `adding` : formulaire de saisie ; `editing` : mesure en cours de correction ; `removing` : mesure à confirmer.
const adding = ref(false)
const editing = ref<MeasurementDetail | null>(null)
const removing = ref<MeasurementDetail | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

const chronological = (list: MeasurementDetail[]) => [...list].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id - b.id)
// La liste montre les plus récentes d'abord ; le graphique reçoit l'ordre chronologique (RG-PER-04).
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
      <PerformanceChart :measurements="measurements" />
      <table class="measurements">
        <thead>
          <tr>
            <th>Date</th>
            <th>Marche (s/j)</th>
            <th>Beat error</th>
            <th>Amplitude</th>
            <th><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in latestFirst" :key="m.id" data-test="measurement-row">
            <td>
              {{ formatDate(m.measuredAt) }}<span v-if="m.watchPosition" class="pos">{{ m.watchPosition }}</span>
            </td>
            <td>{{ m.rateSecondsPerDay }}</td>
            <td>{{ m.beatErrorMs }} ms</td>
            <td>{{ m.amplitudeDegrees }}°</td>
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
  font-size: 15px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  color: var(--text-secondary);
  font-weight: 600;
}

.pos {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
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
