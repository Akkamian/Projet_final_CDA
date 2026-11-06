import { createTransport } from 'nodemailer';
import type { AppConfig } from '../config/configuration.js';
import { MailService } from './mail.service.js';

const config = { mailFrom: 'no-reply@test.local' } as AppConfig;

async function sendAndRead(send: (mail: MailService) => Promise<void>) {
  const sent: { from: { address: string }; to: { address: string }[]; subject: string; text: string }[] = [];
  const transport = createTransport({ jsonTransport: true });
  const original = transport.sendMail.bind(transport) as (options: unknown) => Promise<{ message: string }>;
  transport.sendMail = (async (options: unknown) => {
    const info = await original(options);
    sent.push(JSON.parse(info.message));
    return info;
  }) as typeof transport.sendMail;
  await send(new MailService(transport, config));
  return sent;
}

describe('MailService', () => {
  it('envoie un email de vérification en français contenant le lien', async () => {
    const link = 'http://localhost:5173/verify-email?token=abc.def';
    const [mail] = await sendAndRead((m) => m.sendVerificationEmail('foo@bar.fr', link));
    expect(mail.to[0].address).toBe('foo@bar.fr');
    expect(mail.from.address).toBe('no-reply@test.local');
    expect(mail.subject).toMatch(/adresse/i);
    expect(mail.text).toContain(link);
    expect(mail.text).toMatch(/24 heures/);
  });

  it('envoie un email de réinitialisation contenant le lien', async () => {
    const link = 'http://localhost:5173/reset-password?token=xyz';
    const [mail] = await sendAndRead((m) => m.sendPasswordResetEmail('foo@bar.fr', link));
    expect(mail.to[0].address).toBe('foo@bar.fr');
    expect(mail.subject).toMatch(/mot de passe/i);
    expect(mail.text).toContain(link);
    expect(mail.text).toMatch(/1 heure/);
  });
});
