<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, apiFetch } from '../api/client'
import { useStepPreviewStore } from '../stores/stepPreview'

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
const created = ref<{ id: number; brand: string; model: string; stepCount: number } | null>(null)

// Sélection (mouvement + complications) d'après laquelle `steps` a été construit : revenir en arrière sans
// la changer garde les ajustements de l'utilisateur, la changer régénère la liste proposée.
let stepsSignature = ''
let nextKey = 0

onMounted(() => preview.loadReferenceData())

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
    created.value = { id: watch.id, brand: watch.brand, model: watch.model, stepCount: watch.projects[0]?.steps.length ?? 0 }
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
  stage.value = 'identity'
}
</script>

<template>
  <section class="watch-form">
    <template v-if="stage === 'done' && created">
      <h1>Montre créée</h1>
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

      <form v-show="stage === 'identity'" data-test="identity" novalidate @submit.prevent="goToSteps">
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
