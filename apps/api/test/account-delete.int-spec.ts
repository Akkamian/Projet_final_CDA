import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import {
  createProject,
  createUser,
  createWatch,
  resetUserData,
} from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('pixels'),
]);

describe('Suppression du compte (S35, RG-CPT-15)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let uploadDir: string;
  let user: { id: number; email: string; password: string };
  let authorization: string;

  const http = () => request(app.getHttpServer());
  const tokenFor = (id: number) =>
    `Bearer ${app.get(TokensService).signSession('access', id)}`;
  const del = (
    body: unknown = { password: user.password },
    auth: string | null = authorization,
  ) => {
    const req = http().delete('/account');
    return (auth ? req.set('Authorization', auth) : req).send(body as object);
  };
  const files = () => readdir(uploadDir);

  /** Une montre, un projet avec étape, photo d'étape, photos avant/après, mesure et coût (3 fichiers). */
  async function populate(userId: number, auth: string) {
    const watchId = (await createWatch(prisma, userId)).id;
    await prisma.comporte.create({
      data: { watch_id: watchId, complication_code: 'date' },
    });
    const projectId = (await createProject(prisma, watchId)).id;
    const stepId = (
      await prisma.restoration_steps.create({
        data: { project_id: projectId, step_order: 1, label: 'Désarmer' },
      })
    ).id;
    const send = (method: 'post' | 'put', path: string) =>
      http()
        [method](path)
        .set('Authorization', auth)
        .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(
      (await send('post', `/projects/${projectId}/steps/${stepId}/photos`))
        .status,
    ).toBe(201);
    expect(
      (await send('put', `/projects/${projectId}/photos/before`)).status,
    ).toBe(200);
    expect(
      (await send('put', `/projects/${projectId}/photos/after`)).status,
    ).toBe(200);
    await prisma.performance_measurements.create({
      data: {
        project_id: projectId,
        rate_seconds_per_day: 4,
        beat_error_ms: 0.4,
        amplitude_degrees: 260,
      },
    });
    await prisma.expenses.create({
      data: {
        project_id: projectId,
        label: 'Joint',
        amount: 10,
        expense_date: new Date('2025-05-01'),
      },
    });
    return { watchId, projectId };
  }

  const counts = async (userId: number) => ({
    watches: await prisma.watches.count({ where: { user_id: userId } }),
    projects: await prisma.restoration_projects.count({
      where: { watches: { user_id: userId } },
    }),
    steps: await prisma.restoration_steps.count({
      where: { restoration_projects: { watches: { user_id: userId } } },
    }),
    pics: await prisma.step_pics.count({
      where: {
        restoration_steps: {
          restoration_projects: { watches: { user_id: userId } },
        },
      },
    }),
    measurements: await prisma.performance_measurements.count({
      where: { restoration_projects: { watches: { user_id: userId } } },
    }),
    expenses: await prisma.expenses.count({
      where: { restoration_projects: { watches: { user_id: userId } } },
    }),
  });

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'wrt-account-'));
    vi.stubEnv('UPLOAD_DIR', uploadDir);
    ({ app, prisma } = await createTestApp());
    storage = app.get(StorageService);
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetUserData(prisma);
    for (const file of await files()) await rm(join(uploadDir, file));
    user = await createUser(prisma);
    authorization = tokenFor(user.id);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await del({ password: user.password }, null)).status).toBe(401);
    expect(
      await prisma.users.findUnique({ where: { id: user.id } }),
    ).not.toBeNull();
  });

  it('S35 supprime l’utilisateur et toutes ses données (montres, projets, étapes, photos, mesures, coûts)', async () => {
    await populate(user.id, authorization);
    expect(await counts(user.id)).toEqual({
      watches: 1,
      projects: 1,
      steps: 1,
      pics: 1,
      measurements: 1,
      expenses: 1,
    });

    const res = await del();

    expect(res.status).toBe(204);
    expect(
      await prisma.users.findUnique({ where: { id: user.id } }),
    ).toBeNull();
    expect(await counts(user.id)).toEqual({
      watches: 0,
      projects: 0,
      steps: 0,
      pics: 0,
      measurements: 0,
      expenses: 0,
    });
    expect(await prisma.comporte.count()).toBe(0);
  });

  it('S35 efface les fichiers photos', async () => {
    await populate(user.id, authorization);
    expect(await files()).toHaveLength(3);

    await del();

    expect(await files()).toHaveLength(0);
  });

  it('si l’effacement d’un fichier échoue, la suppression du compte est conservée et la réponse est 204', async () => {
    await populate(user.id, authorization);
    vi.spyOn(storage, 'delete').mockRejectedValue(
      new Error('disque en lecture seule'),
    );

    expect((await del()).status).toBe(204);
    expect(
      await prisma.users.findUnique({ where: { id: user.id } }),
    ).toBeNull();
  });

  it('S35 ferme la session : le cookie de renouvellement est effacé', async () => {
    const res = await del();

    const cookie = (
      (res.headers['set-cookie'] as unknown as string[] | undefined) ?? []
    ).find((c) => c.startsWith('refresh_token='));
    expect(cookie).toMatch(/^refresh_token=;/);
    expect(cookie).toMatch(/Path=\/auth/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('S35 refuse un mot de passe incorrect (400 WRONG_PASSWORD), rien n’est supprimé', async () => {
    await populate(user.id, authorization);

    const res = await del({ password: 'pas-le-bon' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WRONG_PASSWORD');
    expect(
      await prisma.users.findUnique({ where: { id: user.id } }),
    ).not.toBeNull();
    expect((await counts(user.id)).watches).toBe(1);
    expect(await files()).toHaveLength(3);
  });

  it('refuse un mot de passe absent, vide ou qui n’est pas un texte (400), rien n’est supprimé', async () => {
    for (const body of [
      {},
      { password: '' },
      { password: 12345678 },
      { password: null },
      { password: ['a'] },
      { password: 'x'.repeat(2000) },
    ]) {
      expect((await del(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(
      await prisma.users.findUnique({ where: { id: user.id } }),
    ).not.toBeNull();
  });

  it('les données d’un autre utilisateur restent intactes', async () => {
    const other = await createUser(prisma);
    const otherAuth = tokenFor(other.id);
    await populate(other.id, otherAuth);
    await populate(user.id, authorization);
    expect(await files()).toHaveLength(6);

    await del();

    expect(
      await prisma.users.findUnique({ where: { id: other.id } }),
    ).not.toBeNull();
    expect(await counts(other.id)).toEqual({
      watches: 1,
      projects: 1,
      steps: 1,
      pics: 1,
      measurements: 1,
      expenses: 1,
    });
    expect(await files()).toHaveLength(3);
  });

  it('un jeton d’accès émis avant la suppression ne donne plus accès (401)', async () => {
    await del();

    expect(
      (await http().get('/watches').set('Authorization', authorization)).status,
    ).toBe(401);
    expect((await del()).status).toBe(401);
  });
});
