import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { APP_CONFIG } from '../src/config/config.module.js';
import type { AppConfig } from '../src/config/configuration.js';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser, resetUserData } from './helpers/factories.js';
import { createTestApp, type FakeMail } from './helpers/test-app.js';

describe('Mot de passe oublié, réinitialisation et changement (S3, S4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: FakeMail;
  let tokens: TokensService;

  const http = () => request(app.getHttpServer());
  const forgot = (email: string) =>
    http().post('/auth/forgot-password').send({ email });
  const reset = (token: string, password = 'nouveau-mdp-1') =>
    http().post('/auth/reset-password').send({ token, password });
  const change = (userId: number | null, body: object) => {
    const req = http().patch('/account/password');
    return (
      userId === null
        ? req
        : req.set(
            'Authorization',
            `Bearer ${tokens.signSession('access', userId)}`,
          )
    ).send(body);
  };
  const linkToken = () => /token=([^\s]+)/.exec(mail.sent[0].text)![1];
  const hashOf = async (id: number) =>
    (await prisma.users.findUniqueOrThrow({ where: { id } })).password_hash;

  beforeAll(async () => {
    ({ app, prisma, mail } = await createTestApp());
    tokens = app.get(TokensService);
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    mail.sent.length = 0;
    mail.fail = false;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/forgot-password', () => {
    it('S3 répond pareil pour une adresse connue et inconnue', async () => {
      await createUser(prisma, { email: 'foo@bar.fr' });

      const known = await forgot('foo@bar.fr');
      const unknown = await forgot('inconnu@bar.fr');

      expect(known.status).toBe(204);
      expect(unknown.status).toBe(204);
      expect(known.body).toEqual(unknown.body);
      expect(known.headers['set-cookie']).toBeUndefined();
    });

    it('S3 envoie un lien de réinitialisation si le compte existe, rien sinon', async () => {
      await createUser(prisma, { email: 'foo@bar.fr' });

      await forgot('inconnu@bar.fr');
      expect(mail.sent).toHaveLength(0);

      await forgot('foo@bar.fr');
      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].to).toBe('foo@bar.fr');
      expect(mail.sent[0].text).toContain(
        'http://localhost:5173/reset-password?token=',
      );
    });

    it('forgot-password avec " FOO@Bar.fr " retrouve le compte', async () => {
      await createUser(prisma, { email: 'foo@bar.fr' });

      expect((await forgot(' FOO@Bar.fr ')).status).toBe(204);
      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].to).toBe('foo@bar.fr');
    });

    it('RG-CPT-10 une panne d’envoi ne distingue pas une adresse connue d’une inconnue (204)', async () => {
      await createUser(prisma, { email: 'foo@bar.fr' });
      mail.fail = true;

      expect((await forgot('foo@bar.fr')).status).toBe(204);
    });

    it('refuse une adresse mal formée ou absente (400)', async () => {
      expect((await forgot('pas-un-email')).status).toBe(400);
      expect((await http().post('/auth/forgot-password').send({})).status).toBe(
        400,
      );
    });
  });

  describe('POST /auth/reset-password', () => {
    it('RG-CPT-09 le lien change le mot de passe puis ne peut plus servir', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      await forgot('foo@bar.fr');
      const token = linkToken();

      const first = await reset(token, 'nouveau-mdp-1');

      expect(first.status).toBe(204);
      const row = await prisma.users.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(await bcrypt.compare('nouveau-mdp-1', row.password_hash)).toBe(
        true,
      );
      expect(row.password_changed_at).not.toBeNull();

      const second = await reset(token, 'autre-mdp-123');
      expect(second.status).toBe(400);
      expect(second.body.code).toBe('INVALID_LINK');
      expect(await bcrypt.compare('nouveau-mdp-1', await hashOf(user.id))).toBe(
        true,
      );
    });

    it('RG-CPT-09 un lien de plus d’une heure est refusé', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      const config = app.get<AppConfig>(APP_CONFIG);
      const old = Math.floor(Date.now() / 1000) - 3700;
      const token = app
        .get(JwtService)
        .sign(
          { sub: user.id, typ: 'reset', iat: old },
          { secret: config.jwtLinkSecret, expiresIn: 3600 },
        );
      const before = await hashOf(user.id);

      const res = await reset(token);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LINK');
      expect(await hashOf(user.id)).toBe(before);
    });

    it('RG-CPT-09 un jeton de vérification d’adresse est refusé', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });

      const res = await reset(tokens.signLink('verify', user.id));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LINK');
    });

    it('refuse un jeton falsifié ou quelconque (400 INVALID_LINK)', async () => {
      const res = await reset('n-importe-quoi');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LINK');
    });

    it('RG-CPT-09 un lien demandé avant un changement de mot de passe est refusé', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      await forgot('foo@bar.fr');
      expect(
        (
          await change(user.id, {
            currentPassword: user.password,
            newPassword: 'changement-1',
          })
        ).status,
      ).toBe(200);

      const res = await reset(linkToken());

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LINK');
      expect(await bcrypt.compare('changement-1', await hashOf(user.id))).toBe(
        true,
      );
    });

    it('RG-CPT-09 deux utilisations simultanées du même lien : une seule réussit', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      await forgot('foo@bar.fr');
      const token = linkToken();

      const results = await Promise.all([
        reset(token, 'premier-mdp-1'),
        reset(token, 'second-mdp-12'),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([204, 400]);
      expect(await prisma.users.count({ where: { id: user.id } })).toBe(1);
    });

    it('RG-CPT-03 refuse un nouveau mot de passe de 7 caractères', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      await forgot('foo@bar.fr');
      const before = await hashOf(user.id);

      const res = await reset(linkToken(), '1234567');

      expect(res.status).toBe(400);
      expect(await hashOf(user.id)).toBe(before);
    });

    it('un jeton de renouvellement émis avant la réinitialisation ne rouvre plus de session', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      const config = app.get<AppConfig>(APP_CONFIG);
      const old = Math.floor(Date.now() / 1000) - 60;
      const refresh = app
        .get(JwtService)
        .sign(
          { sub: user.id, typ: 'refresh', iat: old },
          { secret: config.jwtSessionSecret, expiresIn: 3600 },
        );
      await forgot('foo@bar.fr');
      await reset(linkToken());

      const res = await http()
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refresh}`);

      expect(res.status).toBe(401);
    });

    it('le nouveau mot de passe permet de se connecter, l’ancien non', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      await forgot('foo@bar.fr');
      await reset(linkToken(), 'nouveau-mdp-1');

      expect(
        (
          await http()
            .post('/auth/login')
            .send({ email: 'foo@bar.fr', password: 'nouveau-mdp-1' })
        ).status,
      ).toBe(200);
      expect(
        (
          await http()
            .post('/auth/login')
            .send({ email: 'foo@bar.fr', password: user.password })
        ).status,
      ).toBe(401);
    });
  });

  describe('PATCH /account/password', () => {
    it('S4 change le mot de passe avec le bon mot de passe actuel et met à jour password_changed_at', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });

      const res = await change(user.id, {
        currentPassword: user.password,
        newPassword: 'nouveau-mdp-1',
      });

      expect(res.status).toBe(200);
      const row = await prisma.users.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(await bcrypt.compare('nouveau-mdp-1', row.password_hash)).toBe(
        true,
      );
      expect(row.password_changed_at).not.toBeNull();
    });

    it('S4 garde la session de l’appareil courant : nouveau jeton d’accès et cookie de renouvellement encore valable', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });

      const res = await change(user.id, {
        currentPassword: user.password,
        newPassword: 'nouveau-mdp-1',
      });

      expect(typeof res.body.accessToken).toBe('string');
      const setCookie = res.headers['set-cookie'] as unknown as string[];
      const cookie = setCookie.find((c) => c.startsWith('refresh_token='));
      expect(cookie).toBeDefined();
      const refreshed = await http()
        .post('/auth/refresh')
        .set('Cookie', cookie!.split(';')[0]);
      expect(refreshed.status).toBe(200);
    });

    it('S4 refuse un mot de passe actuel incorrect (400 WRONG_PASSWORD), rien ne change', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });
      const before = await hashOf(user.id);

      const res = await change(user.id, {
        currentPassword: 'pas-le-bon-mdp',
        newPassword: 'nouveau-mdp-1',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WRONG_PASSWORD');
      expect(await hashOf(user.id)).toBe(before);
      expect(
        (await prisma.users.findUniqueOrThrow({ where: { id: user.id } }))
          .password_changed_at,
      ).toBeNull();
    });

    it('RG-CPT-03 refuse un nouveau mot de passe de 7 caractères', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });

      const res = await change(user.id, {
        currentPassword: user.password,
        newPassword: '1234567',
      });

      expect(res.status).toBe(400);
      expect(await bcrypt.compare(user.password, await hashOf(user.id))).toBe(
        true,
      );
    });

    it('refuse un corps incomplet ou mal typé (400)', async () => {
      const user = await createUser(prisma, { email: 'foo@bar.fr' });

      for (const body of [
        {},
        { currentPassword: user.password },
        { newPassword: 'nouveau-mdp-1' },
        { currentPassword: 1, newPassword: 'nouveau-mdp-1' },
        { currentPassword: '', newPassword: 'nouveau-mdp-1' },
      ]) {
        expect((await change(user.id, body)).status, JSON.stringify(body)).toBe(
          400,
        );
      }
    });

    it('RG-SEC-03 sans jeton la réponse est 401', async () => {
      expect(
        (
          await change(null, {
            currentPassword: 'x',
            newPassword: 'nouveau-mdp-1',
          })
        ).status,
      ).toBe(401);
    });
  });
});
