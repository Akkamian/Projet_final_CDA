<script setup lang="ts">
import { ref } from 'vue'
import { formatDate } from '../format'
import { useWatchesStore, type ExpenseDetail, type ExpensePayload } from '../stores/watches'
import { errorMessage, today } from '../utils/today'

const props = defineProps<{
  /** Projets auxquels le coût peut se rattacher (en modification, le projet ne change pas). */
  projects: { id: number; createdAt: string }[]
  projectId: number
  expense?: ExpenseDetail
}>()
const emit = defineEmits<{ saved: [value: { projectId: number; expense: ExpenseDetail }]; cancel: [] }>()

const watches = useWatchesStore()
const initial = props.expense
const targetId = ref(props.projectId)
const label = ref(initial?.label ?? '')
const amount = ref(initial?.amount ?? '')
const date = ref(initial?.expenseDate ?? '')
const busy = ref(false)
const error = ref<string | null>(null)

// La virgule décimale française est acceptée ; l'API reçoit un point.
const amountText = () => amount.value.trim().replace(',', '.')

/** Mêmes contrôles que l'API (RG-FIN-01, RG-FIN-02, RG-GEN-01). */
function validate(): string | null {
  if (label.value.trim() === '') return 'Le libellé du coût est obligatoire.'
  if (label.value.trim().length > 255) return 'Le libellé du coût est limité à 255 caractères.'
  const text = amountText()
  if (text === '' || Number.isNaN(Number(text))) return 'Le montant doit être un nombre.'
  if (Number(text) < 0) return 'Le montant ne peut pas être négatif.'
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return 'Le montant doit avoir deux décimales au plus.'
  if (Number(text) > 99999999.99) return 'Le montant est trop élevé.'
  if (date.value === '') return 'La date du coût est obligatoire.'
  if (date.value > today()) return 'La date du coût ne peut pas être dans le futur.'
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
    const values: ExpensePayload = { label: label.value.trim(), amount: amountText(), expenseDate: date.value }
    if (!initial) {
      emit('saved', { projectId: targetId.value, expense: await watches.addExpense(targetId.value, values) })
      return
    }
    // Modification (S32) : seuls les champs changés partent.
    const patch: Partial<ExpensePayload> = {}
    if (values.label !== initial.label) patch.label = values.label
    if (Number(values.amount) !== Number(initial.amount)) patch.amount = values.amount
    if (values.expenseDate !== initial.expenseDate) patch.expenseDate = values.expenseDate
    emit('saved', { projectId: props.projectId, expense: await watches.updateExpense(props.projectId, initial.id, patch) })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="sheet-form" data-test="expense-form" novalidate @submit.prevent="submit">
    <div class="sheet-body">
      <div v-if="!initial && projects.length > 1" class="field">
        <label for="e-project">Projet</label>
        <select id="e-project" v-model.number="targetId" data-test="e-project">
          <option v-for="p in projects" :key="p.id" :value="p.id">Projet du {{ formatDate(p.createdAt) }}</option>
        </select>
      </div>
      <div class="field">
        <label for="e-label">Libellé</label>
        <input id="e-label" v-model="label" data-test="e-label" type="text" maxlength="255" placeholder="Poussoirs" required />
      </div>
      <div class="sheet-row">
        <div class="field">
          <label for="e-amount">Montant (€)</label>
          <input id="e-amount" v-model="amount" data-test="e-amount" type="text" inputmode="decimal" placeholder="34" required />
        </div>
        <div class="field">
          <label for="e-date">Date</label>
          <input id="e-date" v-model="date" data-test="e-date" type="date" :max="today()" required />
        </div>
      </div>
      <p v-if="error" class="alert" role="alert">{{ error }}</p>
    </div>
    <div class="sheet-footer">
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-test="e-cancel" :disabled="busy" @click="emit('cancel')">Annuler</button>
        <button type="submit" class="btn" :disabled="busy">Enregistrer</button>
      </div>
    </div>
  </form>
</template>

<style scoped>
p {
  margin: 0;
}

select {
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font: inherit;
}
</style>
