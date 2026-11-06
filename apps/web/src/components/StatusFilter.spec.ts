import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StatusFilter from './StatusFilter.vue'

const counts = { all: 12, in_progress: 3, completed: 4, sold: 2, no_project: 3 }

describe('StatusFilter', () => {
  const scrollIntoView = vi.fn()
  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })
  afterEach(() => {
    // @ts-expect-error jsdom ne définit pas scrollIntoView
    delete Element.prototype.scrollIntoView
  })

  it('S40 le groupe est atteignable au clavier et porte une pastille par statut avec son compteur', () => {
    const wrapper = mount(StatusFilter, { props: { counts, selected: null } })
    expect(wrapper.get('[data-test="status-filter"]').attributes('tabindex')).toBe('0')
    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['Toutes 12', 'En cours 3', 'Terminé 4', 'Vendue 2', 'Sans projet 3'])
    expect(buttons[0]!.attributes('aria-pressed')).toBe('true')
  })

  it('S40 un clic émet le statut choisi, « Toutes » émet null', async () => {
    const wrapper = mount(StatusFilter, { props: { counts, selected: null } })
    await wrapper.findAll('button')[3]!.trigger('click')
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['sold'], [null]])
  })

  it('la pastille active défile dans la vue quand la sélection change', async () => {
    const wrapper = mount(StatusFilter, { props: { counts, selected: null }, attachTo: document.body })
    await wrapper.setProps({ selected: 'sold' })
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'center', block: 'nearest' })
    expect(scrollIntoView.mock.contexts[0]).toBe(wrapper.findAll('button')[3]!.element)
    wrapper.unmount()
  })
})
