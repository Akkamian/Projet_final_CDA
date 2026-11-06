import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, stubFetch } from '../test/helpers'
import type { MeasurementDetail } from '../stores/watches'
import MeasurementForm from './MeasurementForm.vue'

const measure = (id: number, measuredAt: string, rate: string, beat: string, amp: string): MeasurementDetail => ({
  id,
  measuredAt,
  rateSecondsPerDay: rate,
  beatErrorMs: beat,
  amplitudeDegrees: amp,
  watchPosition: null,
})

describe('MeasurementForm', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setActivePinia(createPinia())
    setAccessToken('tok')
  })

  async function fill(wrapper: ReturnType<typeof mount>, values: { date?: string; rate?: string; beat?: string; amp?: string }) {
    await wrapper.find('[data-test="m-date"]').setValue(values.date ?? '2025-05-01')
    await wrapper.find('[data-test="m-rate"]').setValue(values.rate ?? '4')
    await wrapper.find('[data-test="m-beat"]').setValue(values.beat ?? '0.4')
    await wrapper.find('[data-test="m-amp"]').setValue(values.amp ?? '260')
  }

  it('S19 le formulaire refuse un beat error négatif', async () => {
    const fetchMock = stubFetch(() => ({ status: 201, body: {} }))
    const wrapper = mount(MeasurementForm, { props: { projectId: 5 } })

    await fill(wrapper, { beat: '-0.4' })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual([])
    expect(wrapper.find('[role="alert"]').text()).toContain('beat error')
  })

  it('S19 envoie la mesure et la position choisie, puis émet la mesure créée', async () => {
    const created = measure(9, '2025-05-01', '4.00', '0.40', '260.00')
    const fetchMock = stubFetch(() => ({ status: 201, body: created }))
    const wrapper = mount(MeasurementForm, { props: { projectId: 5 } })

    await fill(wrapper, {})
    await wrapper.find('[data-test="m-position-Cadran haut"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['POST /projects/5/measurements'])
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      measuredAt: '2025-05-01',
      rateSecondsPerDay: 4,
      beatErrorMs: 0.4,
      amplitudeDegrees: 260,
      watchPosition: 'Cadran haut',
    })
    expect(wrapper.emitted('saved')![0]![0]).toEqual(created)
  })

  it('S33 la modification n’envoie que les champs changés et efface la position décochée', async () => {
    const existing = { ...measure(9, '2025-05-01', '4.00', '0.40', '260.00'), watchPosition: 'Cadran haut' }
    const fetchMock = stubFetch(() => ({ status: 200, body: existing }))
    const wrapper = mount(MeasurementForm, { props: { projectId: 5, measurement: existing } })

    await wrapper.find('[data-test="m-beat"]').setValue('0.3')
    await wrapper.find('[data-test="m-position-Cadran haut"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PATCH /projects/5/measurements/9'])
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ beatErrorMs: 0.3, watchPosition: null })
  })

  it('S33 une mesure reçue de l’API (horodatage ISO) s’ouvre avec sa date, même datée d’aujourd’hui', async () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const existing = measure(9, `${day}T00:00:00.000Z`, '4.00', '0.40', '260.00')
    const fetchMock = stubFetch(() => ({ status: 200, body: existing }))
    const wrapper = mount(MeasurementForm, { props: { projectId: 5, measurement: existing } })

    expect((wrapper.find('[data-test="m-date"]').element as HTMLInputElement).value).toBe(day)
    await wrapper.find('[data-test="m-beat"]').setValue('0.3')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(calls(fetchMock)).toEqual(['PATCH /projects/5/measurements/9'])
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ beatErrorMs: 0.3 })
  })

  it('les champs portent les attributs de la maquette (pas, minimum, clavier numérique)', () => {
    const wrapper = mount(MeasurementForm, { props: { projectId: 5 } })

    const attrs = (test: string) => wrapper.find(`[data-test="${test}"]`).attributes()
    expect(attrs('m-rate').step).toBe('1')
    expect(attrs('m-beat')).toMatchObject({ step: '0.1', min: '0' })
    expect(attrs('m-amp')).toMatchObject({ step: '1', min: '0', inputmode: 'numeric' })
  })

  it('les aides de position et de valeurs sont celles de la maquette', () => {
    const wrapper = mount(MeasurementForm, { props: { projectId: 5 } })

    expect(wrapper.text()).toContain('une position non précisée est comparée avec les autres mesures sans position')
    expect(wrapper.text()).toContain('Marche négative si la montre retarde (ex. −8)')
    expect(wrapper.text()).toContain('Aucune date dans le futur')
  })

  it('en saisie, le bouton « Supprimer cette mesure » n’existe pas', () => {
    const wrapper = mount(MeasurementForm, { props: { projectId: 5 } })

    expect(wrapper.find('[data-test="m-remove"]').exists()).toBe(false)
  })

  it('S33 en édition, « Supprimer cette mesure » émet remove sans appel réseau', async () => {
    const fetchMock = stubFetch(() => ({ status: 204 }))
    const wrapper = mount(MeasurementForm, { props: { projectId: 5, measurement: measure(9, '2025-05-01', '4.00', '0.40', '260.00') } })

    await wrapper.find('[data-test="m-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
    expect(calls(fetchMock)).toEqual([])
  })

  it('affiche le message de l’API quand l’enregistrement échoue', async () => {
    stubFetch(() => ({ status: 400, body: { message: 'La date de mesure doit être une date existante' } }))
    const wrapper = mount(MeasurementForm, { props: { projectId: 5 } })

    await fill(wrapper, {})
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('date de mesure')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })
})
