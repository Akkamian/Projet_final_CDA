import { Inject, Injectable } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { MAIL_TRANSPORT } from './mail.constants.js';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  sendVerificationEmail(to: string, link: string): Promise<void> {
    return this.send(
      to,
      'Confirmez votre adresse email',
      `Bonjour,\n\nPour activer votre compte Watch Restoration Tracker, confirmez votre adresse email :\n${link}\n\nCe lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    );
  }

  sendPasswordResetEmail(to: string, link: string): Promise<void> {
    return this.send(
      to,
      'Réinitialisation de votre mot de passe',
      `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien :\n${link}\n\nCe lien est valable 1 heure. Si vous n'avez rien demandé, ignorez ce message.`,
    );
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    await this.transport.sendMail({ from: this.config.mailFrom, to, subject, text });
  }
}
