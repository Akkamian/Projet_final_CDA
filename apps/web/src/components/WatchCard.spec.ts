import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { fileUrl } from '../api/client'
import type { WatchCard as WatchCardData } from '../stores/watches'
import { makeRouter } from '../test/helpers'
import WatchCard from './WatchCard.vue'

const watch = (overrides: Partial<WatchCardData> = {}): WatchCardData => ({
  id: 4,
  brand: 'Seiko',
  model: '6119-8100',
  movementCode: 'automatic',
  complicationLabels: ['Chronographe'],
  status: 'in_progress',
  thumbnailUrl: null,
  margin: null,
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resaleDate: null,
  progress: null,
  ...overrides,
})

async function mountCard(overrides: Partial<WatchCardData> = {}) {
  const router = await makeRouter('/', [{ path: '/watches/:id', name: 'watch-detail', component: { template: '<div />' } }])
  return mount(WatchCard, { props: { watch: watch(overrides) }, global: { plugins: [router] } })
}

describe('WatchCard', () => {
  it('S25 affiche la photo du projet en vignette', async () => {
    const wrapper = await mountCard({ thumbnailUrl: '/uploads/a.webp' })
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe(fileUrl('/uploads/a.webp'))
    expect(img.attributes('alt')).toBe('')
  })

  it('RG-AFF-05 une montre sans projet a une vignette vide en pointillés, sans image', async () => {
    const wrapper = await mountCard({ status: 'no_project' })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.thumb-empty').exists()).toBe(true)
  })

  it('un projet sans photo garde l’icône d’horloge, pas la vignette en pointillés', async () => {
    const wrapper = await mountCard({ status: 'in_progress', thumbnailUrl: null })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.thumb-empty').exists()).toBe(false)
    expect(wrapper.find('.thumb svg').exists()).toBe(true)
  })

  it('RG-AFF-12 la marge s’affiche sans décimales nulles', async () => {
    expect((await mountCard({ status: 'sold', margin: '185.00' })).get('[data-test="margin"]').text()).toBe('+185 €')
    expect((await mountCard({ status: 'sold', margin: '-25.00' })).get('[data-test="margin"]').text()).toBe('−25 €')
    expect((await mountCard({ status: 'sold', margin: '12.50' })).get('[data-test="margin"]').text()).toBe('+12,50 €')
  })

  it('S25 affiche mouvement et complications, et le lien porte son titre', async () => {
    const wrapper = await mountCard()
    expect(wrapper.text()).toContain('Automatique · Chronographe')
    expect(wrapper.get('a').attributes('title')).toBe('Ouvre le détail de la montre')
  })
})
