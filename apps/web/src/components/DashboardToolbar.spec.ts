import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { makeRouter } from '../test/helpers'
import DashboardToolbar from './DashboardToolbar.vue'

async function mountToolbar(props: { query: string; status: 'sold' | null }) {
  const router = await makeRouter('/', [{ path: '/watches/new', name: 'new-watch', component: { template: '<div />' } }])
  return mount(DashboardToolbar, { props, global: { plugins: [router] } })
}

describe('DashboardToolbar', () => {
  it('S40 la saisie dans la recherche émet update:query', async () => {
    const wrapper = await mountToolbar({ query: '', status: null })
    await wrapper.get('input[type="search"]').setValue('seiko')
    expect(wrapper.emitted('update:query')).toEqual([['seiko']])
  })

  it('S40 le select propose les statuts, reflète le statut courant et émet null pour « Tous »', async () => {
    const wrapper = await mountToolbar({ query: '', status: 'sold' })
    const select = wrapper.get('select[aria-label="Statut"]')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['Tous', 'En cours', 'Terminé', 'Vendue', 'Sans projet'])
    expect((select.element as HTMLSelectElement).value).toBe('sold')

    await select.setValue('')
    await select.setValue('completed')
    expect(wrapper.emitted('update:status')).toEqual([[null], ['completed']])
  })

  it('le bouton « Nouvelle montre » mène au formulaire de création', async () => {
    const wrapper = await mountToolbar({ query: '', status: null })
    const link = wrapper.get('a[href="/watches/new"]')
    expect(link.text()).toContain('Nouvelle montre')
  })
})
