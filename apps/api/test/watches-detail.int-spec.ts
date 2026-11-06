import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('GET /watches/:id : détail, marge et propriété', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;

  const get = (id: number | string, auth: string | null = authorization) => {
    const req = request(app.getHttpServer()).get(`/watches/${id}`);
    return auth ? req.set('Authorization', auth) : req;
  };
  const bearer = (id: number) => `Bearer ${app.get(TokensService).signSession('access', id)}`;
  const expense = (projectId: number, label: string, amount: string, day: string) =>
    prisma.expenses.create({ data: { project_id: projectId, label, amount, expense_date: new Date(day) } });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    userId = (await createUser(prisma)).id;
    authorization = bearer(userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    const watch = await createWatch(prisma, userId);
    expect((await get(watch.id, null)).status).toBe(401);
  });

  it('S23 la marge additionne les coûts de tous les projets de la montre', async () => {
    const watch = await createWatch(prisma, userId, {
      purchase_price: '80',
      purchase_date: new Date('2025-01-01'),
      resale_price: '200',
      resale_date: new Date('2025-06-01'),
    });
    const first = await createProject(prisma, watch.id, { status: 'completed' });
    const second = await createProject(prisma, watch.id, { status: 'completed' });
    await expense(first.id, 'Joint', '25', '2025-02-01');
    await expense(second.id, 'Verre', '15', '2025-03-01');

    const res = await get(watch.id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ resalePrice: '200.00', purchasePrice: '80.00', margin: '80.00' });
  });

  it("S24 la marge est nulle tant que la montre n'est pas vendue", async () => {
    const watch = await createWatch(prisma, userId, { purchase_price: '80' });
    await createProject(prisma, watch.id);
    expect((await get(watch.id)).body.margin).toBeNull();
  });

  it('RG-FIN-13 le coût de revient additionne l’achat et les coûts de tous les projets', async () => {
    const watch = await createWatch(prisma, userId, { purchase_price: '120' });
    const first = await createProject(prisma, watch.id, { status: 'completed' });
    const second = await createProject(prisma, watch.id);
    await expense(first.id, 'Joint', '45', '2025-02-01');
    await expense(second.id, 'Verre', '30', '2025-03-01');

    expect((await get(watch.id)).body.costPrice).toBe('195.00');
  });

  it('RG-FIN-13 le coût de revient est renvoyé même si la montre n’est pas vendue', async () => {
    const watch = await createWatch(prisma, userId, { purchase_price: '120' });
    await createProject(prisma, watch.id);

    const { body } = await get(watch.id);

    expect(body).toMatchObject({ costPrice: '120.00', margin: null });
  });

  it('RG-FIN-13 sans prix d’achat le coût de revient est null', async () => {
    const watch = await createWatch(prisma, userId);
    const project = await createProject(prisma, watch.id);
    await expense(project.id, 'Joint', '45', '2025-02-01');

    expect((await get(watch.id)).body.costPrice).toBeNull();
  });

  it('RG-FIN-13 il suit l’ajout et la suppression d’un coût', async () => {
    const watch = await createWatch(prisma, userId, { purchase_price: '100' });
    const project = await createProject(prisma, watch.id);

    const added = await expense(project.id, 'Joint', '25.5', '2025-02-01');
    expect((await get(watch.id)).body.costPrice).toBe('125.50');

    await prisma.expenses.delete({ where: { id: added.id } });
    expect((await get(watch.id)).body.costPrice).toBe('100.00');
  });

  it('RG-FIN-09 les coûts sont renvoyés par projet', async () => {
    const watch = await createWatch(prisma, userId);
    const first = await createProject(prisma, watch.id, { status: 'completed' });
    const second = await createProject(prisma, watch.id);
    await expense(first.id, 'Joint', '25', '2025-02-01');
    await expense(second.id, 'Verre', '15.5', '2025-03-01');

    const { body } = await get(watch.id);

    const byId = Object.fromEntries(body.projects.map((p: { id: number; expenses: unknown[] }) => [p.id, p.expenses]));
    expect(byId[first.id]).toEqual([expect.objectContaining({ label: 'Joint', amount: '25.00', expenseDate: '2025-02-01' })]);
    expect(byId[second.id]).toEqual([expect.objectContaining({ label: 'Verre', amount: '15.50', expenseDate: '2025-03-01' })]);
  });

  it('S26 les projets sont triés du plus récent au plus ancien', async () => {
    const watch = await createWatch(prisma, userId);
    const old = await createProject(prisma, watch.id, { status: 'completed' });
    const recent = await createProject(prisma, watch.id);
    const { body } = await get(watch.id);
    expect(body.projects.map((p: { id: number }) => p.id)).toEqual([recent.id, old.id]);
  });

  it('S19 les mesures sont triées par date, nombres en chaîne à 2 décimales', async () => {
    const watch = await createWatch(prisma, userId);
    const project = await createProject(prisma, watch.id);
    const row = (day: string, rate: string) => ({
      project_id: project.id,
      measured_at: new Date(day),
      rate_seconds_per_day: rate,
      beat_error_ms: '0.4',
      amplitude_degrees: '250',
      watch_position: 'dial_up',
    });
    await prisma.performance_measurements.create({ data: row('2025-05-02T10:00:00Z', '-3.5') });
    await prisma.performance_measurements.create({ data: row('2025-05-01T10:00:00Z', '12') });

    const { body } = await get(watch.id);

    expect(body.projects[0].measurements).toEqual([
      expect.objectContaining({ rateSecondsPerDay: '12.00', beatErrorMs: '0.40', amplitudeDegrees: '250.00', watchPosition: 'dial_up' }),
      expect.objectContaining({ rateSecondsPerDay: '-3.50' }),
    ]);
  });

  it("RG-PHO-04 les photos d'une étape sont renvoyées avec leur url", async () => {
    const watch = await createWatch(prisma, userId);
    const project = await createProject(prisma, watch.id);
    const step = await prisma.restoration_steps.create({ data: { project_id: project.id, step_order: 1, label: 'Ouvrir' } });
    await prisma.step_pics.create({ data: { restoration_step_id: step.id, url: 'abc.jpg' } });

    const { body } = await get(watch.id);

    expect(body.projects[0].steps[0].photos).toEqual([{ id: expect.any(Number), url: 'abc.jpg' }]);
  });

  it("RG-SEC-01 / S27 la montre d'un autre utilisateur répond 404, comme une montre inexistante", async () => {
    const other = await createUser(prisma);
    const theirs = await createWatch(prisma, other.id);

    const foreign = await get(theirs.id);
    const missing = await get(theirs.id + 1000);

    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
  });

  it('RG-SEC-04 un identifiant deviné ne révèle rien : texte, négatif ou décimal donnent 404', async () => {
    const other = await createUser(prisma);
    await createWatch(prisma, other.id);
    for (const id of ['abc', '-1', '0', '1.5']) {
      const res = await get(id);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('Seiko');
    }
  });
});
