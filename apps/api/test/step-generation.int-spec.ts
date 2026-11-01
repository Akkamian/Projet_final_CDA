import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { StepGenerationService } from '../src/step-generation/step-generation.service.js';
import type { GeneratedStep } from '../src/step-generation/order-steps.js';
import { TokensService } from '../src/auth/tokens.service.js';
import { createUser, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('référentiel et aperçu des étapes', () => {
  let app: INestApplication;
  let prisma: Awaited<ReturnType<typeof createTestApp>>['prisma'];

  let authorization: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    // Toutes ces routes exigent une session (RG-SEC-03).
    await resetUserData(prisma);
    const user = await createUser(prisma);
    authorization = `Bearer ${app.get(TokensService).signSession('access', user.id)}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', authorization);
  const preview = (movementCode: string, complicationCodes = '') =>
    get('/step-previews').query({ movementCode, complicationCodes });
  const labels = (steps: GeneratedStep[]) => steps.map((s) => s.label);

  describe('GET /movement-types et /complications', () => {
    it('S5 liste les deux types de mouvement', async () => {
      const res = await get('/movement-types');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          { movementCode: 'manual', label: 'Mécanique à remontage manuel' },
          { movementCode: 'automatic', label: 'Mécanique automatique' },
        ]),
      );
      expect(res.body).toHaveLength(2);
    });

    it('S5 liste les cinq complications', async () => {
      const res = await get('/complications');
      expect(res.status).toBe(200);
      expect(
        res.body
          .map((c: { complicationCode: string }) => c.complicationCode)
          .sort(),
      ).toEqual([
        'chronograph',
        'date',
        'day_date',
        'power_reserve',
        'small_seconds',
      ]);
    });

    it('RG-ETP-03 aucune route d’écriture sur le référentiel', async () => {
      const res = await request(app.getHttpServer())
        .post('/complications')
        .set('Authorization', authorization)
        .send({ label: 'Intrus' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /step-previews', () => {
    it('S6 manuel sans complication donne les 22 étapes de base dans l’ordre', async () => {
      const res = await preview('manual');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(22);
      const orders = res.body.map((s: GeneratedStep) => s.stepOrder);
      expect(orders).toEqual([...orders].sort((a: number, b: number) => a - b));
      expect(res.body[0].label).toBe('Désarmer le ressort de barillet');
      expect(res.body.at(-1).label).toBe('Emboîter et tester');
    });

    it('S6 automatique ajoute la dépose et la pose du rotor (24 étapes)', async () => {
      const res = await preview('automatic');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(24);
      expect(labels(res.body)).toEqual(
        expect.arrayContaining([
          'Déposer le rotor et le module automatique',
          'Remonter le module automatique et le rotor',
        ]),
      );
    });

    it('S7 manuel + chronographe + date donne 30 étapes', async () => {
      const res = await preview('manual', 'chronograph,date');
      expect(res.body).toHaveLength(30);
    });

    it('S7 « Déposer les aiguilles chrono » (350) est entre « Déposer les aiguilles » (300) et « Déposer le cadran » (400)', async () => {
      const res = await preview('manual', 'chronograph,date');
      const names = labels(res.body);
      const hands = names.indexOf('Déposer les aiguilles');
      const chronoHands = names.indexOf('Déposer les aiguilles chrono');
      const dial = names.indexOf('Déposer le cadran');
      expect(hands).toBeGreaterThanOrEqual(0);
      expect(chronoHands).toBe(hands + 1);
      expect(dial).toBe(chronoHands + 1);
    });

    it('RG-ETP-05 les étapes de complication portent le nom de la complication, celles de base null', async () => {
      const res = await preview('manual', 'chronograph');
      const chrono = res.body.find(
        (s: GeneratedStep) => s.label === 'Déposer les aiguilles chrono',
      );
      expect(chrono).toMatchObject({
        stepOrder: 350,
        complicationCode: 'chronograph',
        complicationLabel: 'Chronographe',
      });
      const base = res.body.find(
        (s: GeneratedStep) => s.label === 'Déposer les aiguilles',
      );
      expect(base).toMatchObject({
        complicationCode: null,
        complicationLabel: null,
      });
    });

    it('RG-ETP-04 à rang égal entre date et jour/date, « date » passe avant « day_date »', async () => {
      const res = await preview('manual', 'day_date,date');
      const names = labels(res.body);
      expect(names.indexOf('Déposer le module calendrier')).toBeLessThan(
        names.indexOf('Déposer les disques de jour et de quantième'),
      );
    });

    it('RG-ETP-05 une complication donne les mêmes étapes pour manuel et automatique', async () => {
      const onlyComplication = (steps: GeneratedStep[]) =>
        steps
          .filter((s) => s.complicationCode === 'chronograph')
          .map((s) => [s.label, s.stepOrder]);
      const manual = await preview('manual', 'chronograph');
      const automatic = await preview('automatic', 'chronograph');
      expect(onlyComplication(automatic.body)).toEqual(
        onlyComplication(manual.body),
      );
      expect(onlyComplication(manual.body)).toHaveLength(5);
    });

    it('RG-ETP-04 le service renvoie le même ordre que la route', async () => {
      const service = app.get(StepGenerationService);
      const direct = await service.generate('manual', ['chronograph', 'date']);
      const res = await preview('manual', 'chronograph,date');
      expect(direct).toEqual(res.body);
    });

    it('S8 l’aperçu ne persiste rien', async () => {
      const before = [
        await prisma.restoration_steps.count(),
        await prisma.restoration_projects.count(),
      ];
      await preview('manual', 'chronograph');
      const after = [
        await prisma.restoration_steps.count(),
        await prisma.restoration_projects.count(),
      ];
      expect(after).toEqual(before);
    });

    it('refuse un type de mouvement inconnu ou absent (400)', async () => {
      expect((await preview('quartz')).status).toBe(400);
      expect((await get('/step-previews')).status).toBe(400);
    });

    it('refuse une complication inconnue (400)', async () => {
      expect((await preview('manual', 'chronograph,tourbillon')).status).toBe(
        400,
      );
    });

    it('S7 refuse un paramètre répété (400, jamais 500)', async () => {
      const repeated = await get(
        '/step-previews?movementCode=manual&complicationCodes=date&complicationCodes=chronograph',
      );
      expect(repeated.status).toBe(400);
    });

    it('S7 ignore les doublons de complication', async () => {
      const res = await preview('manual', 'date,date');
      expect(res.body).toHaveLength(25);
    });
  });
});
