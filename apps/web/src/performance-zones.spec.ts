import { describe, expect, it } from 'vitest'
import { amplitudeVerdict, beatErrorVerdict, rateVerdict, scaleDomain, scalePosition, ZONES } from './performance-zones'

describe('rateVerdict', () => {
  it('RG-PER-06 une avance de 14 s/j est hors de la zone ±10 s/j', () => {
    expect(rateVerdict(14)).toEqual({ inZone: false, text: 'Avance de 14 s/j · hors zone (±10 s/j)' })
  })

  it('RG-PER-06 les bornes +10 et −10 sont dans la zone', () => {
    expect(rateVerdict(10)).toEqual({ inZone: true, text: 'Avance de 10 s/j · dans la zone (±10 s/j)' })
    expect(rateVerdict(-10)).toEqual({ inZone: true, text: 'Retard de 10 s/j · dans la zone (±10 s/j)' })
  })

  it('RG-PER-06 juste au-delà de la borne, la mesure sort de la zone', () => {
    expect(rateVerdict(10.01).inZone).toBe(false)
    expect(rateVerdict(-10.01)).toEqual({ inZone: false, text: 'Retard de 10.01 s/j · hors zone (±10 s/j)' })
  })

  it('RG-PER-06 une marche nulle est « juste »', () => {
    expect(rateVerdict(0)).toEqual({ inZone: true, text: 'Marche juste · dans la zone (±10 s/j)' })
  })
})

describe('beatErrorVerdict', () => {
  it('RG-PER-06 0,5 ms est dans la zone, 0,51 ms hors zone', () => {
    expect(beatErrorVerdict(0.5)).toEqual({ inZone: true, text: 'Dans la zone (≤ 0.5 ms)' })
    expect(beatErrorVerdict(0.51)).toEqual({ inZone: false, text: 'Hors zone (≤ 0.5 ms)' })
  })
})

describe('amplitudeVerdict', () => {
  it('RG-PER-06 250° et 310° sont dans la zone, 249,9° et 310,1° hors zone', () => {
    expect(amplitudeVerdict(250)).toEqual({ inZone: true, text: 'Dans la zone (250–310°)' })
    expect(amplitudeVerdict(310).inZone).toBe(true)
    expect(amplitudeVerdict(249.9)).toEqual({ inZone: false, text: 'Hors zone (250–310°)' })
    expect(amplitudeVerdict(310.1).inZone).toBe(false)
  })
})

describe('ZONES', () => {
  it('RG-PER-06 reprend les repères indicatifs de la maquette', () => {
    expect(ZONES).toEqual({
      rate: { min: -10, max: 10 },
      beatError: { min: 0, max: 0.5 },
      amplitude: { min: 250, max: 310 },
    })
  })
})

describe('scalePosition', () => {
  it('place une valeur en pourcentage du domaine', () => {
    expect(scalePosition(5, { min: 0, max: 10 })).toBe(50)
  })

  it('borne une valeur hors domaine à 0 ou 100', () => {
    expect(scalePosition(-3, { min: 0, max: 10 })).toBe(0)
    expect(scalePosition(42, { min: 0, max: 10 })).toBe(100)
  })

  it('un domaine de largeur nulle place la valeur au milieu, sans NaN', () => {
    expect(scalePosition(7, { min: 7, max: 7 })).toBe(50)
  })
})

describe('scaleDomain', () => {
  it('la marche englobe la zone ±10 et les valeurs', () => {
    const domain = scaleDomain('rate', [48, 14])
    expect(domain.min).toBeLessThanOrEqual(-10)
    expect(domain.max).toBeGreaterThanOrEqual(48)
  })

  it('la marche sans valeur extrême garde au moins la zone', () => {
    const domain = scaleDomain('rate', [1])
    expect(domain.min).toBeLessThanOrEqual(-10)
    expect(domain.max).toBeGreaterThanOrEqual(10)
  })

  it('le beat error part de 0 et couvre au moins 1 ms', () => {
    expect(scaleDomain('beatError', [0.4])).toEqual({ min: 0, max: 1 })
    expect(scaleDomain('beatError', [2.3]).max).toBeGreaterThanOrEqual(2.3)
  })

  it('l’amplitude couvre au moins 150–400° et s’élargit pour une valeur hors plage', () => {
    expect(scaleDomain('amplitude', [268])).toEqual({ min: 150, max: 400 })
    expect(scaleDomain('amplitude', [120, 450])).toEqual({ min: 120, max: 450 })
  })
})
