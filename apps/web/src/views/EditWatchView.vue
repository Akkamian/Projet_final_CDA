<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, apiFetch } from '../api/client'
import type { Complication, MovementType } from '../stores/stepPreview'
import { useWatchesStore, type UpdateWatchPayload, type WatchDetail } from '../stores/watches'
import { errorMessage } from '../utils/today'

// S10 : modification des informations d'une montre. Les étapes des projets existants ne changent jamais (RG-MON-08).
const watches = useWatchesStore()
const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const original = ref<WatchDetail | null>(null)
const loadError = ref<string | null>(null)
const movementTypes = ref<MovementType[]>([])
const complications = ref<Complication[]>([])

const brand = ref('')
const model = ref('')
const movementCode = ref('')
const complicationCodes = ref<string[]>([])
const purchasePrice = ref('')
const purchaseDate = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

onMounted(async () => {
  try {
    // Les listes de référence sont lues directement : le store d'aperçu des étapes recalculerait un aperçu dont cet écran n'a pas besoin.
    const [watch, types, comps] = await Promise.all([
      watches.get(id),
      apiFetch<MovementType[]>('/movement-types'),
      apiFetch<Complication[]>('/complications'),
    ])
    original.value = watch
    movementTypes.value = types
    complications.value = comps
    brand.value = watch.brand
    model.value = watch.model
    movementCode.value = watch.movementCode
    complicationCodes.value = watch.complications.map((c) => c.code)
    purchasePrice.value = watch.purchasePrice ?? ''
    purchaseDate.value = watch.purchaseDate ?? ''
  } catch (e) {
    loadError.value =
      e instanceof ApiError && e.status === 404
        ? 'Cette montre est introuvable.'
        : 'Impossible de charger la montre. Réessayez dans un instant.'
  }
})

/** Prix saisi → « 80.50 » (la virgule française est acceptée), null s'il est vide, undefined s'il est invalide (RG-MON-07). */
function parsePrice(): string | null | undefined {
  const raw = purchasePrice.value.trim().replace(',', '.')
  if (raw === '') return null
  return /^\d{1,8}(\.\d{1,2})?$/.test(raw) ? raw : undefined
}

function problem(): string | null {
  if (brand.value.trim() === '') return 'La marque est obligatoire.'
  if (model.value.trim() === '') return 'Le modèle est obligatoire.'
  if (parsePrice() === undefined) {
    return 'Le prix d’achat doit être un nombre positif ou nul, avec deux décimales au plus (99 999 999,99 € maximum).'
  }
  if (purchaseDate.value !== '' && purchaseDate.value > localToday()) return 'Une date d’achat dans le futur est refusée.'
  return null
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((code) => b.includes(code))

/** Uniquement les champs modifiés ; si les complications changent, la liste est envoyée en entier. */
const changes = computed<UpdateWatchPayload>(() => {
  const o = original.value
  if (!o) return {}
  const patch: UpdateWatchPayload = {}
  if (brand.value.trim() !== o.brand) patch.brand = brand.value.trim()
  if (model.value.trim() !== o.model) patch.model = model.value.trim()
  if (movementCode.value !== o.movementCode) patch.movementCode = movementCode.value
  if (
    !sameSet(
      complicationCodes.value,
      o.complications.map((c) => c.code),
    )
  )
    patch.complicationCodes = [...complicationCodes.value]
  const price = parsePrice()
  if (price !== undefined) {
    const before = o.purchasePrice
    const changed = price === null ? before !== null : before === null || Number(price) !== Number(before)
    if (changed) patch.purchasePrice = price
  }
  const date = purchaseDate.value === '' ? null : purchaseDate.value
  if (date !== o.purchaseDate) patch.purchaseDate = date
  return patch
})

const back = () => router.push({ name: 'watch-detail', params: { id } })

async function save(): Promise<void> {
  if (busy.value) return
  error.value = problem()
  if (error.value) return
  const patch = changes.value
  if (Object.keys(patch).length === 0) {
    await back()
    return
  }
  busy.value = true
  try {
    await watches.update(id, patch)
    await back()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="watch-form">
    <h1>Modifier la montre</h1>
    <p v-if="loadError" class="alert" role="alert">{{ loadError }}</p>

    <form v-else-if="original" novalidate @submit.prevent="save">
      <p v-if="error" class="alert" role="alert">{{ error }}</p>

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
        <label v-for="type in movementTypes" :key="type.movementCode" class="choice">
          <input v-model="movementCode" type="radio" name="movement" :value="type.movementCode" />
          <span>{{ type.label }}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Complications</legend>
        <label v-for="item in complications" :key="item.complicationCode" class="choice">
          <input v-model="complicationCodes" type="checkbox" :value="item.complicationCode" />
          <span>{{ item.label }}</span>
        </label>
        <p class="field-hint">Les étapes des projets existants ne changent pas : seules les prochaines révisions en tiennent compte.</p>
      </fieldset>

      <div class="field">
        <label for="purchasePrice">Prix d’achat (€) · facultatif</label>
        <input id="purchasePrice" v-model="purchasePrice" name="purchasePrice" type="text" inputmode="decimal" />
      </div>
      <div class="field">
        <label for="purchaseDate">Date d’achat · facultative</label>
        <input id="purchaseDate" v-model="purchaseDate" name="purchaseDate" type="date" :max="localToday()" />
      </div>

      <div class="actions">
        <button class="btn" type="submit" data-test="save" :disabled="busy">Enregistrer</button>
        <button class="btn btn-secondary" type="button" data-test="cancel" @click="back">Annuler</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.watch-form {
  display: grid;
  gap: var(--space-3);
}

h1,
p {
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

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.actions .btn {
  width: auto;
}
</style>
