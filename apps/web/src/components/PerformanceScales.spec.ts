import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { MeasurementDetail } from '../stores/watches'
import PerformanceScales from './PerformanceScales.vue'

const measure = (id: number, measuredAt: string, rate: string, beat: string, amp: string): MeasurementDetail => ({
  id,
  measuredAt,
  rateSecondsPerDay: rate,
  beatErrorMs: beat,
  amplitudeDegrees: amp,
  watchPosition: null,
})

const first = measure(1, '2026-08-11T00:00:00.000Z', '48.00', '2.30', '186.00')
const last = measure(2, '2026-09-06T00:00:00.000Z', '14.00', '0.40', '268.00')

describe('PerformanceScales', () => {
  it('S20 trois pistes décrivent la première et la dernière mesure, zone cible comprise', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [first, last] } })

    const labels = wrapper.findAll('[role="img"]').map((track) => track.attributes('aria-label'))
    expect(labels).toEqual([
      'Marche : +48 puis +14 s/j, zone cible ±10 s/j',
      'Beat error : 2.3 puis 0.4 ms, zone cible ≤ 0.5 ms',
      'Amplitude : 186 puis 268 °, zone cible 250–310°',
    ])
  })

  it('S20 chaque piste affiche le verdict de la dernière mesure', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [first, last] } })

    expect(wrapper.findAll('[data-test="scale-verdict"]').map((v) => v.text())).toEqual([
      'Avance de 14 s/j · hors zone (±10 s/j)',
      'Dans la zone (≤ 0.5 ms)',
      'Dans la zone (250–310°)',
    ])
  })

  it('le verdict et le marqueur final prennent « warn » hors zone et « ok » dans la zone', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [first, last] } })

    const verdicts = wrapper.findAll('[data-test="scale-verdict"]')
    expect(verdicts.map((v) => v.classes().filter((c) => c === 'ok' || c === 'warn'))).toEqual([['warn'], ['ok'], ['ok']])
    const markers = wrapper.findAll('[data-test="marker-last"]')
    expect(markers.map((m) => m.classes().filter((c) => c === 'ok' || c === 'warn'))).toEqual([['warn'], ['ok'], ['ok']])
  })

  it('l’ordre des mesures reçues importe peu : la première et la dernière sont chronologiques', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [last, first] } })

    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Marche : +48 puis +14 s/j, zone cible ±10 s/j')
  })

  it('une seule mesure : un seul marqueur, aucun lien, aucun NaN', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [last] } })

    expect(wrapper.findAll('[data-test="marker-first"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-test="scale-link"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-test="marker-last"]')).toHaveLength(3)
    expect(wrapper.html()).not.toContain('NaN')
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Marche : +14 s/j, zone cible ±10 s/j')
  })

  it('deux mesures identiques : pas de lien ni de division par zéro', () => {
    const twin = { ...last, id: 3, measuredAt: '2026-09-07T00:00:00.000Z' }
    const wrapper = mount(PerformanceScales, { props: { measurements: [last, twin] } })

    expect(wrapper.html()).not.toContain('NaN')
    expect(wrapper.html()).not.toContain('Infinity')
    expect(wrapper.findAll('[data-test="scale-link"]')).toHaveLength(0)
  })

  it('une marche exactement à la borne reste dans la zone', () => {
    const wrapper = mount(PerformanceScales, {
      props: { measurements: [measure(1, '2026-09-06T00:00:00.000Z', '-10.00', '0.50', '250.00')] },
    })

    expect(wrapper.findAll('[data-test="scale-verdict"]').map((v) => v.text())).toEqual([
      'Retard de 10 s/j · dans la zone (±10 s/j)',
      'Dans la zone (≤ 0.5 ms)',
      'Dans la zone (250–310°)',
    ])
  })

  it('aucune mesure : rien n’est rendu', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [] } })

    expect(wrapper.find('.scales').exists()).toBe(false)
  })

  it('la légende rappelle que la zone cible est indicative', () => {
    const wrapper = mount(PerformanceScales, { props: { measurements: [first, last] } })

    expect(wrapper.text()).toContain('première mesure')
    expect(wrapper.text()).toContain('dernière mesure')
    expect(wrapper.text()).toContain('bande = zone cible (repères indicatifs)')
  })
})
