import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';

/** Tout 404 de Nest (identifiant invalide, ressource d'autrui, route inconnue) répond pareil, au format commun : rien ne distingue les cas (RG-SEC-04). */
@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.NOT_FOUND)
      .json({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Ressource introuvable',
      });
  }
}
