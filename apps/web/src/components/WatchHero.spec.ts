import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProjectDetail, WatchDetail } from '../stores/watches'
import WatchHero from './WatchHero.vue'

const project = (over: Partial<ProjectDetail> = {}): ProjectDetail => ({
  id: 1,
  status: 'in_progress',
  createdAt: '2026-06-10T10:00:00Z',
  completedAt: null,
  photoBefore: null,
  photoAfter: null,
  steps: [],
  measurements: [],
  expenses: [],
  ...over,
})

const watch = (over: Partial<WatchDetail> = {}): WatchDetail => ({
  id: 7,
  brand: 'Seiko',
  model: '6119-8100',
  movementCode: 'automatic',
  complications: [
    { code: 'date', label: 'Date' },
    { code: 'day', label: 'Jour' },
  ],
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resaleDate: null,
  margin: null,
  costPrice: null,
  projects: [],
  ...over,
})

describe('WatchHero', () => {
  it('affiche le titre, le mouvement, les complications et le badge de statut', () => {
    const wrapper = mount(WatchHero, { props: { watch: watch(), project: project(), status: 'in_progress' } })

    expect(wrapper.get('h2').text()).toBe('Seiko 6119-8100')
    expect(wrapper.text()).toContain('Automatique · Date, Jour')
    expect(wrapper.get('[data-test="status-badge"]').text()).toBe('En cours')
  })

  it('un badge par statut : Terminé, Vendue, Sans projet', () => {
    const badge = (status: 'completed' | 'sold' | 'no_project') =>
      mount(WatchHero, { props: { watch: watch(), project: null, status } })
        .get('[data-test="status-badge"]')
        .text()

    expect([badge('completed'), badge('sold'), badge('no_project')]).toEqual(['Terminé', 'Vendue', 'Sans projet'])
  })

  it('la photo est celle d’après, sinon celle d’avant', () => {
    const after = mount(WatchHero, {
      props: {
        watch: watch(),
        project: project({ photoBefore: '/uploads/avant.webp', photoAfter: '/uploads/apres.webp' }),
        status: 'completed',
      },
    })
    const before = mount(WatchHero, {
      props: { watch: watch(), project: project({ photoBefore: '/uploads/avant.webp' }), status: 'in_progress' },
    })

    expect(after.get('img').attributes('src')).toMatch(/\/uploads\/apres\.webp$/)
    expect(before.get('img').attributes('src')).toMatch(/\/uploads\/avant\.webp$/)
  })

  it('sans photo ni projet : vignette vide en pointillés, aucune image', () => {
    const wrapper = mount(WatchHero, { props: { watch: watch(), project: null, status: 'no_project' } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-test="hero-empty"]').exists()).toBe(true)
  })

  it('sans complication, le sous-titre n’affiche que le mouvement', () => {
    const wrapper = mount(WatchHero, { props: { watch: watch({ complications: [] }), project: null, status: 'no_project' } })

    expect(wrapper.get('[data-test="hero-subtitle"]').text()).toBe('Automatique')
  })
})
