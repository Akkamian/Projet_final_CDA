import type { DashboardStatus } from './stores/watches'

export const STATUS_LABELS: Record<DashboardStatus, string> = {
  in_progress: 'En cours',
  completed: 'Terminé',
  sold: 'Vendue',
  no_project: 'Sans projet',
}

export const MOVEMENT_LABELS: Record<string, string> = {
  manual: 'Remontage manuel',
  automatic: 'Automatique',
}

/** « 80.00 » (chaîne de l'API) → « 80,00 € » ; une marge négative garde son signe. */
export function formatMoney(amount: string): string {
  return `${amount.replace('.', ',')} €`
}

/** « 2025-03-01 » ou horodatage ISO → « 01/03/2025 ». */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
