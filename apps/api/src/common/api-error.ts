import { HttpException } from '@nestjs/common';

/** Erreur HTTP au format commun `{ statusCode, code, message }` ; `code` est stable, le front s'y appuie. */
export function apiError(statusCode: number, code: string, message: string): HttpException {
  return new HttpException({ statusCode, code, message }, statusCode);
}
