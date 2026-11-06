<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ id: string; label: string; autocomplete: string; maxlength?: number; name?: string; required?: boolean; hint?: string; error?: string | null }>()
const model = defineModel<string>({ required: true })

// Affiché en clair : état local à ce champ, il redevient masqué dès que le composant est démonté.
const shown = ref(false)
const describedBy = computed(() => [props.hint ? `${props.id}-hint` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="field password-field">
    <label :for="id">{{ label }}</label>
    <div class="password-control">
      <input
        :id="id"
        v-model="model"
        :name="name"
        :type="shown ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
      />
      <button
        type="button"
        class="password-eye"
        data-test="toggle-password"
        :aria-pressed="shown"
        :aria-label="shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        @click="shown = !shown"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="shown" d="M4 4l16 16" />
        </svg>
      </button>
    </div>
    <span v-if="hint" :id="`${id}-hint`" class="field-hint">{{ hint }}</span>
    <span v-if="error" :id="`${id}-error`" class="field-error" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.password-field > label {
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

.password-control {
  position: relative;
  display: grid;
}

.password-control input {
  min-height: 44px;
  padding: 0 44px 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.password-eye {
  position: absolute;
  top: 50%;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  transform: translateY(-50%);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.password-eye[aria-pressed='true'] {
  color: var(--accent-text);
}

.field-error {
  color: var(--danger-text);
  font-size: 0.8125rem;
}
</style>
