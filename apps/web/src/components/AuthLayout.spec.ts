import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthLayout from './AuthLayout.vue'

const mountLayout = () => mount(AuthLayout, { slots: { default: '<form data-test="inner">Formulaire</form>' } })

describe('AuthLayout', () => {
  it('affiche le contenu du slot dans main', () => {
    const wrapper = mountLayout()
    expect(wrapper.get('main [data-test="inner"]').text()).toBe('Formulaire')
  })

  it('contient la marque en en-tête et le panneau avec le slogan exact', () => {
    const wrapper = mountLayout()
    expect(wrapper.get('header.auth-brand').text()).toContain('Watch Restoration Tracker')
    expect(wrapper.get('[data-test="auth-panel"]').text()).toContain('Le journal de vos restaurations horlogères.')
  })

  it("n'introduit aucun titre (h1 à h6)", () => {
    expect(mountLayout().find('h1, h2, h3, h4, h5, h6').exists()).toBe(false)
  })

  it('le panneau a trois puces', () => {
    expect(mountLayout().findAll('[data-test="auth-panel"] li')).toHaveLength(3)
  })
})
