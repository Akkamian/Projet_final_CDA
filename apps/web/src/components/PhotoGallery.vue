<script setup lang="ts">
import { fileUrl } from '../api/client'

defineProps<{ photos: { id: number; url: string }[]; label: string; busy: boolean }>()
const emit = defineEmits<{
  add: [files: File[]]
  remove: [photo: { id: number; url: string }]
}>()

function onChoose(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  // Permet de rechoisir le même fichier ensuite.
  if (files.length > 0) emit('add', files)
  input.value = ''
}
</script>

<template>
  <div class="gallery">
    <ul v-if="photos.length > 0" class="photos">
      <li v-for="photo in photos" :key="photo.id" data-test="photo">
        <a :href="fileUrl(photo.url)" target="_blank" rel="noopener">
          <img :src="fileUrl(photo.url)" :alt="`Photo de l’étape ${label}`" loading="lazy" />
        </a>
        <button
          type="button"
          data-test="photo-delete"
          :disabled="busy"
          :aria-label="`Supprimer cette photo de l’étape ${label}`"
          @click="emit('remove', photo)"
        >
          ✕
        </button>
      </li>
    </ul>
    <label class="add" :class="{ disabled: busy }">
      + Photo
      <input
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp"
        data-test="photo-input"
        :disabled="busy"
        @change="onChoose"
      />
    </label>
  </div>
</template>

<style scoped>
.gallery {
  display: grid;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  position: relative;
}

img {
  display: block;
  width: 72px;
  height: 72px;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

li button {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.65);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}

.add {
  justify-self: start;
  padding: var(--space-1) 0;
  color: var(--accent-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.add.disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
