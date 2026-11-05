import { configuration } from './configuration.js';

const BASE_ENV = {
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SESSION_SECRET: 's1',
  JWT_LINK_SECRET: 's2',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  MAIL_FROM: 'no-reply@example.com',
};

describe('configuration SMTP', () => {
  it('sans identifiants (MailDev en développement), aucune authentification', () => {
    const config = configuration(BASE_ENV);

    expect(config.smtpAuth).toBeUndefined();
    expect(config.smtpSecure).toBe(false);
  });

  it('SMTP_USER et SMTP_PASS fournissent les identifiants du relais', () => {
    const config = configuration({
      ...BASE_ENV,
      SMTP_USER: 'bot',
      SMTP_PASS: 'secret',
    });

    expect(config.smtpAuth).toEqual({ user: 'bot', pass: 'secret' });
  });

  it('un identifiant sans mot de passe est refusé au démarrage', () => {
    expect(() => configuration({ ...BASE_ENV, SMTP_USER: 'bot' })).toThrow(
      'SMTP_PASS',
    );
  });

  it('le port 465 active TLS implicite, SMTP_SECURE peut le forcer ou l’interdire', () => {
    expect(configuration({ ...BASE_ENV, SMTP_PORT: '465' }).smtpSecure).toBe(
      true,
    );
    expect(
      configuration({ ...BASE_ENV, SMTP_PORT: '465', SMTP_SECURE: 'false' })
        .smtpSecure,
    ).toBe(false);
    expect(configuration({ ...BASE_ENV, SMTP_SECURE: 'true' }).smtpSecure).toBe(
      true,
    );
  });
});
