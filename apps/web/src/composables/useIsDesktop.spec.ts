import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useIsDesktop } from './useIsDesktop'

const Probe = defineComponent({
  setup() {
    const isDesktop = useIsDesktop()
    return () => h('span', String(isDesktop.value))
  },
})

describe('useIsDesktop', () => {
  afterEach(() => {
    // @ts-expect-error jsdom ne définit pas matchMedia
    delete window.matchMedia
  })

  it('sans matchMedia (jsdom), l’écran est considéré comme mobile', () => {
    expect(mount(Probe).text()).toBe('false')
  })

  it('suit la requête (min-width: 640px) et ses changements, et retire son écouteur au démontage', () => {
    let listener: (event: { matches: boolean }) => void = () => {}
    const removeEventListener = vi.fn()
    const matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: (_: string, fn: typeof listener) => (listener = fn),
      removeEventListener,
    }))
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia

    const wrapper = mount(Probe)
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 640px)')
    expect(wrapper.text()).toBe('true')

    listener({ matches: false })
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.text()).toBe('false')
      wrapper.unmount()
      expect(removeEventListener).toHaveBeenCalledWith('change', listener)
    })
  })
})
