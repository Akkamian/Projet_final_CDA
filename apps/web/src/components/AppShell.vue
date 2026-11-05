<script setup lang="ts">
import { onMounted } from 'vue'
import { useAccountStore } from '../stores/account'
import BottomNav from './BottomNav.vue'
import SideNav from './SideNav.vue'

// Les deux barres sont dans le DOM ; le CSS n'en montre qu'une (≥ 640 px : barre latérale, < 640 px : barre du bas).
const account = useAccountStore()
onMounted(() => account.load())
</script>

<template>
  <div class="shell">
    <SideNav class="side" />
    <main class="content"><slot /></main>
    <BottomNav class="bottom" />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
}

.content {
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6);
}

.bottom {
  display: none;
}

/* Rail d'icônes. */
@media (max-width: 899px) {
  .shell {
    --sidebar-w: 64px;
  }
}

/* Mobile : barre du bas fixe, plus de barre latérale. */
@media (max-width: 639px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 60px;
  }

  .side {
    display: none;
  }

  .content {
    padding: var(--space-4);
  }

  .bottom {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
  }
}
</style>
