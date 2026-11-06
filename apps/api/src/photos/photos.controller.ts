import { Controller, Delete, HttpCode, NotFoundException, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { apiError } from '../common/api-error.js';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator.js';
import { parseId } from '../common/parse-id.js';
import { PhotosService, type ProjectPhotoKind } from './photos.service.js';

/** 10 Mo (RG-PHO-02) : au-delà, multer interrompt la réception et Nest répond 413 sans rien écrire. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const upload = () => FileInterceptor('file', { limits: { files: 1, fileSize: MAX_FILE_SIZE } });

type Uploaded = { buffer: Buffer } | undefined;

function requireFile(file: Uploaded): { buffer: Buffer } {
  if (!file) throw apiError(400, 'FILE_REQUIRED', 'Le champ « file » est obligatoire');
  return file;
}

function parseKind(kind: string): ProjectPhotoKind {
  if (kind !== 'before' && kind !== 'after') throw new NotFoundException();
  return kind;
}

@Controller('projects/:projectId')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post('steps/:stepId/photos')
  @UseInterceptors(upload())
  addStepPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('stepId') stepId: string,
    @UploadedFile() file: Uploaded,
  ): Promise<{ id: number; url: string }> {
    return this.photos.addStepPhoto(user.id, parseId(projectId), parseId(stepId), requireFile(file));
  }

  @Delete('steps/:stepId/photos/:photoId')
  @HttpCode(204)
  removeStepPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('stepId') stepId: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    return this.photos.removeStepPhoto(user.id, parseId(projectId), parseId(stepId), parseId(photoId));
  }

  @Put('photos/:kind')
  @UseInterceptors(upload())
  setProjectPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('kind') kind: string,
    @UploadedFile() file: Uploaded,
  ): Promise<{ url: string }> {
    // L'emplacement est vérifié avant le fichier : une route inconnue répond 404 quel que soit le corps.
    const parsed = parseKind(kind);
    return this.photos.setProjectPhoto(user.id, parseId(projectId), parsed, requireFile(file));
  }

  @Delete('photos/:kind')
  @HttpCode(204)
  removeProjectPhoto(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('kind') kind: string): Promise<void> {
    return this.photos.removeProjectPhoto(user.id, parseId(projectId), parseKind(kind));
  }
}
