import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const VALID = { price: 200, date: '2025-06-01' };

describe('Revente d’une montre : saisie, correction, annulation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;
  let watchId: number;

  const http = () => request(app.getHttpServer());
  const put = (body: unknown, id: number | string = watchId, auth = authorization) =>
    http().put(`/watches/${id}/resale`).set('Authorization', auth).send(body as object);
  const del = (id: number | string = watchId, auth = authorization) => http().delete(`/watches/${id}/resale`).set('Authorization', auth);
  const tokenFor = (id: number) => `Bearer ${app.get(TokensService).signSession('access', id)}`;
  const row = () => prisma.watches.findUniqueOrThrow({ where: { id: watchId } });
  const dashboardStatus = async () => {
    const res = await http().get('/watches').set('Authorization', authorization);
    return res.body.items.find((w: { id: number }) => w.id === watchId).status as string;
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    userId = (await createUser(prisma)).id;
    authorization = tokenFor(userId);
    // Achat à 80 € le 1er mars 2025, projet terminé : la montre peut être vendue.
    watchId = (await createWatch(prisma, userId, { purchase_price: 80, purchase_date: new Date('2025-03-01') })).id;
    await createProject(prisma, watchId, { status: 'completed' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await http().put(`/watches/${watchId}/resale`).send(VALID)).status).toBe(401);
    expect((await http().delete(`/watches/${watchId}/resale`)).status).toBe(401);
  });

  describe('PUT /watches/:id/resale', () => {
    it('S22 enregistre la revente et la montre est vendue, avec sa marge', async () => {
      const res = await put(VALID);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: watchId, resalePrice: '200.00', resaleDate: '2025-06-01', margin: '120.00' });
      expect(await dashboardStatus()).toBe('sold');
    });

    it('S22 / RG-FIN-05 refusée (409) tant qu’un projet est en cours, rien n’est écrit', async () => {
      await prisma.restoration_projects.updateMany({ where: { watch_id: watchId }, data: { status: 'completed' } });
      await createProject(prisma, watchId, { status: 'in_progress' });

      const res = await put(VALID);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROJECT_IN_PROGRESS');
      expect((await row()).resale_date).toBeNull();
    });

    it('RG-FIN-05 le refus vaut aussi pour la correction d’une montre déjà vendue', async () => {
      await put(VALID);
      await prisma.restoration_projects.updateMany({ where: { watch_id: watchId }, data: { status: 'in_progress' } });

      expect((await put({ price: 300, date: '2025-06-02' })).status).toBe(409);
      expect((await row()).resale_price?.toFixed(2)).toBe('200.00');
    });

    it('S22 une montre sans projet peut être vendue', async () => {
      await prisma.restoration_projects.deleteMany({ where: { watch_id: watchId } });

      expect((await put(VALID)).status).toBe(200);
    });

    it('RG-FIN-10 refuse une date antérieure à l’achat, accepte le jour même', async () => {
      const before = await put({ price: 200, date: '2025-02-28' });

      expect(before.status).toBe(400);
      expect(before.body.code).toBe('RESALE_BEFORE_PURCHASE');
      expect((await row()).resale_date).toBeNull();
      expect((await put({ price: 200, date: '2025-03-01' })).status).toBe(200);
    });

    it('RG-FIN-10 accepte n’importe quelle date passée si la date d’achat est inconnue', async () => {
      const unknown = (await createWatch(prisma, userId)).id;

      expect((await put({ price: 50, date: '2020-01-01' }, unknown)).status).toBe(200);
    });

    it('S22 refuse une date future, invalide ou absente', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 10);
      for (const date of [tomorrow, '2025-02-30', 'hier', 12, '', null, '2025-06-01T10:00:00Z']) {
        expect((await put({ price: 200, date })).status, String(date)).toBe(400);
      }
      expect((await put({ price: 200 })).status).toBe(400);
      expect((await row()).resale_date).toBeNull();
    });

    it('RG-FIN-03 le prix et la date vont ensemble : l’un sans l’autre est refusé', async () => {
      expect((await put({ date: '2025-06-01' })).status).toBe(400);
      expect((await put({ price: 200, date: null })).status).toBe(400);
      expect((await put({})).status).toBe(400);
      expect((await row()).resale_price).toBeNull();
    });

    it('RG-FIN-04 refuse un prix négatif, 100000000, 12.345 ou "abc" ; accepte 0 et 99999999.99', async () => {
      for (const price of [-1, 100000000, 12.345, 'abc', '', true, [], {}, null, 1e308]) {
        expect((await put({ price, date: '2025-06-01' })).status, JSON.stringify(price)).toBe(400);
      }
      expect((await put({ price: 0, date: '2025-06-01' })).status).toBe(200);
      expect((await put({ price: 99999999.99, date: '2025-06-01' })).status).toBe(200);
    });

    it('accepte un prix écrit en texte ("150.5"), comme les autres montants', async () => {
      const res = await put({ price: '150.5', date: '2025-06-01' });

      expect(res.status).toBe(200);
      expect(res.body.resalePrice).toBe('150.50');
    });

    it('refuse un champ inconnu', async () => {
      expect((await put({ ...VALID, margin: 999 })).status).toBe(400);
    });

    it('S31 corriger la revente d’une montre vendue enregistre prix et date ensemble', async () => {
      await put(VALID);

      const res = await put({ price: 150, date: '2025-06-15' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ resalePrice: '150.00', resaleDate: '2025-06-15', margin: '70.00' });
      const saved = await row();
      expect([saved.resale_price?.toFixed(2), saved.resale_date?.toISOString().slice(0, 10)]).toEqual(['150.00', '2025-06-15']);
    });

    it('deux saisies simultanées répondent 200 et laissent une revente cohérente (jamais 500)', async () => {
      const results = await Promise.all([put({ price: 100, date: '2025-06-01' }), put({ price: 110, date: '2025-06-02' })]);

      expect(results.map((r) => r.status)).toEqual([200, 200]);
      const saved = await row();
      // Les deux champs viennent de la même saisie : jamais le prix de l'une avec la date de l'autre.
      expect(['100.00|2025-06-01', '110.00|2025-06-02']).toContain(`${saved.resale_price?.toFixed(2)}|${saved.resale_date?.toISOString().slice(0, 10)}`);
    });

    it('RG-SEC-01 la montre d’un autre utilisateur, inexistante ou mal identifiée répond 404, rien n’est écrit', async () => {
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await put(VALID, watchId, stranger)).status).toBe(404);
      expect((await put(VALID, 999999)).status).toBe(404);
      expect((await put(VALID, 'abc')).status).toBe(404);
      expect((await row()).resale_date).toBeNull();
    });
  });

  describe('DELETE /watches/:id/resale', () => {
    it('S31 annuler remet la montre en non vendue, sans marge', async () => {
      await put(VALID);

      const res = await del();

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: watchId, resalePrice: null, resaleDate: null, margin: null });
      const saved = await row();
      expect([saved.resale_price, saved.resale_date]).toEqual([null, null]);
      expect(await dashboardStatus()).toBe('completed');
    });

    it('S31 une montre dont la revente est annulée peut de nouveau être vendue, et reçoit un projet en base', async () => {
      await put(VALID);
      await del();

      // Un projet en cours est possible de nouveau : la route d’ouverture arrive en tâche 28 (RG-PRJ-05).
      await createProject(prisma, watchId, { status: 'in_progress' });
      expect(await dashboardStatus()).toBe('in_progress');
    });

    it('annuler une revente inexistante ne change rien et répond 200', async () => {
      const res = await del();

      expect(res.status).toBe(200);
      expect(res.body.resaleDate).toBeNull();
    });

    it('RG-SEC-01 la montre d’un autre utilisateur ou inexistante répond 404, la revente est conservée', async () => {
      await put(VALID);
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await del(watchId, stranger)).status).toBe(404);
      expect((await del(999999)).status).toBe(404);
      expect((await row()).resale_date).not.toBeNull();
    });
  });
});
