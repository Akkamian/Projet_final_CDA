<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '../format'
import type { StepDetail } from '../stores/watches'
import PhotoGallery from './PhotoGallery.vue'
import StepEditor from './StepEditor.vue'

const props = defineProps<{
  step: StepDetail
  /** Rang affiché, à partir de 0 (« 01 » pour 0). */
  index: number
  first: boolean
  last: boolean
  busy: boolean
  editing: boolean
  expanded: boolean
}>()
const emit = defineEmits<{
  toggle: [done: boolean, box: HTMLInputElement]
  'toggle-expand': []
  'move-up': []
  'move-down': []
  edit: []
  'cancel-edit': []
  save: [value: { label: string; notes: string | null }]
  delete: []
  'add-photos': [files: File[]]
  'remove-photo': [photo: { id: number; url: string }]
}>()

const rank = computed(() => String(props.index + 1).padStart(2, '0'))
const photosChip = computed(() => {
  const n = props.step.photos.length
  return n === 0 ? null : `${n} photo${n > 1 ? 's' : ''}`
})
// Date de fin pour une étape terminée ; « Notes en cours » pour une étape ouverte qui a déjà une note.
const status = computed(() => {
  if (props.step.isCompleted && props.step.completedAt) return `Terminé le ${formatDate(props.step.completedAt)}`
  if (!props.step.isCompleted && props.step.notes) return 'Notes en cours'
  return null
})

function onToggle(event: Event): void {
  const box = event.target as HTMLInputElement
  emit('toggle', box.checked, box)
}
</script>

<template>
  <li class="item" :class="{ done: step.isCompleted, open: expanded }" data-test="step">
    <div class="row">
      <!-- La case seule coche l'étape ; le titre, lui, déplie la ligne (un appui sur le titre ne doit jamais changer l'état de l'étape). -->
      <label class="check">
        <input type="checkbox" :aria-label="step.label" :checked="step.isCompleted" :disabled="busy" @change="onToggle" />
        <span class="box" aria-hidden="true">
          <svg v-if="step.isCompleted" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </label>
      <button type="button" class="title" data-test="step-title" tabindex="-1" @click="emit('toggle-expand')">
        <span class="index tabular" aria-hidden="true">{{ rank }}</span>
        <span class="label" data-test="step-label">{{ step.label }}</span>
      </button>
      <span v-if="photosChip || status" class="meta">
        <span v-if="photosChip" class="chip" data-test="step-photos-chip">{{ photosChip }}</span>
        <span v-if="status" class="status">{{ status }}</span>
      </span>
      <button
        type="button"
        class="chevron"
        data-test="expand"
        :aria-expanded="expanded"
        :aria-controls="`step-panel-${step.id}`"
        :aria-label="`Détail de l’étape ${step.label}`"
        @click="emit('toggle-expand')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- v-show : le panneau reste dans le DOM (état de la saisie, envois en cours) mais n'est ni visible ni atteignable au clavier quand il est replié. -->
    <div v-show="expanded" :id="`step-panel-${step.id}`" class="panel" data-test="step-panel">
      <div class="actions">
        <button
          v-if="!first"
          type="button"
          data-test="move-up"
          :disabled="busy"
          :aria-label="`Monter l’étape ${step.label}`"
          @click="emit('move-up')"
        >
          ↑
        </button>
        <button
          v-if="!last"
          type="button"
          data-test="move-down"
          :disabled="busy"
          :aria-label="`Descendre l’étape ${step.label}`"
          @click="emit('move-down')"
        >
          ↓
        </button>
        <button type="button" data-test="edit" :disabled="busy" :aria-label="`Modifier l’étape ${step.label}`" @click="emit('edit')">
          ✎
        </button>
        <button type="button" data-test="delete" :disabled="busy" :aria-label="`Supprimer l’étape ${step.label}`" @click="emit('delete')">
          ✕
        </button>
      </div>
      <p v-if="step.notes && !editing" class="notes" data-test="step-notes">
        {{ step.notes }}
      </p>
      <PhotoGallery
        :photos="step.photos"
        :label="step.label"
        :busy="busy"
        @add="emit('add-photos', $event)"
        @remove="emit('remove-photo', $event)"
      />
      <StepEditor
        v-if="editing"
        :label="step.label"
        :notes="step.notes"
        :busy="busy"
        @save="emit('save', $event)"
        @cancel="emit('cancel-edit')"
      />
    </div>
  </li>
</template>

<style scoped>
.item {
  list-style: none;
  display: grid;
  border-bottom: 1px solid var(--border);
}

.item:last-child {
  border-bottom: none;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
}

.check {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  min-height: var(--touch-min);
  cursor: pointer;
}

.title {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  min-height: var(--touch-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

/* La case native reste dans l'arbre d'accessibilité ; la case dessinée la remplace à l'écran. */
.check input {
  position: absolute;
  opacity: 0;
  width: 20px;
  height: 20px;
}

.box {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  background: var(--bg);
  color: var(--accent-ink);
}

.check input:focus-visible + .box {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.done .box {
  border-color: var(--accent-text);
  background: var(--accent);
}

.index {
  flex: none;
  width: 22px;
  color: var(--text-secondary);
  font-size: 12px;
}

.label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}

.done .label {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.meta {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

/* Maquette mobile : la ligne n'a que la case, le titre et le chevron ; l'index et les puces apparaissent à partir de 640 px. */
@media (max-width: 639px) {
  .index,
  .meta {
    display: none;
  }
}

.chevron {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: transform 0.15s;
}

.open .chevron {
  transform: rotate(90deg);
}

.panel {
  display: grid;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-3);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
}

.actions button {
  min-width: 36px;
  min-height: 36px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
}

.actions button:hover:not(:disabled) {
  color: var(--text);
}

.notes {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: pre-wrap;
}
</style>
