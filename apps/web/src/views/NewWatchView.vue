<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, apiFetch } from '../api/client'
import { MOVEMENT_LABELS } from '../format'
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
      <p class="notice" role="status">
        {{ created.brand }} {{ created.model }} · projet en cours · {{ created.stepCount }} étapes
      </p>
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
          </dl>
          <p class="hint">Ces informations se modifient depuis la fiche de la montre.</p>
          <button class="btn" type="button" data-test="existing-next" @click="existingToSteps">Voir les étapes proposées</button>
        </template>
      </div>

      <form v-show="stage === 'identity' && !existing" data-test="identity" novalidate @submit.prevent="goToSteps">
        <div class="field">
          <label for="brand">Marque</label>
          <input id="brand" v-model="brand" name="brand" type="text" maxlength="255" autocomplete="off" />
        </div>
        <div class="field">
          <label for="model">Modèle</label>
          <input id="model" v-model="model" name="model" type="text" maxlength="255" autocomplete="off" />
          <span class="field-hint">Le calibre se note dans le modèle (ex. 6119-8100).</span>
        </div>

        <fieldset>
          <legend>Type de mouvement</legend>
          <label v-for="type in preview.movementTypes" :key="type.movementCode" class="choice">
            <input
              type="radio"
              name="movement"
              :value="type.movementCode"
              :checked="preview.movementCode === type.movementCode"
              @change="preview.selectMovement(type.movementCode)"
            />
            <span>{{ type.label }}</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Complications</legend>
          <label v-for="item in preview.complications" :key="item.complicationCode" class="choice">
            <input
              type="checkbox"
              :value="item.complicationCode"
              :checked="preview.complicationCodes.includes(item.complicationCode)"
              @change="preview.toggleComplication(item.complicationCode)"
            />
            <span>{{ item.label }}</span>
          </label>
        </fieldset>

        <div class="field">
          <label for="purchasePrice">Prix d’achat (€) · facultatif</label>
          <input id="purchasePrice" v-model="purchasePrice" name="purchasePrice" type="text" inputmode="decimal" />
        </div>
        <div class="field">
          <label for="purchaseDate">Date d’achat · facultative</label>
          <input id="purchaseDate" v-model="purchaseDate" name="purchaseDate" type="date" :max="localToday()" />
          <span class="field-hint">
            Une montre gardée de longue date peut ne plus avoir de prix ni de date d’achat. Une date dans le futur est
            refusée.
          </span>
        </div>

        <button class="btn" type="submit" :disabled="preview.loading">Voir les étapes proposées</button>
      </form>

      <div v-if="stage === 'steps'">
        <h2>Étapes proposées ({{ steps.length }})</h2>
        <p class="hint">Ajoutez, supprimez ou déplacez des étapes : le projet sera créé avec exactement cette liste.</p>

        <ol class="steps">
          <li v-for="(step, index) in steps" :key="step.key">
            <span class="step-label">{{ step.label }}</span>
            <span v-if="step.complicationLabel" class="badge">{{ step.complicationLabel }}</span>
            <span class="actions">
              <button
                type="button"
                class="icon"
                data-test="up"
                :disabled="index === 0"
                :aria-label="`Monter « ${step.label} »`"
                @click="move(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="icon"
                data-test="down"
                :disabled="index === steps.length - 1"
                :aria-label="`Descendre « ${step.label} »`"
                @click="move(index, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="icon"
                data-test="remove"
                :aria-label="`Supprimer « ${step.label} »`"
                @click="remove(index)"
              >
                ✕
              </button>
            </span>
          </li>
        </ol>
        <p v-if="steps.length === 0" class="hint">Ajoutez au moins une étape pour créer le projet.</p>

        <div class="field add-step">
          <label for="newStep">Ajouter une étape</label>
          <input id="newStep" v-model="newStep" name="newStep" type="text" maxlength="255" @keydown.enter.prevent="addStep" />
          <button class="btn btn-secondary" type="button" data-test="add-step" @click="addStep">Ajouter une étape</button>
        </div>

        <button class="btn btn-secondary" type="button" data-test="back" @click="back">Retour</button>
        <button class="btn" type="button" data-test="create" :disabled="busy || steps.length === 0" @click="create">
          Créer le projet
        </button>
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

fieldset {
  margin: 0 0 var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

legend {
  padding: 0 var(--space-2);
  color: var(--text-secondary);
}

.steps {
  margin: 0;
  padding-left: var(--space-5);
}

.steps li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.step-label {
  flex: 1 1 12rem;
}

.badge {
  padding: 0 var(--space-2);
  border: 1px solid var(--accent-warm);
  border-radius: var(--radius-sm);
  color: var(--accent-warm-text);
  font-size: 0.8125rem;
}

.actions {
  display: inline-flex;
  gap: var(--space-1);
}

.icon {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.icon:disabled {
  opacity: 0.4;
  cursor: default;
}

.add-step {
  margin-top: var(--space-4);
}
</style>
