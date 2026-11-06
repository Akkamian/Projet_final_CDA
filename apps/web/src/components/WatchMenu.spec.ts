import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import WatchMenu from './WatchMenu.vue'

type Props = { canReopen: boolean; reopenNote: string | null; hasProject: boolean }
const mountMenu = (props: Partial<Props> = {}) =>
  mount(WatchMenu, { props: { canReopen: true, reopenNote: null, hasProject: true, ...props }, attachTo: document.body })

const toggle = (w: ReturnType<typeof mountMenu>) => w.get('[data-test="menu-toggle"]')
const items = (w: ReturnType<typeof mountMenu>) => w.findAll('[role="menuitem"]')

describe('WatchMenu', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('fermé par défaut, le bouton annonce un menu', () => {
    const wrapper = mountMenu()

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(toggle(wrapper).attributes('aria-haspopup')).toBe('menu')
    expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('un clic l’ouvre avec les quatre entrées', async () => {
    const wrapper = mountMenu()

    await toggle(wrapper).trigger('click')

    expect(toggle(wrapper).attributes('aria-expanded')).toBe('true')
    expect(items(wrapper).map((i) => i.text())).toEqual([
      'Modifier la montre',
      'Rouvrir ce projet',
      'Supprimer ce projet',
      'Supprimer la montre',
    ])
  })

  it('Échap le ferme et rend le focus au bouton', async () => {
    const wrapper = mountMenu()
    await toggle(wrapper).trigger('click')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(toggle(wrapper).element)
  })

  it('un clic à l’extérieur le ferme', async () => {
    const wrapper = mountMenu()
    await toggle(wrapper).trigger('click')

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('« Rouvrir ce projet » désactivé : note visible, aucune action, menu resté ouvert', async () => {
    const wrapper = mountMenu({ canReopen: false, reopenNote: 'Un projet est déjà en cours' })
    await toggle(wrapper).trigger('click')

    const reopen = items(wrapper)[1]!
    expect(reopen.attributes('aria-disabled')).toBe('true')
    expect(wrapper.text()).toContain('Un projet est déjà en cours')
    await reopen.trigger('click')
    await reopen.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('reopen')).toBeUndefined()
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
  })

  it('sans projet : « Rouvrir » et « Supprimer ce projet » ne sont pas proposés', async () => {
    const wrapper = mountMenu({ hasProject: false })
    await toggle(wrapper).trigger('click')

    expect(items(wrapper).map((i) => i.text())).toEqual(['Modifier la montre', 'Supprimer la montre'])
  })

  it.each([
    [0, 'edit'],
    [1, 'reopen'],
    [2, 'remove-project'],
    [3, 'remove-watch'],
  ])('l’entrée %i émet « %s » et ferme le menu', async (index, event) => {
    const wrapper = mountMenu()
    await toggle(wrapper).trigger('click')

    await items(wrapper)[index]!.trigger('click')

    expect(wrapper.emitted(event)).toHaveLength(1)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('à l’ouverture le focus va à la première entrée, les flèches parcourent les entrées', async () => {
    const wrapper = mountMenu()
    await toggle(wrapper).trigger('click')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(items(wrapper)[0]!.element)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items(wrapper)[1]!.element)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items(wrapper)[0]!.element)
  })
})
