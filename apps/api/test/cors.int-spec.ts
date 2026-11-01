import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.js';

describe('CORS (D5 : l’API est servie sur un autre domaine que le front)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('autorise l’origine du front, avec credentials', async () => {
    const res = await request(app.getHttpServer()).get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('ne répond jamais qu’avec l’origine du front : ni origine étrangère ni « * »', async () => {
    const res = await request(app.getHttpServer()).get('/health').set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('sans WEB_ORIGIN, n’autorise aucune origine (jamais « * »)', async () => {
    vi.stubEnv('WEB_ORIGIN', undefined);
    const { app: withoutOrigin } = await createTestApp();
    try {
      const res = await request(withoutOrigin.getHttpServer()).get('/health').set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await withoutOrigin.close();
      vi.unstubAllEnvs();
    }
  });
});
