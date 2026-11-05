import { Logger } from '@nestjs/common';

/** Enregistre et efface les photos ; le driver (disque local ou S3) est choisi par STORAGE_DRIVER. */
export abstract class StorageService {
  /** Enregistre l'image sous `uuid.ext` ; refuse un contenu qui n'est ni JPEG, ni PNG, ni WebP. */
  abstract save(file: { buffer: Buffer }): Promise<{ url: string; key: string }>;

  /** Efface le fichier désigné par son URL ; un fichier absent n'est pas une erreur. */
  abstract delete(url: string): Promise<void>;

  /** Effacement au mieux : une ligne déjà supprimée ou mise à jour ne doit pas échouer parce qu'un fichier résiste (il reste alors orphelin, journalisé). */
  async deleteQuietly(url: string): Promise<void> {
    try {
      await this.delete(url);
    } catch (error) {
      new Logger(StorageService.name).warn(`Fichier non effacé (${url}) : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
