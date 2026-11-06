import { compressImage } from './compress-image'

/** Taille maximale d'un fichier (RG-PHO-02), vérifiée avant envoi : le serveur la refuse aussi. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Refuse un fichier trop lourd (S17), sinon le compresse. Le message est destiné à l'utilisateur. */
export async function prepareUpload(file: File): Promise<Blob> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`« ${file.name} » dépasse 10 Mo : choisissez une photo plus légère.`)
  return compressImage(file)
}
