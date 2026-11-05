<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import StatusFilter from '../components/StatusFilter.vue'
import WatchCard from '../components/WatchCard.vue'
import { useAuthStore } from '../stores/auth'
import { STATUS_LABELS } from '../format'
import { useWatchesStore, type DashboardStatus } from '../stores/watches'

const watches = useWatchesStore()
const auth = useAuthStore()
const router = useRouter()
const selected = ref<DashboardStatus | null>(null)

onMounted(() => watches.list())

function select(status: DashboardStatus | null) {
  selected.value = status
  return watches.list(status ?? undefined)
}

async function logout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <section class="dashboard">
    <header class="top">
      <div>
        <h1>Tableau de bord</h1>
        <p
          v-if="!(watches.loading && watches.items.length === 0) && !watches.error"
          class="hint"
          data-test="shown-count"
          aria-live="polite"
        >
          {{ watches.items.length }} {{ watches.items.length > 1 ? 'montres' : 'montre' }}<template v-if="selected"> · {{ STATUS_LABELS[selected] }}</template>
        </p>
      </div>
      <RouterLink class="btn btn-compact" to="/watches/new">Nouvelle montre</RouterLink>
    </header>

    <StatusFilter :counts="watches.counts" :selected="selected" @select="select" />

    <p v-if="watches.error" class="alert" role="alert">{{ watches.error }}</p>
    <template v-else>
      <ul v-if="watches.items.length > 0" class="cards">
        <WatchCard v-for="watch in watches.items" :key="watch.id" :watch="watch" />
      </ul>
      <p v-else-if="!watches.loading" class="notice" data-test="empty">
        <template v-if="selected === null">
          Aucune montre pour l’instant. <RouterLink to="/watches/new">Créez votre première montre.</RouterLink>
        </template>
        <template v-else>Aucune montre ne correspond à ce statut.</template>
      </p>
    </template>

    <p v-if="auth.isAuthenticated" class="logout">
      <RouterLink to="/account">Mon compte</RouterLink> · <button type="button" @click="logout">Se déconnecter</button>
    </p>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: var(--space-4);
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

h1,
p {
  margin: 0;
}

.btn-compact {
  width: auto;
  padding: 0 var(--space-3);
  font-size: 0.875rem;
}

h1 {
  font-size: 1.375rem;
}

.logout button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-secondary);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.cards {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
}
</style>
