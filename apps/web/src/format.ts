import type { DashboardStatus } from './stores/watches'

export const STATUS_LABELS: Record<DashboardStatus, string> = {
  in_progress: 'En cours',
  completed: 'Terminé',
  sold: 'Vendue',
  no_project: 'Sans projet',
}

export const MOVEMENT_LABELS: Record<string, string> = {
  manual: 'Manuel',
  automatic: 'Automatique',
}

/** « 80.00 » (chaîne de l'API) → « 80 € », « 95.50 » → « 95,50 € » ; une marge négative garde son signe (RG-AFF-12). */
export function formatMoney(amount: string): string {
  return `${amount.replace('.', ',').replace(/,00$/, '')} €`
}

/** Marge des cartes : « +185 € » pour un gain, « −25 € » (vrai signe moins) pour une perte, « 0 € » sinon. */
export function formatMargin(amount: string): string {
  if (amount.startsWith('-')) return `−${formatMoney(amount.slice(1))}`
  const positive = Number(amount) > 0
  return `${positive ? '+' : ''}${formatMoney(amount)}`
}

/**
 * « 2025-03-01 » (date sans heure : achat, revente) → « 01/03/2025 », sans conversion de fuseau.
 * Un horodatage ISO (création d'un projet) s'affiche au jour **local** : 00h30 à Paris n'est pas la veille.
 */
export function formatDate(iso: string): string {
  if (iso.length <= 10) {
    const [year, month, day] = iso.split('-')
    return `${day}/${month}/${year}`
  }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}
