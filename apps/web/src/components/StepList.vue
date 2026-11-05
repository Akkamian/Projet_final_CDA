<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWatchesStore, type StepDetail } from '../stores/watches'
import ConfirmDialog from './ConfirmDialog.vue'
import StepItem from './StepItem.vue'
import { prepareUpload } from '../utils/prepare-upload'

const props = defineProps<{ projectId: number; steps: StepDetail[] }>()
const emit = defineEmits<{ 'update:steps': [steps: StepDetail[]] }>()

const watches = useWatchesStore()

const busy = ref(false)
const error = ref<string | null>(null)
const editingId = ref<number | null>(null)
const deleting = ref<StepDetail | null>(null)
const removingPhoto = ref<{ step: StepDetail; photo: { id: number; url: string } } | null>(null)
const adding = ref(false)
const newLabel = ref('')

const doneCount = computed(() => props.steps.filter((s) => s.isCompleted).length)

/** Une seule écriture à la fois ; une erreur de l'API laisse la liste telle qu'elle était. */
async function run(action: () => Promise<void>): Promise<boolean> {
  if (busy.value) return false
  busy.value = true
  error.value = null
  try {
    await action()
    return true
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : 'L’opération a échoué. Réessayez dans un instant.'
    return false
  } finally {
    busy.value = false
  }
}

function replace(updated: StepDetail): void {
  emit(
    'update:steps',
    props.steps.map((s) => (s.id === updated.id ? updated : s)),
  )
}

async function toggle(step: StepDetail, done: boolean, box: HTMLInputElement): Promise<void> {
  const ok = await run(async () => replace(await watches.updateStep(props.projectId, step.id, { isCompleted: done })))
  if (!ok) box.checked = step.isCompleted
}

async function move(index: number, offset: -1 | 1): Promise<void> {
  const ids = props.steps.map((s) => s.id)
  const [moved] = ids.splice(index, 1)
  ids.splice(index + offset, 0, moved!)
  await run(async () => emit('update:steps', await watches.reorderSteps(props.projectId, ids)))
}

async function saveEdit(step: StepDetail, value: { label: string; notes: string | null }): Promise<void> {
  const ok = await run(async () => replace(await watches.updateStep(props.projectId, step.id, value)))
  if (ok) editingId.value = null
}

async function confirmDelete(): Promise<void> {
  const step = deleting.value
  if (!step) return
  await run(async () => {
    await watches.removeStep(props.projectId, step.id)
    // Les rangs restent 1..n (RG-ETP-13) : l'API renumérote, on reflète le même résultat.
    emit(
      'update:steps',
      props.steps.filter((s) => s.id !== step.id).map((s, i) => ({ ...s, stepOrder: i + 1 })),
    )
  })
  // Le dialogue se ferme aussi en cas d'échec : l'alerte, derrière un dialogue modal, resterait invisible.
  deleting.value = null
}

/** Un envoi par fichier, dans l'ordre ; en cas d'échec, les photos déjà envoyées restent affichées (S17). */
async function addPhotos(step: StepDetail, files: File[]): Promise<void> {
  await run(async () => {
    let steps = props.steps
    for (const file of files) {
      const photo = await watches.addStepPhoto(props.projectId, step.id, await prepareUpload(file))
      steps = steps.map((s) => (s.id === step.id ? { ...s, photos: [...s.photos, photo] } : s))
      emit('update:steps', steps)
    }
  })
}

async function confirmRemovePhoto(): Promise<void> {
  const target = removingPhoto.value
  if (!target) return
  await run(async () => {
    await watches.removeStepPhoto(props.projectId, target.step.id, target.photo.id)
    emit(
      'update:steps',
      props.steps.map((s) => (s.id === target.step.id ? { ...s, photos: s.photos.filter((p) => p.id !== target.photo.id) } : s)),
    )
  })
  // Le dialogue se ferme aussi en cas d'échec : l'alerte, derrière un dialogue modal, resterait invisible.
  removingPhoto.value = null
}

async function add(): Promise<void> {
  const label = newLabel.value.trim()
  if (label === '') {
    error.value = 'Le libellé d’une étape est obligatoire.'
    return
  }
  const ok = await run(async () => emit('update:steps', [...props.steps, await watches.addStep(props.projectId, label)]))
  if (ok) {
    newLabel.value = ''
    adding.value = false
  }
}
</script>

<template>
  <section class="checklist">
    <header>
      <div>
        <h3>Checklist de restauration</h3>
        <p class="progress">{{ doneCount }}/{{ steps.length }} terminées</p>
      </div>
      <button type="button" class="ghost" data-test="add-open" @click="adding = !adding">+ Étape</button>
    </header>

    <form v-if="adding" class="add" @submit.prevent="add">
      <input
        v-model="newLabel"
        data-test="add-label"
        type="text"
        maxlength="255"
        placeholder="Libellé de l’étape"
        aria-label="Libellé de la nouvelle étape"
      />
      <button type="submit" data-test="add-submit" :disabled="busy">Ajouter</button>
    </form>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <ol>
      <StepItem
        v-for="(step, index) in steps"
        :key="step.id"
        :step="step"
        :first="index === 0"
        :last="index === steps.length - 1"
        :busy="busy"
        :editing="editingId === step.id"
        @toggle="(done, box) => toggle(step, done, box)"
        @move-up="move(index, -1)"
        @move-down="move(index, 1)"
        @edit="editingId = editingId === step.id ? null : step.id"
        @cancel-edit="editingId = null"
        @save="(value) => saveEdit(step, value)"
        @delete="deleting = step"
        @add-photos="(files) => addPhotos(step, files)"
        @remove-photo="(photo) => (removingPhoto = { step, photo })"
      />
    </ol>

    <ConfirmDialog
      v-if="deleting"
      title="Supprimer cette étape ?"
      :message="`« ${deleting.label} » sera supprimée avec sa note et ses photos. Cette action est définitive.`"
      confirm-label="Supprimer"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
    <ConfirmDialog
      v-if="removingPhoto"
      title="Supprimer cette photo ?"
      message="La photo sera définitivement supprimée."
      confirm-label="Supprimer"
      @confirm="confirmRemovePhoto"
      @cancel="removingPhoto = null"
    />
  </section>
</template>

<style scoped>
.checklist {
  display: grid;
  gap: var(--space-3);
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 15px;
}

.progress {
  color: var(--text-secondary);
  font-size: 13px;
}

ol {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
}

.ghost {
  min-height: var(--touch-min);
  padding: 0 var(--space-2);
  border: 0;
  background: transparent;
  color: var(--accent-text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.add {
  display: flex;
  gap: var(--space-2);
}

.add input {
  flex: 1;
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.add button {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border: 1px solid var(--accent-text);
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
