import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { calls, sentBody, stubFetch, type StubResponse } from '../test/helpers'
import type { StepDetail } from '../stores/watches'
import StepList from './StepList.vue'

// jsdom n'a pas de canvas : la compression est testée à part (compress-image.spec.ts).
vi.mock('../utils/compress-image', () => ({ compressImage: vi.fn(async () => new Blob(['webp'], { type: 'image/webp' })) }))

const imageFile = (name = 'IMG_0001.jpg', size = 2_000_000) => {
  const file = new File(['x'], name, { type: 'image/jpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}
async function choose(input: { element: Element; trigger: (e: string) => Promise<void> }, files: File[]) {
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

const step = (id: number, label: string, done = false, notes: string | null = null): StepDetail => ({
  id,
  stepOrder: id,
  label,
  notes,
  isCompleted: done,
  completedAt: done ? '2025-05-02T10:00:00Z' : null,
  photos: [],
})
const STEPS = [step(1, 'Désarmer', true), step(2, 'Sortir le mouvement'), step(3, 'Déposer les aiguilles')]

function mountList(respond: () => StubResponse = () => ({ status: 200, body: {} }), steps = STEPS) {
  const fetchMock = stubFetch(respond)
  setActivePinia(createPinia())
  const wrapper = mount(StepList, { props: { projectId: 5, steps }, attachTo: document.body })
  return { wrapper, fetchMock }
}

const labels = (wrapper: ReturnType<typeof mountList>['wrapper']) => wrapper.findAll('[data-test="step-label"]').map((l) => l.text())
const lastEmitted = (wrapper: ReturnType<typeof mountList>['wrapper']) => wrapper.emitted('update:steps')!.at(-1)![0] as StepDetail[]

describe('StepList', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    setAccessToken('tok')
  })

  it('affiche les étapes dans l’ordre et le nombre d’étapes terminées', () => {
    const { wrapper } = mountList()

    expect(labels(wrapper)).toEqual(['Désarmer', 'Sortir le mouvement', 'Déposer les aiguilles'])
    expect(wrapper.text()).toContain('1/3 terminées')
    const boxes = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')
    expect(boxes.map((b) => b.element.checked)).toEqual([true, false, false])
  })

  it('S17 le champ d’ajout de photo reste atteignable au clavier (pas d’attribut hidden)', () => {
    const { wrapper } = mountList()

    expect(wrapper.find('[data-test="photo-input"]').attributes('hidden')).toBeUndefined()
  })

  it('S12 cocher une étape envoie isCompleted', async () => {
    const done = { ...step(2, 'Sortir le mouvement'), isCompleted: true, completedAt: '2025-05-03T08:00:00Z' }
    const { wrapper, fetchMock } = mountList(() => ({ status: 200, body: done }))

    await wrapper.findAll('input[type="checkbox"]')[1]!.setValue(true)
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PATCH /projects/5/steps/2'])
    expect(sentBody(fetchMock, 0)).toEqual({ isCompleted: true })
    expect(lastEmitted(wrapper).map((s) => s.isCompleted)).toEqual([true, true, false])
  })

  it('S29 décocher une étape envoie isCompleted à false', async () => {
    const undone = { ...step(1, 'Désarmer'), isCompleted: false, completedAt: null }
    const { wrapper, fetchMock } = mountList(() => ({ status: 200, body: undone }))

    await wrapper.findAll('input[type="checkbox"]')[0]!.setValue(false)
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PATCH /projects/5/steps/1'])
    expect(sentBody(fetchMock, 0)).toEqual({ isCompleted: false })
    expect(lastEmitted(wrapper).map((s) => s.isCompleted)).toEqual([false, false, false])
  })

  it('S15 « monter » échange une étape avec la précédente et envoie la liste complète', async () => {
    const reordered = [step(1, 'Désarmer', true), step(3, 'Déposer les aiguilles'), step(2, 'Sortir le mouvement')].map((s, i) => ({
      ...s,
      stepOrder: i + 1,
    }))
    const { wrapper, fetchMock } = mountList(() => ({ status: 200, body: reordered }))

    await wrapper.findAll('[data-test="move-up"]')[0]!.trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PUT /projects/5/steps/order'])
    expect(sentBody(fetchMock, 0)).toEqual({ stepIds: [2, 1, 3] })
  })

  it('S15 « descendre » échange une étape avec la suivante', async () => {
    const { wrapper, fetchMock } = mountList(() => ({ status: 200, body: STEPS }))

    await wrapper.findAll('[data-test="move-down"]')[0]!.trigger('click')
    await flushPromises()

    expect(sentBody(fetchMock, 0)).toEqual({ stepIds: [2, 1, 3] })
  })

  it('le premier élément n’a pas de bouton « monter », le dernier pas de « descendre »', () => {
    const { wrapper } = mountList()

    const items = wrapper.findAll('[data-test="step"]')
    expect(items[0]!.find('[data-test="move-up"]').exists()).toBe(false)
    expect(items[0]!.find('[data-test="move-down"]').exists()).toBe(true)
    expect(items[2]!.find('[data-test="move-up"]').exists()).toBe(true)
    expect(items[2]!.find('[data-test="move-down"]').exists()).toBe(false)
  })

  it('S30 la suppression demande confirmation, et rien n’est envoyé avant', async () => {
    const { wrapper, fetchMock } = mountList(() => ({ status: 204 }))

    await wrapper.findAll('[data-test="delete"]')[1]!.trigger('click')

    const dialog = wrapper.find('dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('Sortir le mouvement')
    expect(fetchMock).not.toHaveBeenCalled()

    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['DELETE /projects/5/steps/2'])
    expect(lastEmitted(wrapper).map((s) => [s.id, s.stepOrder])).toEqual([
      [1, 1],
      [3, 2],
    ])
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('S30 si la suppression échoue, le dialogue se ferme et l’erreur est visible', async () => {
    const { wrapper } = mountList(() => ({ status: 500, body: { message: 'boom' } }))

    await wrapper.findAll('[data-test="delete"]')[1]!.trigger('click')
    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('update:steps')).toBeUndefined()
  })

  it('S30 annuler la suppression n’envoie rien et garde l’étape', async () => {
    const { wrapper, fetchMock } = mountList(() => ({ status: 204 }))

    await wrapper.findAll('[data-test="delete"]')[1]!.trigger('click')
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:steps')).toBeUndefined()
  })

  it('S14 S16 modifier le libellé et la note envoie les deux champs', async () => {
    const saved = { ...step(2, 'Sortir le mouvement du boîtier', false, 'Vis rouillée') }
    const { wrapper, fetchMock } = mountList(() => ({ status: 200, body: saved }))

    await wrapper.findAll('[data-test="edit"]')[1]!.trigger('click')
    await wrapper.find('[data-test="edit-label"]').setValue('Sortir le mouvement du boîtier')
    await wrapper.find('[data-test="edit-notes"]').setValue('Vis rouillée')
    await wrapper.find('[data-test="edit-save"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['PATCH /projects/5/steps/2'])
    expect(sentBody(fetchMock, 0)).toEqual({ label: 'Sortir le mouvement du boîtier', notes: 'Vis rouillée' })
    expect(lastEmitted(wrapper)[1]!.notes).toBe('Vis rouillée')
    expect(wrapper.find('[data-test="edit-label"]').exists()).toBe(false)
  })

  it('S16 vider la note l’efface (null) ; un libellé vide n’est pas envoyé', async () => {
    const withNote = [step(1, 'Désarmer', true, 'À revoir')]
    const { wrapper, fetchMock } = mountList(() => ({ status: 200, body: step(1, 'Désarmer', true) }), withNote)

    await wrapper.find('[data-test="edit"]').trigger('click')
    await wrapper.find('[data-test="edit-label"]').setValue('   ')
    await wrapper.find('[data-test="edit-save"]').trigger('click')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('libellé')

    await wrapper.find('[data-test="edit-label"]').setValue('Désarmer')
    await wrapper.find('[data-test="edit-notes"]').setValue('')
    await wrapper.find('[data-test="edit-save"]').trigger('click')
    await flushPromises()

    expect(sentBody(fetchMock, 0)).toEqual({ label: 'Désarmer', notes: null })
  })

  it('S13 ajouter une étape l’ajoute à la suite', async () => {
    const created = step(4, 'Contrôler le balancier')
    const { wrapper, fetchMock } = mountList(() => ({ status: 201, body: created }))

    await wrapper.find('[data-test="add-open"]').trigger('click')
    await wrapper.find('[data-test="add-label"]').setValue('Contrôler le balancier')
    await wrapper.find('[data-test="add-submit"]').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toEqual(['POST /projects/5/steps'])
    expect(sentBody(fetchMock, 0)).toEqual({ label: 'Contrôler le balancier' })
    expect(lastEmitted(wrapper).map((s) => s.id)).toEqual([1, 2, 3, 4])
  })

  it('une erreur de l’API s’affiche, la liste reste inchangée et la case revient à son état', async () => {
    const { wrapper } = mountList(() => ({ status: 500, body: { message: 'boom' } }))

    await wrapper.findAll('input[type="checkbox"]')[1]!.setValue(true)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('update:steps')).toBeUndefined()
    expect(wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')[1]!.element.checked).toBe(false)
  })

  describe('photos d’une étape', () => {
    const withPhotos = [{ ...step(1, 'Désarmer', true), photos: [{ id: 9, url: '/uploads/x.png' }] }, step(2, 'Sortir le mouvement')]

    it('affiche les vignettes de la photo, servies depuis l’origine de l’API', () => {
      const { wrapper } = mountList(undefined, withPhotos)

      const images = wrapper.findAll('[data-test="photo"] img')
      expect(images).toHaveLength(1)
      expect(images[0]!.attributes('src')).toMatch(/^https?:\/\/[^/]+\/uploads\/x\.png$/)
      expect(images[0]!.attributes('alt')).toContain('Désarmer')
    })

    it('S17 ajoute plusieurs photos à la même étape : un envoi par fichier, compressé', async () => {
      let n = 0
      const { wrapper, fetchMock } = mountList(() => {
        n += 1
        return { status: 201, body: { id: 20 + n, url: `/uploads/new-${n}.webp` } }
      }, withPhotos)

      await choose(wrapper.findAll('[data-test="photo-input"]')[1]!, [imageFile('a.jpg'), imageFile('b.jpg')])
      await flushPromises()

      expect(calls(fetchMock)).toEqual(['POST /projects/5/steps/2/photos', 'POST /projects/5/steps/2/photos'])
      const sent = fetchMock.mock.calls[0]![1]!.body as FormData
      expect((sent.get('file') as Blob).type).toBe('image/webp')
      expect(lastEmitted(wrapper)[1]!.photos.map((p) => p.url)).toEqual(['/uploads/new-1.webp', '/uploads/new-2.webp'])
    })

    it('S17 un fichier de plus de 10 Mo est refusé avant envoi, avec un message', async () => {
      const { wrapper, fetchMock } = mountList(undefined, withPhotos)

      await choose(wrapper.findAll('[data-test="photo-input"]')[1]!, [imageFile('gros.jpg', 10 * 1024 * 1024 + 1)])
      await flushPromises()

      expect(fetchMock).not.toHaveBeenCalled()
      expect(wrapper.find('[role="alert"]').text()).toMatch(/10 Mo/)
      expect(wrapper.emitted('update:steps')).toBeUndefined()
    })

    it('S17 10 Mo exactement est accepté', async () => {
      const { wrapper, fetchMock } = mountList(() => ({ status: 201, body: { id: 30, url: '/uploads/ok.webp' } }), withPhotos)

      await choose(wrapper.findAll('[data-test="photo-input"]')[1]!, [imageFile('limite.jpg', 10 * 1024 * 1024)])
      await flushPromises()

      expect(calls(fetchMock)).toEqual(['POST /projects/5/steps/2/photos'])
    })

    it('S17 le refus du serveur s’affiche et les photos déjà envoyées sont gardées', async () => {
      let n = 0
      const { wrapper } = mountList(() => {
        n += 1
        return n === 1
          ? { status: 201, body: { id: 40, url: '/uploads/first.webp' } }
          : { status: 400, body: { message: 'Le fichier doit être une image JPEG, PNG ou WebP' } }
      }, withPhotos)

      await choose(wrapper.findAll('[data-test="photo-input"]')[1]!, [imageFile('a.jpg'), imageFile('b.heic')])
      await flushPromises()

      expect(wrapper.find('[role="alert"]').text()).toContain('JPEG, PNG ou WebP')
      expect(lastEmitted(wrapper)[1]!.photos.map((p) => p.url)).toEqual(['/uploads/first.webp'])
    })

    it('S34 la suppression d’une photo demande confirmation, et rien n’est envoyé avant', async () => {
      const { wrapper, fetchMock } = mountList(() => ({ status: 204 }), withPhotos)

      await wrapper.find('[data-test="photo-delete"]').trigger('click')
      expect(wrapper.find('dialog').exists()).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()

      await wrapper.find('[data-test="confirm-ok"]').trigger('click')
      await flushPromises()

      expect(calls(fetchMock)).toEqual(['DELETE /projects/5/steps/1/photos/9'])
      expect(lastEmitted(wrapper)[0]!.photos).toEqual([])
      expect(wrapper.find('dialog').exists()).toBe(false)
    })

    it('S34 annuler la suppression d’une photo n’envoie rien', async () => {
      const { wrapper, fetchMock } = mountList(() => ({ status: 204 }), withPhotos)

      await wrapper.find('[data-test="photo-delete"]').trigger('click')
      await wrapper.find('[data-test="confirm-cancel"]').trigger('click')

      expect(fetchMock).not.toHaveBeenCalled()
      expect(wrapper.find('dialog').exists()).toBe(false)
    })
  })
})
