<script setup lang="ts">
// Tracés repris des maquettes (design/2026-09-23-screen-dashboard-*).
defineProps<{ name: 'home' | 'search' | 'account' | 'plus' | 'dial' | 'person' }>()
</script>

<template>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <template v-if="name === 'home'">
      <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 10.5V19h12v-8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.5" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </template>
    <template v-else-if="name === 'account'">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.5" />
      <path d="M5 20c1.2-3.6 4.2-5.5 7-5.5s5.8 1.9 7 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </template>
    <template v-else-if="name === 'plus'">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </template>
    <template v-else-if="name === 'dial'">
      <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.5" />
      <path d="M12 9v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      <path d="M9 3h6M9 21h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </template>
    <template v-else>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5" />
      <path d="M5 20c1.3-4 4.5-6 7-6s5.7 2 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </template>
  </svg>
</template>
