import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { makeRouter } from '../test/helpers'
import BottomNav from './BottomNav.vue'

const Empty = { render: () => null }

async function mountNav(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await makeRouter(path, [
    { path: '/watches/new', name: 'new-watch', component: Empty },
    { path: '/watches/:id', name: 'watch-detail', component: Empty },
  ])
  return mount(BottomNav, { global: { plugins: [pinia, router] } })
}

const link = (wrapper: Awaited<ReturnType<typeof mountNav>>, label: string) => wrapper.findAll('a').find((a) => a.text() === label)!

describe('BottomNav', () => {
  it('trois entrées, dans l’ordre, avec leur lien', async () => {
    const wrapper = await mountNav('/')

    const links = wrapper.findAll('a')
    expect(links.map((a) => a.text())).toEqual(['Accueil', 'Recherche', 'Nouveau projet'])
    expect(links.map((a) => a.attributes('href'))).toEqual(['/', '/?recherche=1', '/watches/new'])
  })

  it('« Accueil » est actif sur / et sur une fiche', async () => {
    for (const path of ['/', '/watches/3']) {
      const wrapper = await mountNav(path)

      expect(link(wrapper, 'Accueil').attributes('aria-current'), path).toBe('page')
    }
  })

  it('« Nouveau projet » et « Recherche » ne sont jamais actifs, même sur /watches/new', async () => {
    const wrapper = await mountNav('/watches/new')

    expect(link(wrapper, 'Nouveau projet').attributes('aria-current')).toBeUndefined()
    expect(link(wrapper, 'Recherche').attributes('aria-current')).toBeUndefined()
  })

  it('la navigation porte le nom « Navigation principale »', async () => {
    const wrapper = await mountNav('/')

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Navigation principale')
  })
})
