<script setup lang="ts">
import { onMounted } from 'vue'
import { useStepPreviewStore } from '../stores/stepPreview'

const store = useStepPreviewStore()

onMounted(() => store.loadReferenceData())
</script>

<template>
  <section class="preview">
    <h1>Aperçu des étapes</h1>
    <p class="hint">
      La checklist est générée d’après le type de mouvement et les complications de la montre.
    </p>

    <p v-if="store.error" class="error" role="alert">{{ store.error }}</p>

    <fieldset>
      <legend>Type de mouvement</legend>
      <label v-for="type in store.movementTypes" :key="type.movementCode" class="choice">
        <input
          type="radio"
          name="movement"
          :value="type.movementCode"
          :checked="store.movementCode === type.movementCode"
          @change="store.selectMovement(type.movementCode)"
        />
        <span>{{ type.label }}</span>
      </label>
    </fieldset>

    <fieldset>
      <legend>Complications</legend>
      <label v-for="item in store.complications" :key="item.complicationCode" class="choice">
        <input
          type="checkbox"
          :value="item.complicationCode"
          :checked="store.complicationCodes.includes(item.complicationCode)"
          @change="store.toggleComplication(item.complicationCode)"
        />
        <span>{{ item.label }}</span>
      </label>
    </fieldset>

    <h2>Étapes proposées ({{ store.steps.length }})</h2>
    <ol class="steps">
      <li v-for="step in store.steps" :key="`${step.complicationCode ?? 'base'}-${step.stepOrder}`">
        <span class="step-label">{{ step.label }}</span>
        <span v-if="step.complicationLabel" class="badge">{{ step.complicationLabel }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.hint {
  color: var(--text-secondary);
}

.error {
  padding: var(--space-3);
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  color: var(--danger-text);
}

fieldset {
  margin: var(--space-4) 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

legend {
  padding: 0 var(--space-2);
  color: var(--text-secondary);
}

.choice {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-min);
}

.steps {
  margin: 0;
  padding-left: var(--space-5);
}

.steps li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.badge {
  padding: 0 var(--space-2);
  border: 1px solid var(--accent-warm);
  border-radius: var(--radius-sm);
  color: var(--accent-warm-text);
  font-size: 0.8125rem;
}
</style>
