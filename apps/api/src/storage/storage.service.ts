/** Enregistre et efface les photos ; le driver (disque local ou S3) est choisi par STORAGE_DRIVER. */
export abstract class StorageService {
  /** Enregistre l'image sous `uuid.ext` ; refuse un contenu qui n'est ni JPEG, ni PNG, ni WebP. */
  abstract save(file: { buffer: Buffer }): Promise<{ url: string; key: string }>;

  /** Efface le fichier désigné par son URL ; un fichier absent n'est pas une erreur. */
  abstract delete(url: string): Promise<void>;
}
