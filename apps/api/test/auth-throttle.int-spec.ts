import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.js';

describe('Limitation des tentatives (S36, S39, RG-CPT-14)', () => {
  let app: INestApplication;

  const post = (path: string, body: object = {}) =>
    request(app.getHttpServer()).post(path).send(body);
  const login = () =>
    post('/auth/login', { email: 'foo@bar.fr', password: 'mauvais-mdp-1' });
  const forgot = () => post('/auth/forgot-password', { email: 'foo@bar.fr' });
  const resend = () =>
    post('/auth/resend-verification', { email: 'foo@bar.fr' });

  // Chaque test repart d'un compteur neuf : le compteur vit dans l'application.
  beforeEach(async () => {
    vi.stubEnv('THROTTLE_LIMIT', '3');
    vi.stubEnv('THROTTLE_TTL_SECONDS', '60');
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('S36 la 4e tentative de connexion depuis la même IP reçoit 429', async () => {
    for (let i = 0; i < 3; i++) expect((await login()).status).toBe(401);

    const res = await login();

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      message: expect.stringContaining('Trop de tentatives'),
    });
  });

  it('S36 la demande de réinitialisation est limitée', async () => {
    for (let i = 0; i < 3; i++) expect((await forgot()).status).toBe(204);

    expect((await forgot()).status).toBe(429);
  });

  it('l’inscription est limitée : elle envoie un email à chaque appel', async () => {
    const register = () => post('/auth/register', { email: 'foo@bar.fr', password: 'password123', acceptTerms: false });
    for (let i = 0; i < 3; i++) expect((await register()).status).toBe(400);

    expect((await register()).status).toBe(429);
  });

  it('S39 le renvoi du lien est limité', async () => {
    for (let i = 0; i < 3; i++) expect((await resend()).status).toBe(204);

    expect((await resend()).status).toBe(429);
  });

  it('une route limitée n’épuise pas le compteur d’une autre', async () => {
    for (let i = 0; i < 4; i++) await login();

    expect((await forgot()).status).toBe(204);
  });

  const loginFrom = (ip: string) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'foo@bar.fr', password: 'mauvais-mdp-1' });

  it('sans proxy déclaré, X-Forwarded-For est ignoré : changer d’en-tête ne remet pas le compteur à zéro', async () => {
    for (let i = 0; i < 3; i++)
      expect((await loginFrom(`10.0.0.${i}`)).status).toBe(401);

    expect((await loginFrom('10.0.0.99')).status).toBe(429);
  });

  it('TRUST_PROXY : derrière un proxy de confiance, chaque client a son propre compteur', async () => {
    await app.close();
    vi.stubEnv('TRUST_PROXY', 'loopback');
    ({ app } = await createTestApp());

    for (let i = 0; i < 3; i++)
      expect((await loginFrom('10.0.0.1')).status).toBe(401);

    expect((await loginFrom('10.0.0.1')).status).toBe(429);
    expect((await loginFrom('10.0.0.2')).status).toBe(401);
  });

  it('les autres routes ne sont pas limitées', async () => {
    for (let i = 0; i < 8; i++) {
      expect((await post('/auth/refresh')).status).toBe(401);
      expect((await request(app.getHttpServer()).get('/health')).status).toBe(
        200,
      );
    }
  });
});
