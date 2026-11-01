import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('Connexion, renouvellement, déconnexion et garde globale', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: TokensService;

  const http = () => request(app.getHttpServer());
  const login = (email: string, password: string) => http().post('/auth/login').send({ email, password });
  const setCookies = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const refreshCookie = (res: request.Response) => setCookies(res).find((c) => c.startsWith('refresh_token='))!;
  const cookieValue = (cookie: string) => cookie.split(';')[0];

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    tokens = app.get(TokensService);
  });

  beforeEach(async () => {
    await resetUserData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('ouvre une session : jeton d’accès dans le corps, jeton de renouvellement en cookie', async () => {
      const user = await createUser(prisma);
      const res = await login(user.email, user.password);
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toBeUndefined();
      expect(tokens.verifySession('access', res.body.accessToken).sub).toBe(user.id);
      expect(tokens.verifySession('refresh', cookieValue(refreshCookie(res)).split('=')[1]).sub).toBe(user.id);
    });

    it('S2 refuse un compte non vérifié avec EMAIL_NOT_VERIFIED, distinct d’identifiants invalides', async () => {
      const user = await createUser(prisma, { verified: false });
      const res = await login(user.email, user.password);
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ statusCode: 403, code: 'EMAIL_NOT_VERIFIED' });
      expect(setCookies(res)).toHaveLength(0);
    });

    it('RG-CPT-07 email inconnu et mauvais mot de passe donnent la même réponse', async () => {
      const user = await createUser(prisma);
      const wrongPassword = await login(user.email, 'mauvais-mot-de-passe');
      const unknownEmail = await login('inconnu@test.local', 'mauvais-mot-de-passe');
      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body).toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
      expect(unknownEmail.status).toBe(wrongPassword.status);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });

    it('S2 un compte non vérifié avec mauvais mot de passe reçoit INVALID_CREDENTIALS', async () => {
      const user = await createUser(prisma, { verified: false });
      const res = await login(user.email, 'mauvais-mot-de-passe');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('login accepte " FOO@Bar.fr " (email normalisé)', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      const res = await login(' FOO@Bar.fr ', user.password);
      expect(res.status).toBe(200);
    });

    it('RG-CPT-12 le cookie refresh_token est httpOnly, SameSite=Lax, chemin /auth, 7 jours', async () => {
      const user = await createUser(prisma);
      const cookie = refreshCookie(await login(user.email, user.password));
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\/auth(;|$)/);
      expect(cookie).toMatch(/Max-Age=604800/);
      expect(cookie).not.toMatch(/;\s*Secure/i);
    });

    it('RG-CPT-12 le cookie est Secure quand COOKIE_SECURE vaut true', async () => {
      vi.stubEnv('COOKIE_SECURE', 'true');
      const { app: secureApp, prisma: securePrisma } = await createTestApp();
      try {
        const user = await createUser(securePrisma);
        const res = await request(secureApp.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: user.password });
        expect(refreshCookie(res)).toMatch(/;\s*Secure/i);
      } finally {
        await secureApp.close();
        vi.unstubAllEnvs();
      }
    });

    it('refuse un corps sans mot de passe avec 400', async () => {
      expect((await http().post('/auth/login').send({ email: 'foo@bar.fr' })).status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    const loginCookie = async () => {
      const user = await createUser(prisma);
      const res = await login(user.email, user.password);
      return { user, cookie: cookieValue(refreshCookie(res)) };
    };

    it('refresh renvoie un nouveau jeton d’accès et renouvelle le cookie', async () => {
      const { user, cookie } = await loginCookie();
      const res = await http().post('/auth/refresh').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(tokens.verifySession('access', res.body.accessToken).sub).toBe(user.id);
      expect(refreshCookie(res)).toMatch(/Path=\/auth/);
    });

    it('refresh refuse un jeton d’accès à la place du jeton de renouvellement', async () => {
      const user = await createUser(prisma);
      const access = tokens.signSession('access', user.id);
      const res = await http().post('/auth/refresh').set('Cookie', `refresh_token=${access}`);
      expect(res.status).toBe(401);
    });

    it('refresh refuse une requête sans cookie ou avec un cookie falsifié', async () => {
      expect((await http().post('/auth/refresh')).status).toBe(401);
      expect((await http().post('/auth/refresh').set('Cookie', 'refresh_token=nimportequoi')).status).toBe(401);
    });

    it('session : un jeton de renouvellement émis avant password_changed_at est refusé', async () => {
      const { user, cookie } = await loginCookie();
      await prisma.users.update({
        where: { id: user.id },
        data: { password_changed_at: new Date(Date.now() + 1000) },
      });
      const res = await http().post('/auth/refresh').set('Cookie', cookie);
      expect(res.status).toBe(401);
    });

    it('session : un jeton émis après password_changed_at reste accepté', async () => {
      const { user, cookie } = await loginCookie();
      await prisma.users.update({
        where: { id: user.id },
        data: { password_changed_at: new Date(Date.now() - 60_000) },
      });
      expect((await http().post('/auth/refresh').set('Cookie', cookie)).status).toBe(200);
    });

    it('refresh refuse le jeton d’un compte supprimé', async () => {
      const { user, cookie } = await loginCookie();
      await prisma.users.delete({ where: { id: user.id } });
      expect((await http().post('/auth/refresh').set('Cookie', cookie)).status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('efface le cookie de renouvellement (204)', async () => {
      const user = await createUser(prisma);
      const { body } = await login(user.email, user.password);
      const res = await http().post('/auth/logout').set('Authorization', `Bearer ${body.accessToken}`);
      expect(res.status).toBe(204);
      const cookie = refreshCookie(res);
      expect(cookie).toMatch(/^refresh_token=;/);
      expect(cookie).toMatch(/Path=\/auth/);
      expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('RG-SEC-03 la déconnexion exige une session', async () => {
      expect((await http().post('/auth/logout')).status).toBe(401);
    });
  });

  describe('garde globale', () => {
    it('RG-SEC-03 une route privée sans jeton donne 401 au format commun', async () => {
      const res = await http().get('/movement-types');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
    });

    it('RG-SEC-03 l’aperçu exige une session', async () => {
      const url = '/step-previews?movementCode=manual';
      expect((await http().get(url)).status).toBe(401);
      const user = await createUser(prisma);
      const access = tokens.signSession('access', user.id);
      expect((await http().get(url).set('Authorization', `Bearer ${access}`)).status).toBe(200);
    });

    it('RG-SEC-03 le référentiel exige une session', async () => {
      expect((await http().get('/complications')).status).toBe(401);
    });

    it('refuse un jeton de renouvellement, un jeton falsifié et un schéma autre que Bearer', async () => {
      const user = await createUser(prisma);
      const refresh = tokens.signSession('refresh', user.id);
      expect((await http().get('/movement-types').set('Authorization', `Bearer ${refresh}`)).status).toBe(401);
      expect((await http().get('/movement-types').set('Authorization', 'Bearer abc.def.ghi')).status).toBe(401);
      const access = tokens.signSession('access', user.id);
      expect((await http().get('/movement-types').set('Authorization', `Basic ${access}`)).status).toBe(401);
    });

    it('refuse un jeton d’accès expiré (plus de 15 minutes)', async () => {
      const user = await createUser(prisma);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() - 16 * 60 * 1000);
      const old = tokens.signSession('access', user.id);
      vi.useRealTimers();
      expect((await http().get('/movement-types').set('Authorization', `Bearer ${old}`)).status).toBe(401);
    });

    it('refuse un jeton de lien (secret et type distincts)', async () => {
      const user = await createUser(prisma);
      const link = tokens.signLink('verify', user.id);
      expect((await http().get('/movement-types').set('Authorization', `Bearer ${link}`)).status).toBe(401);
    });

    it('GET /health reste public', async () => {
      expect((await http().get('/health')).status).toBe(200);
    });
  });
});
