<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ modelValue: string; width?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const input = ref<HTMLInputElement | null>(null)
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <label class="search" :style="width ? { width } : undefined">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.6" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
    <input
      ref="input"
      type="search"
      aria-label="Rechercher une montre"
      placeholder="Rechercher une montre"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-secondary);
}

.search:focus-within {
  border-color: var(--accent-text);
}

input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  outline: none;
}
</style>
