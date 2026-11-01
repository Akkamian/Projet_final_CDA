import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { apiError } from '../common/api-error.js';
import type { AuthenticatedUser } from '../common/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../common/public.decorator.js';
import { TokensService } from './tokens.service.js';

/** Garde globale (RG-SEC-03) : toute route exige un jeton d'accès valide, sauf celles marquées `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthenticated();
    let userId: number;
    try {
      userId = this.tokens.verifySession('access', token).sub;
    } catch {
      throw unauthenticated();
    }
    // Un compte supprimé n'a plus de session, même avec un jeton encore valide (sinon : erreur de clé étrangère, 500).
    const user = await this.prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw unauthenticated();
    request.user = { id: user.id };
    return true;
  }
}

function unauthenticated() {
  return apiError(401, 'UNAUTHENTICATED', 'Connexion requise');
}
