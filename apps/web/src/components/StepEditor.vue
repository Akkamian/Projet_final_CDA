<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  notes: string | null
  busy?: boolean
}>()
const emit = defineEmits<{
  save: [value: { label: string; notes: string | null }]
  cancel: []
}>()

const label = ref(props.label)
const notes = ref(props.notes ?? '')
const error = ref<string | null>(null)

function submit(): void {
  const trimmed = label.value.trim()
  if (trimmed === '') {
    error.value = 'Le libellé d’une étape est obligatoire.'
    return
  }
  error.value = null
  // Une note vide efface la note (S16).
  emit('save', {
    label: trimmed,
    notes: notes.value.trim() === '' ? null : notes.value,
  })
}
</script>

<template>
  <form class="editor" @submit.prevent="submit">
    <label>
      Libellé
      <input v-model="label" data-test="edit-label" type="text" maxlength="255" />
    </label>
    <label>
      Note
      <textarea v-model="notes" data-test="edit-notes" rows="3"></textarea>
    </label>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <div class="actions">
      <button type="button" data-test="edit-cancel" @click="emit('cancel')">Annuler</button>
      <button type="submit" class="primary" data-test="edit-save" :disabled="busy">Enregistrer</button>
    </div>
  </form>
</template>

<style scoped>
.editor {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

label {
  display: grid;
  gap: var(--space-1);
  color: var(--text-secondary);
  font-size: 13px;
}

input,
textarea {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

input {
  min-height: var(--touch-min);
}

p {
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

button {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

button.primary {
  border-color: var(--accent-text);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}
</style>
