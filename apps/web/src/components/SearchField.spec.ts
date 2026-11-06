import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SearchField from './SearchField.vue'

describe('SearchField', () => {
  it('S40 porte un nom accessible et affiche la valeur reçue', () => {
    const wrapper = mount(SearchField, { props: { modelValue: 'seiko' } })
    const input = wrapper.get('input[type="search"]')
    expect(input.attributes('aria-label')).toBe('Rechercher une montre')
    expect(input.attributes('placeholder')).toBe('Rechercher une montre')
    expect((input.element as HTMLInputElement).value).toBe('seiko')
  })

  it('S40 la saisie émet update:modelValue', async () => {
    const wrapper = mount(SearchField, { props: { modelValue: '' } })
    await wrapper.get('input').setValue('omega')
    expect(wrapper.emitted('update:modelValue')).toEqual([['omega']])
  })

  it('focus() donne le focus au champ', () => {
    const wrapper = mount(SearchField, { props: { modelValue: '' }, attachTo: document.body })
    ;(wrapper.vm as unknown as { focus: () => void }).focus()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    wrapper.unmount()
  })
})
