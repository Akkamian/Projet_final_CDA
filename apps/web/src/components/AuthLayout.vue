<script setup lang="ts">
// Les graduations du cadran : 12 repères, les quatre principaux (aux heures 12, 3, 6 et 9) plus longs et en accent.
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6 - Math.PI / 2
  const major = i % 3 === 0
  const [from, to] = major ? [112, 132] : [112, 122]
  const point = (r: number) => [(160 + r * Math.cos(angle)).toFixed(1), (160 + r * Math.sin(angle)).toFixed(1)]
  const [x1, y1] = point(from)
  const [x2, y2] = point(to)
  return { x1, y1, x2, y2, major }
})
</script>

<template>
  <div class="auth-page">
    <aside class="auth-panel" data-test="auth-panel">
      <div class="auth-logo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="var(--accent-secondary)" stroke-width="1.5" />
          <path d="M12 6.5V12l3.5 2" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="auth-brand-name">Watch Restoration Tracker</span>
      </div>
      <svg class="auth-dial" viewBox="0 0 320 320" fill="none" aria-hidden="true">
        <circle cx="160" cy="160" r="150" stroke="var(--border-strong)" stroke-width="2" />
        <circle cx="160" cy="160" r="138" stroke="var(--border)" stroke-width="1" />
        <line
          v-for="(tick, i) in TICKS"
          :key="i"
          :x1="tick.x1"
          :y1="tick.y1"
          :x2="tick.x2"
          :y2="tick.y2"
          :stroke="tick.major ? 'var(--accent)' : 'var(--accent-secondary)'"
          :stroke-width="tick.major ? 6 : 3"
          stroke-linecap="round"
        />
        <line x1="160" y1="160" x2="102.7" y2="119.8" stroke="var(--text)" stroke-width="7" stroke-linecap="round" />
        <line x1="160" y1="160" x2="250.1" y2="108" stroke="var(--text)" stroke-width="5" stroke-linecap="round" />
        <circle cx="160" cy="160" r="8" fill="var(--accent)" />
      </svg>
      <div>
        <p class="auth-tagline">Le journal de vos restaurations horlogères.</p>
        <ul class="auth-points">
          <li>Étapes de démontage et de remontage guidées</li>
          <li>Photos avant / après et mesures de marche</li>
          <li>Coûts, revente et marge par montre</li>
        </ul>
      </div>
    </aside>

    <div class="auth-form-panel">
      <header class="auth-brand">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="var(--accent-secondary)" stroke-width="1.5" />
          <path d="M12 6.5V12l3.5 2" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="auth-brand-name">Watch Restoration Tracker</span>
      </header>
      <main class="auth-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100dvh;
  background: var(--bg);
}

/* Mobile : le panneau de marque est masqué (pas lu par les lecteurs d'écran), la marque est en haut, le formulaire ancré en bas. */
.auth-panel {
  display: none;
}

.auth-form-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-6) var(--space-4);
}

.auth-brand,
.auth-logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.auth-brand {
  margin-bottom: var(--space-6);
}

.auth-brand svg,
.auth-logo svg {
  flex: none;
}

.auth-brand-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
}

.auth-main {
  display: grid;
  gap: var(--space-4);
  align-content: start;
  width: 100%;
  max-width: 380px;
  margin: auto auto 0;
}

@media (min-width: 900px) {
  .auth-page {
    grid-template-columns: 1.15fr 1fr;
  }

  .auth-panel {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--space-7);
    border-right: 1px solid var(--border);
    background: var(--surface);
  }

  .auth-panel .auth-brand-name {
    font-size: 1rem;
  }

  .auth-dial {
    align-self: center;
    width: min(320px, 100%);
    height: auto;
    margin: var(--space-6) 0;
  }

  .auth-tagline {
    max-width: 18ch;
    margin: 0 0 var(--space-3);
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1.2;
    text-wrap: balance;
  }

  .auth-points {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
    list-style: none;
  }

  .auth-form-panel {
    align-items: center;
    justify-content: center;
    padding: var(--space-7) var(--space-6);
  }

  .auth-brand {
    display: none;
  }

  .auth-main {
    margin: 0;
  }
}
</style>
