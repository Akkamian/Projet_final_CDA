<script setup lang="ts">
import Sheet from './Sheet.vue'

defineProps<{ title: string; message: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

// Échap, clic sur le fond et bouton fermer de la feuille valent « Annuler ». Le parent monte le composant (v-if) quand la confirmation est demandée.
</script>

<template>
  <Sheet :title="title" variant="confirm" @close="emit('cancel')">
    <div class="confirm-body">
      <p>{{ message }}</p>
      <slot />
      <div class="actions">
        <button type="button" data-test="confirm-cancel" @click="emit('cancel')">Annuler</button>
        <button type="button" class="danger" data-test="confirm-ok" @click="emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </Sheet>
</template>

<style scoped>
.confirm-body {
  display: grid;
  gap: var(--space-3);
  padding: 0 var(--space-4) var(--space-4);
  overflow-y: auto;
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

button.danger {
  border-color: var(--danger);
  background: var(--danger);
  color: var(--danger-ink);
}

@media (max-width: 639px) {
  .actions {
    flex-direction: column-reverse;
  }
}
</style>
