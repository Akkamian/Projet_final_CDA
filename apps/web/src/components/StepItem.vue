<script setup lang="ts">
import type { StepDetail } from '../stores/watches'
import PhotoGallery from './PhotoGallery.vue'
import StepEditor from './StepEditor.vue'

defineProps<{
  step: StepDetail
  first: boolean
  last: boolean
  busy: boolean
  editing: boolean
}>()
const emit = defineEmits<{
  toggle: [done: boolean, box: HTMLInputElement]
  'move-up': []
  'move-down': []
  edit: []
  'cancel-edit': []
  save: [value: { label: string; notes: string | null }]
  delete: []
  'add-photos': [files: File[]]
  'remove-photo': [photo: { id: number; url: string }]
}>()

function onToggle(event: Event): void {
  const box = event.target as HTMLInputElement
  emit('toggle', box.checked, box)
}
</script>

<template>
  <li class="item" :class="{ done: step.isCompleted }" data-test="step">
    <div class="row">
      <label class="check">
        <input type="checkbox" :checked="step.isCompleted" :disabled="busy" @change="onToggle" />
        <span class="box" aria-hidden="true">
          <svg v-if="step.isCompleted" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="label" data-test="step-label">{{ step.label }}</span>
      </label>
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
  </li>
</template>

<style scoped>
.item {
  list-style: none;
  display: grid;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--touch-min);
}

.check {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-min);
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

.label {
  flex: 1;
  font-size: 14px;
}

.done .label {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.row button {
  min-width: 36px;
  min-height: 36px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
}

.row button:hover:not(:disabled) {
  color: var(--text);
}

.notes {
  margin: 0;
  padding-bottom: var(--space-2);
  color: var(--text-secondary);
  font-size: 13px;
  white-space: pre-wrap;
}
</style>
