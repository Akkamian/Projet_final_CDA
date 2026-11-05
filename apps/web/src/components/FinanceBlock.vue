<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, formatMoney } from '../format'
import { useWatchesStore, type ExpenseDetail, type WatchDetail } from '../stores/watches'
import { errorMessage } from '../utils/today'
import ConfirmDialog from './ConfirmDialog.vue'
import ExpenseForm from './ExpenseForm.vue'
import ResaleForm from './ResaleForm.vue'

const props = defineProps<{ watch: WatchDetail; selectedProjectId: number | null }>()
const emit = defineEmits<{
  'update:expenses': [value: { projectId: number; expenses: ExpenseDetail[] }]
  'update:resale': [value: WatchDetail]
}>()

const watches = useWatchesStore()
const busy = ref(false)
const error = ref<string | null>(null)
// Un seul formulaire ouvert à la fois : ajout de coût, correction d'un coût, revente (saisie ou correction).
const expenseForm = ref<{ projectId: number; expense?: ExpenseDetail } | null>(null)
const resaleOpen = ref(false)
const removing = ref<{ projectId: number; expense: ExpenseDetail } | null>(null)
const clearing = ref(false)

const sold = computed(() => props.watch.resaleDate !== null)
const inProgress = computed(() => props.watch.projects.some((p) => p.status === 'in_progress'))
// RG-FIN-09 : seuls les projets qui ont des coûts forment un groupe (du plus récent au plus ancien, comme l'API).
const groups = computed(() => props.watch.projects.filter((p) => p.expenses.length > 0))

const cents = (amount: string) => Math.round(Number(amount) * 100)
const money = (totalCents: number) => formatMoney((totalCents / 100).toFixed(2))
const total = (expenses: ExpenseDetail[]) => expenses.reduce((sum, e) => sum + cents(e.amount), 0)
const grandTotal = computed(() => groups.value.reduce((sum, p) => sum + total(p.expenses), 0))

function openExpense(projectId: number, expense?: ExpenseDetail): void {
  resaleOpen.value = false
  expenseForm.value = { projectId, expense }
}

function openResale(): void {
  expenseForm.value = null
  resaleOpen.value = true
}

function currentExpenses(projectId: number): ExpenseDetail[] {
  return props.watch.projects.find((p) => p.id === projectId)?.expenses ?? []
}

function expenseSaved({ projectId, expense }: { projectId: number; expense: ExpenseDetail }): void {
  const list = currentExpenses(projectId)
  const exists = list.some((e) => e.id === expense.id)
  const next = exists ? list.map((e) => (e.id === expense.id ? expense : e)) : [...list, expense]
  emit('update:expenses', { projectId, expenses: next })
  expenseForm.value = null
  error.value = null
}

function resaleSaved(updated: WatchDetail): void {
  emit('update:resale', updated)
  resaleOpen.value = false
  error.value = null
}

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function confirmRemoveExpense(): Promise<void> {
  const target = removing.value
  if (!target) return
  await run(async () => {
    await watches.removeExpense(target.projectId, target.expense.id)
    emit('update:expenses', {
      projectId: target.projectId,
      expenses: currentExpenses(target.projectId).filter((e) => e.id !== target.expense.id),
    })
  })
  // Le dialogue se ferme aussi en cas d'échec : l'alerte, derrière un dialogue modal, resterait invisible.
  removing.value = null
}

async function confirmClearResale(): Promise<void> {
  await run(async () => {
    emit('update:resale', await watches.clearResale(props.watch.id))
  })
  clearing.value = false
}
</script>

<template>
  <section class="finance">
    <h3>Finances</h3>

    <dl v-if="watch.purchasePrice !== null || watch.purchaseDate !== null" class="facts">
      <dt>Achat</dt>
      <dd>
        <template v-if="watch.purchasePrice !== null">{{ formatMoney(watch.purchasePrice) }}</template>
        <template v-if="watch.purchaseDate !== null"> le {{ formatDate(watch.purchaseDate) }}</template>
      </dd>
    </dl>

    <div class="header">
      <h4>Coûts par projet</h4>
      <button
        v-if="watch.projects.length > 0 && !expenseForm"
        type="button"
        class="ghost"
        data-test="expense-add"
        @click="openExpense(selectedProjectId ?? watch.projects[0]!.id)"
      >
        + Coût
      </button>
    </div>

    <ExpenseForm
      v-if="expenseForm"
      :key="expenseForm.expense?.id ?? 'new'"
      :projects="watch.projects"
      :project-id="expenseForm.projectId"
      :expense="expenseForm.expense"
      @saved="expenseSaved"
      @cancel="expenseForm = null"
    />

    <p v-if="groups.length === 0" class="hint">Aucun coût : un coût se rattache à un projet.</p>
    <template v-else>
      <div v-for="p in groups" :key="p.id" class="group" :class="{ selected: p.id === selectedProjectId }" data-test="expense-group">
        <div class="group-header">
          <span> Projet du {{ formatDate(p.createdAt) }}<template v-if="p.id === selectedProjectId"> · sélectionné</template> </span>
          <span data-test="group-total">{{ money(total(p.expenses)) }}</span>
        </div>
        <ul>
          <li v-for="e in p.expenses" :key="e.id">
            <span>
              {{ e.label }} <span class="date">{{ formatDate(e.expenseDate) }}</span>
            </span>
            <span class="end">
              {{ formatMoney(e.amount) }}
              <button type="button" class="ghost" :data-test="`expense-edit-${e.id}`" :disabled="busy" @click="openExpense(p.id, e)">
                Modifier
              </button>
              <button
                type="button"
                class="ghost danger"
                :data-test="`expense-remove-${e.id}`"
                :disabled="busy"
                @click="removing = { projectId: p.id, expense: e }"
              >
                Supprimer
              </button>
            </span>
          </li>
        </ul>
      </div>
      <p class="total">
        <span>Total des coûts (tous projets)</span> <strong data-test="expenses-total">{{ money(grandTotal) }}</strong>
      </p>
    </template>

    <ResaleForm
      v-if="resaleOpen"
      :watch-id="watch.id"
      :purchase-date="watch.purchaseDate"
      :initial="sold ? { price: watch.resalePrice ?? '', date: watch.resaleDate ?? '' } : undefined"
      @saved="resaleSaved"
      @cancel="resaleOpen = false"
    />
    <div v-else-if="sold" class="resale">
      <p>
        Revente <span class="date">{{ formatDate(watch.resaleDate!) }}</span>
        <strong v-if="watch.resalePrice !== null"> {{ formatMoney(watch.resalePrice) }}</strong>
      </p>
      <div class="actions">
        <button type="button" class="ghost" data-test="resale-edit" :disabled="busy" @click="openResale">Corriger</button>
        <button type="button" class="ghost danger" data-test="resale-clear" :disabled="busy" @click="clearing = true">
          Annuler la revente
        </button>
      </div>
    </div>
    <div v-else class="resale">
      <p>Revente non renseignée</p>
      <p v-if="inProgress" class="hint">Un projet est en cours : terminez-le avant de renseigner la revente.</p>
      <button v-else type="button" class="ghost" data-test="resale-open" @click="openResale">Renseigner la revente</button>
    </div>

    <p v-if="watch.margin !== null" class="margin">
      Marge de la montre <strong data-test="margin">{{ formatMoney(watch.margin) }}</strong>
    </p>
    <p v-else-if="sold" class="hint">Marge non calculable : le prix d’achat n’est pas renseigné.</p>
    <p v-else class="hint">Marge : calculée dès la saisie de la revente</p>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <ConfirmDialog
      v-if="removing"
      title="Supprimer ce coût ?"
      :message="`Le coût « ${removing.expense.label} » sera définitivement supprimé et la marge recalculée.`"
      confirm-label="Supprimer"
      @confirm="confirmRemoveExpense"
      @cancel="removing = null"
    />
    <ConfirmDialog
      v-if="clearing"
      title="Annuler la revente ?"
      message="La montre ne sera plus vendue ; sa marge ne sera plus calculée."
      confirm-label="Annuler la revente"
      @confirm="confirmClearResale"
      @cancel="clearing = false"
    />
  </section>
</template>

<style scoped>
.finance {
  display: grid;
  gap: var(--space-3);
}

h3,
h4,
p,
ul,
dl {
  margin: 0;
}

h3 {
  font-size: 15px;
}

h4 {
  font-size: 13px;
  color: var(--text-secondary);
}

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-4);
}

dt,
.date {
  color: var(--text-secondary);
}

dd {
  margin: 0;
}

.header,
.group-header,
li,
.total,
.margin,
.resale > p:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.group {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.group.selected {
  border-color: var(--accent);
}

.group-header {
  font-weight: 600;
}

ul {
  padding: 0;
  list-style: none;
}

li {
  padding: var(--space-1) 0;
  font-size: 13px;
}

.end {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.resale {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.actions {
  display: flex;
  gap: var(--space-3);
}

.margin {
  font-size: 15px;
}

.margin strong {
  font-size: 20px;
  color: var(--accent-text);
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
