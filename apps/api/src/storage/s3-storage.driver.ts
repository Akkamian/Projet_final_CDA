import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { detectImageType, EXTENSIONS } from './image-type.js';
import { StorageService } from './storage.service.js';

export interface S3Settings {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

/** Stockage compatible S3 (N0C Storage en production, D1). L'URL est celle de l'objet en lecture publique, en 255 caractères maximum. */
export class S3StorageDriver extends StorageService {
  private readonly client: S3Client;
  private readonly baseUrl: string;

  constructor(private readonly settings: S3Settings) {
    super();
    this.client = new S3Client({
      endpoint: settings.endpoint,
      region: 'auto',
      forcePathStyle: true,
      credentials: { accessKeyId: settings.accessKey, secretAccessKey: settings.secretKey },
    });
    this.baseUrl = `${settings.endpoint.replace(/\/+$/, '')}/${settings.bucket}`;
  }

  async save(file: { buffer: Buffer }): Promise<{ url: string; key: string }> {
    const type = detectImageType(file.buffer);
    if (!type) throw new Error('Type de fichier non pris en charge (JPEG, PNG ou WebP attendu)');
    const key = `${randomUUID()}.${EXTENSIONS[type]}`;
    await this.client.send(new PutObjectCommand({ Bucket: this.settings.bucket, Key: key, Body: file.buffer, ContentType: type }));
    return { url: `${this.baseUrl}/${key}`, key };
  }

  async delete(url: string): Promise<void> {
    // Seule une URL de ce bucket est effacée ; la suppression d'un objet absent réussit déjà côté S3.
    if (!url.startsWith(`${this.baseUrl}/`)) return;
    const key = url.slice(this.baseUrl.length + 1);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.settings.bucket, Key: key }));
  }
}
