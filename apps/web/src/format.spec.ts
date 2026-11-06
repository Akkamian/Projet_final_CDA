import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDate, formatMargin, formatMoney } from './format'

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
