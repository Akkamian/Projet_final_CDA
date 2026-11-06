import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressImage } from './compress-image'

const photo = (size = 5_000_000) => {
  const file = new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/** jsdom n'a ni createImageBitmap ni canvas : on les remplace et on garde les canvas utilisés. */
function stubCanvas(width: number, height: number, encoded: Blob | null = new Blob(['webp'], { type: 'image/webp' })) {
  const canvases: HTMLCanvasElement[] = []
  const bitmap = { width, height, close: vi.fn() }
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => bitmap),
  )
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback, type) {
    canvases.push(this)
    callback(encoded && new Blob([encoded], { type: encoded.type || type }))
  })
  return { canvases, bitmap, drawImage }
}

describe('compressImage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('réduit le plus grand côté à 1600 px en gardant les proportions, et encode en WebP', async () => {
    const { canvases, drawImage, bitmap } = stubCanvas(4000, 3000)

    const result = await compressImage(photo())

    expect(result.type).toBe('image/webp')
    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([1600, 1200])
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 1200)
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('réduit aussi une photo en portrait', async () => {
    const { canvases } = stubCanvas(3000, 4000)

    await compressImage(photo())

    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([1200, 1600])
  })

  it('n’agrandit jamais une image plus petite que la limite', async () => {
    const { canvases } = stubCanvas(800, 600)

    await compressImage(photo())

    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([800, 600])
  })

  it('le plus grand côté est paramétrable', async () => {
    const { canvases } = stubCanvas(4000, 3000)

    await compressImage(photo(), 1000)

    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([1000, 750])
  })

  it('renvoie le fichier d’origine si le canvas échoue (encodage impossible)', async () => {
    stubCanvas(4000, 3000, null)
    const file = photo()

    expect(await compressImage(file)).toBe(file)
  })

  it('renvoie le fichier d’origine si le navigateur n’encode pas en WebP (il répond en PNG)', async () => {
    stubCanvas(4000, 3000, new Blob(['png'], { type: 'image/png' }))
    const file = photo()

    expect(await compressImage(file)).toBe(file)
  })

  it('renvoie le fichier d’origine si l’image ne peut pas être décodée', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => Promise.reject(new Error('format inconnu'))),
    )
    const file = photo()

    expect(await compressImage(file)).toBe(file)
  })

  it('ne renvoie jamais un fichier plus lourd que l’original', async () => {
    stubCanvas(800, 600, new Blob([new Uint8Array(5000)], { type: 'image/webp' }))
    const file = photo(1000)

    expect(await compressImage(file)).toBe(file)
  })
})
