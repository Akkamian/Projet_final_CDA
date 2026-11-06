<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWatchesStore, type MeasurementDetail, type MeasurementPayload } from '../stores/watches'
import { errorMessage, today } from '../utils/today'

const props = defineProps<{ projectId: number; measurement?: MeasurementDetail }>()
const emit = defineEmits<{ saved: [value: MeasurementDetail]; cancel: []; remove: []; busy: [value: boolean] }>()

const POSITIONS = ['Cadran haut', 'Cadran bas', 'Couronne en haut', 'Couronne en bas', 'Couronne à gauche', 'Couronne à droite']

const watches = useWatchesStore()
const initial = props.measurement
// L'API renvoie un horodatage ISO ; le champ date et la comparaison à « aujourd'hui » veulent le seul jour AAAA-MM-JJ saisi.
const initialDay = initial ? initial.measuredAt.slice(0, 10) : ''
const date = ref(initialDay)
const position = ref<string | null>(initial?.watchPosition ?? null)
const rate = ref(initial?.rateSecondsPerDay ?? '')
const beat = ref(initial?.beatErrorMs ?? '')
const amplitude = ref(initial?.amplitudeDegrees ?? '')
const busy = ref(false)
// Le parent le transmet à la feuille, qui refuse de se fermer pendant un enregistrement.
watch(busy, (value) => emit('busy', value))
const error = ref<string | null>(null)

// Une position saisie autrement (hors des puces) reste visible et décochable.
const positions = computed(() => (position.value && !POSITIONS.includes(position.value) ? [...POSITIONS, position.value] : POSITIONS))

const num = (value: string | number) => (String(value).trim() === '' ? NaN : Number(value))

/** Mêmes contrôles que l'API (RG-PER-02, RG-PER-03, RG-GEN-01) : le message s'affiche avant tout appel. */
function validate(): string | null {
  if (date.value === '') return 'La date de la mesure est obligatoire.'
  if (date.value > today()) return 'La date de la mesure ne peut pas être dans le futur.'
  const [r, b, a] = [num(rate.value), num(beat.value), num(amplitude.value)]
  if (Number.isNaN(r) || Number.isNaN(b) || Number.isNaN(a)) return 'La marche, le beat error et l’amplitude sont obligatoires.'
  if (b < 0) return 'Le beat error ne peut pas être négatif.'
  if (a < 0) return 'L’amplitude ne peut pas être négative.'
  if (Math.abs(r) > 999.99 || b > 999.99 || a > 999.99) return 'Les valeurs doivent rester entre −999,99 et 999,99.'
  return null
}

function togglePosition(value: string): void {
  position.value = position.value === value ? null : value
}

async function submit(): Promise<void> {
  if (busy.value) return
  const invalid = validate()
  if (invalid) {
    error.value = invalid
    return
  }
  error.value = null
  busy.value = true
  try {
    const values: MeasurementPayload = {
      measuredAt: date.value,
      rateSecondsPerDay: num(rate.value),
      beatErrorMs: num(beat.value),
      amplitudeDegrees: num(amplitude.value),
    }
    if (!initial) {
      emit(
        'saved',
        await watches.addMeasurement(props.projectId, { ...values, ...(position.value ? { watchPosition: position.value } : {}) }),
      )
      return
    }
    // Modification (S33) : seuls les champs changés partent ; une position décochée est effacée (null).
    const patch: Partial<MeasurementPayload> = {}
    if (values.measuredAt !== initialDay) patch.measuredAt = values.measuredAt
    if (values.rateSecondsPerDay !== Number(initial.rateSecondsPerDay)) patch.rateSecondsPerDay = values.rateSecondsPerDay
    if (values.beatErrorMs !== Number(initial.beatErrorMs)) patch.beatErrorMs = values.beatErrorMs
    if (values.amplitudeDegrees !== Number(initial.amplitudeDegrees)) patch.amplitudeDegrees = values.amplitudeDegrees
    if (position.value !== initial.watchPosition) patch.watchPosition = position.value
    emit('saved', await watches.updateMeasurement(props.projectId, initial.id, patch))
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="sheet-form" novalidate @submit.prevent="submit">
    <div class="sheet-body">
      <div class="field">
        <label for="m-date">Date de la mesure</label>
        <input id="m-date" v-model="date" data-test="m-date" type="date" :max="today()" required />
      </div>

      <fieldset class="field">
        <legend>Position de la montre · facultative</legend>
        <div class="chip-group">
          <button
            v-for="p in positions"
            :key="p"
            type="button"
            class="chip-toggle"
            :data-test="`m-position-${p}`"
            :aria-pressed="position === p"
            @click="togglePosition(p)"
          >
            {{ p }}
          </button>
        </div>
        <span class="field-hint">
          Les mesures sont comparées à position égale ; une position non précisée est comparée avec les autres mesures sans position.
        </span>
      </fieldset>

      <div class="sheet-row">
        <div class="field">
          <label for="m-rate">Marche (s/j)</label>
          <input id="m-rate" v-model="rate" data-test="m-rate" type="number" inputmode="decimal" step="1" placeholder="+12" required />
        </div>
        <div class="field">
          <label for="m-beat">Beat error (ms)</label>
          <input
            id="m-beat"
            v-model="beat"
            data-test="m-beat"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            placeholder="0.4"
            required
          />
        </div>
        <div class="field">
          <label for="m-amp">Amplitude (°)</label>
          <input
            id="m-amp"
            v-model="amplitude"
            data-test="m-amp"
            type="number"
            inputmode="numeric"
            step="1"
            min="0"
            placeholder="260"
            required
          />
        </div>
      </div>
      <p class="field-hint">
        Marche négative si la montre retarde (ex. −8). Beat error et amplitude ne peuvent pas être négatifs. Aucune date dans le futur.
      </p>

      <p v-if="error" class="alert" role="alert">{{ error }}</p>
    </div>

    <div class="sheet-footer">
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-test="m-cancel" :disabled="busy" @click="emit('cancel')">Annuler</button>
        <button type="submit" class="btn" :disabled="busy">{{ initial ? 'Enregistrer' : 'Enregistrer la mesure' }}</button>
      </div>
      <button v-if="initial" type="button" class="sheet-danger" data-test="m-remove" :disabled="busy" @click="emit('remove')">
        Supprimer cette mesure
      </button>
    </div>
  </form>
</template>

<style scoped>
p {
  margin: 0;
}

fieldset {
  border: 0;
  padding: 0;
  min-width: 0;
}

legend {
  padding: 0;
  margin-bottom: var(--space-2);
}

.sheet-row .field,
.sheet-row input {
  min-width: 0;
}
</style>
