import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WatchIdentityFields from './WatchIdentityFields.vue'

const props = {
  brand: 'Seiko',
  model: '6119',
  movementCode: 'automatic',
  complicationCodes: ['date'],
  purchasePrice: '',
  purchaseDate: '',
  maxDate: '2026-11-06',
  movementTypes: [
    { movementCode: 'manual', label: 'Mécanique manuelle' },
    { movementCode: 'automatic', label: 'Mécanique automatique' },
  ],
  complications: [
    { complicationCode: 'date', label: 'Date' },
    { complicationCode: 'chronograph', label: 'Chronographe' },
  ],
}

const mountFields = (extra: Record<string, unknown> = {}) => mount(WatchIdentityFields, { props: { ...props, ...extra } })

describe('WatchIdentityFields', () => {
  it('rend marque, modèle, prix et date avec leurs ids, noms et valeurs', () => {
    const wrapper = mountFields({ purchasePrice: '80.00', purchaseDate: '2025-03-01' })

    expect((wrapper.find('#brand').element as HTMLInputElement).value).toBe('Seiko')
    expect(wrapper.find('#brand').attributes('name')).toBe('brand')
    expect((wrapper.find('#model').element as HTMLInputElement).value).toBe('6119')
    expect(wrapper.find('#model').attributes('name')).toBe('model')
    expect((wrapper.find('#purchasePrice').element as HTMLInputElement).value).toBe('80.00')
    expect((wrapper.find('#purchaseDate').element as HTMLInputElement).value).toBe('2025-03-01')
    expect(wrapper.find('#purchaseDate').attributes('max')).toBe('2026-11-06')
  })

  it('le mouvement est un groupe de radios dans un contrôle segmenté ; cocher émet select-movement', async () => {
    const wrapper = mountFields()

    const radios = wrapper.findAll('.segmented input[type="radio"][name="movement"]')
    expect(radios).toHaveLength(2)
    expect((wrapper.find('input[name="movement"][value="automatic"]').element as HTMLInputElement).checked).toBe(true)

    await wrapper.find('input[name="movement"][value="manual"]').setValue(true)

    expect(wrapper.emitted('select-movement')).toEqual([['manual']])
  })

  it('les complications sont des pastilles à cases natives ; cocher émet toggle-complication', async () => {
    const wrapper = mountFields()

    expect(wrapper.findAll('.chip-group .chip-toggle')).toHaveLength(2)
    expect((wrapper.find('input[value="date"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.find('input[value="chronograph"]').element as HTMLInputElement).checked).toBe(false)

    await wrapper.find('input[value="chronograph"]').setValue(true)

    expect(wrapper.emitted('toggle-complication')).toEqual([['chronograph']])
  })

  it('la saisie émet les mises à jour de marque, modèle, prix et date', async () => {
    const wrapper = mountFields()

    await wrapper.find('#brand').setValue('Orient')
    await wrapper.find('#model').setValue('Bambino')
    await wrapper.find('#purchasePrice').setValue('95,5')
    await wrapper.find('#purchaseDate').setValue('2025-03-01')

    expect(wrapper.emitted('update:brand')).toEqual([['Orient']])
    expect(wrapper.emitted('update:model')).toEqual([['Bambino']])
    expect(wrapper.emitted('update:purchasePrice')).toEqual([['95,5']])
    expect(wrapper.emitted('update:purchaseDate')).toEqual([['2025-03-01']])
  })

  it('l’aide des complications ne s’affiche que si elle est fournie', () => {
    expect(mountFields().text()).not.toContain('prochaines révisions')
    expect(mountFields({ complicationHint: 'Seules les prochaines révisions en tiennent compte.' }).text()).toContain(
      'prochaines révisions',
    )
  })

  it('le prix et la date d’achat sont dans la même rangée', () => {
    const wrapper = mountFields()

    const pair = wrapper.find('.pair')
    expect(pair.find('#purchasePrice').exists()).toBe(true)
    expect(pair.find('#purchaseDate').exists()).toBe(true)
  })
})
