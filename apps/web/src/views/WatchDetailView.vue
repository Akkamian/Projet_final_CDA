<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '../api/client'
import BeforeAfter from '../components/BeforeAfter.vue'
import FinanceBlock from '../components/FinanceBlock.vue'
import PerformanceBlock from '../components/PerformanceBlock.vue'
import ProjectSelector from '../components/ProjectSelector.vue'
import StepList from '../components/StepList.vue'
import { MOVEMENT_LABELS } from '../format'
import { useWatchesStore, type ExpenseDetail, type WatchDetail } from '../stores/watches'

const watches = useWatchesStore()
const route = useRoute()

const watch = ref<WatchDetail | null>(null)
const error = ref<string | null>(null)
const selectedId = ref<number | null>(null)

// L'API trie du plus récent au plus ancien (RG-PRJ-08) : le premier est affiché d'abord.
const project = computed(() => watch.value?.projects.find((p) => p.id === selectedId.value) ?? null)

onMounted(async () => {
  try {
    const loaded = await watches.get(Number(route.params.id))
    watch.value = loaded
    selectedId.value = loaded.projects[0]?.id ?? null
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 404
        ? 'Cette montre est introuvable.'
        : 'Impossible de charger la montre. Réessayez dans un instant.'
  }
})

// Les coûts ne portent pas la marge : après chaque écriture, on relit la fiche et on n'en garde que la marge.
async function updateExpenses({ projectId, expenses }: { projectId: number; expenses: ExpenseDetail[] }): Promise<void> {
  const target = watch.value?.projects.find((p) => p.id === projectId)
  if (!target || !watch.value) return
  target.expenses = expenses
  try {
    const fresh = await watches.get(watch.value.id)
    watch.value.margin = fresh.margin
  } catch {
    // La liste est à jour ; la marge se corrigera à la prochaine ouverture de la fiche.
  }
}

// La revente répond par la fiche : on en reprend la revente et la marge, pas les projets (qui portent l'état en cours d'édition).
function updateResale(fresh: WatchDetail): void {
  if (!watch.value) return
  watch.value.resalePrice = fresh.resalePrice
  watch.value.resaleDate = fresh.resaleDate
  watch.value.margin = fresh.margin
}
</script>

<template>
  <section class="detail">
    <p><RouterLink to="/">← Mes montres</RouterLink></p>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <template v-else-if="watch">
      <h1>{{ watch.brand }} {{ watch.model }}</h1>
      <p class="hint">
        {{ MOVEMENT_LABELS[watch.movementCode] }}
        <template v-if="watch.complications.length > 0"> · {{ watch.complications.map((c) => c.label).join(', ') }}</template>
      </p>

      <p v-if="watch.projects.length === 0" class="notice">Aucun projet pour cette montre.</p>
      <template v-else>
        <ProjectSelector :projects="watch.projects" :selected-id="selectedId" @select="selectedId = $event" />
        <template v-if="project">
          <h2>{{ project.status === 'in_progress' ? 'En cours' : 'Terminé' }}</h2>
          <BeforeAfter
            :key="`photos-${project.id}`"
            :project-id="project.id"
            :photo-before="project.photoBefore"
            :photo-after="project.photoAfter"
            @change="project[$event.kind === 'before' ? 'photoBefore' : 'photoAfter'] = $event.url"
          />
          <!-- key : la liste (éditeur, ajout, requêtes en vol) ne se réutilise jamais d'un projet à l'autre. -->
          <StepList :key="project.id" :project-id="project.id" :steps="project.steps" @update:steps="project.steps = $event" />
          <PerformanceBlock
            :key="`perf-${project.id}`"
            :project-id="project.id"
            :measurements="project.measurements"
            @update:measurements="project.measurements = $event"
          />
        </template>
      </template>

      <FinanceBlock :watch="watch" :selected-project-id="selectedId" @update:expenses="updateExpenses" @update:resale="updateResale" />
    </template>
  </section>
</template>

<style scoped>
.detail {
  display: grid;
  gap: var(--space-3);
}

h1,
h2,
p {
  margin: 0;
}
</style>
