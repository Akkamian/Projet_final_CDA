const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Erreur API ${status}`)
    this.status = status
  }
}

// Client minimal : lecture seule, sans session. Il sera remplacé par celui de la tâche 12 du plan
// (jeton d'accès, renouvellement automatique) quand l'authentification existera.
export async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, API_URL)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError(response.status)
  }
  return (await response.json()) as T
}
