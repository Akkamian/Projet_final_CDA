<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, apiFetch } from '../api/client'
import WatchIdentityFields from '../components/WatchIdentityFields.vue'
import { MOVEMENT_LABELS, formatDate, formatMoney } from '../format'
import { useStepPreviewStore } from '../stores/stepPreview'
import { useWatchesStore, type WatchCard, type WatchDetail } from '../stores/watches'

interface EditableStep {
  key: number
  label: string
  complicationLabel: string | null
}

interface CreatedWatch {
  id: number
  brand: string
  model: string
  projects: { steps: unknown[] }[]
}

const preview = useStepPreviewStore()
const watches = useWatchesStore()
const route = useRoute()

const brand = ref('')
const model = ref('')
const purchasePrice = ref('')
const purchaseDate = ref('')
const stage = ref<'identity' | 'steps' | 'done'>('identity')
const steps = ref<EditableStep[]>([])
const newStep = ref('')
const error = ref<string | null>(null)
const sessionExpired = ref(false)
const busy = ref(false)
const created = ref<{ id: number; brand: string; model: string; stepCount: number; revision: boolean } | null>(null)
// S9 : liste « Montre existante » (montres non vendues, sans projet en cours) et montre choisie, affichée en lecture seule.
const openable = ref<WatchCard[]>([])
const existingId = ref('')
const existing = ref<WatchDetail | null>(null)

// Sélection (mouvement + complications) d'après laquelle `steps` a été construit : revenir en arrière sans
// la changer garde les ajustements de l'utilisateur, la changer régénère la liste proposée.
let stepsSignature = ''
let nextKey = 0

onMounted(async () => {
  const reference = preview.loadReferenceData()
  try {
    openable.value = await watches.listOpenable()
  } catch {
    // Sans la liste, on peut toujours saisir une nouvelle montre.
  }
  // « Nouvelle révision » depuis la fiche d'une montre : elle arrive présélectionnée.
  const wanted = String(route.query.watch ?? '')
  if (openable.value.some((w) => String(w.id) === wanted)) {
    existingId.value = wanted
    await selectExisting()
  }
  await reference
})

async function selectExisting() {
  error.value = null
  const id = existingId.value
  if (id === '') {
    existing.value = null
    return
  }
  try {
    const detail = await watches.get(Number(id))
    if (id === existingId.value) existing.value = detail
  } catch {
    existing.value = null
    error.value = 'Impossible de charger cette montre. Réessayez dans un instant.'
  }
}

// Ligne « Achat » du récapitulatif : prix et date, « — » quand la montre n'en a pas.
function purchaseText(watch: WatchDetail): string {
  const parts = [
    watch.purchasePrice !== null ? formatMoney(watch.purchasePrice) : null,
    watch.purchaseDate !== null ? `le ${formatDate(watch.purchaseDate)}` : null,
  ]
  const text = parts.filter(Boolean).join(' ')
  return text === '' ? '—' : text
}

// « Saisir une nouvelle montre » : on quitte la montre existante sans toucher à la marque ni au modèle déjà saisis.
function clearExisting() {
  existingId.value = ''
  existing.value = null
  error.value = null
}

async function existingToSteps() {
  const watch = existing.value
  if (!watch) return
  error.value = null
  try {
    const proposed = await watches.fetchPreview(
      watch.movementCode,
      watch.complications.map((c) => c.code),
    )
    steps.value = proposed.map((s) => ({ key: nextKey++, label: s.label, complicationLabel: s.complicationLabel }))
    // La liste n'est plus celle d'une nouvelle montre : y revenir doit la régénérer.
    stepsSignature = ''
    stage.value = 'steps'
  } catch {
    error.value = 'Les étapes proposées ne sont pas disponibles. Réessayez dans un instant.'
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Prix saisi → texte « 80.50 » (la virgule française est acceptée), ou null s'il est vide. */
function parsePrice(): string | null | undefined {
  const raw = purchasePrice.value.trim().replace(',', '.')
  if (raw === '') return null
  // 8 chiffres avant la virgule au plus et 2 après : NUMERIC(10,2), jamais négatif (RG-MON-07).
  return /^\d{1,8}(\.\d{1,2})?$/.test(raw) ? raw : undefined
}

function identityProblem(): string | null {
  if (brand.value.trim() === '') return 'La marque est obligatoire.'
  if (model.value.trim() === '') return 'Le modèle est obligatoire.'
  if (parsePrice() === undefined) {
    return 'Le prix d’achat doit être un nombre positif ou nul, avec deux décimales au plus (99 999 999,99 € maximum).'
  }
  if (purchaseDate.value !== '' && purchaseDate.value > localToday()) {
    return 'Une date d’achat dans le futur est refusée.'
  }
  return null
}

function goToSteps() {
  error.value = identityProblem()
  if (error.value) return
  if (preview.loading || preview.error || !preview.movementCode) {
    error.value = 'Les étapes proposées ne sont pas disponibles. Réessayez dans un instant.'
    return
  }
  const signature = `${preview.movementCode}|${[...preview.complicationCodes].sort().join(',')}`
  if (signature !== stepsSignature) {
    steps.value = preview.steps.map((s) => ({ key: nextKey++, label: s.label, complicationLabel: s.complicationLabel }))
    stepsSignature = signature
  }
  stage.value = 'steps'
}

function back() {
  error.value = null
  sessionExpired.value = false
  stage.value = 'identity'
}

function move(index: number, delta: -1 | 1) {
  const target = index + delta
  if (target < 0 || target >= steps.value.length) return
  const next = [...steps.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  steps.value = next
}

function remove(index: number) {
  steps.value = steps.value.filter((_, i) => i !== index)
}

function addStep() {
  const label = newStep.value.trim()
  if (label === '') return
  steps.value = [...steps.value, { key: nextKey++, label, complicationLabel: null }]
  newStep.value = ''
}

function failureMessage(e: unknown): string {
  if (existing.value && e instanceof ApiError && (e.status === 400 || e.status === 409))
    return `Impossible de créer le projet : ${e.message}`
  if (e instanceof ApiError && e.status === 400) return `Impossible de créer la montre : ${e.message}`
  return 'Impossible de créer la montre. Vérifiez les informations puis réessayez.'
}

async function create() {
  if (busy.value || steps.value.length === 0) return
  error.value = null
  sessionExpired.value = false
  busy.value = true
  const price = parsePrice()
  try {
    if (existing.value) {
      const revision = await watches.createRevision(
        existing.value.id,
        steps.value.map((s) => ({ label: s.label })),
      )
      created.value = {
        id: existing.value.id,
        brand: existing.value.brand,
        model: existing.value.model,
        stepCount: revision.steps.length,
        revision: true,
      }
      stage.value = 'done'
      return
    }
    const watch = await apiFetch<CreatedWatch>('/watches', {
      method: 'POST',
      body: JSON.stringify({
        brand: brand.value.trim(),
        model: model.value.trim(),
        movementCode: preview.movementCode,
        complicationCodes: [...preview.complicationCodes],
        ...(price ? { purchasePrice: price } : {}),
        ...(purchaseDate.value ? { purchaseDate: purchaseDate.value } : {}),
        steps: steps.value.map((s) => ({ label: s.label })),
      }),
    })
    created.value = {
      id: watch.id,
      brand: watch.brand,
      model: watch.model,
      stepCount: watch.projects[0]?.steps.length ?? 0,
      revision: false,
    }
    stage.value = 'done'
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) sessionExpired.value = true
    error.value = e instanceof ApiError && e.status === 401 ? 'Votre session a expiré.' : failureMessage(e)
  } finally {
    busy.value = false
  }
}

function startOver() {
  brand.value = ''
  model.value = ''
  purchasePrice.value = ''
  purchaseDate.value = ''
  steps.value = []
  stepsSignature = ''
  error.value = null
  created.value = null
  existingId.value = ''
  existing.value = null
  stage.value = 'identity'
}
</script>

<template>
  <section class="watch-form">
    <template v-if="stage === 'done' && created">
      <h1>{{ created.revision ? 'Projet créé' : 'Montre créée' }}</h1>
      <p class="notice" role="status">{{ created.brand }} {{ created.model }} · projet en cours · {{ created.stepCount }} étapes</p>
      <p><RouterLink class="btn" :to="`/watches/${created.id}`">Voir la fiche de la montre</RouterLink></p>
      <p><button class="btn btn-secondary" type="button" @click="startOver">Créer une autre montre</button></p>
      <p class="switch"><RouterLink to="/">Retour à mes montres</RouterLink></p>
    </template>

    <template v-else>
      <h1>Nouvelle montre</h1>
      <p class="hint">Étape {{ stage === 'identity' ? 1 : 2 }} sur 2</p>

      <div v-if="error" class="alert" role="alert">
        <p>{{ error }}</p>
        <p v-if="sessionExpired">
          <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }">Se reconnecter</RouterLink>
        </p>
      </div>
      <p v-if="preview.error && stage === 'identity'" class="alert" role="alert">{{ preview.error }}</p>

      <div v-show="stage === 'identity'" class="existing">
        <div class="field">
          <label for="existing-watch">Montre existante</label>
          <select id="existing-watch" v-model="existingId" :disabled="openable.length === 0" @change="selectExisting">
            <option value="">Saisir une nouvelle montre</option>
            <option v-for="watch in openable" :key="watch.id" :value="String(watch.id)">{{ watch.brand }} {{ watch.model }}</option>
          </select>
          <span v-if="openable.length === 0" class="field-hint">
            Aucune montre disponible : une montre vendue ou qui a déjà un projet en cours n’est pas proposée.
          </span>
        </div>
        <template v-if="existing">
          <dl class="summary" data-test="existing-summary">
            <dt>Montre</dt>
            <dd>{{ existing.brand }} {{ existing.model }}</dd>
            <dt>Mouvement</dt>
            <dd>{{ MOVEMENT_LABELS[existing.movementCode] }}</dd>
            <dt>Complications</dt>
            <dd>{{ existing.complications.length > 0 ? existing.complications.map((c) => c.label).join(', ') : 'Aucune' }}</dd>
            <dt>Achat</dt>
            <dd>{{ purchaseText(existing) }}</dd>
          </dl>
          <p class="hint">Ces informations se modifient depuis la fiche de la montre.</p>
          <button class="btn" type="button" data-test="existing-next" @click="existingToSteps">Voir les étapes proposées</button>
          <button class="btn btn-secondary" type="button" data-test="existing-clear" @click="clearExisting">
            Saisir une nouvelle montre
          </button>
        </template>
      </div>

      <form v-show="stage === 'identity' && !existing" data-test="identity" novalidate @submit.prevent="goToSteps">
        <WatchIdentityFields
          v-model:brand="brand"
          v-model:model="model"
          v-model:purchase-price="purchasePrice"
          v-model:purchase-date="purchaseDate"
          :movement-code="preview.movementCode ?? ''"
          :complication-codes="preview.complicationCodes"
          :movement-types="preview.movementTypes"
          :complications="preview.complications"
          :max-date="localToday()"
          @select-movement="preview.selectMovement"
          @toggle-complication="preview.toggleComplication"
        />

        <button class="btn" type="submit" :disabled="preview.loading">Voir les étapes proposées</button>
      </form>

      <div v-if="stage === 'steps'">
        <h2>Étapes proposées ({{ steps.length }})</h2>
        <p class="hint">Ajoutez, supprimez ou déplacez des étapes : le projet sera créé avec exactement cette liste.</p>

        <ol class="steps">
          <li v-for="(step, index) in steps" :key="step.key">
            <span class="step-order tabular" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="step-info">
              <span class="step-label">{{ step.label }}</span>
              <span v-if="step.complicationLabel" class="step-tag">{{ step.complicationLabel }}</span>
            </span>
            <span class="actions">
              <button
                type="button"
                class="icon"
                data-test="up"
                :disabled="index === 0"
                :aria-label="`Monter « ${step.label} »`"
                @click="move(index, -1)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 19V5M5 12l7-7 7 7"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="icon"
                data-test="down"
                :disabled="index === steps.length - 1"
                :aria-label="`Descendre « ${step.label} »`"
                @click="move(index, 1)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 5v14M5 12l7 7 7-7"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="icon danger"
                data-test="remove"
                :aria-label="`Supprimer « ${step.label} »`"
                @click="remove(index)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                </svg>
              </button>
            </span>
          </li>
        </ol>
        <p v-if="steps.length === 0" class="hint">Ajoutez au moins une étape pour créer le projet.</p>

        <div class="field add-step">
          <label for="newStep">Ajouter une étape</label>
          <div class="add-step-row">
            <input id="newStep" v-model="newStep" name="newStep" type="text" maxlength="255" @keydown.enter.prevent="addStep" />
            <button class="icon" type="button" data-test="add-step" aria-label="Ajouter une étape" @click="addStep">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <button class="btn btn-secondary" type="button" data-test="back" @click="back">Retour</button>
        <button class="btn" type="button" data-test="create" :disabled="busy || steps.length === 0" @click="create">Créer le projet</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.watch-form {
  display: grid;
  gap: var(--space-3);
}

.watch-form h1,
.watch-form h2,
.watch-form p {
  margin: 0;
}

.existing {
  display: grid;
  gap: var(--space-3);
}

.existing select {
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.summary {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-3);
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.summary dt {
  color: var(--text-secondary);
}

.summary dd {
  margin: 0;
}

.steps {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.step-order {
  flex: none;
  width: 18px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.step-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.step-label {
  font-size: 13px;
  line-height: 1.3;
}

.step-tag {
  align-self: flex-start;
  padding: 1px var(--space-2);
  border: 1px solid var(--accent-text);
  border-radius: 999px;
  background: var(--bg);
  color: var(--accent-text);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.actions {
  display: inline-flex;
  gap: 3px;
}

.icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text-secondary);
  cursor: pointer;
}

.icon.danger {
  color: var(--danger-text);
}

.add-step-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.add-step-row input {
  flex: 1;
  min-width: 0;
}

.icon:disabled {
  opacity: 0.4;
  cursor: default;
}

.add-step {
  margin-top: var(--space-4);
}
</style>
