<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import StatusFilter from '../components/StatusFilter.vue'
import WatchCard from '../components/WatchCard.vue'
import { useAuthStore } from '../stores/auth'
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
      <h1>Mes montres</h1>
      <RouterLink class="btn" to="/watches/new">Nouvelle montre</RouterLink>
    </header>

    <StatusFilter :counts="watches.counts" :selected="selected" @select="select" />

    <p v-if="watches.error" class="alert" role="alert">{{ watches.error }}</p>
    <template v-else>
      <p v-if="!(watches.loading && watches.items.length === 0)" class="hint" data-test="shown-count" aria-live="polite">
        {{ watches.items.length }} {{ watches.items.length > 1 ? 'montres' : 'montre' }}
      </p>
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

    <p v-if="auth.isAuthenticated" class="logout"><button type="button" @click="logout">Se déconnecter</button></p>
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

.cards {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
}
</style>
