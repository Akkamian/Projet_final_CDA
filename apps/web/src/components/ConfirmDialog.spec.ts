import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from './ConfirmDialog.vue'

const props = {
  title: 'Supprimer l’étape ?',
  message: 'Cette action est définitive.',
  confirmLabel: 'Supprimer',
}

describe('ConfirmDialog', () => {
  it('affiche le titre, le message et le libellé de confirmation dans un dialog natif', () => {
    const wrapper = mount(ConfirmDialog, { props })

    expect(wrapper.element.tagName).toBe('DIALOG')
    expect(wrapper.text()).toContain('Supprimer l’étape ?')
    expect(wrapper.text()).toContain('Cette action est définitive.')
    expect(wrapper.find('[data-test="confirm-ok"]').text()).toBe('Supprimer')
  })

  it('émet confirm au clic sur le bouton de confirmation, cancel sur « Annuler »', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('la touche Échap (événement cancel du dialog) émet cancel', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper.trigger('cancel')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('la confirmation est une feuille compacte (classes sheet et confirm)', () => {
    const wrapper = mount(ConfirmDialog, { props })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['sheet', 'confirm']))
  })

  it('un clic sur le fond émet cancel', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('le bouton fermer de la feuille émet cancel', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper.find('[data-test="sheet-close"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
