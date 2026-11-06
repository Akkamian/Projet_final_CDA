import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Sheet from './Sheet.vue'

const proto = HTMLDialogElement.prototype as { showModal?: () => void; close?: () => void }
const originalShowModal = proto.showModal
const originalClose = proto.close

afterEach(() => {
  proto.showModal = originalShowModal
  proto.close = originalClose
  document.body.innerHTML = ''
})

const mountSheet = (props: Record<string, unknown> = {}) =>
  mount(Sheet, {
    props: { title: 'Ajouter une mesure', ...props },
    slots: { default: '<p data-test="body">Corps</p>' },
    attachTo: document.body,
  })

describe('Sheet', () => {
  it('rend un dialog natif titré et le corps du slot', () => {
    const wrapper = mountSheet()

    expect(wrapper.element.tagName).toBe('DIALOG')
    const heading = wrapper.find('h2')
    expect(heading.text()).toBe('Ajouter une mesure')
    expect(wrapper.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(wrapper.find('[data-test="body"]').exists()).toBe(true)
  })

  it('s’ouvre en modal au montage', () => {
    const showModal = vi.fn()
    proto.showModal = showModal

    mountSheet()

    expect(showModal).toHaveBeenCalledTimes(1)
  })

  it('sans showModal (jsdom), pose l’attribut open', () => {
    proto.showModal = undefined

    const wrapper = mountSheet()

    expect(wrapper.attributes('open')).toBeDefined()
  })

  it('Échap (cancel) émet close et empêche la fermeture native', () => {
    const wrapper = mountSheet()
    const event = new Event('cancel', { cancelable: true })

    wrapper.element.dispatchEvent(event)

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('le clic sur le fond émet close, le clic dans le corps non', async () => {
    const wrapper = mountSheet()

    await wrapper.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.find('[data-test="body"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('le bouton fermer émet close', async () => {
    const wrapper = mountSheet()

    const close = wrapper.find('[data-test="sheet-close"]')
    expect(close.attributes('aria-label')).toBe('Fermer')
    await close.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('la variante confirm pose la classe confirm, form par défaut', () => {
    expect(mountSheet({ variant: 'confirm' }).classes()).toEqual(expect.arrayContaining(['sheet', 'confirm']))
    expect(mountSheet().classes()).toEqual(expect.arrayContaining(['sheet', 'form']))
  })

  it('au démontage, la feuille se ferme (lève l’inertie du reste de la page) avant de rendre le focus', () => {
    // Un dialog modal rend le reste de la page inerte : focus() sur le déclencheur ne marche qu'une fois le dialog fermé.
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, 'close')
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const focusSpy = vi.spyOn(opener, 'focus')
    const wrapper = mountSheet()

    wrapper.unmount()

    expect(closeSpy).toHaveBeenCalledTimes(1)
    expect(focusSpy).toHaveBeenCalledTimes(1)
    expect(closeSpy.mock.invocationCallOrder[0]!).toBeLessThan(focusSpy.mock.invocationCallOrder[0]!)
  })

  it('occupée (busy), la feuille ignore Échap, le clic sur le fond et la fermeture, et désactive le bouton ×', async () => {
    const wrapper = mountSheet({ busy: true })

    wrapper.element.dispatchEvent(new Event('cancel', { cancelable: true }))
    await wrapper.trigger('click')
    await wrapper.find('[data-test="sheet-close"]').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find('[data-test="sheet-close"]').attributes('disabled')).toBeDefined()
  })

  it('le focus revient à l’élément actif au montage quand la feuille est démontée', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const wrapper = mountSheet()
    const inner = wrapper.find('[data-test="sheet-close"]').element as HTMLElement
    inner.focus()

    wrapper.unmount()

    expect(document.activeElement).toBe(opener)
  })
})
