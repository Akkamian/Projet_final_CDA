import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, stubFetch } from '../test/helpers'
import type { MeasurementDetail } from '../stores/watches'
import PerformanceBlock from './PerformanceBlock.vue'
import PerformanceScales from './PerformanceScales.vue'

const measure = (id: number, day: string, rate: string, beat: string, amp: string, position: string | null = null): MeasurementDetail => ({
  id,
  measuredAt: `${day}T00:00:00.000Z`,
  rateSecondsPerDay: rate,
  beatErrorMs: beat,
  amplitudeDegrees: amp,
  watchPosition: position,
})

// Les quatre mesures de la maquette : trois en « Cadran haut », une en « Couronne à gauche ».
const mockup = [
  measure(1, '2026-08-11', '48.00', '2.30', '186.00', 'Cadran haut'),
  measure(2, '2026-08-18', '35.00', '1.40', '214.00', 'Couronne à gauche'),
  measure(3, '2026-08-29', '26.00', '1.10', '231.00', 'Cadran haut'),
  measure(4, '2026-09-06', '14.00', '0.40', '268.00', 'Cadran haut'),
]

const mountBlock = (measurements: MeasurementDetail[]) => mount(PerformanceBlock, { props: { projectId: 5, measurements } })
const rows = (wrapper: ReturnType<typeof mountBlock>) => wrapper.findAll('[data-test="measurement-row"]')

describe('PerformanceBlock', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setActivePinia(createPinia())
    setAccessToken('tok')
  })

  it('S20 les échelles remplacent le graphique', () => {
    const wrapper = mountBlock(mockup)

    expect(wrapper.findComponent(PerformanceScales).exists()).toBe(true)
    expect(wrapper.find('canvas').exists()).toBe(false)
  })

  it('RG-PER-04 le tableau montre les mesures de la plus récente à la plus ancienne', () => {
    const wrapper = mountBlock([mockup[1]!, mockup[3]!, mockup[0]!, mockup[2]!])

    expect(rows(wrapper).map((r) => r.find('td').text())).toEqual(['06/09/2026', '29/08/2026', '18/08/2026', '11/08/2026'])
  })

  it('RG-AFF-13 le tableau affiche la position, la marche signée, le beat error et l’amplitude sans décimales superflues', () => {
    const wrapper = mountBlock(mockup)

    const cells = rows(wrapper)[0]!
      .findAll('td')
      .map((c) => c.text())
    expect(cells.slice(0, 5)).toEqual(['06/09/2026', 'Cadran haut', '+14 (−12)', '0.4 ms', '268°'])
  })

  it('RG-AFF-13 l’écart se calcule avec la mesure précédente à la même position', () => {
    const wrapper = mountBlock(mockup)

    const rate = (i: number) => rows(wrapper)[i]!.findAll('td')[2]!.text()
    expect(rate(0)).toBe('+14 (−12)')
    expect(rate(1)).toBe('+26 (−22)')
    expect(rate(2)).toBe('+35')
    expect(rate(3)).toBe('+48')
  })

  it('RG-AFF-13 une mesure sans position n’a jamais d’écart', () => {
    const wrapper = mountBlock([measure(1, '2026-08-11', '48.00', '2.30', '186.00'), measure(2, '2026-08-18', '35.00', '1.40', '214.00')])

    expect(rows(wrapper)[0]!.findAll('td')[2]!.text()).toBe('+35')
  })

  it('le filtre de position propose « Toutes » et une pastille par position avec son nombre', () => {
    const wrapper = mountBlock(mockup)

    const chips = wrapper.findAll('[data-test="position-chip"]').map((c) => c.text())
    expect(chips).toEqual(['Toutes', 'Cadran haut 3', 'Couronne à gauche 1'])
  })

  it('S20 par défaut les échelles ne comparent que la position la plus fréquente, comme la maquette', () => {
    const wrapper = mountBlock(mockup)

    expect(wrapper.find('[data-test="position-chip"][aria-pressed="true"]').text()).toBe('Cadran haut 3')
    expect(
      wrapper
        .findComponent(PerformanceScales)
        .props('measurements')
        .map((m: MeasurementDetail) => m.id),
    ).toEqual([1, 3, 4])
    expect(wrapper.text()).toContain('position Cadran haut')
  })

  it('S20 une première mesure d’une position n’est jamais comparée à une dernière mesure d’une autre', () => {
    const wrapper = mountBlock([
      measure(1, '2026-08-11', '48.00', '2.30', '186.00', 'Cadran haut'),
      measure(2, '2026-08-18', '-3.00', '0.30', '270.00', 'Couronne à gauche'),
      measure(3, '2026-08-20', '40.00', '1.30', '200.00', 'Cadran haut'),
    ])

    const verdict = wrapper.findAll('[data-test="scale-verdict"]')[0]!.text()
    expect(verdict).toBe('Avance de 40 s/j · hors zone (±10 s/j)')
  })

  it('choisir une position restreint les échelles, le tableau garde toutes les mesures', async () => {
    const wrapper = mountBlock(mockup)

    await wrapper.findAll('[data-test="position-chip"]')[2]!.trigger('click')

    expect(wrapper.findComponent(PerformanceScales).props('measurements')).toHaveLength(1)
    expect(rows(wrapper)).toHaveLength(4)
  })

  it('« Toutes » compare toutes les mesures dans les échelles', async () => {
    const wrapper = mountBlock(mockup)

    await wrapper.findAll('[data-test="position-chip"]')[0]!.trigger('click')

    expect(wrapper.findComponent(PerformanceScales).props('measurements')).toHaveLength(4)
    expect(wrapper.find('[data-test="position-chip"][aria-pressed="true"]').text()).toBe('Toutes')
  })

  it('la pastille d’une position disparue (mesure supprimée) revient sur la position par défaut', async () => {
    const wrapper = mountBlock(mockup)
    await wrapper.findAll('[data-test="position-chip"]')[2]!.trigger('click')

    await wrapper.setProps({ measurements: mockup.filter((m) => m.watchPosition !== 'Couronne à gauche') })

    expect(rows(wrapper)).toHaveLength(3)
    expect(wrapper.find('[data-test="position-chip"][aria-pressed="true"]').text()).toBe('Cadran haut 3')
  })

  it('une mesure ajoutée dans une autre position apparaît dans le tableau sans changer de filtre', async () => {
    const wrapper = mountBlock(mockup)

    await wrapper.setProps({ measurements: [...mockup, measure(9, '2026-09-10', '3.00', '0.30', '260.00', 'Cadran bas')] })

    expect(rows(wrapper)).toHaveLength(5)
  })

  it('aucun filtre quand aucune mesure n’a de position', () => {
    const wrapper = mountBlock([measure(1, '2026-08-11', '48.00', '2.30', '186.00')])

    expect(wrapper.find('[data-test="position-chip"]').exists()).toBe(false)
  })

  it('« + Mesure » ouvre le formulaire, y compris pour une liste vide', async () => {
    const wrapper = mountBlock([])

    expect(wrapper.text()).toContain('Aucune mesure')
    await wrapper.find('[data-test="measurement-add"]').trigger('click')

    expect(wrapper.find('[data-test="m-date"]').exists()).toBe(true)
  })

  it('S33 supprimer une mesure demande confirmation puis la retire de la liste', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))
    const wrapper = mountBlock(mockup)

    await wrapper.find('[data-test="measurement-remove-4"]').trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['DELETE /projects/5/measurements/4'])
    expect((wrapper.emitted('update:measurements')![0]![0] as MeasurementDetail[]).map((m) => m.id)).toEqual([1, 2, 3])
  })

  it('S33 annuler la confirmation ne supprime rien', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))
    const wrapper = mountBlock(mockup)

    await wrapper.find('[data-test="measurement-remove-4"]').trigger('click')
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

    expect(calls(fetchMock)).toEqual([])
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('une erreur de suppression s’affiche et la liste reste inchangée', async () => {
    stubFetch(() => ({ status: 500, body: { message: 'Erreur serveur' } }))
    const wrapper = mountBlock(mockup)

    await wrapper.find('[data-test="measurement-remove-4"]').trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('update:measurements')).toBeUndefined()
  })
})
