import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const VALID = { label: 'Couronne', amount: 12, expenseDate: '2025-06-01' };

describe('Coûts d’un projet : ajout, modification, suppression', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorization: string;
  let userId: number;
  let watchId: number;
  let projectId: number;

  const http = () => request(app.getHttpServer());
  const post = (body: unknown, project = projectId, auth = authorization) =>
    http().post(`/projects/${project}/expenses`).set('Authorization', auth).send(body as object);
  const patch = (id: number, body: unknown, project = projectId, auth = authorization) =>
    http().patch(`/projects/${project}/expenses/${id}`).set('Authorization', auth).send(body as object);
  const del = (id: number, project = projectId, auth = authorization) =>
    http().delete(`/projects/${project}/expenses/${id}`).set('Authorization', auth);
  const tokenFor = (id: number) => `Bearer ${app.get(TokensService).signSession('access', id)}`;
  const count = () => prisma.expenses.count();
  const watchDetail = async () => (await http().get(`/watches/${watchId}`).set('Authorization', authorization)).body;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    userId = (await createUser(prisma)).id;
    authorization = tokenFor(userId);
    watchId = (await createWatch(prisma, userId)).id;
    projectId = (await createProject(prisma, watchId)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await http().post(`/projects/${projectId}/expenses`).send(VALID)).status).toBe(401);
  });

  describe('POST /projects/:id/expenses', () => {
    it('S21 enregistre « Couronne », 12 €', async () => {
      const res = await post(VALID);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(Number), label: 'Couronne', amount: '12.00', expenseDate: '2025-06-01' });
      expect(await count()).toBe(1);
    });

    it('RG-FIN-02 refuse un montant négatif et accepte 0', async () => {
      expect((await post({ ...VALID, amount: -0.01 })).status).toBe(400);
      expect((await post({ ...VALID, amount: 0 })).status).toBe(201);
      expect(await count()).toBe(1);
    });

    it('refuse 100000000, 12.345 ou "abc" (400, jamais 500) et accepte la borne 99999999.99', async () => {
      for (const amount of [100000000, 12.345, 'abc', '', true, [], {}, null, 1e308, 1e-7]) {
        expect((await post({ ...VALID, amount })).status, JSON.stringify(amount)).toBe(400);
      }
      expect((await post({ ...VALID, amount: 99999999.99 })).status).toBe(201);
      expect(await count()).toBe(1);
    });

    it('accepte un montant écrit en texte ("12.5"), comme les prix', async () => {
      const res = await post({ ...VALID, amount: '12.5' });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe('12.50');
    });

    it('RG-FIN-01 refuse un coût sans libellé, sans montant ou sans date', async () => {
      for (const field of ['label', 'amount', 'expenseDate']) {
        const { [field as keyof typeof VALID]: _omitted, ...body } = VALID;
        expect((await post(body)).status, field).toBe(400);
      }
      expect(await count()).toBe(0);
    });

    it('S21 refuse une date future ou invalide, accepte aujourd’hui', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 10);
      for (const expenseDate of [tomorrow, '2025-02-30', 'hier', 12, '', '2025-06-01T10:00:00Z']) {
        expect((await post({ ...VALID, expenseDate })).status, String(expenseDate)).toBe(400);
      }
      expect((await post({ ...VALID, expenseDate: new Date().toISOString().slice(0, 10) })).status).toBe(201);
    });

    it('RG-GEN-02 refuse un libellé de 256 caractères, vide ou blanc, accepte 255', async () => {
      expect((await post({ ...VALID, label: 'a'.repeat(256) })).status).toBe(400);
      for (const label of ['', '   ', null, 12, 'a\u0000b']) {
        expect((await post({ ...VALID, label })).status, JSON.stringify(label)).toBe(400);
      }
      expect((await post({ ...VALID, label: 'a'.repeat(255) })).status).toBe(201);
    });

    it('le libellé est enregistré sans espaces autour', async () => {
      expect((await post({ ...VALID, label: '  Verre minéral  ' })).body.label).toBe('Verre minéral');
    });

    it('refuse un champ inconnu (le projet ne se choisit pas dans le corps)', async () => {
      expect((await post({ ...VALID, projectId: 999 })).status).toBe(400);
    });

    it('RG-SEC-01 le projet d’un autre utilisateur répond 404, rien n’est écrit', async () => {
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await post(VALID, projectId, stranger)).status).toBe(404);
      expect((await post(VALID, 999999)).status).toBe(404);
      expect(await count()).toBe(0);
    });
  });

  describe('PATCH /projects/:id/expenses/:expenseId', () => {
    const seed = async () => (await post(VALID)).body.id as number;

    it('S32 modifier change les champs envoyés et laisse les autres', async () => {
      const id = await seed();

      const res = await patch(id, { amount: 20.5 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id, label: 'Couronne', amount: '20.50', expenseDate: '2025-06-01' });
    });

    it('S32 modifier applique les mêmes contrôles (400, coût inchangé)', async () => {
      const id = await seed();
      const invalid = [
        { amount: -1 },
        { amount: 100000000 },
        { amount: 12.345 },
        { amount: 'abc' },
        { label: '' },
        { label: 'a'.repeat(256) },
        { expenseDate: new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 10) },
        // null est refusé (la base répondrait 500) : aucun champ du coût n'est facultatif.
        { amount: null },
        { label: null },
        { expenseDate: null },
        { projectId: 2 },
      ];

      for (const body of invalid) expect((await patch(id, body)).status, JSON.stringify(body)).toBe(400);

      const row = await prisma.expenses.findUniqueOrThrow({ where: { id } });
      expect([row.label, row.amount.toFixed(2)]).toEqual(['Couronne', '12.00']);
    });

    it('un corps vide ne change rien et répond 200', async () => {
      const id = await seed();
      expect((await patch(id, {})).status).toBe(200);
    });

    it('un coût inexistant, ou d’un autre projet du même utilisateur, répond 404', async () => {
      const id = await seed();
      const otherProject = (await createProject(prisma, (await createWatch(prisma, userId)).id)).id;

      expect((await patch(999999, { amount: 1 })).status).toBe(404);
      expect((await patch(id, { amount: 1 }, otherProject)).status).toBe(404);
    });

    it('RG-SEC-01 le coût d’un autre utilisateur répond 404 et reste inchangé', async () => {
      const id = await seed();
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await patch(id, { amount: 1 }, projectId, stranger)).status).toBe(404);
      expect((await prisma.expenses.findUniqueOrThrow({ where: { id } })).amount.toFixed(2)).toBe('12.00');
    });
  });

  describe('DELETE /projects/:id/expenses/:expenseId', () => {
    it('une suppression retire le coût', async () => {
      const keep = (await post(VALID)).body.id as number;
      const gone = (await post({ ...VALID, label: 'Joint' })).body.id as number;

      expect((await del(gone)).status).toBe(204);

      expect((await watchDetail()).projects[0].expenses.map((e: { id: number }) => e.id)).toEqual([keep]);
    });

    it('un coût inexistant répond 404', async () => {
      expect((await del(999999)).status).toBe(404);
    });

    it('RG-SEC-01 le coût d’un autre utilisateur répond 404 et n’est pas supprimé', async () => {
      const id = (await post(VALID)).body.id as number;
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await del(id, projectId, stranger)).status).toBe(404);
      expect(await count()).toBe(1);
    });
  });

  describe('marge recalculée à la lecture (RG-FIN-06, RG-FIN-11)', () => {
    beforeEach(async () => {
      // Montre vendue : achat 80 €, revente 200 € ; son projet est terminé (un coût se modifie quand même, A5).
      await prisma.watches.update({
        where: { id: watchId },
        data: { purchase_price: 80, resale_price: 200, resale_date: new Date('2025-07-01') },
      });
      await prisma.restoration_projects.update({ where: { id: projectId }, data: { status: 'completed', completed_at: new Date() } });
    });

    it('S32 modifier puis supprimer un coût recalcule la marge de la montre', async () => {
      expect((await watchDetail()).margin).toBe('120.00');

      const id = (await post(VALID)).body.id as number;
      expect((await watchDetail()).margin).toBe('108.00');

      await patch(id, { amount: 20 });
      expect((await watchDetail()).margin).toBe('100.00');

      await del(id);
      expect((await watchDetail()).margin).toBe('120.00');
    });
  });
});
