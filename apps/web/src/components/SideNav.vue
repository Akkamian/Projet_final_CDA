<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isHomeActive } from '../navigation'
import { useAccountStore } from '../stores/account'
import Avatar from './Avatar.vue'
import NavIcon from './NavIcon.vue'

const route = useRoute()
const account = useAccountStore()

// « Recherche » n'est jamais active : elle ramène au tableau de bord (le champ vient avec le tableau de bord).
const entries = computed(() => [
  { label: 'Tableau de bord', to: '/', icon: 'home' as const, active: isHomeActive(route.path) },
  { label: 'Recherche', to: '/?recherche=1', icon: 'search' as const, active: false },
  { label: 'Mon compte', to: '/account', icon: 'account' as const, active: route.path === '/account' },
])
</script>

<template>
  <nav class="sidenav" aria-label="Navigation principale">
    <div class="brand-row">
      <span class="mark"><NavIcon name="dial" /></span>
      <span class="brand-name">Watch Restoration<br />Tracker</span>
    </div>
    <ul class="entries">
      <li v-for="entry in entries" :key="entry.label">
        <RouterLink v-slot="{ href, navigate }" :to="entry.to" custom>
          <a :href="href" :aria-current="entry.active ? 'page' : undefined" :class="{ active: entry.active }" @click="navigate">
            <NavIcon :name="entry.icon" />
            <span class="label">{{ entry.label }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>
    <div class="footer" data-test="account-footer">
      <Avatar variant="icon" :initial="account.initial" />
      <span v-if="account.email" class="email" data-test="account-email" :title="account.email">{{ account.email }}</span>
    </div>
  </nav>
</template>

<style scoped>
.sidenav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  height: 100vh;
  padding: var(--space-5) var(--space-3);
  border-right: 1px solid var(--border);
  background: var(--page-bg);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-2);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
}

.mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--accent-text);
}

.entries {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.entries a {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 38px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: none;
}

.entries a:hover {
  color: var(--text);
}

.entries a.active {
  background: var(--surface);
  box-shadow: inset 2px 0 0 var(--accent);
  color: var(--text);
  font-weight: 600;
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  margin-top: auto;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.email {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Rail d'icônes (640 à 899 px) : libellés, nom et email masqués visuellement mais présents pour les lecteurs d'écran. */
@media (max-width: 899px) {
  .brand-name,
  .label,
  .email {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .brand-row,
  .entries a,
  .footer {
    justify-content: center;
    padding-right: 0;
    padding-left: 0;
  }
}
</style>
