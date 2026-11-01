import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { routes } from './router'

describe('App', () => {
  it('monte l’application et affiche la vue du routeur', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('.app').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Watch Restoration Tracker')
  })
})
