import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, stubFetch } from '../test/helpers'
import type { MeasurementDetail } from '../stores/watches'
import MeasurementForm from './MeasurementForm.vue'
import PerformanceChart from './PerformanceChart.vue'

// jsdom n'a pas de canvas : on observe la configuration que le composant donne à Chart.js.
const created = vi.hoisted(() => ({ configs: [] as { data: { labels: string[]; datasets: { label: string; data: number[] }[] } }[] }))
vi.mock('chart.js', () => {
  class Chart {
    static register = vi.fn()
    destroy = vi.fn()
    constructor(_canvas: unknown, config: (typeof created.configs)[number]) {
      created.configs.push(config)
    }
  }
  const stub = class {}
  return { Chart, LineController: stub, LineElement: stub, PointElement: stub, LinearScale: stub, CategoryScale: stub, Tooltip: stub }
})

const measure = (id: number, measuredAt: string, rate: string, beat: string, amp: string): MeasurementDetail => ({
  id,
  measuredAt,
  rateSecondsPerDay: rate,
  beatErrorMs: beat,
  amplitudeDegrees: amp,
  watchPosition: null,
})

describe('PerformanceChart', () => {
  beforeEach(() => {
    created.configs.length = 0
  })

  it('S20 le graphique reçoit trois séries dans l’ordre chronologique', () => {
    mount(PerformanceChart, {
      props: {
        measurements: [
          measure(2, '2025-05-20', '7.00', '0.30', '262.00'),
          measure(1, '2025-05-05', '126.00', '2.90', '188.00'),
          measure(3, '2025-05-20', '4.00', '0.20', '270.00'),
        ],
      },
    })

    const { data } = created.configs[0]!
    expect(data.labels).toEqual(['05/05/2025', '20/05/2025', '20/05/2025'])
    expect(data.datasets.map((d) => d.label)).toEqual(['Marche (s/j)', 'Beat error (ms)', 'Amplitude (°)'])
    expect(data.datasets[0]!.data).toEqual([126, 7, 4])
    expect(data.datasets[1]!.data).toEqual([2.9, 0.3, 0.2])
    expect(data.datasets[2]!.data).toEqual([188, 262, 270])
  })
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
