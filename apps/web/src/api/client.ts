const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** Les fichiers du stockage local sont servis par l'API (URL relative) ; ceux de S3 ont déjà une URL absolue. */
export function fileUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// Le jeton d'accès ne vit qu'en mémoire (jamais dans localStorage) ; le cookie de renouvellement fait le reste.
let accessToken: string | null = null
let onTokenChange: (token: string | null) => void = () => {}

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  onTokenChange(token)
}

/** Le store d'authentification s'abonne ici pour refléter le jeton (connexion, renouvellement, perte de session). */
export function onAccessTokenChange(listener: (token: string | null) => void): void {
  onTokenChange = listener
}

let refreshing: Promise<string | null> | null = null

/** Demande un nouveau jeton d'accès grâce au cookie ; les appels simultanés partagent une seule requête. */
export function refreshSession(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function doRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (response.ok) {
      const body = (await response.json()) as { accessToken: string }
      setAccessToken(body.accessToken)
      return body.accessToken
    }
} catch {
    // réseau coupé : on traite comme une session perdue
  }
  setAccessToken(null)
  return null
}

function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' })
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string | string[] }
  // La validation Nest renvoie un tableau de messages.
  const message = Array.isArray(body.message) ? body.message.join(' ; ') : body.message
  return new ApiError(response.status, message ?? `Erreur API ${response.status}`, body.code)
}

// Sur ces routes un 401 signifie « identifiants refusés » ou « renouvellement refusé » : rien à renouveler.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh']

/** Appel de l'API avec le jeton d'accès ; sur 401, tente **un** renouvellement puis rejoue la requête une fois. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init)
  if (response.status === 401 && !NO_REFRESH_PATHS.includes(path) && (await refreshSession())) {
    response = await send(path, init)
  }
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  // Un succès sans corps (ex. 201 de l'inscription) n'est pas du JSON : `json()` échouerait alors que l'opération a réussi.
  return (await response.json().catch(() => undefined)) as T
}
