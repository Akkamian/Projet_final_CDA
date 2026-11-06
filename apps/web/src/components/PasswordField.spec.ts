import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PasswordField from './PasswordField.vue'

function mountField(props: Record<string, unknown> = {}) {
  return mount(PasswordField, { props: { id: 'pw', label: 'Mot de passe', modelValue: '', autocomplete: 'current-password', ...props } })
}

describe('PasswordField', () => {
  it('le champ est masqué par défaut', () => {
    const wrapper = mountField()
    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(wrapper.get('label').text()).toBe('Mot de passe')
  })

  it("l'œil affiche puis masque le texte, aria-pressed et aria-label suivent, la valeur est conservée", async () => {
    const wrapper = mountField({ modelValue: 'secret-123' })
    const eye = wrapper.get('[data-test="toggle-password"]')
    expect(eye.attributes('type')).toBe('button')
    expect(eye.attributes('aria-pressed')).toBe('false')
    expect(eye.attributes('aria-label')).toBe('Afficher le mot de passe')

    await eye.trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('secret-123')
    expect(eye.attributes('aria-pressed')).toBe('true')
    expect(eye.attributes('aria-label')).toBe('Masquer le mot de passe')

    await eye.trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('password')
  })

  it("error pose aria-invalid et aria-describedby vers le message", () => {
    const wrapper = mountField({ error: 'Trop court' })
    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    const message = wrapper.get('#pw-error')
    expect(message.text()).toBe('Trop court')
    expect(message.attributes('role')).toBe('alert')
    expect(input.attributes('aria-describedby')).toContain('pw-error')
  })

  it('sans erreur, pas d’aria-invalid', () => {
    expect(mountField().get('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('hint est lié par aria-describedby', () => {
    const wrapper = mountField({ hint: '8 caractères minimum.' })
    expect(wrapper.get('#pw-hint').text()).toBe('8 caractères minimum.')
    expect(wrapper.get('input').attributes('aria-describedby')).toContain('pw-hint')
  })

  it('v-model propage la saisie', async () => {
    const wrapper = mountField()
    await wrapper.get('input').setValue('abc')
    expect(wrapper.emitted('update:modelValue')).toEqual([['abc']])
  })

  it('autocomplete, maxlength et name sont transmis à l’input', () => {
    const input = mountField({ autocomplete: 'new-password', maxlength: 72, name: 'password' }).get('input')
    expect(input.attributes('autocomplete')).toBe('new-password')
    expect(input.attributes('maxlength')).toBe('72')
    expect(input.attributes('name')).toBe('password')
    expect(input.attributes('id')).toBe('pw')
  })
})
