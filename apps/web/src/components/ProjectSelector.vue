<script setup lang="ts">
import { formatDate } from '../format'
import type { ProjectDetail } from '../stores/watches'

defineProps<{ projects: ProjectDetail[]; selectedId: number | null }>()
defineEmits<{ select: [id: number] }>()
</script>

<template>
  <!-- S26 : le choix n'a de sens qu'à partir de deux projets. -->
  <div v-if="projects.length >= 2" class="selector" data-test="project-selector">
    <label for="project-select">Projet</label>
    <select id="project-select" :value="selectedId ?? undefined" @change="$emit('select', Number(($event.target as HTMLSelectElement).value))">
      <option v-for="project in projects" :key="project.id" :value="project.id">
        {{ formatDate(project.createdAt) }} · {{ project.status === 'in_progress' ? 'En cours' : 'Terminé' }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.selector {
  display: grid;
  gap: var(--space-1);
}

select {
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
</style>
