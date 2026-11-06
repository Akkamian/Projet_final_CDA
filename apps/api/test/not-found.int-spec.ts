import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('Format unique des réponses 404', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: TokensService;

  const expected = {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'Ressource introuvable',
  };
  const get = (path: string, userId: number) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${tokens.signSession('access', userId)}`);

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

  it('une route inconnue', async () => {
    const res = await request(app.getHttpServer()).get('/nulle-part');

    expect(res.status).toBe(404);
    expect(res.body).toEqual(expected);
  });

  it('un identifiant malformé, absent ou appartenant à un autre utilisateur donnent la même réponse (RG-SEC-04)', async () => {
    const owner = await createUser(prisma, { email: 'foo@bar.fr' });
    const other = await createUser(prisma, { email: 'baz@bar.fr' });
    const watch = await createWatch(prisma, owner.id);

    for (const path of [
      '/watches/abc',
      '/watches/2147483648',
      '/watches/999999',
      `/watches/${watch.id}`,
    ]) {
      const res = await get(path, other.id);
      expect(res.status, path).toBe(404);
      expect(res.body, path).toEqual(expected);
    }
  });

  it('un projet ou une étape introuvable', async () => {
    const user = await createUser(prisma, { email: 'foo@bar.fr' });

    for (const path of ['/projects/999999', '/projects/999999/steps/1']) {
      const res = await get(path, user.id);
      expect(res.status, path).toBe(404);
      expect(res.body, path).toEqual(expected);
    }
  });
});
