<script setup lang="ts">
import { ref } from 'vue'
import { fileUrl } from '../api/client'
import { useWatchesStore } from '../stores/watches'
import { prepareUpload } from '../utils/prepare-upload'
import ConfirmDialog from './ConfirmDialog.vue'

type Kind = 'before' | 'after'

const props = defineProps<{ projectId: number; photoBefore: string | null; photoAfter: string | null }>()
const emit = defineEmits<{ change: [value: { kind: Kind; url: string | null }] }>()

const watches = useWatchesStore()
const busy = ref(false)
const error = ref<string | null>(null)
const removing = ref<Kind | null>(null)

const slots: { kind: Kind; caption: string; empty: string }[] = [
  { kind: 'before', caption: 'Avant', empty: 'Photo d’état initial' },
  { kind: 'after', caption: 'Après', empty: 'Photo d’état final' },
]

const urlOf = (kind: Kind) => (kind === 'before' ? props.photoBefore : props.photoAfter)

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

async function choose(kind: Kind, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await run(async () => {
    const { url } = await watches.setProjectPhoto(props.projectId, kind, await prepareUpload(file))
    emit('change', { kind, url })
  })
}

async function confirmRemove(): Promise<void> {
  const kind = removing.value
  if (!kind) return
  await run(async () => {
    await watches.removeProjectPhoto(props.projectId, kind)
    emit('change', { kind, url: null })
  })
  // Le dialogue se ferme aussi en cas d'échec : l'alerte, derrière un dialogue modal, resterait invisible.
  removing.value = null
}
</script>

<template>
  <section class="before-after-block">
    <h3>Avant / Après</h3>
    <div class="before-after">
      <figure v-for="slot in slots" :key="slot.kind">
        <a v-if="urlOf(slot.kind)" :href="fileUrl(urlOf(slot.kind)!)" target="_blank" rel="noopener" class="img-slot">
          <img :src="fileUrl(urlOf(slot.kind)!)" :alt="`Photo ${slot.caption.toLowerCase()}`" loading="lazy" />
        </a>
        <div v-else class="img-slot empty">{{ slot.empty }}</div>
        <figcaption>{{ slot.caption }}<template v-if="!urlOf(slot.kind)"> — pas encore ajoutée</template></figcaption>
        <div class="actions">
          <label class="ghost" :class="{ disabled: busy }">
            {{ urlOf(slot.kind) ? 'Remplacer' : 'Ajouter' }}
            <input
              type="file"
              class="visually-hidden-input"
              accept="image/jpeg,image/png,image/webp"
              :data-test="`photo-input-${slot.kind}`"
              :disabled="busy"
              @change="choose(slot.kind, $event)"
            />
          </label>
          <button
            v-if="urlOf(slot.kind)"
            type="button"
            class="ghost danger"
            :data-test="`photo-remove-${slot.kind}`"
            :disabled="busy"
            @click="removing = slot.kind"
          >
            Retirer
          </button>
        </div>
      </figure>
    </div>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <ConfirmDialog
      v-if="removing"
      title="Retirer cette photo ?"
      message="La photo sera définitivement supprimée."
      confirm-label="Retirer"
      @confirm="confirmRemove"
      @cancel="removing = null"
    />
  </section>
</template>

<style scoped>
.before-after-block {
  display: grid;
  gap: var(--space-3);
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 15px;
}

.before-after {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

figure {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
}

.img-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--accent-secondary);
}

.img-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-slot.empty {
  border-style: dashed;
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

figcaption {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

.actions {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
}

.ghost {
  min-height: var(--touch-min);
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent-text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ghost.danger {
  color: var(--danger-text);
}

.visually-hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.ghost:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.ghost.disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
