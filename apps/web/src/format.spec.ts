import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDate, formatMargin, formatMoney } from './format'

describe('formatMoney', () => {
  it('S23 met la virgule française et garde le signe, y compris pour zéro', () => {
    expect(formatMoney('80.00')).toBe('80,00 €')
    expect(formatMoney('-20.00')).toBe('-20,00 €')
    expect(formatMoney('0.00')).toBe('0,00 €')
  })
})

describe('formatMargin', () => {
  it('S23 un gain prend « + », une perte le vrai signe moins, zéro reste sans signe', () => {
    expect(formatMargin('185.00')).toBe('+185,00 €')
    expect(formatMargin('-25.00')).toBe('−25,00 €')
    expect(formatMargin('0.00')).toBe('0,00 €')
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
