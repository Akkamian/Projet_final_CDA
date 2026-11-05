import { Injectable, Logger } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { OwnershipService } from '../common/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { detectImageType } from '../storage/image-type.js';
import { StorageService } from '../storage/storage.service.js';

export type ProjectPhotoKind = 'before' | 'after';
type UploadedImage = { buffer: Buffer };

const COLUMN = { before: 'photo_before', after: 'photo_after' } as const;

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly storage: StorageService,
  ) {}

  async addStepPhoto(userId: number, projectId: number, stepId: number, file: UploadedImage): Promise<{ id: number; url: string }> {
    await this.ownership.findOwnedStep(userId, projectId, stepId);
    const { url } = await this.store(file);
    try {
      const row = await this.prisma.step_pics.create({ data: { restoration_step_id: stepId, url } });
      return { id: row.id, url: row.url };
    } catch (error) {
      await this.discard(url);
      throw error;
    }
  }

  /** La ligne part d'abord ; un fichier qui ne s'efface pas n'annule pas la suppression (RG-PHO-06). */
  async removeStepPhoto(userId: number, projectId: number, stepId: number, photoId: number): Promise<void> {
    await this.ownership.findOwnedStep(userId, projectId, stepId);
    const photo = await this.prisma.step_pics.findFirst({ where: { id: photoId, restoration_step_id: stepId } });
    if (!photo) throw apiError(404, 'NOT_FOUND', 'Photo introuvable');
    await this.prisma.step_pics.deleteMany({ where: { id: photo.id } });
    await this.discard(photo.url);
  }

  /** Enregistre ou remplace la photo d'état initial ou final ; l'ancien fichier est effacé après la mise à jour (RG-PHO-07). */
  async setProjectPhoto(userId: number, projectId: number, kind: ProjectPhotoKind, file: UploadedImage): Promise<{ url: string }> {
    const project = await this.ownership.findOwnedProject(userId, projectId);
    const previous = project[COLUMN[kind]];
    const { url } = await this.store(file);
    try {
      await this.prisma.restoration_projects.update({ where: { id: projectId }, data: { [COLUMN[kind]]: url } });
    } catch (error) {
      await this.discard(url);
      throw error;
    }
    if (previous) await this.discard(previous);
    return { url };
  }

  async removeProjectPhoto(userId: number, projectId: number, kind: ProjectPhotoKind): Promise<void> {
    const project = await this.ownership.findOwnedProject(userId, projectId);
    const previous = project[COLUMN[kind]];
    if (!previous) return;
    await this.prisma.restoration_projects.update({ where: { id: projectId }, data: { [COLUMN[kind]]: null } });
    await this.discard(previous);
  }

  /** Le contenu est vérifié sur ses octets d'en-tête, jamais sur le type déclaré par le client (RG-PHO-01). */
  private store(file: UploadedImage): Promise<{ url: string; key: string }> {
    if (!detectImageType(file.buffer)) {
      throw apiError(400, 'INVALID_IMAGE_TYPE', 'Le fichier doit être une image JPEG, PNG ou WebP');
    }
    return this.storage.save(file);
  }

  /** Effacement au mieux : une ligne déjà à jour ne doit pas échouer parce qu'un fichier résiste. */
  private async discard(url: string): Promise<void> {
    try {
      await this.storage.delete(url);
    } catch (error) {
      this.logger.warn(`Fichier non effacé (${url}) : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
