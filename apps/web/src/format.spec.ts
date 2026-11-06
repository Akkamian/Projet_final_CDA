import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDate, formatDelta, formatMargin, formatMeasure, formatMoney, formatRate } from './format'

describe('formatMoney', () => {
  it('RG-AFF-12 met la virgule française, garde le signe et supprime les décimales nulles', () => {
    expect(formatMoney('80.00')).toBe('80 €')
    expect(formatMoney('-20.00')).toBe('-20 €')
    expect(formatMoney('0.00')).toBe('0 €')
  })

  it('RG-AFF-12 garde les centimes quand il y en a', () => {
    expect(formatMoney('95.50')).toBe('95,50 €')
    expect(formatMoney('1234.50')).toBe('1234,50 €')
    expect(formatMoney('0.05')).toBe('0,05 €')
  })
})

describe('formatMargin', () => {
  it('S23 un gain prend « + », une perte le vrai signe moins, zéro reste sans signe', () => {
    expect(formatMargin('185.00')).toBe('+185 €')
    expect(formatMargin('-25.00')).toBe('−25 €')
    expect(formatMargin('0.00')).toBe('0 €')
    expect(formatMargin('12.50')).toBe('+12,50 €')
  })
})

describe('formatDate', () => {
  const previousTz = process.env.TZ
  beforeEach(() => {
    process.env.TZ = 'Europe/Paris'
  })
  afterEach(() => {
    if (previousTz === undefined) delete process.env.TZ
    else process.env.TZ = previousTz
  })

  it('une date sans heure (achat, revente) s’affiche telle quelle, sans décalage de fuseau', () => {
    expect(formatDate('2025-03-01')).toBe('01/03/2025')
  })

  it('un horodatage s’affiche au jour local : 00h30 à Paris n’est pas la veille', () => {
    // 2025-05-01T22:30:00Z = 2 mai 00h30 à Paris (UTC+2).
    expect(formatDate('2025-05-01T22:30:00Z')).toBe('02/05/2025')
  })
})

describe('formatMeasure', () => {
  it('RG-AFF-13 supprime les décimales superflues', () => {
    expect(formatMeasure('14.00')).toBe('14')
    expect(formatMeasure('0.40', 'ms')).toBe('0.4 ms')
    expect(formatMeasure('268.00', '°')).toBe('268°')
    expect(formatMeasure('2.35', 'ms')).toBe('2.35 ms')
  })

  it('RG-AFF-13 un nombre négatif prend le vrai signe moins', () => {
    expect(formatMeasure('-12.50')).toBe('−12.5')
  })

  it('RG-AFF-13 zéro négatif s’affiche 0', () => {
    expect(formatMeasure('-0.00')).toBe('0')
  })
})

describe('formatRate', () => {
  it('RG-AFF-13 la marche prend « + » en avance, le vrai moins en retard, zéro sans signe', () => {
    expect(formatRate('14.00')).toBe('+14')
    expect(formatRate('-12.00')).toBe('−12')
    expect(formatRate('0.00')).toBe('0')
    expect(formatRate('2.50')).toBe('+2.5')
  })
})

describe('formatDelta', () => {
  it('RG-AFF-13 écart avec la mesure précédente à la même position, vrai signe moins', () => {
    expect(formatDelta('14.00', '26.00')).toBe('−12')
    expect(formatDelta('26.00', '48.00')).toBe('−22')
    expect(formatDelta('30.00', '27.00')).toBe('+3')
  })

  it('RG-AFF-13 sans mesure précédente, aucun écart', () => {
    expect(formatDelta('35.00', null)).toBeNull()
  })

  it('RG-AFF-13 pas de bruit de flottant : 0.30 − 0.10 donne +0.2', () => {
    expect(formatDelta('0.30', '0.10')).toBe('+0.2')
  })

  it('RG-AFF-13 deux marches identiques : écart 0', () => {
    expect(formatDelta('14.00', '14.00')).toBe('0')
  })
})
