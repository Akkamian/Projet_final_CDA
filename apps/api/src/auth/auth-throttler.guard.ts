import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { apiError } from '../common/api-error.js';

/** Limite par IP (RG-CPT-14), appliquée route par route ; la réponse suit le format d'erreur commun. */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw apiError(
      429,
      'TOO_MANY_REQUESTS',
      'Trop de tentatives : réessayez dans un instant',
    );
  }
}
