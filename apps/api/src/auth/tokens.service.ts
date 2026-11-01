import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';

export type LinkKind = 'verify' | 'reset';

export interface TokenPayload {
  sub: number;
  iat: number;
}

const LINK_LIFETIME_SECONDS: Record<LinkKind, number> = {
  verify: 24 * 60 * 60, // RG-CPT-08
  reset: 60 * 60, // RG-CPT-09
};

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Jeton de lien d'email ; le claim `typ` interdit d'utiliser un lien de vérification comme lien de réinitialisation. */
  signLink(kind: LinkKind, userId: number): string {
    return this.jwt.sign(
      { sub: userId, typ: kind },
      { secret: this.config.jwtLinkSecret, expiresIn: LINK_LIFETIME_SECONDS[kind] },
    );
  }

  /** Lève une erreur si le jeton est falsifié, expiré ou d'un autre type. */
  verifyLink(kind: LinkKind, token: string): TokenPayload {
    const payload = this.jwt.verify<{ sub?: unknown; iat?: unknown; typ?: unknown }>(token, {
      secret: this.config.jwtLinkSecret,
      algorithms: ['HS256'],
    });
    if (payload.typ !== kind || typeof payload.sub !== 'number' || typeof payload.iat !== 'number') {
      throw new Error('Jeton de lien inattendu');
    }
    return { sub: payload.sub, iat: payload.iat };
  }
}
