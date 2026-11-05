import { defineStore } from 'pinia'
import { ref } from 'vue'
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
}

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
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Numéro de la dernière demande : une réponse plus ancienne ne doit pas écraser la liste affichée.
  let latestRequest = 0

  async function list(status?: DashboardStatus): Promise<void> {
    const request = ++latestRequest
    loading.value = true
    try {
      const query = status ? `?${new URLSearchParams({ status })}` : ''
      const result = await apiFetch<{ items: WatchCard[]; counts: StatusCounts }>(`/watches${query}`)
      if (request !== latestRequest) return
      items.value = result.items
      counts.value = result.counts
      error.value = null
    } catch {
      if (request !== latestRequest) return
      items.value = []
      error.value = 'Impossible de charger vos montres. Réessayez dans un instant.'
    } finally {
      if (request === latestRequest) loading.value = false
    }
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

  return { items, counts, loading, error, list, get, create, fetchPreview, addStep, updateStep, removeStep, reorderSteps }
})
