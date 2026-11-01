import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createTransport, type Transporter } from 'nodemailer';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { MAIL_TRANSPORT } from '../../src/mail/mail.constants.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/** Transport d'emails factice : rien ne part, les messages sont lisibles dans `sent`. */
export class FakeMail {
  readonly sent: { to: string; subject: string; text: string }[] = [];
  readonly transport: Transporter;

  constructor() {
    const transport = createTransport({ jsonTransport: true });
    const send = transport.sendMail.bind(transport) as (options: unknown) => Promise<{ message: string }>;
    transport.sendMail = (async (options: unknown) => {
      const info = await send(options);
      const message = JSON.parse(info.message) as { to: { address: string }[]; subject: string; text: string };
      this.sent.push({ to: message.to[0].address, subject: message.subject, text: message.text });
      return info;
    }) as typeof transport.sendMail;
    this.transport = transport;
  }
}

/** Application Nest complète branchée sur la base de test, avec un transport d'emails factice. */
export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService; mail: FakeMail }> {
  const mail = new FakeMail();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_TRANSPORT)
    .useValue(mail.transport)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), mail };
}
