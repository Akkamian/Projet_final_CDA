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

  it('sans WEB_ORIGIN, l’application refuse de démarrer (jamais « * » par défaut)', async () => {
    vi.stubEnv('WEB_ORIGIN', undefined);
    try {
      await expect(createTestApp()).rejects.toThrow(/WEB_ORIGIN/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
