import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser, resetUserData } from './helpers/factories.js';
import { createTestApp, type FakeMail } from './helpers/test-app.js';

describe('Inscription, vérification d’adresse et renvoi du lien', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: FakeMail;
  let tokens: TokensService;

  const post = (path: string, body: object) => request(app.getHttpServer()).post(path).send(body);
  const register = (overrides: object = {}) =>
    post('/auth/register', { email: 'foo@bar.fr', password: 'password123', acceptTerms: true, ...overrides });
  const tokenFromMail = (index = 0) => /token=([^\s]+)/.exec(mail.sent[index].text)![1];

  beforeAll(async () => {
    ({ app, prisma, mail } = await createTestApp());
    tokens = app.get(TokensService);
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    mail.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('S1 crée le compte sans session et envoie l’email de vérification', async () => {
      const res = await register();
      expect(res.status).toBe(201);
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(res.body.accessToken).toBeUndefined();

      const user = await prisma.users.findUniqueOrThrow({ where: { email: 'foo@bar.fr' } });
      expect(user.email_verified_at).toBeNull();
      expect(user.password_hash).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare('password123', user.password_hash)).toBe(true);

      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].to).toBe('foo@bar.fr');
      expect(mail.sent[0].text).toContain('http://localhost:5173/verify-email?token=');
    });

    it('RG-CPT-13 enregistre " Foo@Bar.fr " en minuscules', async () => {
      const res = await register({ email: ' Foo@Bar.fr ' });
      expect(res.status).toBe(201);
      expect(await prisma.users.count({ where: { email: 'foo@bar.fr' } })).toBe(1);
      expect(mail.sent[0].to).toBe('foo@bar.fr');
    });

    it('S1 refuse une adresse déjà utilisée avec 409', async () => {
      await createUser(prisma, { email: 'foo@bar.fr' });
      const res = await register({ email: 'FOO@bar.fr' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_USED' });
      expect(res.body.message).toEqual(expect.any(String));
      expect(mail.sent).toHaveLength(0);
    });

    it('RG-CPT-03 refuse un mot de passe de 7 caractères', async () => {
      const res = await register({ password: '1234567' });
      expect(res.status).toBe(400);
      expect(await prisma.users.count()).toBe(0);
    });

    it('RG-CPT-03 accepte un mot de passe de 8 caractères', async () => {
      expect((await register({ password: '12345678' })).status).toBe(201);
    });

    it('RG-CPT-04 refuse un mot de passe de plus de 72 caractères (bcrypt le tronquerait en silence)', async () => {
      const res = await register({ password: 'a'.repeat(73) });
      expect(res.status).toBe(400);
      expect(await prisma.users.count()).toBe(0);
    });

    it('RG-CPT-17 refuse sans acceptTerms', async () => {
      const missing = await post('/auth/register', { email: 'foo@bar.fr', password: 'password123' });
      expect(missing.status).toBe(400);
      expect((await register({ acceptTerms: false })).status).toBe(400);
      expect(await prisma.users.count()).toBe(0);
    });

    it('RG-CPT-02 refuse un email invalide avec 400', async () => {
      expect((await register({ email: 'pas-un-email' })).status).toBe(400);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('S1 le lien confirme l’adresse', async () => {
      await register();
      const res = await post('/auth/verify-email', { token: tokenFromMail() });
      expect(res.status).toBe(204);
      const user = await prisma.users.findUniqueOrThrow({ where: { email: 'foo@bar.fr' } });
      expect(user.email_verified_at).not.toBeNull();
    });

    it('RG-CPT-08 refuse un lien déjà utilisé', async () => {
      await register();
      const token = tokenFromMail();
      expect((await post('/auth/verify-email', { token })).status).toBe(204);
      const again = await post('/auth/verify-email', { token });
      expect(again.status).toBe(400);
      expect(again.body).toMatchObject({ statusCode: 400, code: 'INVALID_LINK' });
    });

    it('RG-CPT-08 refuse un lien expiré (plus de 24 h)', async () => {
      const user = await createUser(prisma, { verified: false });
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() - 25 * 60 * 60 * 1000);
      const old = tokens.signLink('verify', user.id);
      vi.useRealTimers();

      const res = await post('/auth/verify-email', { token: old });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LINK');
      expect((await prisma.users.findUniqueOrThrow({ where: { id: user.id } })).email_verified_at).toBeNull();
    });

    it('RG-CPT-08 refuse un jeton de réinitialisation', async () => {
      const user = await createUser(prisma, { verified: false });
      const res = await post('/auth/verify-email', { token: tokens.signLink('reset', user.id) });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LINK');
    });

    it('RG-CPT-08 refuse un jeton falsifié ou le compte supprimé', async () => {
      expect((await post('/auth/verify-email', { token: 'n-importe-quoi' })).body.code).toBe('INVALID_LINK');
      const user = await createUser(prisma, { verified: false });
      const token = tokens.signLink('verify', user.id);
      await prisma.users.delete({ where: { id: user.id } });
      expect((await post('/auth/verify-email', { token })).body.code).toBe('INVALID_LINK');
    });

    it('refuse une requête sans jeton avec 400', async () => {
      expect((await post('/auth/verify-email', {})).status).toBe(400);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('S39 renvoie un lien si le compte existe et n’est pas vérifié', async () => {
      await createUser(prisma, { email: 'foo@bar.fr', verified: false });
      const res = await post('/auth/resend-verification', { email: 'foo@bar.fr' });
      expect(res.status).toBe(204);
      expect(mail.sent).toHaveLength(1);
      expect((await post('/auth/verify-email', { token: tokenFromMail() })).status).toBe(204);
    });

    it('S39 n’envoie rien si déjà vérifié mais répond pareil', async () => {
      await createUser(prisma, { email: 'foo@bar.fr', verified: true });
      const res = await post('/auth/resend-verification', { email: 'foo@bar.fr' });
      expect(res.status).toBe(204);
      expect(mail.sent).toHaveLength(0);
    });

    it('S39 répond pareil pour une adresse inconnue', async () => {
      await createUser(prisma, { email: 'foo@bar.fr', verified: false });
      const known = await post('/auth/resend-verification', { email: 'foo@bar.fr' });
      const unknown = await post('/auth/resend-verification', { email: 'inconnu@bar.fr' });
      expect(unknown.status).toBe(known.status);
      expect(unknown.body).toEqual(known.body);
      expect(mail.sent).toHaveLength(1);
    });

    it('renvoi avec " FOO@bar.fr " retrouve le compte', async () => {
      await createUser(prisma, { email: 'foo@bar.fr', verified: false });
      const res = await post('/auth/resend-verification', { email: ' FOO@bar.fr ' });
      expect(res.status).toBe(204);
      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].to).toBe('foo@bar.fr');
    });
  });
});
