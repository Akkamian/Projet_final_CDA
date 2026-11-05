<script setup lang="ts">
import { ref } from 'vue'
import { formatDate } from '../format'
import { useWatchesStore, type WatchDetail } from '../stores/watches'
import { errorMessage, today } from '../utils/today'

const props = defineProps<{ watchId: number; purchaseDate: string | null; initial?: { price: string; date: string } }>()
const emit = defineEmits<{ saved: [value: WatchDetail]; cancel: [] }>()

const watches = useWatchesStore()
const price = ref(props.initial?.price ?? '')
const date = ref(props.initial?.date ?? '')
const busy = ref(false)
const error = ref<string | null>(null)

const priceText = () => price.value.trim().replace(',', '.')

/** Mêmes contrôles que l'API (RG-FIN-05, RG-FIN-06, RG-GEN-01). */
function validate(): string | null {
  const text = priceText()
  if (text === '' || Number.isNaN(Number(text))) return 'Le prix de revente doit être un nombre.'
  if (Number(text) < 0) return 'Le prix de revente ne peut pas être négatif.'
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return 'Le prix de revente doit avoir deux décimales au plus.'
  if (Number(text) > 99999999.99) return 'Le prix de revente est trop élevé.'
  if (date.value === '') return 'La date de revente est obligatoire.'
  if (date.value > today()) return 'La date de revente ne peut pas être dans le futur.'
  if (props.purchaseDate && date.value < props.purchaseDate) {
    return `La date de revente ne peut pas précéder la date d’achat (${formatDate(props.purchaseDate)}).`
  }
  return null
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
    emit('saved', await watches.setResale(props.watchId, { price: priceText(), date: date.value }))
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="resale-form" data-test="resale-form" novalidate @submit.prevent="submit">
    <h3>{{ initial ? 'Corriger la revente' : 'Renseigner la revente' }}</h3>
    <div class="row">
      <div class="field">
        <label for="r-price">Prix de revente (€)</label>
        <input id="r-price" v-model="price" data-test="resale-price" type="text" inputmode="decimal" placeholder="350" required />
      </div>
      <div class="field">
        <label for="r-date">Date de revente</label>
        <input id="r-date" v-model="date" data-test="resale-date" type="date" :min="purchaseDate ?? undefined" :max="today()" required />
      </div>
    </div>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <div class="actions">
      <button type="button" class="btn btn-secondary" :disabled="busy" @click="emit('cancel')">Annuler</button>
      <button type="submit" class="btn" :disabled="busy">Enregistrer</button>
    </div>
  </form>
</template>

<style scoped>
.resale-form {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

h3,
p,
.field {
  margin: 0;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
