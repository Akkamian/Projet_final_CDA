import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from './configure-app.js';

const KEY = '0b0f6c34-6a5e-4c3e-8a56-2f1f6d0f4a11.png';

describe('configureApp : fichiers servis sur /uploads (driver local)', () => {
  let app: INestApplication;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wrt-serve-'));
    await writeFile(join(dir, KEY), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(join(dir, 'secret.txt'), 'secret');
    vi.stubEnv('UPLOAD_DIR', dir);
    vi.stubEnv('STORAGE_DRIVER', 'local');
    app = (await Test.createTestingModule({}).compile()).createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it('RG-SEC-06 sert le fichier par son URL, sans authentification, avec son type et nosniff', async () => {
    const res = await request(app.getHttpServer()).get(`/uploads/${KEY}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('répond 404 pour une clé inconnue, et ne liste ni ne sert autre chose qu’une clé générée', async () => {
    expect((await request(app.getHttpServer()).get('/uploads/absent.png')).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/uploads/')).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/uploads/secret.txt')).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/uploads/..%2Fpackage.json')).status).toBe(404);
  });
});
