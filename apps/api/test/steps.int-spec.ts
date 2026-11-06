import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('Étapes d’un projet : ajout, modification, suppression, réordonnancement', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;
  let projectId: number;

  const http = () => request(app.getHttpServer());
  const post = (path: string, body: unknown) => http().post(path).set('Authorization', authorization).send(body as object);
  const patch = (path: string, body: unknown) => http().patch(path).set('Authorization', authorization).send(body as object);
  const put = (path: string, body: unknown) => http().put(path).set('Authorization', authorization).send(body as object);
  const del = (path: string) => http().delete(path).set('Authorization', authorization);

  /** Crée des étapes de rang 1..n dans un projet, dans l'ordre des libellés. */
  const seedSteps = async (project: number, labels: string[]) => {
    const ids: number[] = [];
    for (const [index, label] of labels.entries()) {
      const step = await prisma.restoration_steps.create({
        data: { project_id: project, step_order: index + 1, label },
        select: { id: true },
      });
      ids.push(step.id);
    }
    return ids;
  };
  const stepsOf = (project: number) =>
    prisma.restoration_steps.findMany({ where: { project_id: project }, orderBy: [{ step_order: 'asc' }, { id: 'asc' }] });
  const ordersOf = async (project: number) => (await stepsOf(project)).map((s) => s.step_order);
  const labelsOf = async (project: number) => (await stepsOf(project)).map((s) => s.label);

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    userId = (await createUser(prisma)).id;
    authorization = `Bearer ${app.get(TokensService).signSession('access', userId)}`;
    const watch = await createWatch(prisma, userId);
    projectId = (await createProject(prisma, watch.id)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await http().post(`/projects/${projectId}/steps`).send({ label: 'X' })).status).toBe(401);
  });

  describe('POST /projects/:id/steps', () => {
    it('S13 l’étape ajoutée prend le rang suivant', async () => {
      await seedSteps(projectId, ['A', 'B']);

      const res = await post(`/projects/${projectId}/steps`, { label: 'Polir le fond' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        stepOrder: 3,
        label: 'Polir le fond',
        notes: null,
        isCompleted: false,
        completedAt: null,
        photos: [],
      });
      expect(await ordersOf(projectId)).toEqual([1, 2, 3]);
    });

    it('S13 la première étape d’un projet vide prend le rang 1', async () => {
      const res = await post(`/projects/${projectId}/steps`, { label: 'Démonter' });
      expect(res.status).toBe(201);
      expect(res.body.stepOrder).toBe(1);
    });

    it('RG-ETP-08 refuse un libellé vide, blanc ou absent', async () => {
      for (const body of [{ label: '' }, { label: '   ' }, {}, { label: null }, { label: 12 }]) {
        expect((await post(`/projects/${projectId}/steps`, body)).status).toBe(400);
      }
      expect(await stepsOf(projectId)).toHaveLength(0);
    });

    it('RG-GEN-02 refuse 256 caractères et accepte 255', async () => {
      expect((await post(`/projects/${projectId}/steps`, { label: 'a'.repeat(256) })).status).toBe(400);
      expect((await post(`/projects/${projectId}/steps`, { label: 'a'.repeat(255) })).status).toBe(201);
    });

    it('RG-ETP-09 un projet terminé reste modifiable (A5)', async () => {
      await prisma.restoration_projects.update({ where: { id: projectId }, data: { status: 'completed', completed_at: new Date() } });
      expect((await post(`/projects/${projectId}/steps`, { label: 'Retouche' })).status).toBe(201);
    });
  });

  describe('PATCH /projects/:id/steps/:stepId', () => {
    it('S12 valider une étape renseigne completedAt, dans n’importe quel ordre', async () => {
      const [first, , third] = await seedSteps(projectId, ['A', 'B', 'C']);

      const res = await patch(`/projects/${projectId}/steps/${third}`, { isCompleted: true });

      expect(res.status).toBe(200);
      expect(res.body.isCompleted).toBe(true);
      expect(new Date(res.body.completedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
      expect((await prisma.restoration_steps.findUniqueOrThrow({ where: { id: first } })).is_completed).toBe(false);
    });

    it('S12 valider une étape déjà validée garde sa date de réalisation', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      const done = new Date('2026-01-01T10:00:00Z');
      await prisma.restoration_steps.update({ where: { id: step }, data: { is_completed: true, completed_at: done } });

      const res = await patch(`/projects/${projectId}/steps/${step}`, { isCompleted: true });

      expect(res.status).toBe(200);
      expect(res.body.completedAt).toBe(done.toISOString());
    });

    it('S29 décocher efface completedAt', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      await prisma.restoration_steps.update({ where: { id: step }, data: { is_completed: true, completed_at: new Date() } });

      const res = await patch(`/projects/${projectId}/steps/${step}`, { isCompleted: false });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ isCompleted: false, completedAt: null });
    });

    it('S14 / S16 modifier libellé et note garde les photos et le statut', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      const completedAt = new Date('2026-02-01T10:00:00Z');
      await prisma.restoration_steps.update({ where: { id: step }, data: { is_completed: true, completed_at: completedAt } });
      await prisma.step_pics.create({ data: { restoration_step_id: step, url: 'a.jpg' } });

      const res = await patch(`/projects/${projectId}/steps/${step}`, { label: 'Nettoyer', notes: 'Huile sèche' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ label: 'Nettoyer', notes: 'Huile sèche', isCompleted: true, completedAt: completedAt.toISOString() });
      expect(res.body.photos).toHaveLength(1);
    });

    it('S16 une note à null l’efface', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      await prisma.restoration_steps.update({ where: { id: step }, data: { notes: 'à effacer' } });

      const res = await patch(`/projects/${projectId}/steps/${step}`, { notes: null });

      expect(res.status).toBe(200);
      expect(res.body.notes).toBeNull();
    });

    it('RG-ETP-08 refuse un libellé vide, 256 caractères ou null à la modification', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      for (const body of [{ label: '' }, { label: 'a'.repeat(256) }, { label: null }, { isCompleted: 'oui' }, { notes: 5 }, { stepOrder: 2 }]) {
        expect((await patch(`/projects/${projectId}/steps/${step}`, body)).status).toBe(400);
      }
      expect(await labelsOf(projectId)).toEqual(['A']);
    });

    it('RG-GEN-02 une note n’a pas de limite de longueur', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      const res = await patch(`/projects/${projectId}/steps/${step}`, { notes: 'n'.repeat(5000) });
      expect(res.status).toBe(200);
    });

    it('S14 un corps vide laisse l’étape inchangée', async () => {
      const [step] = await seedSteps(projectId, ['A']);
      const res = await patch(`/projects/${projectId}/steps/${step}`, {});
      expect(res.status).toBe(200);
      expect(res.body.label).toBe('A');
    });
  });

  describe('DELETE /projects/:id/steps/:stepId', () => {
    it('S30 supprimer une étape renumérote 1..n sans trou', async () => {
      const [, second] = await seedSteps(projectId, ['A', 'B', 'C', 'D']);

      const res = await del(`/projects/${projectId}/steps/${second}`);

      expect(res.status).toBe(204);
      expect(await labelsOf(projectId)).toEqual(['A', 'C', 'D']);
      expect(await ordersOf(projectId)).toEqual([1, 2, 3]);
    });

    it('S30 ses photos disparaissent', async () => {
      const [step] = await seedSteps(projectId, ['A', 'B']);
      await prisma.step_pics.create({ data: { restoration_step_id: step, url: 'a.jpg' } });

      await del(`/projects/${projectId}/steps/${step}`);

      expect(await prisma.step_pics.count()).toBe(0);
    });

    it('S30 ne touche pas aux étapes des autres projets', async () => {
      const [step] = await seedSteps(projectId, ['A', 'B']);
      const otherWatch = await createWatch(prisma, userId);
      const other = (await createProject(prisma, otherWatch.id)).id;
      await seedSteps(other, ['X', 'Y', 'Z']);

      await del(`/projects/${projectId}/steps/${step}`);

      expect(await labelsOf(other)).toEqual(['X', 'Y', 'Z']);
      expect(await ordersOf(other)).toEqual([1, 2, 3]);
    });
  });

  describe('PUT /projects/:id/steps/order', () => {
    it('S15 réordonner renumérote sans trou ni doublon et chaque étape garde note, photos et statut', async () => {
      const [a, b, c] = await seedSteps(projectId, ['A', 'B', 'C']);
      await prisma.restoration_steps.update({ where: { id: a }, data: { notes: 'note A', is_completed: true, completed_at: new Date() } });
      await prisma.step_pics.create({ data: { restoration_step_id: a, url: 'a.jpg' } });

      const res = await put(`/projects/${projectId}/steps/order`, { stepIds: [c, a, b] });

      expect(res.status).toBe(200);
      expect(res.body.map((s: { label: string; stepOrder: number }) => [s.label, s.stepOrder])).toEqual([
        ['C', 1],
        ['A', 2],
        ['B', 3],
      ]);
      expect(res.body[1]).toMatchObject({ id: a, notes: 'note A', isCompleted: true });
      expect(res.body[1].photos).toHaveLength(1);
      expect(await labelsOf(projectId)).toEqual(['C', 'A', 'B']);
      expect(await ordersOf(projectId)).toEqual([1, 2, 3]);
    });

    it('RG-ETP-12 la liste doit contenir exactement les étapes du projet', async () => {
      const [a, b, c] = await seedSteps(projectId, ['A', 'B', 'C']);
      const otherWatch = await createWatch(prisma, userId);
      const other = (await createProject(prisma, otherWatch.id)).id;
      const [foreign] = await seedSteps(other, ['X']);

      const invalid: Record<string, unknown> = {
        'identifiant en double': { stepIds: [a, a, b] },
        'identifiant manquant': { stepIds: [a, b] },
        'identifiant en trop': { stepIds: [a, b, c, c + 1000] },
        "identifiant d'un autre projet": { stepIds: [a, b, foreign] },
        'liste vide': { stepIds: [] },
        'pas une liste': { stepIds: 'a,b,c' },
        'identifiants non entiers': { stepIds: [a, b, 'c'] },
        'liste absente': {},
      };
      for (const [cas, body] of Object.entries(invalid)) {
        const res = await put(`/projects/${projectId}/steps/order`, body);
        expect(res.status, cas).toBe(400);
      }
      expect(await labelsOf(projectId)).toEqual(['A', 'B', 'C']);
      expect(await ordersOf(projectId)).toEqual([1, 2, 3]);
      expect(await ordersOf(other)).toEqual([1]);
    });

    it('RG-ETP-12 un projet sans étape accepte une liste vide', async () => {
      const res = await put(`/projects/${projectId}/steps/order`, { stepIds: [] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('S15 un échec en cours d’écriture conserve l’ordre précédent', async () => {
      const [a, b, c] = await seedSteps(projectId, ['A', 'B', 'C']);
      // Un déclencheur refuse le rang 3 : l'écriture échoue après avoir déjà déplacé d'autres lignes ou non, peu importe,
      // le résultat doit être « rien n'a changé ».
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION test_refuse_rang_3() RETURNS trigger AS $$
        BEGIN
          IF NEW.step_order = 3 AND OLD.step_order <> 3 THEN RAISE EXCEPTION 'rang 3 refusé'; END IF;
          RETURN NEW;
        END $$ LANGUAGE plpgsql`);
      await prisma.$executeRawUnsafe(
        'CREATE TRIGGER test_refuse_rang_3 BEFORE UPDATE ON restoration_steps FOR EACH ROW EXECUTE FUNCTION test_refuse_rang_3()',
      );
      try {
        const res = await put(`/projects/${projectId}/steps/order`, { stepIds: [c, b, a] });
        expect(res.status).toBe(500);
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER test_refuse_rang_3 ON restoration_steps');
        await prisma.$executeRawUnsafe('DROP FUNCTION test_refuse_rang_3()');
      }

      expect(await labelsOf(projectId)).toEqual(['A', 'B', 'C']);
      expect(await ordersOf(projectId)).toEqual([1, 2, 3]);
    });
  });

  describe('RG-SEC-01 étape ou projet d’un autre utilisateur répond 404', () => {
    it('pour les quatre routes', async () => {
      const intruder = await createUser(prisma);
      const watch = await createWatch(prisma, intruder.id);
      const foreignProject = (await createProject(prisma, watch.id)).id;
      const [foreignStep] = await seedSteps(foreignProject, ['Secret']);
      const [ownStep] = await seedSteps(projectId, ['A']);

      const responses = [
        await post(`/projects/${foreignProject}/steps`, { label: 'X' }),
        await patch(`/projects/${foreignProject}/steps/${foreignStep}`, { label: 'X' }),
        await del(`/projects/${foreignProject}/steps/${foreignStep}`),
        await put(`/projects/${foreignProject}/steps/order`, { stepIds: [foreignStep] }),
        // Mon projet, mais l'étape d'un autre projet.
        await patch(`/projects/${projectId}/steps/${foreignStep}`, { label: 'X' }),
        await del(`/projects/${projectId}/steps/${foreignStep}`),
        // Projet inexistant et identifiant mal formé.
        await post('/projects/999999/steps', { label: 'X' }),
        await patch(`/projects/abc/steps/${ownStep}`, { label: 'X' }),
        await patch(`/projects/${projectId}/steps/abc`, { label: 'X' }),
      ];

      expect(responses.map((r) => r.status)).toEqual(Array(9).fill(404));
      expect(await labelsOf(foreignProject)).toEqual(['Secret']);
    });
  });
});
