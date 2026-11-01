import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';

export type LinkKind = 'verify' | 'reset';
export type SessionKind = 'access' | 'refresh';

export interface TokenPayload {
  sub: number;
  iat: number;
}

const LINK_LIFETIME_SECONDS: Record<LinkKind, number> = {
  verify: 24 * 60 * 60, // RG-CPT-08
  reset: 60 * 60, // RG-CPT-09
};

export const SESSION_LIFETIME_SECONDS: Record<SessionKind, number> = {
  access: 15 * 60, // RG-CPT-12
  refresh: 7 * 24 * 60 * 60, // RG-CPT-12
};

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Jeton de lien d'email ; le claim `typ` interdit d'utiliser un lien de vérification comme lien de réinitialisation. */
  signLink(kind: LinkKind, userId: number): string {
    return this.sign(kind, userId, this.config.jwtLinkSecret, LINK_LIFETIME_SECONDS[kind]);
  }

  /** Lève une erreur si le jeton est falsifié, expiré ou d'un autre type. */
  verifyLink(kind: LinkKind, token: string): TokenPayload {
    return this.verify(kind, token, this.config.jwtLinkSecret);
  }

  /** Jeton de session (secret distinct de celui des liens) : `access` 15 min, `refresh` 7 jours. */
  signSession(kind: SessionKind, userId: number): string {
    return this.sign(kind, userId, this.config.jwtSessionSecret, SESSION_LIFETIME_SECONDS[kind]);
  }

  /** Lève une erreur si le jeton est falsifié, expiré ou d'un autre type (un jeton d'accès n'est pas un jeton de renouvellement). */
  verifySession(kind: SessionKind, token: string): TokenPayload {
    return this.verify(kind, token, this.config.jwtSessionSecret);
  }

  private sign(typ: LinkKind | SessionKind, userId: number, secret: string, expiresIn: number): string {
    return this.jwt.sign({ sub: userId, typ }, { secret, expiresIn });
  }

  private verify(typ: LinkKind | SessionKind, token: string, secret: string): TokenPayload {
    const payload = this.jwt.verify<{ sub?: unknown; iat?: unknown; typ?: unknown }>(token, {
      secret,
      algorithms: ['HS256'],
    });
    if (payload.typ !== typ || typeof payload.sub !== 'number' || typeof payload.iat !== 'number') {
      throw new Error('Jeton inattendu');
    }
    return { sub: payload.sub, iat: payload.iat };
  }
}
