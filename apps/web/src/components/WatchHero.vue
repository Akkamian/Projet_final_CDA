<script setup lang="ts">
import { computed } from 'vue'
import { fileUrl } from '../api/client'
import { MOVEMENT_LABELS, STATUS_LABELS } from '../format'
import type { DashboardStatus, ProjectDetail, WatchDetail } from '../stores/watches'

const props = defineProps<{ watch: WatchDetail; project: ProjectDetail | null; status: DashboardStatus }>()

// Même photo que la carte du tableau de bord : celle d'après, à défaut celle d'avant.
const photo = computed(() => props.project?.photoAfter ?? props.project?.photoBefore ?? null)

const subtitle = computed(() =>
  [MOVEMENT_LABELS[props.watch.movementCode], props.watch.complications.map((c) => c.label).join(', ')]
    .filter((part) => part !== '')
    .join(' · '),
)
</script>

<template>
  <div class="hero">
    <img v-if="photo" class="photo" :src="fileUrl(photo)" alt="" />
    <span v-else class="photo photo-empty" data-test="hero-empty" aria-hidden="true" />
    <div class="body">
      <h2>{{ watch.brand }} {{ watch.model }}</h2>
      <p class="subtitle" data-test="hero-subtitle">{{ subtitle }}</p>
      <span class="status" :class="`status-${status}`" data-test="status-badge">{{ STATUS_LABELS[status] }}</span>
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  gap: var(--space-3);
}

.photo {
  display: block;
  width: 100%;
  height: 150px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  object-fit: cover;
}

.photo-empty {
  border-style: dashed;
  border-color: var(--border-strong);
  background: transparent;
}

.body {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  min-width: 0;
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: 19px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 13px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-3);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  font-size: 12px;
}

.status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  content: '';
}

.status-completed::before {
  background: var(--accent-secondary);
}

.status-in_progress::before {
  background: var(--warning);
}

.status-sold::before {
  background: var(--success);
}

/* Desktop : carte d'en-tête, photo 200×140 à gauche du titre ; en colonne à ≤ 900 px. */
@media (min-width: 901px) {
  .hero {
    grid-template-columns: 200px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-5);
  }

  .photo {
    width: 200px;
    height: 140px;
  }

  h2 {
    font-size: 22px;
  }
}
</style>
