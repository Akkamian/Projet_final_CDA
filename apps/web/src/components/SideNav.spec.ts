import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useAccountStore } from '../stores/account'
import { makeRouter } from '../test/helpers'
import SideNav from './SideNav.vue'

const Empty = { render: () => null }

async function mountNav(path: string, email: string | null = 'amateur@example.com') {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (email) {
    useAccountStore().profile = { email, createdAt: '', emailVerifiedAt: null, passwordChangedAt: null }
  }
  const router = await makeRouter(path, [
    { path: '/account', name: 'account', component: Empty },
    { path: '/watches/new', name: 'new-watch', component: Empty },
    { path: '/watches/:id', name: 'watch-detail', component: Empty },
  ])
  return mount(SideNav, { global: { plugins: [pinia, router] } })
}

const link = (wrapper: Awaited<ReturnType<typeof mountNav>>, label: string) => wrapper.findAll('a').find((a) => a.text() === label)!

describe('SideNav', () => {
  it('trois entrées, dans l’ordre, avec leur lien', async () => {
    const wrapper = await mountNav('/')

    const links = wrapper.findAll('a')
    expect(links.map((a) => a.text())).toEqual(['Tableau de bord', 'Recherche', 'Mon compte'])
    expect(links.map((a) => a.attributes('href'))).toEqual(['/', '/?recherche=1', '/account'])
  })

  it('« Tableau de bord » est actif sur /, /watches/12 et /watches/new, et rien d’autre ne l’est', async () => {
    for (const path of ['/', '/watches/12', '/watches/new']) {
      const wrapper = await mountNav(path)

      expect(link(wrapper, 'Tableau de bord').attributes('aria-current'), path).toBe('page')
      expect(link(wrapper, 'Recherche').attributes('aria-current'), path).toBeUndefined()
      expect(link(wrapper, 'Mon compte').attributes('aria-current'), path).toBeUndefined()
    }
  })

  it('« Mon compte » est actif sur /account, « Tableau de bord » ne l’est pas', async () => {
    const wrapper = await mountNav('/account')

    expect(link(wrapper, 'Mon compte').attributes('aria-current')).toBe('page')
    expect(link(wrapper, 'Tableau de bord').attributes('aria-current')).toBeUndefined()
  })

  it('« Recherche » n’est jamais active, même sur /?recherche=1', async () => {
    const wrapper = await mountNav('/?recherche=1')

    expect(link(wrapper, 'Recherche').attributes('aria-current')).toBeUndefined()
  })

  it('le pied affiche l’email, tronqué visuellement mais avec son texte complet en title', async () => {
    const email = 'une-adresse-vraiment-tres-longue-pour-tester-la-troncature@exemple-de-domaine.example.com'
    const wrapper = await mountNav('/', email)

    const element = wrapper.get('[data-test="account-email"]')
    expect(element.text()).toBe(email)
    expect(element.attributes('title')).toBe(email)
  })

  it('sans profil, le pied n’affiche pas d’email et garde l’icône', async () => {
    const wrapper = await mountNav('/', null)

    expect(wrapper.find('[data-test="account-email"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="account-footer"]').find('svg').exists()).toBe(true)
  })

  it('les libellés restent dans le DOM pour le rail d’icônes : chaque entrée garde un nom accessible', async () => {
    const wrapper = await mountNav('/')

    for (const a of wrapper.findAll('a')) expect(a.text().length).toBeGreaterThan(0)
  })

  it('la navigation porte le nom « Navigation principale »', async () => {
    const wrapper = await mountNav('/')

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Navigation principale')
  })
})
