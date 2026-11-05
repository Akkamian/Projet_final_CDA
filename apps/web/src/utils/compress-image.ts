/**
 * Réduit une photo avant son envoi (éco-conception, UML séquence 1) : plus grand côté ramené à `maxSide` px, encodé en WebP.
 * Au moindre échec (image non décodable, canvas indisponible, navigateur sans encodeur WebP) ou si le résultat n'est pas plus
 * léger, le fichier d'origine est renvoyé tel quel : l'envoi n'est jamais bloqué par la compression.
 */
export async function compressImage(file: File, maxSide = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    try {
      // Jamais d'agrandissement.
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const context = canvas.getContext('2d')
      if (!context) return file
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8))
      // Un navigateur sans encodeur WebP répond en PNG : on garde alors l'original.
      return blob && blob.type === 'image/webp' && blob.size < file.size ? blob : file
    } finally {
      bitmap.close()
    }
  } catch {
    return file
  }
}
