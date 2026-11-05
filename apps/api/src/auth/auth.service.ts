import { Inject, Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { apiError } from '../common/api-error.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { Prisma } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { TokensService, type TokenPayload } from './tokens.service.js';

const BCRYPT_ROUNDS = 10;
const dummyHash = bcrypt.hash('mot-de-passe-factice', BCRYPT_ROUNDS);

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Crée le compte sans ouvrir de session et envoie le lien de vérification (RG-CPT-05). */
  async register(dto: RegisterDto): Promise<void> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let userId: number;
    try {
      ({ id: userId } = await this.prisma.users.create({
        data: { email: dto.email, password_hash: passwordHash },
        select: { id: true },
      }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw apiError(409, 'EMAIL_ALREADY_USED', 'Cette adresse email est déjà utilisée');
      }
      throw error;
    }
    await this.sendVerificationLink(userId, dto.email);
  }

  /** Lien valable 24 h et à usage unique : refusé dès que l'adresse est vérifiée (RG-CPT-08). */
  async verifyEmail(token: string): Promise<void> {
    let userId: number;
    try {
      userId = this.tokens.verifyLink('verify', token).sub;
    } catch {
      throw invalidLink();
    }
    // Une seule requête conditionnelle : deux clics simultanés ne peuvent pas réussir tous les deux.
    const { count } = await this.prisma.users.updateMany({
      where: { id: userId, email_verified_at: null },
      data: { email_verified_at: new Date() },
    });
    if (count === 0) throw invalidLink();
  }

  /** Le mot de passe est contrôlé avant l'état de vérification : EMAIL_NOT_VERIFIED ne révèle rien à qui ne le connaît pas. */
  async login(dto: LoginDto): Promise<SessionTokens> {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    // Compare aussi quand l'email est inconnu : même durée de réponse, RG-CPT-07.
    const passwordMatches = await bcrypt.compare(dto.password, user?.password_hash ?? (await dummyHash));
    if (!user || !passwordMatches) {
      throw apiError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
    }
    if (user.email_verified_at === null) {
      throw apiError(403, 'EMAIL_NOT_VERIFIED', "Votre adresse email n'est pas encore vérifiée");
    }
    return this.issueSession(user.id);
  }

  /** Refuse un jeton émis avant le dernier changement de mot de passe (secondes entières, comme `iat`). */
  async refresh(refreshToken: string | undefined): Promise<SessionTokens> {
    let payload: TokenPayload;
    try {
      if (!refreshToken) throw new Error('cookie absent');
      payload = this.tokens.verifySession('refresh', refreshToken);
    } catch {
      throw invalidSession();
    }
    const user = await this.prisma.users.findUnique({ where: { id: payload.sub } });
    const changedAt = user?.password_changed_at;
    if (!user || (changedAt && payload.iat < Math.floor(changedAt.getTime() / 1000))) {
      throw invalidSession();
    }
    return this.issueSession(user.id);
  }

  /** Répond pareil que le compte existe ou non (RG-CPT-10). */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (user && user.email_verified_at === null) {
      try {
        await this.sendVerificationLink(user.id, user.email);
      } catch (error) {
        // Une panne d'envoi ne doit pas distinguer une adresse connue d'une inconnue : on journalise et on répond pareil.
        this.logger.error(`Renvoi du lien de vérification impossible : ${String(error)}`);
      }
    }
  }

  /** Répond pareil que le compte existe ou non (RG-CPT-10) ; le lien est valable 1 h (RG-CPT-09). */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) return;
    try {
      const token = this.tokens.signLink('reset', user.id);
      await this.mail.sendPasswordResetEmail(user.email, `${this.config.webOrigin}/reset-password?token=${token}`);
    } catch (error) {
      // Une panne d'envoi ne doit pas distinguer une adresse connue d'une inconnue : on journalise et on répond pareil.
      this.logger.error(`Envoi du lien de réinitialisation impossible : ${String(error)}`);
    }
  }

  /**
   * Usage unique sans table de jetons : le lien est refusé s'il a été émis avant le dernier changement de mot de passe
   * (RG-CPT-09). Une seule requête conditionnelle : deux clics simultanés ne peuvent pas réussir tous les deux.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    let payload: TokenPayload;
    try {
      payload = this.tokens.verifyLink('reset', token);
    } catch {
      throw invalidLink();
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { count } = await this.prisma.users.updateMany({
      where: {
        id: payload.sub,
        // `iat` est en secondes entières : un changement survenu dans la même seconde invalide aussi le lien.
        OR: [{ password_changed_at: null }, { password_changed_at: { lt: new Date(payload.iat * 1000) } }],
      },
      data: { password_hash: passwordHash, password_changed_at: new Date() },
    });
    if (count === 0) throw invalidLink();
  }

  private issueSession(userId: number): SessionTokens {
    return {
      accessToken: this.tokens.signSession('access', userId),
      refreshToken: this.tokens.signSession('refresh', userId),
    };
  }

  private sendVerificationLink(userId: number, email: string): Promise<void> {
    const token = this.tokens.signLink('verify', userId);
    return this.mail.sendVerificationEmail(email, `${this.config.webOrigin}/verify-email?token=${token}`);
  }
}

function invalidSession() {
  return apiError(401, 'INVALID_SESSION', 'Session invalide ou expirée');
}

function invalidLink() {
  return apiError(400, 'INVALID_LINK', 'Ce lien est invalide ou a expiré');
}
