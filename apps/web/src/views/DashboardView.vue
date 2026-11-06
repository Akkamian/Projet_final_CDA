<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Avatar from '../components/Avatar.vue'
import DashboardStats from '../components/DashboardStats.vue'
import DashboardToolbar from '../components/DashboardToolbar.vue'
import PageHeader from '../components/PageHeader.vue'
import SearchField from '../components/SearchField.vue'
import StatusFilter from '../components/StatusFilter.vue'
import WatchCard from '../components/WatchCard.vue'
import WatchTable from '../components/WatchTable.vue'
import { useIsDesktop } from '../composables/useIsDesktop'
import { STATUS_LABELS } from '../format'
import { useAccountStore } from '../stores/account'
import { useWatchesStore, type DashboardStatus } from '../stores/watches'

const SEARCH_DELAY_MS = 300

const route = useRoute()
const watches = useWatchesStore()
const account = useAccountStore()
const isDesktop = useIsDesktop()

const selected = computed(() => watches.params.status)
// Texte saisi ; la requête part 300 ms après la dernière frappe.
const search = ref(watches.params.q)
const searchField = ref<InstanceType<typeof SearchField> | null>(null)
// En mobile le champ n'a pas de place fixe : il apparaît par le lien « Recherche » (?recherche=1) ou tant qu'il est rempli.
const showSearch = computed(() => route.query.recherche === '1' || search.value !== '')

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (text) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => watches.list({ q: text }), SEARCH_DELAY_MS)
})
onUnmounted(() => clearTimeout(searchTimer))

async function focusSearch() {
  await nextTick()
  searchField.value?.focus()
}
watch(
  () => route.query.recherche,
  (value) => value === '1' && focusSearch(),
)

onMounted(() => {
  watches.list({ page: 1 })
  if (route.query.recherche === '1') focusSearch()
})

const select = (status: DashboardStatus | null) => watches.list({ status })

/** Achat : décroissant, puis croissant, puis l'ordre par défaut (RG-AFF-09). */
function toggleSort() {
  const { sort, order } = watches.params
  if (sort === null) return watches.list({ sort: 'purchase_date', order: 'desc' })
  if (order === 'desc') return watches.list({ sort: 'purchase_date', order: 'asc' })
  return watches.list({ sort: null })
}

const isFiltered = computed(() => watches.params.status !== null || watches.params.q.trim() !== '')
const subtitle = computed(() =>
  (watches.loading && watches.items.length === 0) || watches.error
    ? undefined
    : `${watches.total} ${watches.total > 1 ? 'montres' : 'montre'}${selected.value ? ` · ${STATUS_LABELS[selected.value]}` : ''}`,
)
</script>

<template>
  <section class="dashboard">
    <PageHeader title="Tableau de bord" :subtitle="subtitle">
      <template #actions>
        <DashboardToolbar v-if="isDesktop" :query="search" :status="selected" @update:query="search = $event" @update:status="select" />
        <!-- Seul accès au compte en mobile (la barre du bas n'en porte pas) ; la barre latérale le porte dès 640 px. -->
        <RouterLink v-else class="account-btn" to="/account" :aria-label="account.email ? `Mon compte (${account.email})` : 'Mon compte'">
          <Avatar variant="initial" :initial="account.initial" />
        </RouterLink>
      </template>
    </PageHeader>

    <DashboardStats v-if="isDesktop" :counts="watches.counts" :total-margin="watches.totalMargin" />
    <template v-else>
      <StatusFilter :counts="watches.counts" :selected="selected" @select="select" />
      <SearchField v-if="showSearch" ref="searchField" v-model="search" />
    </template>

    <p v-if="watches.error" class="alert" role="alert">{{ watches.error }}</p>
    <template v-else>
      <template v-if="watches.items.length > 0">
        <WatchTable
          v-if="isDesktop"
          :items="watches.items"
          :total="watches.total"
          :page="watches.page"
          :page-size="watches.pageSize"
          :sort="watches.params.sort"
          :order="watches.params.order"
          @sort="toggleSort"
          @page="watches.list({ page: $event })"
        />
        <template v-else>
          <ul class="cards">
            <WatchCard v-for="watch in watches.items" :key="watch.id" :watch="watch" />
          </ul>
          <button
            v-if="watches.items.length < watches.total"
            type="button"
            class="more"
            data-test="load-more"
            :disabled="watches.loading"
            @click="watches.loadMore()"
          >
            Voir plus
          </button>
        </template>
      </template>
      <p v-else-if="!watches.loading" class="notice" data-test="empty">
        <template v-if="!isFiltered">
          Aucune montre pour l’instant. <RouterLink to="/watches/new">Créez votre première montre.</RouterLink>
        </template>
        <template v-else-if="watches.params.q.trim() !== ''">Aucune montre ne correspond à votre recherche.</template>
        <template v-else>Aucune montre ne correspond à ce statut.</template>
      </p>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: var(--space-4);
}

.account-btn {
  display: inline-flex;
}

.cards {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
}

.more {
  justify-self: center;
  min-height: var(--touch-min);
  padding: 0 var(--space-5);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.more:disabled {
  opacity: 0.45;
  cursor: wait;
}

@media (min-width: 640px) {
  .dashboard {
    gap: var(--space-5);
  }
}
</style>
