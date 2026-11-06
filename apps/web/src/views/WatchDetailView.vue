<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '../api/client'
import BeforeAfter from '../components/BeforeAfter.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import FinanceBlock from '../components/FinanceBlock.vue'
import PageHeader from '../components/PageHeader.vue'
import PerformanceBlock from '../components/PerformanceBlock.vue'
import ProjectTabs from '../components/ProjectTabs.vue'
import StepList from '../components/StepList.vue'
import WatchFacts from '../components/WatchFacts.vue'
import WatchHero from '../components/WatchHero.vue'
import WatchMenu from '../components/WatchMenu.vue'
import { formatDate } from '../format'
import { useWatchesStore, type DashboardStatus, type ExpenseDetail, type ProjectDetail, type WatchDetail } from '../stores/watches'
import { errorMessage } from '../utils/today'

const watches = useWatchesStore()
const route = useRoute()
const router = useRouter()

const watch = ref<WatchDetail | null>(null)
const error = ref<string | null>(null)
const selectedId = ref<number | null>(null)
const busy = ref(false)
const actionError = ref<string | null>(null)
const removing = ref<'project' | 'watch' | null>(null)

// L'API trie du plus récent au plus ancien (RG-PRJ-08) : le premier est affiché d'abord.
const project = computed(() => watch.value?.projects.find((p) => p.id === selectedId.value) ?? null)

const sold = computed(() => watch.value?.resaleDate != null)
const hasInProgress = computed(() => watch.value?.projects.some((p) => p.status === 'in_progress') ?? false)
// RG-AFF-04, RG-PRJ-05, RG-PRJ-09 : ni nouvelle révision ni réouverture sur une montre vendue ou qui a déjà un projet en cours.
const canOpenProject = computed(() => !sold.value && !hasInProgress.value)

// Badge de la fiche : vendue prime ; sinon l'état du projet affiché, ou « Sans projet ».
const status = computed<DashboardStatus>(() => (sold.value ? 'sold' : project.value ? project.value.status : 'no_project'))

const canReopen = computed(() => project.value?.status === 'completed' && canOpenProject.value)
const reopenNote = computed(() => {
  if (canReopen.value || !project.value) return null
  if (project.value.status === 'in_progress') return 'Ce projet est déjà en cours.'
  if (sold.value) return 'Montre vendue : un projet ne peut plus être rouvert.'
  return 'Un autre projet est en cours.'
})

const title = computed(() => (watch.value ? `${watch.value.brand} ${watch.value.model}` : 'Fiche montre'))

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

// Les coûts ne portent ni la marge ni le coût de revient : après chaque écriture, on relit la fiche et on n'en garde que ces deux champs.
async function updateExpenses({ projectId, expenses }: { projectId: number; expenses: ExpenseDetail[] }): Promise<void> {
  const target = watch.value?.projects.find((p) => p.id === projectId)
  if (!target || !watch.value) return
  target.expenses = expenses
  await refreshDerived()
}

// Les coûts d'un projet supprimé ne comptent plus : marge et coût de revient se relisent sur la fiche, comme après un coût.
async function refreshDerived(): Promise<void> {
  if (!watch.value) return
  try {
    const fresh = await watches.get(watch.value.id)
    watch.value.margin = fresh.margin
    watch.value.costPrice = fresh.costPrice
  } catch {
    // La fiche affichée est à jour ; marge et coût de revient se corrigeront à la prochaine ouverture.
  }
}

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  actionError.value = null
  try {
    await action()
  } catch (e) {
    actionError.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

// L'API répond par le projet : on n'en reprend que l'état, les étapes et les saisies affichées restent celles de l'écran.
function applyState(updated: ProjectDetail): void {
  const target = watch.value?.projects.find((p) => p.id === updated.id)
  if (!target) return
  target.status = updated.status
  target.completedAt = updated.completedAt
}

const complete = () => run(async () => applyState(await watches.completeProject(project.value!.id)))
const reopen = () => run(async () => applyState(await watches.reopenProject(project.value!.id)))
const edit = () => router.push({ name: 'edit-watch', params: { id: watch.value!.id } })

async function confirmRemove(): Promise<void> {
  const kind = removing.value
  const current = watch.value
  if (!kind || !current) return
  await run(async () => {
    if (kind === 'watch') {
      await watches.removeWatch(current.id)
      await router.push({ name: 'home' })
      return
    }
    const id = project.value!.id
    await watches.removeProject(id)
    current.projects = current.projects.filter((p) => p.id !== id)
    selectedId.value = current.projects[0]?.id ?? null
    await refreshDerived()
  })
  // Le dialogue se ferme aussi en cas d'échec : l'alerte, derrière un dialogue modal, resterait invisible.
  removing.value = null
}

// La revente répond par la fiche : on en reprend la revente et la marge, pas les projets (qui portent l'état en cours d'édition).
function updateResale(fresh: WatchDetail): void {
  if (!watch.value) return
  watch.value.resalePrice = fresh.resalePrice
  watch.value.resaleDate = fresh.resaleDate
  watch.value.margin = fresh.margin
  watch.value.costPrice = fresh.costPrice
}
</script>

<template>
  <section class="detail">
    <PageHeader :title="title" back="/" :parent="{ label: 'Tableau de bord', to: '/' }">
      <template #actions>
        <template v-if="watch">
          <RouterLink class="btn btn-secondary desktop-only" data-test="edit-watch" :to="{ name: 'edit-watch', params: { id: watch.id } }">
            Modifier la montre
          </RouterLink>
          <WatchMenu
            :can-reopen="canReopen"
            :reopen-note="reopenNote"
            :has-project="project !== null"
            @edit="edit"
            @reopen="reopen"
            @remove-project="removing = 'project'"
            @remove-watch="removing = 'watch'"
          />
          <button
            v-if="project?.status === 'in_progress'"
            type="button"
            class="btn desktop-only"
            data-test="complete"
            :disabled="busy"
            @click="complete"
          >
            Marquer le projet terminé
          </button>
        </template>
      </template>
    </PageHeader>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <template v-else-if="watch">
      <p v-if="actionError" class="alert" role="alert">{{ actionError }}</p>

      <div class="head-card">
        <WatchHero :watch="watch" :project="project" :status="status" />
        <WatchFacts :watch="watch" :project="project" />
      </div>

      <ProjectTabs :projects="watch.projects" :selected-id="selectedId" @select="selectedId = $event" />

      <div class="lifecycle">
        <RouterLink v-if="canOpenProject" class="btn revision" :to="`/watches/new?watch=${watch.id}`"> Nouvelle révision </RouterLink>
        <p v-else-if="sold" class="hint">Montre vendue : aucun nouveau projet n’est possible.</p>
        <template v-if="project">
          <div v-if="project.status === 'in_progress'" class="complete-block mobile-only">
            <button type="button" class="btn" data-test="complete" :disabled="busy" @click="complete">Marquer le projet terminé</button>
            <p class="hint">Passe le projet au statut Terminé</p>
          </div>
          <p v-else-if="project.completedAt" class="hint">Terminé le {{ formatDate(project.completedAt) }}</p>
        </template>
      </div>

      <p v-if="watch.projects.length === 0" class="notice">Aucun projet pour cette montre.</p>

      <div class="layout">
        <div class="rail">
          <div class="block">
            <FinanceBlock
              :watch="watch"
              :selected-project-id="selectedId"
              @update:expenses="updateExpenses"
              @update:resale="updateResale"
            />
          </div>
          <div v-if="project" class="block">
            <BeforeAfter
              :key="`photos-${project.id}`"
              :project-id="project.id"
              :photo-before="project.photoBefore"
              :photo-after="project.photoAfter"
              @change="project[$event.kind === 'before' ? 'photoBefore' : 'photoAfter'] = $event.url"
            />
          </div>
        </div>
        <div v-if="project" class="main">
          <!-- key : la liste (éditeur, ajout, requêtes en vol) ne se réutilise jamais d'un projet à l'autre. -->
          <div class="block">
            <StepList :key="project.id" :project-id="project.id" :steps="project.steps" @update:steps="project.steps = $event" />
          </div>
          <div class="block">
            <PerformanceBlock
              :key="`perf-${project.id}`"
              :project-id="project.id"
              :measurements="project.measurements"
              @update:measurements="project.measurements = $event"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        v-if="removing === 'project'"
        title="Supprimer ce projet ?"
        message="Le projet, ses étapes, notes, photos, mesures et coûts seront supprimés définitivement. La montre est conservée."
        confirm-label="Supprimer le projet"
        @confirm="confirmRemove"
        @cancel="removing = null"
      />
      <ConfirmDialog
        v-else-if="removing === 'watch'"
        title="Supprimer cette montre ?"
        message="La montre, tous ses projets et toutes leurs données (photos comprises) seront supprimés définitivement."
        confirm-label="Supprimer la montre"
        @confirm="confirmRemove"
        @cancel="removing = null"
      />
    </template>
  </section>
</template>

<style scoped>
.detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

p {
  margin: 0;
}

.head-card {
  display: grid;
  gap: var(--space-4);
}

.lifecycle,
.complete-block {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.lifecycle .btn,
.complete-block .btn {
  width: auto;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.rail,
.main {
  display: grid;
  min-width: 0;
}

/* Mobile : blocs séparés par un filet, 24 px de marge verticale (maquette). */
.block {
  padding: var(--space-5) 0;
  border-top: 1px solid var(--border);
}

.desktop-only {
  display: none;
}

@media (min-width: 640px) {
  .desktop-only {
    display: inline-flex;
    width: auto;
  }

  .mobile-only {
    display: none;
  }

  .detail {
    gap: var(--space-5);
  }

  /* Barre du haut pleine largeur de la zone de contenu (comme le tableau de bord). */
  .detail :deep(.page-header) {
    margin: calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) 0;
  }

  .head-card,
  .block {
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .layout,
  .rail,
  .main {
    gap: var(--space-4);
  }

  .layout {
    gap: var(--space-5);
  }
}

/* Deux colonnes : étapes et performances à gauche, finances et avant/après dans un rail collant à droite. */
@media (min-width: 1181px) {
  .layout {
    grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr);
    align-items: start;
  }

  .main {
    grid-column: 1;
    grid-row: 1;
  }

  .rail {
    grid-column: 2;
    grid-row: 1;
    position: sticky;
    top: calc(var(--topbar-h) + var(--space-6));
  }
}

/* Sous 900 px l'en-tête passe en colonne : le bandeau de faits sous le titre. */
@media (max-width: 900px) {
  .head-card {
    gap: var(--space-3);
  }
}
</style>
