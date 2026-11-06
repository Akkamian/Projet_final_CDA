import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DashboardStats from './DashboardStats.vue'

const counts = { all: 12, in_progress: 3, completed: 4, sold: 2, no_project: 3 }
const tiles = (totalMargin: string) => mount(DashboardStats, { props: { counts, totalMargin } }).findAll('[data-test="stat"]')

describe('DashboardStats', () => {
  it('S25 affiche six tuiles dans l’ordre de la maquette', () => {
    expect(tiles('640.00').map((t) => t.text())).toEqual([
      'Montres12',
      'En cours3',
      'Terminées4',
      'Vendues2',
      'Sans projet3',
      'Marge cumulée+640 €',
    ])
  })

  it('RG-AFF-10 la marge cumulée positive est verte, nulle ou négative ne l’est pas', () => {
    expect(tiles('640.00')[5]!.classes()).toContain('positive')
    expect(tiles('0.00')[5]!.classes()).not.toContain('positive')
    expect(tiles('-20.00')[5]!.text()).toBe('Marge cumulée−20 €')
    expect(tiles('-20.00')[5]!.classes()).not.toContain('positive')
  })
})
