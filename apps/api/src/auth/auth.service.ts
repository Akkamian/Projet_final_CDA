import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { apiError } from '../common/api-error.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { Prisma } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { TokensService } from './tokens.service.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
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

  /** Répond pareil que le compte existe ou non (RG-CPT-10). */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (user && user.email_verified_at === null) {
      await this.sendVerificationLink(user.id, user.email);
    }
  }

  private sendVerificationLink(userId: number, email: string): Promise<void> {
    const token = this.tokens.signLink('verify', userId);
    return this.mail.sendVerificationEmail(email, `${this.config.webOrigin}/verify-email?token=${token}`);
  }
}

function invalidLink() {
  return apiError(400, 'INVALID_LINK', 'Ce lien est invalide ou a expiré');
}
