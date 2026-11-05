import { describe, expect, it } from 'vitest'
import { isHomeActive } from './navigation'

describe('isHomeActive', () => {
  it('« Tableau de bord » reste actif sur l’accueil, les fiches et le nouveau projet', () => {
    expect(isHomeActive('/')).toBe(true)
    expect(isHomeActive('/watches/12')).toBe(true)
    expect(isHomeActive('/watches/new')).toBe(true)
  })

  it('il ne l’est pas sur le compte ni sur l’aperçu des étapes', () => {
    expect(isHomeActive('/account')).toBe(false)
    expect(isHomeActive('/apercu-etapes')).toBe(false)
  })
})
