import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProjectDetail, WatchDetail } from '../stores/watches'
import WatchFacts from './WatchFacts.vue'

const project = (over: Partial<ProjectDetail> = {}): ProjectDetail => ({
  id: 1,
  status: 'in_progress',
  createdAt: '2026-06-10T10:00:00Z',
  completedAt: null,
  photoBefore: null,
  photoAfter: null,
  steps: [
    { id: 1, stepOrder: 1, label: 'A', notes: null, isCompleted: true, completedAt: '2026-06-11T10:00:00Z', photos: [] },
    { id: 2, stepOrder: 2, label: 'B', notes: null, isCompleted: false, completedAt: null, photos: [] },
    { id: 3, stepOrder: 3, label: 'C', notes: null, isCompleted: false, completedAt: null, photos: [] },
  ],
  measurements: [
    {
      id: 1,
      measuredAt: '2026-08-11T00:00:00.000Z',
      rateSecondsPerDay: '48.00',
      beatErrorMs: '2.30',
      amplitudeDegrees: '186.00',
      watchPosition: null,
    },
    {
      id: 2,
      measuredAt: '2026-09-06T00:00:00.000Z',
      rateSecondsPerDay: '14.00',
      beatErrorMs: '0.40',
      amplitudeDegrees: '268.00',
      watchPosition: null,
    },
  ],
  expenses: [],
  ...over,
})

const watch = (over: Partial<WatchDetail> = {}): WatchDetail => ({
  id: 7,
  brand: 'Seiko',
  model: '6119-8100',
  movementCode: 'automatic',
  complications: [],
  purchasePrice: '120.00',
  purchaseDate: '2026-07-02',
  resalePrice: null,
  resaleDate: null,
  margin: null,
  costPrice: '195.00',
  projects: [project()],
  ...over,
})

const facts = (wrapper: ReturnType<typeof mount>) =>
  Object.fromEntries(wrapper.findAll('[data-test="fact"]').map((f) => [f.find('dt').text(), f.find('dd').text()]))

describe('WatchFacts', () => {
  it('montre non vendue : Achat, Coût de revient, Progression et Dernière mesure', () => {
    const w = watch()
    const wrapper = mount(WatchFacts, { props: { watch: w, project: w.projects[0]! } })

    expect(Object.keys(facts(wrapper))).toEqual(['Achat', 'Coût de revient', 'Progression', 'Dernière mesure'])
    expect(facts(wrapper)).toMatchObject({
      Achat: expect.stringContaining('120 €'),
      'Coût de revient': '195 €',
      Progression: '1/3',
      'Dernière mesure': '+14 s/j',
    })
  })

  it('RG-FIN-13 sans prix d’achat : « — », jamais « null », « NaN » ni « 0 € »', () => {
    const w = watch({ purchasePrice: null, purchaseDate: null, costPrice: null })
    const wrapper = mount(WatchFacts, { props: { watch: w, project: w.projects[0]! } })

    expect(facts(wrapper).Achat).toBe('—')
    expect(facts(wrapper)['Coût de revient']).toBe('—')
    expect(wrapper.text()).not.toMatch(/null|NaN|0 €/)
  })

  it('sans projet ni mesure : « — » pour la progression et la dernière mesure', () => {
    const w = watch({ projects: [] })
    const wrapper = mount(WatchFacts, { props: { watch: w, project: null } })

    expect(facts(wrapper).Progression).toBe('—')
    expect(facts(wrapper)['Dernière mesure']).toBe('—')
  })

  it('un projet sans mesure : « — » pour la dernière mesure', () => {
    const w = watch({ projects: [project({ measurements: [] })] })
    const wrapper = mount(WatchFacts, { props: { watch: w, project: w.projects[0]! } })

    expect(facts(wrapper)['Dernière mesure']).toBe('—')
  })

  it('montre vendue : Achat, Coût de revient, Revente et Marge à la place de Progression et Dernière mesure', () => {
    const w = watch({ resalePrice: '350.00', resaleDate: '2026-10-01', margin: '155.00', costPrice: '195.00' })
    const wrapper = mount(WatchFacts, { props: { watch: w, project: w.projects[0]! } })

    expect(Object.keys(facts(wrapper))).toEqual(['Achat', 'Coût de revient', 'Revente', 'Marge'])
    expect(facts(wrapper).Revente).toContain('350 €')
    expect(facts(wrapper).Marge).toBe('+155 €')
  })

  it('S23 une marge négative prend le vrai signe moins', () => {
    const w = watch({ resalePrice: '100.00', resaleDate: '2026-10-01', margin: '-25.00' })
    const wrapper = mount(WatchFacts, { props: { watch: w, project: null } })

    expect(facts(wrapper).Marge).toBe('−25 €')
  })

  it('S24 montre vendue sans prix d’achat : marge « — »', () => {
    const w = watch({ resalePrice: '100.00', resaleDate: '2026-10-01', purchasePrice: null, costPrice: null, margin: null })
    const wrapper = mount(WatchFacts, { props: { watch: w, project: null } })

    expect(facts(wrapper).Marge).toBe('—')
  })
})
