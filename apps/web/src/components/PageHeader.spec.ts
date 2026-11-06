import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { makeRouter } from '../test/helpers'
import PageHeader from './PageHeader.vue'

async function mountHeader(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  const router = await makeRouter('/')
  return mount(PageHeader, { props, slots, global: { plugins: [router] } })
}

describe('PageHeader', () => {
  it('affiche le titre dans un h1', async () => {
    const wrapper = await mountHeader({ title: 'Tableau de bord' })

    expect(wrapper.get('h1').text()).toBe('Tableau de bord')
  })

  it('affiche le sous-titre quand il est fourni, et pas sinon', async () => {
    const avec = await mountHeader({ title: 'Tableau de bord', subtitle: '5 montres' })
    const sans = await mountHeader({ title: 'Tableau de bord' })

    expect(avec.get('[data-test="subtitle"]').text()).toBe('5 montres')
    expect(sans.find('[data-test="subtitle"]').exists()).toBe(false)
  })

  it('le bouton retour est un lien vers back, au nom accessible « Retour »', async () => {
    const wrapper = await mountHeader({ title: 'Seiko', back: '/' })

    const link = wrapper.get('a[aria-label="Retour"]')
    expect(link.attributes('href')).toBe('/')
  })

  it('sans back, il n’y a pas de lien retour', async () => {
    const wrapper = await mountHeader({ title: 'Tableau de bord' })

    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('le slot actions est rendu', async () => {
    const wrapper = await mountHeader({ title: 'Tableau de bord' }, { actions: '<button data-test="action">Nouveau projet</button>' })

    expect(wrapper.get('[data-test="action"]').text()).toBe('Nouveau projet')
  })

  it('avec parent, un fil d’Ariane renvoie au tableau de bord et l’en-tête le signale', async () => {
    const wrapper = await mountHeader({ title: 'Seiko 6119-8100', back: '/', parent: { label: 'Tableau de bord', to: '/' } })

    const crumb = wrapper.get('nav[aria-label="Fil d’Ariane"]')
    expect(crumb.get('a').text()).toBe('Tableau de bord')
    expect(crumb.get('a').attributes('href')).toBe('/')
    expect(wrapper.get('header').classes()).toContain('has-parent')
    expect(wrapper.get('h1').text()).toBe('Seiko 6119-8100')
  })

  it('sans parent, aucun fil d’Ariane', async () => {
    const wrapper = await mountHeader({ title: 'Tableau de bord' })

    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.get('header').classes()).not.toContain('has-parent')
  })
})
