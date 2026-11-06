import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const VALID = { measuredAt: '2025-06-01T10:00:00Z', rateSecondsPerDay: 12.5, beatErrorMs: 0.4, amplitudeDegrees: 268 };

describe('Mesures de performance : ajout, modification, suppression', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorization: string;
  let watchId: number;
  let projectId: number;

  const http = () => request(app.getHttpServer());
  const post = (body: unknown, project = projectId, auth = authorization) =>
    http().post(`/projects/${project}/measurements`).set('Authorization', auth).send(body as object);
  const patch = (id: number, body: unknown, project = projectId, auth = authorization) =>
    http().patch(`/projects/${project}/measurements/${id}`).set('Authorization', auth).send(body as object);
  const del = (id: number, project = projectId, auth = authorization) =>
    http().delete(`/projects/${project}/measurements/${id}`).set('Authorization', auth);
  const tokenFor = (userId: number) => `Bearer ${app.get(TokensService).signSession('access', userId)}`;
  const count = () => prisma.performance_measurements.count();

  const detail = async () => {
    const res = await http().get(`/watches/${watchId}`).set('Authorization', authorization);
    return res.body.projects[0].measurements as { id: number; measuredAt: string }[];
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    const userId = (await createUser(prisma)).id;
    authorization = tokenFor(userId);
    watchId = (await createWatch(prisma, userId)).id;
    projectId = (await createProject(prisma, watchId)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await http().post(`/projects/${projectId}/measurements`).send(VALID)).status).toBe(401);
  });

  describe('POST /projects/:id/measurements', () => {
    it('S19 enregistre une mesure avec position facultative', async () => {
      const withPosition = await post({ ...VALID, watchPosition: 'Cadran haut' });
      const without = await post(VALID);

      expect(withPosition.status).toBe(201);
      expect(withPosition.body).toEqual({
        id: expect.any(Number),
        measuredAt: '2025-06-01T10:00:00.000Z',
        rateSecondsPerDay: '12.50',
        beatErrorMs: '0.40',
        amplitudeDegrees: '268.00',
        watchPosition: 'Cadran haut',
      });
      expect(without.status).toBe(201);
      expect(without.body.watchPosition).toBeNull();
      expect(await count()).toBe(2);
    });

    it('RG-PER-02 refuse sans beat error, sans marche, sans amplitude ou sans date', async () => {
      for (const field of ['beatErrorMs', 'rateSecondsPerDay', 'amplitudeDegrees', 'measuredAt']) {
        const { [field as keyof typeof VALID]: _omitted, ...body } = VALID;
        expect((await post(body)).status, field).toBe(400);
        expect((await post({ ...VALID, [field]: null })).status, `${field} null`).toBe(400);
      }
      expect(await count()).toBe(0);
    });

    it('RG-PER-03 refuse un beat error négatif', async () => {
      expect((await post({ ...VALID, beatErrorMs: -0.1 })).status).toBe(400);
      expect((await post({ ...VALID, beatErrorMs: 0 })).status).toBe(201);
    });

    it('RG-PER-03 refuse une amplitude négative', async () => {
      expect((await post({ ...VALID, amplitudeDegrees: -1 })).status).toBe(400);
      expect((await post({ ...VALID, amplitudeDegrees: 0 })).status).toBe(201);
    });

    it('S19 accepte une marche négative (la montre retarde)', async () => {
      const res = await post({ ...VALID, rateSecondsPerDay: -14.25 });

      expect(res.status).toBe(201);
      expect(res.body.rateSecondsPerDay).toBe('-14.25');
    });

    it('refuse une marche de 1000, de 12.345 ou "abc" (400, jamais 500)', async () => {
      for (const rateSecondsPerDay of [1000, -1000, 12.345, 'abc', '', true, [], {}, 1e308, 1e-7]) {
        expect((await post({ ...VALID, rateSecondsPerDay })).status, JSON.stringify(rateSecondsPerDay)).toBe(400);
      }
      expect(await count()).toBe(0);
    });

    it('accepte les bornes de NUMERIC(5,2) : ±999.99', async () => {
      expect((await post({ ...VALID, rateSecondsPerDay: 999.99, beatErrorMs: 999.99, amplitudeDegrees: 999.99 })).status).toBe(201);
      expect((await post({ ...VALID, rateSecondsPerDay: -999.99 })).status).toBe(201);
      expect((await post({ ...VALID, beatErrorMs: 1000 })).status).toBe(400);
      expect((await post({ ...VALID, amplitudeDegrees: 1000 })).status).toBe(400);
    });

    it('accepte un nombre écrit en texte ("12.5"), comme les prix', async () => {
      const res = await post({ ...VALID, rateSecondsPerDay: '-12.5' });

      expect(res.status).toBe(201);
      expect(res.body.rateSecondsPerDay).toBe('-12.50');
    });

    it('S19 refuse une date de mesure future, invalide ou absente', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString();
      for (const measuredAt of [tomorrow, '2025-02-30', 'hier', 12, '']) {
        expect((await post({ ...VALID, measuredAt })).status, String(measuredAt)).toBe(400);
      }
      expect(await count()).toBe(0);
    });

    it('accepte une date seule (AAAA-MM-JJ) et aujourd’hui', async () => {
      expect((await post({ ...VALID, measuredAt: '2025-06-01' })).status).toBe(201);
      expect((await post({ ...VALID, measuredAt: new Date().toISOString() })).status).toBe(201);
    });

    it('refuse une position de plus de 50 caractères, vide de sens ou avec un caractère NUL', async () => {
      expect((await post({ ...VALID, watchPosition: 'a'.repeat(51) })).status).toBe(400);
      expect((await post({ ...VALID, watchPosition: 'a'.repeat(50) })).status).toBe(201);
      expect((await post({ ...VALID, watchPosition: 'a\u0000b' })).status).toBe(400);
      expect((await post({ ...VALID, watchPosition: 12 })).status).toBe(400);
    });

    it('refuse un champ inconnu (le projet ne se choisit pas dans le corps)', async () => {
      expect((await post({ ...VALID, projectId: 999 })).status).toBe(400);
    });

    it('RG-PER-04 les mesures sont renvoyées dans l’ordre chronologique, quel que soit l’ordre de saisie', async () => {
      await post({ ...VALID, measuredAt: '2025-06-03T10:00:00Z' });
      await post({ ...VALID, measuredAt: '2025-06-01T10:00:00Z' });
      await post({ ...VALID, measuredAt: '2025-06-02T10:00:00Z' });

      expect((await detail()).map((m) => m.measuredAt.slice(0, 10))).toEqual(['2025-06-01', '2025-06-02', '2025-06-03']);
    });

    it('RG-SEC-01 le projet d’un autre utilisateur répond 404, rien n’est écrit', async () => {
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await post(VALID, projectId, stranger)).status).toBe(404);
      expect((await post(VALID, 999999)).status).toBe(404);
      expect(await count()).toBe(0);
    });
  });

  describe('PATCH /projects/:id/measurements/:measurementId', () => {
    const seed = async () => (await post({ ...VALID, watchPosition: 'Cadran haut' })).body.id as number;

    it('S33 modifier change les champs envoyés et laisse les autres', async () => {
      const id = await seed();

      const res = await patch(id, { rateSecondsPerDay: -3.5, watchPosition: null });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id, rateSecondsPerDay: '-3.50', beatErrorMs: '0.40', amplitudeDegrees: '268.00', watchPosition: null });
    });

    it('S33 modifier applique les mêmes contrôles (400, mesure inchangée)', async () => {
      const id = await seed();
      const invalid = [
        { beatErrorMs: -1 },
        { amplitudeDegrees: -1 },
        { rateSecondsPerDay: 1000 },
        { rateSecondsPerDay: 12.345 },
        { rateSecondsPerDay: 'abc' },
        { measuredAt: new Date(Date.now() + 24 * 3600_000).toISOString() },
        { watchPosition: 'a'.repeat(51) },
        // null est refusé pour les champs obligatoires (la base répondrait 500) : seule la position peut être effacée.
        { beatErrorMs: null },
        { rateSecondsPerDay: null },
        { amplitudeDegrees: null },
        { measuredAt: null },
        { projectId: 2 },
      ];

      for (const body of invalid) expect((await patch(id, body)).status, JSON.stringify(body)).toBe(400);

      const row = await prisma.performance_measurements.findUniqueOrThrow({ where: { id } });
      expect(row.rate_seconds_per_day.toFixed(2)).toBe('12.50');
      expect(row.beat_error_ms.toFixed(2)).toBe('0.40');
    });

    it('un corps vide ne change rien et répond 200', async () => {
      const id = await seed();
      expect((await patch(id, {})).status).toBe(200);
    });

    it('une mesure inexistante, ou d’un autre projet du même utilisateur, répond 404', async () => {
      const id = await seed();
      const otherProject = (await createProject(prisma, (await createWatch(prisma, (await prisma.users.findFirstOrThrow()).id)).id)).id;

      expect((await patch(999999, { beatErrorMs: 1 })).status).toBe(404);
      expect((await patch(id, { beatErrorMs: 1 }, otherProject)).status).toBe(404);
    });

    it('RG-SEC-01 la mesure d’un autre utilisateur répond 404 et reste inchangée', async () => {
      const id = await seed();
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await patch(id, { beatErrorMs: 1 }, projectId, stranger)).status).toBe(404);
      expect((await prisma.performance_measurements.findUniqueOrThrow({ where: { id } })).beat_error_ms.toFixed(2)).toBe('0.40');
    });
  });

  describe('DELETE /projects/:id/measurements/:measurementId', () => {
    it('S33 supprimer retire la mesure', async () => {
      const keep = (await post(VALID)).body.id as number;
      const gone = (await post(VALID)).body.id as number;

      const res = await del(gone);

      expect(res.status).toBe(204);
      expect((await detail()).map((m) => m.id)).toEqual([keep]);
    });

    it('une mesure inexistante répond 404', async () => {
      expect((await del(999999)).status).toBe(404);
    });

    it('RG-SEC-01 la mesure d’un autre utilisateur répond 404 et n’est pas supprimée', async () => {
      const id = (await post(VALID)).body.id as number;
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await del(id, projectId, stranger)).status).toBe(404);
      expect(await count()).toBe(1);
    });
  });
});
