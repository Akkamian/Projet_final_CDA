import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createProject,
  createUser,
  createWatch,
  resetUserData,
} from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const STEPS = {
  steps: [
    { label: 'Désarmer' },
    { label: 'Sortir le mouvement' },
    { label: 'Nettoyer' },
  ],
};

describe('Cycle de vie d’un projet : nouvelle révision, terminer, rouvrir', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;
  let watchId: number;

  const http = () => request(app.getHttpServer());
  const tokenFor = (id: number) =>
    `Bearer ${app.get(TokensService).signSession('access', id)}`;
  const create = (
    body: unknown = STEPS,
    id: number | string = watchId,
    auth = authorization,
  ) =>
    http()
      .post(`/watches/${id}/projects`)
      .set('Authorization', auth)
      .send(body as object);
  const complete = (id: number | string, auth = authorization) =>
    http().post(`/projects/${id}/complete`).set('Authorization', auth);
  const reopen = (id: number | string, auth = authorization) =>
    http().post(`/projects/${id}/reopen`).set('Authorization', auth);
  const project = (id: number) =>
    prisma.restoration_projects.findUniqueOrThrow({ where: { id } });
  const inProgressCount = () =>
    prisma.restoration_projects.count({
      where: { watch_id: watchId, status: 'in_progress' },
    });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    userId = (await createUser(prisma)).id;
    authorization = tokenFor(userId);
    watchId = (await createWatch(prisma, userId)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect(
      (await http().post(`/watches/${watchId}/projects`).send(STEPS)).status,
    ).toBe(401);
    expect((await http().post('/projects/1/complete')).status).toBe(401);
    expect((await http().post('/projects/1/reopen')).status).toBe(401);
  });

  describe('POST /watches/:id/projects', () => {
    it('S9 ouvre un nouveau projet sur une montre dont le dernier projet est terminé', async () => {
      await createProject(prisma, watchId, { status: 'completed' });

      const res = await create();

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        status: 'in_progress',
        completedAt: null,
        expenses: [],
        measurements: [],
      });
      expect(
        res.body.steps.map(
          (s: { stepOrder: number; label: string; isCompleted: boolean }) => [
            s.stepOrder,
            s.label,
            s.isCompleted,
          ],
        ),
      ).toEqual([
        [1, 'Désarmer', false],
        [2, 'Sortir le mouvement', false],
        [3, 'Nettoyer', false],
      ]);
      expect(
        await prisma.restoration_projects.count({
          where: { watch_id: watchId },
        }),
      ).toBe(2);
    });

    it('S9 aussi sur une montre sans projet', async () => {
      const res = await create();

      expect(res.status).toBe(201);
      expect(await inProgressCount()).toBe(1);
    });

    it('RG-PRJ-05 refuse sur une montre vendue (WATCH_SOLD), rien n’est écrit', async () => {
      await createProject(prisma, watchId, { status: 'completed' });
      await prisma.watches.update({
        where: { id: watchId },
        data: { resale_price: 200, resale_date: new Date('2025-06-01') },
      });

      const res = await create();

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('WATCH_SOLD');
      expect(
        await prisma.restoration_projects.count({
          where: { watch_id: watchId },
        }),
      ).toBe(1);
    });

    it('RG-PRJ-09 refuse si un projet est en cours (PROJECT_ALREADY_IN_PROGRESS)', async () => {
      await createProject(prisma, watchId, { status: 'in_progress' });

      const res = await create();

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROJECT_ALREADY_IN_PROGRESS');
      expect(
        await prisma.restoration_projects.count({
          where: { watch_id: watchId },
        }),
      ).toBe(1);
    });

    it('RG-PRJ-09 deux créations simultanées : une seule réussit, l’autre reçoit 409 PROJECT_ALREADY_IN_PROGRESS, jamais 500', async () => {
      await createProject(prisma, watchId, { status: 'completed' });

      const results = await Promise.all([create(), create()]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)!.body.code).toBe(
        'PROJECT_ALREADY_IN_PROGRESS',
      );
      expect(await inProgressCount()).toBe(1);
    });

    it('RG-PRJ-05 / RG-MON-08 une revente et une création simultanées ne produisent jamais une montre vendue avec un projet en cours', async () => {
      await createProject(prisma, watchId, { status: 'completed' });
      const sell = http()
        .put(`/watches/${watchId}/resale`)
        .set('Authorization', authorization)
        .send({ price: 200, date: '2025-06-01' });

      const results = await Promise.all([create(), sell]);

      expect(results.every((r) => r.status !== 500)).toBe(true);
      const watch = await prisma.watches.findUniqueOrThrow({
        where: { id: watchId },
      });
      expect(watch.resale_date !== null && (await inProgressCount()) > 0).toBe(
        false,
      );
    });

    it('RG-ETP-07 exige au moins une étape et refuse un libellé vide ou un champ inconnu (400, rien n’est écrit)', async () => {
      for (const body of [
        {},
        { steps: [] },
        { steps: [{ label: '  ' }] },
        { steps: [{ label: 'a' }], extra: 1 },
        { steps: 'x' },
      ]) {
        expect((await create(body)).status, JSON.stringify(body)).toBe(400);
      }
      expect(
        await prisma.restoration_projects.count({
          where: { watch_id: watchId },
        }),
      ).toBe(0);
    });

    it('RG-MON-08 modifier les complications de la montre ne touche pas les étapes des projets existants', async () => {
      const first = (await create()).body;
      await complete(first.id);

      await http()
        .patch(`/watches/${watchId}`)
        .set('Authorization', authorization)
        .send({ complicationCodes: ['date'] });
      const second = await create({
        steps: [{ label: 'Étape de la révision' }],
      });

      expect(second.status).toBe(201);
      const steps = await prisma.restoration_steps.findMany({
        where: { project_id: first.id },
        orderBy: { step_order: 'asc' },
      });
      expect(steps.map((s) => s.label)).toEqual([
        'Désarmer',
        'Sortir le mouvement',
        'Nettoyer',
      ]);
    });

    it('RG-SEC-01 la montre d’un autre utilisateur, inexistante ou mal identifiée répond 404, rien n’est écrit', async () => {
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await create(STEPS, watchId, stranger)).status).toBe(404);
      expect((await create(STEPS, 999999)).status).toBe(404);
      expect((await create(STEPS, 'abc')).status).toBe(404);
      expect(
        await prisma.restoration_projects.count({
          where: { watch_id: watchId },
        }),
      ).toBe(0);
    });
  });

  describe('POST /projects/:id/complete', () => {
    it('S11 terminer renseigne completedAt', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'in_progress',
      });

      const res = await complete(id);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id, status: 'completed' });
      expect(typeof res.body.completedAt).toBe('string');
      expect((await project(id)).completed_at).not.toBeNull();
    });

    it('RG-PRJ-06 terminer un projet déjà terminé est refusé (PROJECT_ALREADY_COMPLETED) et la date de fin ne change pas', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'in_progress',
      });
      await complete(id);
      const before = (await project(id)).completed_at;

      const res = await complete(id);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROJECT_ALREADY_COMPLETED');
      expect((await project(id)).completed_at).toEqual(before);
    });

    it('RG-SEC-01 le projet d’un autre utilisateur, inexistant ou mal identifié répond 404, rien n’est écrit', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'in_progress',
      });
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await complete(id, stranger)).status).toBe(404);
      expect((await complete(999999)).status).toBe(404);
      expect((await complete('abc')).status).toBe(404);
      expect((await project(id)).status).toBe('in_progress');
    });
  });

  describe('POST /projects/:id/reopen', () => {
    it('S28 rouvrir remet en cours et efface completedAt', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'in_progress',
      });
      await complete(id);

      const res = await reopen(id);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id,
        status: 'in_progress',
        completedAt: null,
      });
      const saved = await project(id);
      expect([saved.status, saved.completed_at]).toEqual(['in_progress', null]);
    });

    it('S28 rouvrir un projet déjà en cours est refusé (PROJECT_ALREADY_IN_PROGRESS)', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'in_progress',
      });

      const res = await reopen(id);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROJECT_ALREADY_IN_PROGRESS');
    });

    it('S28 / RG-PRJ-10 refusé si la montre est vendue (WATCH_SOLD) ; annuler la revente le permet', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'completed',
      });
      await prisma.watches.update({
        where: { id: watchId },
        data: { resale_price: 200, resale_date: new Date('2025-06-01') },
      });

      const refused = await reopen(id);
      await http()
        .delete(`/watches/${watchId}/resale`)
        .set('Authorization', authorization);
      const accepted = await reopen(id);

      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('WATCH_SOLD');
      expect(accepted.status).toBe(200);
    });

    it('S28 / RG-PRJ-09 refusé si un autre projet est en cours (PROJECT_ALREADY_IN_PROGRESS), le projet reste terminé', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'completed',
      });
      await createProject(prisma, watchId, { status: 'in_progress' });

      const res = await reopen(id);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROJECT_ALREADY_IN_PROGRESS');
      expect((await project(id)).status).toBe('completed');
    });

    it('RG-PRJ-09 deux réouvertures simultanées de projets terminés : une seule réussit, jamais 500', async () => {
      const a = await createProject(prisma, watchId, { status: 'completed' });
      const b = await createProject(prisma, watchId, { status: 'completed' });

      const results = await Promise.all([reopen(a.id), reopen(b.id)]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await inProgressCount()).toBe(1);
    });

    it('RG-SEC-01 le projet d’un autre utilisateur, inexistant ou mal identifié répond 404, rien n’est écrit', async () => {
      const { id } = await createProject(prisma, watchId, {
        status: 'completed',
      });
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await reopen(id, stranger)).status).toBe(404);
      expect((await reopen(999999)).status).toBe(404);
      expect((await reopen('abc')).status).toBe(404);
      expect((await project(id)).status).toBe('completed');
    });
  });
});
