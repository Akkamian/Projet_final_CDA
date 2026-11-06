<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { fileUrl } from '../api/client'
import { formatDate, formatMargin, formatMoney, MOVEMENT_LABELS, STATUS_LABELS } from '../format'
import type { WatchCard } from '../stores/watches'

const props = defineProps<{
  items: WatchCard[]
  total: number
  page: number
  pageSize: number
  sort: 'purchase_date' | null
  order: 'asc' | 'desc'
}>()
const emit = defineEmits<{ sort: []; page: [page: number] }>()

const ariaSort = () => (props.sort === null ? 'none' : props.order === 'asc' ? 'ascending' : 'descending')
const firstShown = () => (props.page - 1) * props.pageSize + 1
const lastShown = () => Math.min(props.page * props.pageSize, props.total)
const isLastPage = () => props.page * props.pageSize >= props.total

const subtitle = (watch: WatchCard) =>
  [MOVEMENT_LABELS[watch.movementCode], watch.complicationLabels.join(', ')].filter((part) => part !== '').join(' · ')
const hasProgress = (watch: WatchCard) => watch.progress !== null && watch.progress.total > 0
const marginClass = (margin: string) => (margin.startsWith('-') ? 'negative' : Number(margin) > 0 ? 'positive' : '')
</script>

<template>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th scope="col">Montre</th>
          <th scope="col">Statut</th>
          <th scope="col" class="progress-col">Progression</th>
          <th scope="col" :aria-sort="ariaSort()">
            <button type="button" class="sort" data-test="sort-purchase" @click="emit('sort')">
              Achat <span aria-hidden="true">{{ sort === null ? '' : order === 'asc' ? '↑' : '↓' }}</span>
            </button>
          </th>
          <th scope="col">Revente</th>
          <th scope="col">Marge</th>
          <th scope="col"><span class="visually-hidden">Détail</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="watch in items" :key="watch.id" data-test="table-row">
          <td>
            <div class="watch">
              <img v-if="watch.thumbnailUrl" class="thumb" :src="fileUrl(watch.thumbnailUrl)" alt="" />
              <span v-else class="thumb" :class="{ 'thumb-empty': watch.status === 'no_project' }" aria-hidden="true">
                <svg
                  v-if="watch.status !== 'no_project'"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                >
                  <circle cx="12" cy="12" r="6.5" />
                  <path d="M12 9v3.2l2 1.3M9 2.5h6M9 21.5h6" stroke-linecap="round" />
                </svg>
              </span>
              <div class="names">
                <RouterLink class="title" :to="{ name: 'watch-detail', params: { id: watch.id } }"
                  >{{ watch.brand }} {{ watch.model }}</RouterLink
                >
                <span class="sub">{{ subtitle(watch) }}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="status" :class="`status-${watch.status}`">{{ STATUS_LABELS[watch.status] }}</span>
          </td>
          <td class="progress-col">
            <div v-if="watch.progress && hasProgress(watch)" class="progress">
              <div
                class="bar"
                role="progressbar"
                aria-label="Progression des étapes"
                aria-valuemin="0"
                :aria-valuenow="watch.progress.done"
                :aria-valuemax="watch.progress.total"
              >
                <span :style="{ width: `${(watch.progress.done / watch.progress.total) * 100}%` }" />
              </div>
              <span class="tabular">{{ watch.progress.done }}/{{ watch.progress.total }}</span>
            </div>
            <span v-else class="muted">—</span>
          </td>
          <td class="tabular">
            <template v-if="watch.purchasePrice !== null">
              <span class="amount">{{ formatMoney(watch.purchasePrice) }}</span>
              <span v-if="watch.purchaseDate" class="sub">{{ formatDate(watch.purchaseDate) }}</span>
            </template>
            <span v-else class="muted">Inconnu</span>
          </td>
          <td class="tabular">
            <template v-if="watch.resalePrice !== null">
              <span class="amount">{{ formatMoney(watch.resalePrice) }}</span>
              <span v-if="watch.resaleDate" class="sub">{{ formatDate(watch.resaleDate) }}</span>
            </template>
            <span v-else class="muted">—</span>
          </td>
          <td class="tabular">
            <span v-if="watch.margin !== null" class="amount" :class="marginClass(watch.margin)">{{ formatMargin(watch.margin) }}</span>
            <span v-else class="muted">—</span>
          </td>
          <td class="chevron" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </td>
        </tr>
      </tbody>
    </table>
    <footer v-if="total > 0" class="pager">
      <span class="tabular" data-test="range">{{ firstShown() }}–{{ lastShown() }} sur {{ total }}</span>
      <div class="pager-actions">
        <button type="button" data-test="page-prev" :disabled="page <= 1" @click="emit('page', page - 1)">Précédent</button>
        <button type="button" data-test="page-next" :disabled="isLastPage()" @click="emit('page', page + 1)">Suivant</button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.table-card {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  position: relative;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
}

td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: 0;
}

tbody tr:hover {
  background: var(--bg);
}

.sort {
  padding: 0;
  letter-spacing: inherit;
  text-transform: inherit;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.watch {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.thumb {
  display: grid;
  flex: none;
  place-items: center;
  color: var(--text-secondary);
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  object-fit: cover;
}

.thumb-empty {
  border-style: dashed;
  border-color: var(--border-strong);
  background: transparent;
}

.names {
  display: grid;
  min-width: 0;
}

.title {
  color: var(--text);
  font-weight: 600;
  text-decoration: none;
}

.title:hover {
  text-decoration: underline;
}

.sub {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
}

.amount {
  display: block;
  font-weight: 600;
}

.muted {
  color: var(--text-secondary);
}

.positive {
  color: var(--success);
}

.negative {
  color: var(--danger-text);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-3);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  content: '';
}

.status-completed::before {
  background: var(--accent-secondary);
}

.status-in_progress::before {
  background: var(--warning);
}

.status-sold::before {
  background: var(--success);
}

.progress-col {
  min-width: 120px;
}

.progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
}

.bar {
  flex: 1;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--border);
}

.bar span {
  display: block;
  height: 100%;
  background: var(--accent);
}

.chevron {
  width: 1%;
  color: var(--text-secondary);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
}

.pager-actions {
  display: flex;
  gap: var(--space-2);
}

.pager button {
  min-height: 32px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.pager button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
