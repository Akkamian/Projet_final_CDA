<script lang="ts">
// Compteur de module : un identifiant de titre unique par instance, pour aria-labelledby.
let sequence = 0
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

withDefaults(defineProps<{ title: string; variant?: 'form' | 'confirm' }>(), { variant: 'form' })
const emit = defineEmits<{ close: [] }>()

const titleId = `sheet-title-${++sequence}`
const dialog = ref<HTMLDialogElement | null>(null)
// Le parent monte la feuille (v-if) quand elle est demandée : on mémorise l'élément qui l'a ouverte pour lui rendre le focus.
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

onMounted(() => {
  const el = dialog.value
  if (!el) return
  if (typeof el.showModal === 'function') el.showModal()
  else el.setAttribute('open', '')
})

onBeforeUnmount(() => {
  if (opener?.isConnected) opener.focus()
})

// Le clic sur le fond (cible = le dialog lui-même, pas son contenu) ferme comme Échap.
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog ref="dialog" class="sheet" :class="variant" :aria-labelledby="titleId" @cancel.prevent="emit('close')" @click="onClick">
    <div class="sheet-frame">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-header">
        <h2 :id="titleId">{{ title }}</h2>
        <button type="button" class="sheet-close" data-test="sheet-close" aria-label="Fermer" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.sheet {
  width: 100%;
  max-width: 100%;
  max-height: 96%;
  margin: auto 0 0;
  padding: 0;
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: 20px 20px 0 0;
  background: var(--bg);
  color: var(--text);
  box-shadow: 0 -24px 50px -20px rgb(0 0 0 / 0.65);
  overflow: hidden;
}

.sheet.confirm {
  max-height: 88%;
}

.sheet::backdrop {
  background: rgb(5 7 10 / 0.72);
}

/* Un dialog ouvert est en display: block : le cadre interne porte la colonne flex (en-tête fixe, corps qui défile). */
.sheet-frame {
  display: flex;
  flex-direction: column;
  max-height: inherit;
}

.sheet-handle {
  flex: none;
  width: 36px;
  height: 4px;
  margin: var(--space-3) auto var(--space-2);
  border-radius: 2px;
  background: var(--border);
}

.sheet-header {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 var(--space-4) var(--space-4);
}

h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.sheet-close {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}

@media (min-width: 640px) {
  .sheet {
    margin: auto;
    max-width: 560px;
    max-height: min(90vh, 720px);
    border-bottom: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 24px 60px -20px rgb(0 0 0 / 0.7);
  }

  .sheet.confirm {
    max-width: 24rem;
  }

  .sheet-handle {
    display: none;
  }

  .sheet-header {
    padding-top: var(--space-4);
  }
}
</style>
