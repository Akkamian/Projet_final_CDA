import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

/** Traduit les erreurs Prisma attendues en réponses HTTP : P2002 → 409, P2025 → 404, le reste → 500. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception.code === 'P2002') {
      response.status(HttpStatus.CONFLICT).json({ statusCode: 409, message: 'Cette valeur existe déjà' });
    } else if (exception.code === 'P2025') {
      response.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, code: 'NOT_FOUND', message: 'Ressource introuvable' });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Erreur interne' });
    }
  }
}
