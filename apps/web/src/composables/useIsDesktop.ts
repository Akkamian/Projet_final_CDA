import { onMounted, onUnmounted, ref, type Ref } from 'vue'

const DESKTOP_QUERY = '(min-width: 640px)'

/** Vrai à partir de 640 px : le tableau de bord passe des cartes au tableau. Sans `matchMedia` (jsdom), l'écran est mobile. */
export function useIsDesktop(): Ref<boolean> {
  const isDesktop = ref(false)
  let query: MediaQueryList | null = null
  const onChange = (event: { matches: boolean }) => {
    isDesktop.value = event.matches
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    query = window.matchMedia(DESKTOP_QUERY)
    isDesktop.value = query.matches
  }
  onMounted(() => query?.addEventListener('change', onChange))
  onUnmounted(() => query?.removeEventListener('change', onChange))
  return isDesktop
}
