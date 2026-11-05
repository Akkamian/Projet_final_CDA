<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{ title: string; message: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

// L'événement natif « cancel » du dialog est celui de la touche Échap.
const dialog = ref<HTMLDialogElement | null>(null)

// Le parent monte le composant (v-if) quand la confirmation est demandée : il s'ouvre en modal à ce moment.
onMounted(() => {
  const el = dialog.value
  if (!el) return
  if (typeof el.showModal === 'function') el.showModal()
  else el.setAttribute('open', '')
})
</script>

<template>
  <dialog ref="dialog" class="confirm" aria-labelledby="confirm-title" @cancel.prevent="emit('cancel')">
    <h2 id="confirm-title">{{ title }}</h2>
    <p>{{ message }}</p>
    <div class="actions">
      <button type="button" data-test="confirm-cancel" @click="emit('cancel')">Annuler</button>
      <button type="button" class="danger" data-test="confirm-ok" @click="emit('confirm')">
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm {
  max-width: min(90vw, 24rem);
  padding: var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}

.confirm::backdrop {
  background: rgb(0 0 0 / 0.6);
}

h2,
p {
  margin: 0 0 var(--space-3);
}

h2 {
  font-size: 16px;
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
</style>
