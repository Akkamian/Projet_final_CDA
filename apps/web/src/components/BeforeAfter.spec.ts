import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, stubFetch, type StubResponse } from '../test/helpers'
import BeforeAfter from './BeforeAfter.vue'

vi.mock('../utils/compress-image', () => ({ compressImage: vi.fn(async () => new Blob(['webp'], { type: 'image/webp' })) }))

const imageFile = (size = 2_000_000) => {
  const file = new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function mountBlock(
  props: { photoBefore: string | null; photoAfter: string | null },
  respond: () => StubResponse = () => ({ status: 200, body: {} }),
) {
  const fetchMock = stubFetch(respond)
  setActivePinia(createPinia())
  const wrapper = mount(BeforeAfter, { props: { projectId: 5, ...props }, attachTo: document.body })
  return { wrapper, fetchMock }
}

async function choose(wrapper: ReturnType<typeof mountBlock>['wrapper'], kind: string, file: File) {
  const input = wrapper.find(`[data-test="photo-input-${kind}"]`)
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('BeforeAfter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    setAccessToken('tok')
  })

  it('S18 affiche l’avant et l’après côte à côte quand les deux existent', () => {
    const { wrapper } = mountBlock({ photoBefore: '/uploads/b.webp', photoAfter: '/uploads/a.webp' })

    const figures = wrapper.findAll('figure')
    expect(figures).toHaveLength(2)
    expect(figures[0]!.text()).toContain('Avant')
    expect(figures[0]!.find('img').attributes('src')).toMatch(/\/uploads\/b\.webp$/)
    expect(figures[1]!.text()).toContain('Après')
    expect(figures[1]!.find('img').attributes('src')).toMatch(/\/uploads\/a\.webp$/)
  })

  it('une photo absente montre un emplacement vide, sans bouton « Retirer »', () => {
    const { wrapper } = mountBlock({ photoBefore: '/uploads/b.webp', photoAfter: null })

    const after = wrapper.findAll('figure')[1]!
    expect(after.find('img').exists()).toBe(false)
    expect(after.text()).toContain('pas encore ajoutée')
    expect(after.find('[data-test="photo-remove-after"]').exists()).toBe(false)
    expect(after.text()).toContain('Ajouter')
    expect(wrapper.findAll('figure')[0]!.text()).toContain('Remplacer')
  })

  it('S17 ajouter la photo finale l’envoie compressée et la signale', async () => {
    const { wrapper, fetchMock } = mountBlock({ photoBefore: null, photoAfter: null }, () => ({
      status: 200,
      body: { url: '/uploads/n.webp' },
    }))

    await choose(wrapper, 'after', imageFile())

    expect(calls(fetchMock)).toEqual(['PUT /projects/5/photos/after'])
    const sent = fetchMock.mock.calls[0]![1]!.body as FormData
    expect((sent.get('file') as Blob).type).toBe('image/webp')
    expect(wrapper.emitted('change')).toEqual([[{ kind: 'after', url: '/uploads/n.webp' }]])
  })

  it('S34 remplacer la photo initiale envoie la nouvelle', async () => {
    const { wrapper, fetchMock } = mountBlock({ photoBefore: '/uploads/b.webp', photoAfter: null }, () => ({
      status: 200,
      body: { url: '/uploads/n2.webp' },
    }))

    await choose(wrapper, 'before', imageFile())

    expect(calls(fetchMock)).toEqual(['PUT /projects/5/photos/before'])
    expect(wrapper.emitted('change')).toEqual([[{ kind: 'before', url: '/uploads/n2.webp' }]])
  })

  it('S34 retirer une photo demande confirmation puis la supprime', async () => {
    const { wrapper, fetchMock } = mountBlock({ photoBefore: '/uploads/b.webp', photoAfter: '/uploads/a.webp' }, () => ({ status: 204 }))

    await wrapper.find('[data-test="photo-remove-after"]').trigger('click')
    expect(fetchMock).not.toHaveBeenCalled()
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['DELETE /projects/5/photos/after'])
    expect(wrapper.emitted('change')).toEqual([[{ kind: 'after', url: null }]])
  })

  it('S34 annuler le retrait n’envoie rien', async () => {
    const { wrapper, fetchMock } = mountBlock({ photoBefore: '/uploads/b.webp', photoAfter: null })

    await wrapper.find('[data-test="photo-remove-before"]').trigger('click')
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('S17 un fichier de plus de 10 Mo est refusé avant envoi, avec un message', async () => {
    const { wrapper, fetchMock } = mountBlock({ photoBefore: null, photoAfter: null })

    await choose(wrapper, 'before', imageFile(10 * 1024 * 1024 + 1))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toMatch(/10 Mo/)
  })

  it('une erreur de l’API s’affiche et la photo reste inchangée', async () => {
    const { wrapper } = mountBlock({ photoBefore: '/uploads/b.webp', photoAfter: null }, () => ({ status: 500, body: { message: 'boom' } }))

    await choose(wrapper, 'before', imageFile())

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})
