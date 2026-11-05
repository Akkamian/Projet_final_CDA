import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('GET /account : profil de la session', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const get = (userId: number | null) => {
    const req = request(app.getHttpServer()).get('/account');
    return userId === null
      ? req
      : req.set(
          'Authorization',
          `Bearer ${app.get(TokensService).signSession('access', userId)}`,
        );
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await get(null)).status).toBe(401);
  });

  it('renvoie le profil de la session', async () => {
    const user = await createUser(prisma, { email: 'foo@bar.fr' });

    const res = await get(user.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: 'foo@bar.fr',
      createdAt: expect.any(String),
      emailVerifiedAt: expect.any(String),
      passwordChangedAt: null,
    });
  });

  it('un compte non vérifié a emailVerifiedAt null', async () => {
    const user = await createUser(prisma, { verified: false });

    expect((await get(user.id)).body.emailVerifiedAt).toBeNull();
  });

  it('RG-SEC-01 chaque session ne voit que son profil', async () => {
    const first = await createUser(prisma, { email: 'un@bar.fr' });
    const second = await createUser(prisma, { email: 'deux@bar.fr' });

    expect((await get(first.id)).body.email).toBe('un@bar.fr');
    expect((await get(second.id)).body.email).toBe('deux@bar.fr');
  });

  it('ne renvoie jamais le hachage du mot de passe', async () => {
    const user = await createUser(prisma);

    const res = await get(user.id);

    expect(Object.keys(res.body).sort()).toEqual([
      'createdAt',
      'email',
      'emailVerifiedAt',
      'passwordChangedAt',
    ]);
  });
});
