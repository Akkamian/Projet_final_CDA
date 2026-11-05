<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '../api/client'
import BeforeAfter from '../components/BeforeAfter.vue'
import ProjectSelector from '../components/ProjectSelector.vue'
import StepList from '../components/StepList.vue'
import { formatDate, formatMoney, MOVEMENT_LABELS } from '../format'
import { useWatchesStore, type WatchDetail } from '../stores/watches'

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

      <dl class="facts">
        <template v-if="watch.purchasePrice !== null || watch.purchaseDate !== null">
          <dt>Achat</dt>
          <dd>
            <template v-if="watch.purchasePrice !== null">{{ formatMoney(watch.purchasePrice) }}</template>
            <template v-if="watch.purchaseDate !== null"> le {{ formatDate(watch.purchaseDate) }}</template>
          </dd>
        </template>
        <template v-if="watch.resaleDate !== null">
          <dt>Vendue</dt>
          <dd>
            <template v-if="watch.resalePrice !== null">{{ formatMoney(watch.resalePrice) }}</template>
            le {{ formatDate(watch.resaleDate) }}
          </dd>
        </template>
        <template v-if="watch.margin !== null">
          <dt>Marge</dt>
          <dd data-test="margin">{{ formatMoney(watch.margin) }}</dd>
        </template>
      </dl>

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
        </template>
      </template>
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

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-4);
  margin: 0;
}

dt {
  color: var(--text-secondary);
}

dd {
  margin: 0;
}
</style>
