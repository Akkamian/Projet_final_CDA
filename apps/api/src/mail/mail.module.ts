import { Module } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { MAIL_TRANSPORT } from './mail.constants.js';
import { MailService } from './mail.service.js';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false }),
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
