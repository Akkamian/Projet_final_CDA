import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { routes } from './router'
import { stubFetch } from './test/helpers'

describe('App', () => {
  it('monte l’application et affiche la vue du routeur', async () => {
    // La page d'accueil (tableau de bord) charge la liste des montres : on ne sort pas sur le réseau.
    stubFetch(() => ({ status: 200, body: { items: [], counts: { all: 0, in_progress: 0, completed: 0, sold: 0, no_project: 0 } } }))
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('.app').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Mes montres')
  })
})
