import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch } from '../api/client'
import type { GeneratedStep } from './stepPreview'

export type DashboardStatus = 'in_progress' | 'completed' | 'sold' | 'no_project'

export interface WatchCard {
  id: number
  brand: string
  model: string
  movementCode: 'manual' | 'automatic'
  complicationLabels: string[]
  status: DashboardStatus
  thumbnailUrl: string | null
  margin: string | null
  purchasePrice: string | null
  purchaseDate: string | null
  resalePrice: string | null
  resaleDate: string | null
  progress: { done: number; total: number } | null
}

/** Paramètres de GET /watches conservés par le store (RG-AFF-08, 09, 11). */
export interface WatchListParams {
  status: DashboardStatus | null
  q: string
  sort: 'purchase_date' | null
  order: 'asc' | 'desc'
  page: number
}

interface WatchListResponse {
  items: WatchCard[]
  counts: StatusCounts
  total: number
  page: number
  pageSize: number
  totalMargin: string
}

const PAGE_SIZE = 8
const OPENABLE_PAGE_SIZE = 50

export type StatusCounts = { all: number } & Record<DashboardStatus, number>

export interface StepDetail {
  id: number
  stepOrder: number
  label: string
  notes: string | null
  isCompleted: boolean
  completedAt: string | null
  photos: { id: number; url: string }[]
}

export interface MeasurementDetail {
  id: number
  measuredAt: string
  rateSecondsPerDay: string
  beatErrorMs: string
  amplitudeDegrees: string
  watchPosition: string | null
}

export interface MeasurementPayload {
  measuredAt: string
  rateSecondsPerDay: number
  beatErrorMs: number
  amplitudeDegrees: number
  watchPosition?: string | null
}

export interface ExpensePayload {
  label: string
  amount: string
  expenseDate: string
}

export interface ExpenseDetail {
  id: number
  label: string
  amount: string
  expenseDate: string
}

export interface ProjectDetail {
  id: number
  status: 'in_progress' | 'completed'
  createdAt: string
  completedAt: string | null
  photoBefore: string | null
  photoAfter: string | null
  steps: StepDetail[]
  measurements: MeasurementDetail[]
  expenses: ExpenseDetail[]
}

export interface WatchDetail {
  id: number
  brand: string
  model: string
  movementCode: 'manual' | 'automatic'
  complications: { code: string; label: string }[]
  purchasePrice: string | null
  purchaseDate: string | null
  resalePrice: string | null
  resaleDate: string | null
  margin: string | null
  projects: ProjectDetail[]
}

export interface CreateWatchPayload {
  brand: string
  model: string
  movementCode: string
  complicationCodes?: string[]
  purchasePrice?: string
  purchaseDate?: string
  steps: { label: string }[]
}

const EMPTY_COUNTS: StatusCounts = { all: 0, in_progress: 0, completed: 0, sold: 0, no_project: 0 }

export const useWatchesStore = defineStore('watches', () => {
  const items = ref<WatchCard[]>([])
  const counts = ref<StatusCounts>({ ...EMPTY_COUNTS })
  const total = ref(0)
  const totalMargin = ref('0.00')
  const params = ref<WatchListParams>({ status: null, q: '', sort: null, order: 'desc', page: 1 })
  const page = computed(() => params.value.page)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Numéro de la dernière demande : une réponse plus ancienne ne doit pas écraser la liste affichée.
  let latestRequest = 0

  function listQuery(p: WatchListParams, pageSize: number): string {
    const query = new URLSearchParams()
    if (p.status) query.set('status', p.status)
    if (p.q.trim() !== '') query.set('q', p.q.trim())
    if (p.sort) {
      query.set('sort', p.sort)
      query.set('order', p.order)
    }
    query.set('page', String(p.page))
    query.set('pageSize', String(pageSize))
    return query.toString()
  }

  /**
   * Charge une page de la liste. Les paramètres non fournis sont conservés ; changer le statut, la recherche
   * ou le tri ramène à la page 1 (RG-AFF-11). `append` ajoute la page aux montres déjà affichées (« Voir plus »).
   */
  async function list(patch: Partial<WatchListParams> = {}, mode: 'replace' | 'append' = 'replace'): Promise<void> {
    const current = params.value
    const resets = ['status', 'q', 'sort', 'order'].some(
      (key) => key in patch && patch[key as keyof WatchListParams] !== current[key as keyof WatchListParams],
    )
    const next: WatchListParams = { ...current, ...patch, page: patch.page ?? (resets ? 1 : current.page) }
    const request = ++latestRequest
    loading.value = true
    try {
      const result = await apiFetch<WatchListResponse>(`/watches?${listQuery(next, PAGE_SIZE)}`)
      if (request !== latestRequest) return
      items.value = mode === 'append' ? [...items.value, ...result.items] : result.items
      counts.value = result.counts
      total.value = result.total
      totalMargin.value = result.totalMargin
      params.value = { ...next, page: result.page }
      error.value = null
    } catch {
      if (request !== latestRequest) return
      if (mode === 'replace') items.value = []
      error.value = 'Impossible de charger vos montres. Réessayez dans un instant.'
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  /** Ajoute la page suivante ; sans effet quand toutes les montres sont affichées ou qu'un chargement est en cours. */
  async function loadMore(): Promise<void> {
    if (loading.value || items.value.length >= total.value) return
    await list({ page: params.value.page + 1 }, 'append')
  }

  function get(id: number): Promise<WatchDetail> {
    return apiFetch<WatchDetail>(`/watches/${id}`)
  }

  function create(payload: CreateWatchPayload): Promise<WatchDetail> {
    return apiFetch<WatchDetail>('/watches', { method: 'POST', body: JSON.stringify(payload) })
  }

  function fetchPreview(movementCode: string, complicationCodes: string[]): Promise<GeneratedStep[]> {
    const query = new URLSearchParams({ movementCode, complicationCodes: complicationCodes.join(',') })
    return apiFetch<GeneratedStep[]>(`/step-previews?${query}`)
  }

  function addStep(projectId: number, label: string): Promise<StepDetail> {
    return apiFetch<StepDetail>(`/projects/${projectId}/steps`, { method: 'POST', body: JSON.stringify({ label }) })
  }

  function updateStep(
    projectId: number,
    stepId: number,
    patch: { label?: string; notes?: string | null; isCompleted?: boolean },
  ): Promise<StepDetail> {
    return apiFetch<StepDetail>(`/projects/${projectId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  function removeStep(projectId: number, stepId: number): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/steps/${stepId}`, { method: 'DELETE' })
  }

  /** Envoie la liste complète des étapes dans le nouvel ordre (RG-ETP-12). */
  function reorderSteps(projectId: number, stepIds: number[]): Promise<StepDetail[]> {
    return apiFetch<StepDetail[]>(`/projects/${projectId}/steps/order`, { method: 'PUT', body: JSON.stringify({ stepIds }) })
  }

  function upload(blob: Blob): FormData {
    const form = new FormData()
    form.append('file', blob, 'photo')
    return form
  }

  function addStepPhoto(projectId: number, stepId: number, blob: Blob): Promise<{ id: number; url: string }> {
    return apiFetch(`/projects/${projectId}/steps/${stepId}/photos`, { method: 'POST', body: upload(blob) })
  }

  function removeStepPhoto(projectId: number, stepId: number, photoId: number): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/steps/${stepId}/photos/${photoId}`, { method: 'DELETE' })
  }

  function setProjectPhoto(projectId: number, kind: 'before' | 'after', blob: Blob): Promise<{ url: string }> {
    return apiFetch(`/projects/${projectId}/photos/${kind}`, { method: 'PUT', body: upload(blob) })
  }

  function removeProjectPhoto(projectId: number, kind: 'before' | 'after'): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/photos/${kind}`, { method: 'DELETE' })
  }

  function addMeasurement(projectId: number, body: MeasurementPayload): Promise<MeasurementDetail> {
    return apiFetch<MeasurementDetail>(`/projects/${projectId}/measurements`, { method: 'POST', body: JSON.stringify(body) })
  }

  function updateMeasurement(projectId: number, measurementId: number, patch: Partial<MeasurementPayload>): Promise<MeasurementDetail> {
    return apiFetch<MeasurementDetail>(`/projects/${projectId}/measurements/${measurementId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  function removeMeasurement(projectId: number, measurementId: number): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/measurements/${measurementId}`, { method: 'DELETE' })
  }

  function addExpense(projectId: number, body: ExpensePayload): Promise<ExpenseDetail> {
    return apiFetch<ExpenseDetail>(`/projects/${projectId}/expenses`, { method: 'POST', body: JSON.stringify(body) })
  }

  function updateExpense(projectId: number, expenseId: number, patch: Partial<ExpensePayload>): Promise<ExpenseDetail> {
    return apiFetch<ExpenseDetail>(`/projects/${projectId}/expenses/${expenseId}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  function removeExpense(projectId: number, expenseId: number): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/expenses/${expenseId}`, { method: 'DELETE' })
  }

  /** Saisie et correction de la revente (S22, S31) : renvoie la fiche, marge recalculée. */
  function setResale(watchId: number, body: { price: string; date: string }): Promise<WatchDetail> {
    return apiFetch<WatchDetail>(`/watches/${watchId}/resale`, { method: 'PUT', body: JSON.stringify(body) })
  }

  function clearResale(watchId: number): Promise<WatchDetail> {
    return apiFetch<WatchDetail>(`/watches/${watchId}/resale`, { method: 'DELETE' })
  }

  /** Montres sur lesquelles un projet peut être ouvert : ni vendues, ni déjà en cours (S9, RG-AFF-04). Parcourt toutes les pages. */
  async function listOpenable(): Promise<WatchCard[]> {
    const all: WatchCard[] = []
    for (let pageNumber = 1; ; pageNumber++) {
      const result = await apiFetch<WatchListResponse>(
        `/watches?${listQuery({ status: null, q: '', sort: null, order: 'desc', page: pageNumber }, OPENABLE_PAGE_SIZE)}`,
      )
      all.push(...result.items)
      // Une page plus courte que demandée est la dernière.
      if (result.items.length < OPENABLE_PAGE_SIZE || all.length >= result.total) break
    }
    return all.filter((w) => w.status === 'completed' || w.status === 'no_project')
  }

  function completeProject(projectId: number): Promise<ProjectDetail> {
    return apiFetch<ProjectDetail>(`/projects/${projectId}/complete`, { method: 'POST' })
  }

  function reopenProject(projectId: number): Promise<ProjectDetail> {
    return apiFetch<ProjectDetail>(`/projects/${projectId}/reopen`, { method: 'POST' })
  }

  /** Nouvelle révision d'une montre déjà suivie, avec la liste d'étapes choisie (S9). */
  function createRevision(watchId: number, steps: { label: string }[]): Promise<ProjectDetail> {
    return apiFetch<ProjectDetail>(`/watches/${watchId}/projects`, { method: 'POST', body: JSON.stringify({ steps }) })
  }

  function removeProject(projectId: number): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}`, { method: 'DELETE' })
  }

  function removeWatch(watchId: number): Promise<void> {
    return apiFetch<void>(`/watches/${watchId}`, { method: 'DELETE' })
  }

  return {
    items,
    counts,
    total,
    totalMargin,
    params,
    page,
    pageSize: PAGE_SIZE,
    loading,
    error,
    list,
    loadMore,
    get,
    create,
    fetchPreview,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    addStepPhoto,
    removeStepPhoto,
    setProjectPhoto,
    removeProjectPhoto,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    addExpense,
    updateExpense,
    removeExpense,
    setResale,
    clearResale,
    listOpenable,
    completeProject,
    reopenProject,
    createRevision,
    removeProject,
    removeWatch,
  }
})
