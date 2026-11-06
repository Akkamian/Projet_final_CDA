import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Avatar from './Avatar.vue'

describe('Avatar', () => {
  it('la variante initiale affiche la lettre', () => {
    const wrapper = mount(Avatar, { props: { variant: 'initial', initial: 'A' } })

    expect(wrapper.text()).toBe('A')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('sans initiale (profil non chargé), la variante initiale affiche l’icône de repli, jamais de texte', () => {
    const wrapper = mount(Avatar, { props: { variant: 'initial', initial: null } })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
  })

  it('la variante large affiche l’initiale sur le grand format', () => {
    const wrapper = mount(Avatar, { props: { variant: 'large', initial: 'a' } })

    expect(wrapper.classes()).toContain('large')
    expect(wrapper.text()).toBe('a')
  })

  it('la variante icône affiche l’icône même avec une initiale', () => {
    const wrapper = mount(Avatar, { props: { variant: 'icon', initial: 'A' } })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
  })
})
