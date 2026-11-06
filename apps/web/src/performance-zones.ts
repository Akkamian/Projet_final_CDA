/** Repères indicatifs de la maquette (RG-PER-06) : bornes incluses, aucune valeur horlogère officielle. */
export const ZONES = {
  rate: { min: -10, max: 10 },
  beatError: { min: 0, max: 0.5 },
  amplitude: { min: 250, max: 310 },
} as const

export interface Verdict {
  inZone: boolean
  text: string
}

export interface Domain {
  min: number
  max: number
}

const rateZoneLabel = `±${ZONES.rate.max} s/j`
const beatErrorZoneLabel = `≤ ${ZONES.beatError.max} ms`
const amplitudeZoneLabel = `${ZONES.amplitude.min}–${ZONES.amplitude.max}°`

const zoneWord = (inZone: boolean): string => (inZone ? 'dans la zone' : 'hors zone')
const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

export function rateVerdict(rate: number): Verdict {
  const inZone = rate >= ZONES.rate.min && rate <= ZONES.rate.max
  if (rate === 0) return { inZone, text: `Marche juste · ${zoneWord(inZone)} (${rateZoneLabel})` }
  const lead = rate > 0 ? 'Avance' : 'Retard'
  return { inZone, text: `${lead} de ${Math.abs(rate)} s/j · ${zoneWord(inZone)} (${rateZoneLabel})` }
}

export function beatErrorVerdict(ms: number): Verdict {
  const inZone = ms >= ZONES.beatError.min && ms <= ZONES.beatError.max
  return { inZone, text: `${capitalized(zoneWord(inZone))} (${beatErrorZoneLabel})` }
}

export function amplitudeVerdict(deg: number): Verdict {
  const inZone = deg >= ZONES.amplitude.min && deg <= ZONES.amplitude.max
  return { inZone, text: `${capitalized(zoneWord(inZone))} (${amplitudeZoneLabel})` }
}

/** Position d'une valeur sur une piste, en pourcentage borné de 0 à 100 ; un domaine sans largeur place la valeur au milieu. */
export function scalePosition(value: number, domain: Domain): number {
  const width = domain.max - domain.min
  if (width <= 0) return 50
  return Math.min(100, Math.max(0, ((value - domain.min) / width) * 100))
}

/** Domaine d'une piste : toujours assez large pour la zone cible et pour toutes les valeurs. */
export function scaleDomain(kind: 'rate' | 'beatError' | 'amplitude', values: number[]): Domain {
  if (kind === 'beatError') return { min: 0, max: Math.max(1, ...values.map((v) => v * 1.2)) }
  if (kind === 'amplitude') return { min: Math.min(150, ...values), max: Math.max(400, ...values) }
  const low = Math.min(ZONES.rate.min, ...values)
  const high = Math.max(ZONES.rate.max, ...values)
  const margin = (high - low) * 0.1
  return { min: low - margin, max: high + margin }
}
