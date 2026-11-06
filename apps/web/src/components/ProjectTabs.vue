<script setup lang="ts">
import { formatDate } from '../format'
import type { ProjectDetail } from '../stores/watches'

const props = defineProps<{ projects: ProjectDetail[]; selectedId: number | null }>()
const emit = defineEmits<{ select: [id: number] }>()

const label = (project: ProjectDetail) => `${formatDate(project.createdAt)} · ${project.status === 'in_progress' ? 'En cours' : 'Terminé'}`

// Flèches gauche et droite : on passe à l'onglet voisin (en boucle) et le focus le suit.
function onKey(event: KeyboardEvent, index: number): void {
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (step === 0) return
  event.preventDefault()
  const next = (index + step + props.projects.length) % props.projects.length
  emit('select', props.projects[next]!.id)
  ;((event.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement | undefined)?.focus()
}
</script>

<template>
  <!-- S26 : le choix n'a de sens qu'à partir de deux projets. -->
  <div v-if="projects.length >= 2" class="tabs" role="tablist" aria-label="Projets de restauration" data-test="project-tabs">
    <button
      v-for="(project, index) in projects"
      :key="project.id"
      type="button"
      role="tab"
      class="tab tabular"
      :aria-selected="project.id === selectedId"
      :tabindex="project.id === selectedId ? 0 : -1"
      @click="emit('select', project.id)"
      @keydown="onKey($event, index)"
    >
      {{ label(project) }}
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tab {
  min-height: 34px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.tab[aria-selected='true'] {
  border-color: var(--accent-text);
  background: var(--accent);
  color: var(--accent-ink);
}
</style>
