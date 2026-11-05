import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectImageType, EXTENSIONS } from './image-type.js';
import { StorageService } from './storage.service.js';

/** Une clé produite par `save` : uuid v4 et extension connue. Toute autre forme est refusée avant de toucher au disque. */
export const GENERATED_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export const UPLOADS_PREFIX = '/uploads';

/** Disque local (dev et tests) ; le dossier est servi en statique sur GET /uploads/:key (voir configure-app.ts). */
export class LocalStorageDriver extends StorageService {
  constructor(private readonly uploadDir: string) {
    super();
  }

  async save(file: { buffer: Buffer }): Promise<{ url: string; key: string }> {
    const type = detectImageType(file.buffer);
    if (!type) throw new Error('Type de fichier non pris en charge (JPEG, PNG ou WebP attendu)');
    const key = `${randomUUID()}.${EXTENSIONS[type]}`;
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, key), file.buffer);
    return { url: `${UPLOADS_PREFIX}/${key}`, key };
  }

  async delete(url: string): Promise<void> {
    const key = url.slice(url.lastIndexOf('/') + 1);
    // Une URL qui ne désigne pas une clé générée n'efface rien : jamais de chemin construit à partir d'une valeur libre.
    if (!GENERATED_KEY.test(key)) return;
    await rm(join(this.uploadDir, key), { force: true });
  }
}
