<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

defineProps<{ canReopen: boolean; reopenNote: string | null; hasProject: boolean }>()
const emit = defineEmits<{ edit: []; reopen: []; 'remove-project': []; 'remove-watch': [] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

const itemElements = (): HTMLElement[] => [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]

function close(refocus = true): void {
  open.value = false
  if (refocus) void nextTick(() => toggle.value?.focus())
}

function onDocumentClick(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) close(false)
}

// Le clic extérieur n'est écouté que menu ouvert.
watch(open, async (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocumentClick)
    await nextTick()
    itemElements()[0]?.focus()
  } else {
    document.removeEventListener('click', onDocumentClick)
  }
})
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (step === 0) return
  event.preventDefault()
  const items = itemElements()
  const current = items.indexOf(document.activeElement as HTMLElement)
  items[(current + step + items.length) % items.length]?.focus()
}

// Une entrée désactivée garde le focus (elle est annoncée, avec sa note) mais ne fait rien.
function pick(event: 'edit' | 'reopen' | 'remove-project' | 'remove-watch', disabled = false): void {
  if (disabled) return
  close()
  if (event === 'edit') emit('edit')
  else if (event === 'reopen') emit('reopen')
  else if (event === 'remove-project') emit('remove-project')
  else emit('remove-watch')
}
</script>

<template>
  <div ref="root" class="menu-wrap">
    <button
      ref="toggle"
      type="button"
      class="toggle"
      data-test="menu-toggle"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Plus d’actions"
      @click="open = !open"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
    </button>
    <div v-if="open" ref="menu" class="menu" role="menu" @keydown="onKeydown">
      <button type="button" role="menuitem" class="item" @click="pick('edit')">Modifier la montre</button>
      <template v-if="hasProject">
        <button type="button" role="menuitem" class="item" :aria-disabled="!canReopen" @click="pick('reopen', !canReopen)">
          Rouvrir ce projet
          <span v-if="!canReopen && reopenNote" class="note">{{ reopenNote }}</span>
        </button>
        <button type="button" role="menuitem" class="item danger" @click="pick('remove-project')">Supprimer ce projet</button>
      </template>
      <button type="button" role="menuitem" class="item danger" @click="pick('remove-watch')">Supprimer la montre</button>
    </div>
  </div>
</template>

<style scoped>
.menu-wrap {
  position: relative;
}

.toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-min);
  height: var(--touch-min);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 5;
  display: grid;
  min-width: 240px;
  padding: var(--space-1);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
}

.item {
  display: grid;
  gap: 2px;
  min-height: var(--touch-min);
  align-content: center;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.item:hover,
.item:focus-visible {
  background: rgb(255 255 255 / 0.05);
}

.item.danger {
  color: var(--danger-text);
}

.item[aria-disabled='true'] {
  color: var(--text-secondary);
  cursor: default;
}

.note {
  font-size: 12px;
}
</style>
