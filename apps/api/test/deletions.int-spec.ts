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

describe('Suppression d’un projet et d’une montre, fichiers compris', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let uploadDir: string;
  let userId: number;
  let authorization: string;

  const http = () => request(app.getHttpServer());
  const tokenFor = (id: number) =>
    `Bearer ${app.get(TokensService).signSession('access', id)}`;
  const delProject = (id: number | string, auth = authorization) =>
    http().delete(`/projects/${id}`).set('Authorization', auth);
  const delWatch = (id: number | string, auth = authorization) =>
    http().delete(`/watches/${id}`).set('Authorization', auth);
  const files = () => readdir(uploadDir);

  /** Un projet avec une étape portant une photo, les deux photos avant/après, une mesure et un coût (3 fichiers). */
  async function fullProject(
    watchId: number,
    status: 'in_progress' | 'completed' = 'completed',
    amount = 30,
  ) {
    const projectId = (await createProject(prisma, watchId, { status })).id;
    const stepId = (
      await prisma.restoration_steps.create({
        data: { project_id: projectId, step_order: 1, label: 'Désarmer' },
      })
    ).id;
    const send = (method: 'post' | 'put', path: string) =>
      http()
        [method](path)
        .set('Authorization', authorization)
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
        amount,
        expense_date: new Date('2025-05-01'),
      },
    });
    return projectId;
  }

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'wrt-deletions-'));
    vi.stubEnv('UPLOAD_DIR', uploadDir);
    ({ app, prisma } = await createTestApp());
    storage = app.get(StorageService);
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetUserData(prisma);
    for (const file of await files()) await rm(join(uploadDir, file));
    userId = (await createUser(prisma)).id;
    authorization = tokenFor(userId);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await http().delete('/projects/1')).status).toBe(401);
    expect((await http().delete('/watches/1')).status).toBe(401);
  });

  describe('DELETE /projects/:id', () => {
    it('S37 supprime étapes, photos, mesures, coûts et fichiers du projet, mais garde la montre et les autres projets', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      const doomed = await fullProject(watchId);
      const kept = await fullProject(watchId);
      expect(await files()).toHaveLength(6);

      const res = await delProject(doomed);

      expect(res.status).toBe(204);
      expect(
        await prisma.restoration_projects.findUnique({ where: { id: doomed } }),
      ).toBeNull();
      expect(
        await prisma.restoration_steps.count({ where: { project_id: doomed } }),
      ).toBe(0);
      expect(await prisma.step_pics.count()).toBe(1);
      expect(
        await prisma.performance_measurements.count({
          where: { project_id: doomed },
        }),
      ).toBe(0);
      expect(
        await prisma.expenses.count({ where: { project_id: doomed } }),
      ).toBe(0);
      expect(await files()).toHaveLength(3);
      expect(
        await prisma.watches.findUnique({ where: { id: watchId } }),
      ).not.toBeNull();
      expect(
        await prisma.restoration_projects.findUnique({ where: { id: kept } }),
      ).not.toBeNull();
    });

    it('S37 la marge de la montre est recalculée sans les coûts du projet', async () => {
      const watchId = (
        await createWatch(prisma, userId, {
          purchase_price: 80,
          purchase_date: new Date('2025-03-01'),
        })
      ).id;
      const doomed = await fullProject(watchId, 'completed', 30);
      await fullProject(watchId, 'completed', 20);
      await prisma.watches.update({
        where: { id: watchId },
        data: { resale_price: 200, resale_date: new Date('2025-06-01') },
      });
      const margin = async () =>
        (
          await http()
            .get(`/watches/${watchId}`)
            .set('Authorization', authorization)
        ).body.margin;
      expect(await margin()).toBe('70.00');

      await delProject(doomed);

      expect(await margin()).toBe('100.00');
    });

    it('RG-AFF-05 la montre sans projet reste visible avec le statut no_project', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      const only = await fullProject(watchId);

      await delProject(only);

      const list = await http()
        .get('/watches')
        .set('Authorization', authorization);
      expect(
        list.body.items.find((w: { id: number }) => w.id === watchId),
      ).toMatchObject({ status: 'no_project', thumbnailUrl: null });
      expect(
        (
          await http()
            .get(`/watches/${watchId}`)
            .set('Authorization', authorization)
        ).status,
      ).toBe(200);
    });

    it('un projet en cours se supprime aussi', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      const id = await fullProject(watchId, 'in_progress');

      expect((await delProject(id)).status).toBe(204);
      expect(await files()).toHaveLength(0);
    });

    it('si l’effacement d’un fichier échoue, la suppression en base est conservée et la réponse est 204', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      const id = await fullProject(watchId);
      vi.spyOn(storage, 'delete').mockRejectedValue(
        new Error('disque en lecture seule'),
      );

      expect((await delProject(id)).status).toBe(204);
      expect(
        await prisma.restoration_projects.findUnique({ where: { id } }),
      ).toBeNull();
    });

    it('RG-SEC-01 le projet d’un autre utilisateur, inexistant ou mal identifié répond 404 et rien n’est supprimé', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      const id = await fullProject(watchId);
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await delProject(id, stranger)).status).toBe(404);
      expect((await delProject(999999)).status).toBe(404);
      expect((await delProject('abc')).status).toBe(404);
      expect(
        await prisma.restoration_projects.findUnique({ where: { id } }),
      ).not.toBeNull();
      expect(await files()).toHaveLength(3);
    });
  });

  describe('DELETE /watches/:id', () => {
    it('S38 supprime complications, projets, données et fichiers de la montre, et rien de ceux des autres', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      await prisma.comporte.create({
        data: { watch_id: watchId, complication_code: 'date' },
      });
      const projectId = await fullProject(watchId);
      await fullProject(watchId);
      const otherWatch = (await createWatch(prisma, userId)).id;
      const otherProject = await fullProject(otherWatch);
      expect(await files()).toHaveLength(9);

      const res = await delWatch(watchId);

      expect(res.status).toBe(204);
      expect(
        await prisma.watches.findUnique({ where: { id: watchId } }),
      ).toBeNull();
      expect(
        await prisma.comporte.count({ where: { watch_id: watchId } }),
      ).toBe(0);
      expect(
        await prisma.restoration_projects.count({
          where: { watch_id: watchId },
        }),
      ).toBe(0);
      expect(
        await prisma.restoration_steps.count({
          where: { project_id: projectId },
        }),
      ).toBe(0);
      expect(
        await prisma.expenses.count({ where: { project_id: projectId } }),
      ).toBe(0);
      expect(await files()).toHaveLength(3);
      expect(
        await prisma.restoration_projects.findUnique({
          where: { id: otherProject },
        }),
      ).not.toBeNull();
    });

    it('S38 vendue ou avec projet en cours, elle se supprime', async () => {
      const sold = (
        await createWatch(prisma, userId, {
          resale_price: 200,
          resale_date: new Date('2025-06-01'),
        })
      ).id;
      await fullProject(sold);
      const running = (await createWatch(prisma, userId)).id;
      await fullProject(running, 'in_progress');

      expect((await delWatch(sold)).status).toBe(204);
      expect((await delWatch(running)).status).toBe(204);
      expect(await prisma.watches.count()).toBe(0);
      expect(await files()).toHaveLength(0);
    });

    it('S38 une montre sans projet se supprime', async () => {
      const watchId = (await createWatch(prisma, userId)).id;

      expect((await delWatch(watchId)).status).toBe(204);
    });

    it('si l’effacement d’un fichier échoue, la suppression en base est conservée et la réponse est 204', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      await fullProject(watchId);
      vi.spyOn(storage, 'delete').mockRejectedValue(
        new Error('disque en lecture seule'),
      );

      expect((await delWatch(watchId)).status).toBe(204);
      expect(
        await prisma.watches.findUnique({ where: { id: watchId } }),
      ).toBeNull();
    });

    it('RG-SEC-01 la montre d’un autre utilisateur, inexistante ou mal identifiée répond 404 et rien n’est supprimé', async () => {
      const watchId = (await createWatch(prisma, userId)).id;
      await fullProject(watchId);
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await delWatch(watchId, stranger)).status).toBe(404);
      expect((await delWatch(999999)).status).toBe(404);
      expect((await delWatch('abc')).status).toBe(404);
      expect(
        await prisma.watches.findUnique({ where: { id: watchId } }),
      ).not.toBeNull();
      expect(await files()).toHaveLength(3);
    });
  });
});
