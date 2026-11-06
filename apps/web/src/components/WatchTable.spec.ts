import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { WatchCard } from '../stores/watches'
import { makeRouter } from '../test/helpers'
import WatchTable from './WatchTable.vue'

const watch = (id: number, overrides: Partial<WatchCard> = {}): WatchCard => ({
  id,
  brand: 'Seiko',
  model: `M${id}`,
  movementCode: 'automatic',
  complicationLabels: ['Date'],
  status: 'in_progress',
  thumbnailUrl: null,
  margin: null,
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resaleDate: null,
  progress: null,
  ...overrides,
})

type Props = { items: WatchCard[]; total: number; page: number; pageSize: number; sort: 'purchase_date' | null; order: 'asc' | 'desc' }

async function mountTable(overrides: Partial<Props> = {}) {
  const router = await makeRouter('/', [{ path: '/watches/:id', name: 'watch-detail', component: { template: '<div />' } }])
  const props: Props = { items: [watch(1)], total: 1, page: 1, pageSize: 8, sort: null, order: 'desc', ...overrides }
  return mount(WatchTable, { props, global: { plugins: [router] } })
}
const cells = (wrapper: Awaited<ReturnType<typeof mountTable>>, row = 0) =>
  wrapper
    .findAll('[data-test="table-row"]')
    [row]!.findAll('td')
    .map((td) => td.text())

describe('WatchTable', () => {
  it('S25 une ligne par montre : titre lien, sous-titre, statut', async () => {
    const wrapper = await mountTable({ items: [watch(1), watch(2, { status: 'sold' })], total: 2 })
    expect(wrapper.findAll('[data-test="table-row"]')).toHaveLength(2)
    expect(wrapper.get('[data-test="table-row"] a').attributes('href')).toBe('/watches/1')
    expect(cells(wrapper)[0]).toContain('Seiko M1')
    expect(cells(wrapper)[0]).toContain('Automatique · Date')
    expect(cells(wrapper)[1]).toBe('En cours')
    expect(cells(wrapper, 1)[1]).toBe('Vendue')
  })

  it('RG-AFF-07 la progression s’affiche « 3/27 » avec une barre, « — » sans projet ou sans étape', async () => {
    const wrapper = await mountTable({
      items: [watch(1, { progress: { done: 3, total: 27 } }), watch(2), watch(3, { progress: { done: 0, total: 0 } })],
      total: 3,
    })
    expect(cells(wrapper, 0)[2]).toBe('3/27')
    const bar = wrapper.findAll('[data-test="table-row"]')[0]!.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('3')
    expect(bar.attributes('aria-valuemax')).toBe('27')
    expect(cells(wrapper, 1)[2]).toBe('—')
    expect(cells(wrapper, 2)[2]).toBe('—')
  })

  it('RG-AFF-12 achat, revente et marge : montants sans décimales nulles et dates JJ/MM/AAAA', async () => {
    const wrapper = await mountTable({
      items: [
        watch(1, {
          status: 'sold',
          purchasePrice: '95.00',
          purchaseDate: '2025-03-01',
          resalePrice: '280.50',
          resaleDate: '2025-06-01',
          margin: '185.50',
        }),
      ],
    })
    const row = cells(wrapper)
    expect(row[3]).toContain('95 €')
    expect(row[3]).toContain('01/03/2025')
    expect(row[4]).toContain('280,50 €')
    expect(row[4]).toContain('01/06/2025')
    expect(row[5]).toBe('+185,50 €')
  })

  it('une montre sans prix d’achat affiche « Inconnu », sans revente ni marge « — », jamais « null »', async () => {
    const wrapper = await mountTable()
    const row = cells(wrapper)
    expect(row[3]).toBe('Inconnu')
    expect(row[4]).toBe('—')
    expect(row[5]).toBe('—')
    expect(wrapper.text()).not.toContain('null')
    expect(wrapper.text()).not.toContain('NaN')
  })

  it('RG-AFF-09 l’en-tête Achat indique le tri et un clic émet sort', async () => {
    const none = await mountTable()
    expect(none.get('th[aria-sort]').attributes('aria-sort')).toBe('none')
    await none.get('[data-test="sort-purchase"]').trigger('click')
    expect(none.emitted('sort')).toHaveLength(1)

    expect((await mountTable({ sort: 'purchase_date', order: 'desc' })).get('th[aria-sort]').attributes('aria-sort')).toBe('descending')
    expect((await mountTable({ sort: 'purchase_date', order: 'asc' })).get('th[aria-sort]').attributes('aria-sort')).toBe('ascending')
  })

  it('RG-AFF-11 le pied indique la plage affichée et pagine', async () => {
    const first = await mountTable({ total: 12, page: 1 })
    expect(first.get('[data-test="range"]').text()).toBe('1–8 sur 12')
    expect(first.get('[data-test="page-prev"]').attributes('disabled')).toBeDefined()
    expect(first.get('[data-test="page-next"]').attributes('disabled')).toBeUndefined()
    await first.get('[data-test="page-next"]').trigger('click')
    expect(first.emitted('page')).toEqual([[2]])

    const last = await mountTable({ total: 12, page: 2 })
    expect(last.get('[data-test="range"]').text()).toBe('9–12 sur 12')
    expect(last.get('[data-test="page-next"]').attributes('disabled')).toBeDefined()
    await last.get('[data-test="page-prev"]').trigger('click')
    expect(last.emitted('page')).toEqual([[1]])
  })

  it('sans résultat, le pied n’est pas affiché', async () => {
    const wrapper = await mountTable({ items: [], total: 0 })
    expect(wrapper.find('[data-test="range"]').exists()).toBe(false)
  })
})
