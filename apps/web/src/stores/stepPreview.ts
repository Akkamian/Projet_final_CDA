import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet } from '../api/client'

export interface MovementType {
  movementCode: string
  label: string
}

export interface Complication {
  complicationCode: string
  label: string
}

export interface GeneratedStep {
  label: string
  stepOrder: number
  complicationCode: string | null
  complicationLabel: string | null
}

const LOAD_ERROR = 'Impossible de charger l’aperçu des étapes.'

export const useStepPreviewStore = defineStore('stepPreview', () => {
  const movementTypes = ref<MovementType[]>([])
  const complications = ref<Complication[]>([])
  const movementCode = ref<string | null>(null)
  const complicationCodes = ref<string[]>([])
  const steps = ref<GeneratedStep[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Numéro de la dernière demande : une réponse plus ancienne ne doit pas écraser l'aperçu affiché.
  let latestRequest = 0

  async function refreshPreview(): Promise<void> {
    if (!movementCode.value) return
    const request = ++latestRequest
    loading.value = true
    try {
      const result = await apiGet<GeneratedStep[]>('/step-previews', {
        movementCode: movementCode.value,
        complicationCodes: complicationCodes.value.join(','),
      })
      if (request !== latestRequest) return
      steps.value = result
      error.value = null
    } catch {
      if (request !== latestRequest) return
      steps.value = []
      error.value = LOAD_ERROR
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  async function loadReferenceData(): Promise<void> {
    try {
      const [types, comps] = await Promise.all([
        apiGet<MovementType[]>('/movement-types'),
        apiGet<Complication[]>('/complications'),
      ])
      movementTypes.value = types
      complications.value = comps
      movementCode.value ??= types[0]?.movementCode ?? null
    } catch {
      error.value = LOAD_ERROR
      return
    }
    await refreshPreview()
  }

  async function selectMovement(code: string): Promise<void> {
    movementCode.value = code
    await refreshPreview()
  }

  async function toggleComplication(code: string): Promise<void> {
    complicationCodes.value = complicationCodes.value.includes(code)
      ? complicationCodes.value.filter((c) => c !== code)
      : [...complicationCodes.value, code]
    await refreshPreview()
  }

  return {
    movementTypes,
    complications,
    movementCode,
    complicationCodes,
    steps,
    loading,
    error,
    loadReferenceData,
    refreshPreview,
    selectMovement,
    toggleComplication,
  }
})
