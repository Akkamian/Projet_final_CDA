<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '../api/client'
import BeforeAfter from '../components/BeforeAfter.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import FinanceBlock from '../components/FinanceBlock.vue'
import PerformanceBlock from '../components/PerformanceBlock.vue'
import ProjectSelector from '../components/ProjectSelector.vue'
import StepList from '../components/StepList.vue'
import { MOVEMENT_LABELS } from '../format'
import { useWatchesStore, type ExpenseDetail, type ProjectDetail, type WatchDetail } from '../stores/watches'
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

// Les coûts d'un projet supprimé ne comptent plus : la marge se relit sur la fiche, comme après un coût.
async function refreshMargin(): Promise<void> {
  if (!watch.value) return
  try {
    watch.value.margin = (await watches.get(watch.value.id)).margin
  } catch {
    // La fiche affichée est à jour ; la marge se corrigera à la prochaine ouverture.
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
    await refreshMargin()
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

      <p v-if="actionError" class="alert" role="alert">{{ actionError }}</p>

      <RouterLink v-if="canOpenProject" class="btn revision" :to="`/watches/new?watch=${watch.id}`"> Nouvelle révision </RouterLink>

      <p v-if="watch.projects.length === 0" class="notice">Aucun projet pour cette montre.</p>
      <template v-else>
        <ProjectSelector :projects="watch.projects" :selected-id="selectedId" @select="selectedId = $event" />
        <template v-if="project">
          <h2>{{ project.status === 'in_progress' ? 'En cours' : 'Terminé' }}</h2>
          <div class="lifecycle">
            <button v-if="project.status === 'in_progress'" type="button" class="btn" :disabled="busy" @click="complete">
              Terminer le projet
            </button>
            <button v-else-if="canOpenProject" type="button" class="btn btn-secondary" :disabled="busy" @click="reopen">Rouvrir</button>
          </div>
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

      <div class="danger-zone">
        <button v-if="project" type="button" class="ghost-danger" :disabled="busy" @click="removing = 'project'">
          Supprimer le projet
        </button>
        <button type="button" class="ghost-danger" :disabled="busy" @click="removing = 'watch'">Supprimer la montre</button>
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
  gap: var(--space-3);
}

h1,
h2,
p {
  margin: 0;
}

.lifecycle,
.danger-zone {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.lifecycle .btn {
  width: auto;
}

.danger-zone {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.ghost-danger {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--danger-text);
  font: inherit;
  cursor: pointer;
}
</style>
