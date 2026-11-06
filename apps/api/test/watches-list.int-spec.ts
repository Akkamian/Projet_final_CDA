import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import type { WatchCard } from '../src/watches/watches.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('GET /watches : tableau de bord', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;

  const list = (query = '', auth: string | null = authorization) => {
    const req = request(app.getHttpServer()).get(`/watches${query}`);
    return auth ? req.set('Authorization', auth) : req;
  };
  const byModel = (body: { items: WatchCard[] }, model: string) => body.items.find((i) => i.model === model);

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetUserData(prisma);
    userId = (await createUser(prisma)).id;
    authorization = `Bearer ${app.get(TokensService).signSession('access', userId)}`;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Une montre par statut : en cours, terminée, vendue, sans projet. */
  async function seedOnePerStatus() {
    const a = await createWatch(prisma, userId, { model: 'A' });
    await createProject(prisma, a.id);
    const b = await createWatch(prisma, userId, { model: 'B' });
    await createProject(prisma, b.id, { status: 'completed' });
    const c = await createWatch(prisma, userId, { model: 'C', resale_price: '100', resale_date: new Date('2025-06-01') });
    await createProject(prisma, c.id, { status: 'completed' });
    await createWatch(prisma, userId, { model: 'D' });
  }

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await list('', null)).status).toBe(401);
  });

  it('S25 renvoie une carte par montre avec marque, modèle, mouvement et complications', async () => {
    const watch = await createWatch(prisma, userId, { brand: 'Seiko', model: '6119', movement_code: 'automatic' });
    await prisma.comporte.create({ data: { watch_id: watch.id, complication_code: 'chronograph' } });
    await prisma.comporte.create({ data: { watch_id: watch.id, complication_code: 'date' } });

    const { body } = await list();

    expect(body.items).toEqual([
      expect.objectContaining({
        id: watch.id,
        brand: 'Seiko',
        model: '6119',
        movementCode: 'automatic',
        status: 'no_project',
      }),
    ]);
    // Les libellés du référentiel, pas les codes.
    expect(body.items[0].complicationLabels).toEqual(['Chronographe', 'Date']);
  });

  it('RG-AFF-02 une montre vendue affiche « sold » même si son dernier projet est terminé', async () => {
    await seedOnePerStatus();
    expect(byModel((await list()).body, 'C')?.status).toBe('sold');
  });

  it('RG-AFF-05 une montre sans projet a le statut no_project et pas de miniature', async () => {
    await seedOnePerStatus();
    expect(byModel((await list()).body, 'D')).toMatchObject({ status: 'no_project', thumbnailUrl: null });
  });

  it('RG-AFF-01 la miniature est photo_after du projet le plus récent, sinon photo_before', async () => {
    const both = await createWatch(prisma, userId, { model: 'both' });
    const only = await createWatch(prisma, userId, { model: 'only-before' });
    const none = await createWatch(prisma, userId, { model: 'none' });
    await prisma.restoration_projects.create({ data: { watch_id: both.id, photo_before: 'b.jpg', photo_after: 'a.jpg' } });
    await prisma.restoration_projects.create({ data: { watch_id: only.id, photo_before: 'b2.jpg' } });
    await createProject(prisma, none.id);

    const { body } = await list();

    expect(byModel(body, 'both')?.thumbnailUrl).toBe('a.jpg');
    expect(byModel(body, 'only-before')?.thumbnailUrl).toBe('b2.jpg');
    expect(byModel(body, 'none')?.thumbnailUrl).toBeNull();
  });

  it('RG-PRJ-08 le projet le plus récent est celui de created_at le plus récent', async () => {
    const watch = await createWatch(prisma, userId, { model: 'W' });
    // Le plus récent est inséré en premier : seul created_at le distingue de l'ordre des identifiants.
    await prisma.restoration_projects.create({
      data: { watch_id: watch.id, status: 'in_progress', photo_after: 'recent.jpg', created_at: new Date('2025-05-01') },
    });
    await prisma.restoration_projects.create({
      data: { watch_id: watch.id, status: 'completed', photo_after: 'old.jpg', created_at: new Date('2024-01-01') },
    });

    expect(byModel((await list()).body, 'W')).toMatchObject({ status: 'in_progress', thumbnailUrl: 'recent.jpg' });
  });

  it('S40 le filtre ne renvoie que les montres du statut, counts reste global', async () => {
    await seedOnePerStatus();

    const { status, body } = await list('?status=completed');

    expect(status).toBe(200);
    expect(body.items.map((i: { model: string }) => i.model)).toEqual(['B']);
    expect(body.counts).toEqual({ all: 4, in_progress: 1, completed: 1, sold: 1, no_project: 1 });
  });

  it('S40 un statut sans montre renvoie items vide', async () => {
    const watch = await createWatch(prisma, userId);
    await createProject(prisma, watch.id);

    const { status, body } = await list('?status=sold');

    expect(status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.counts).toEqual({ all: 1, in_progress: 1, completed: 0, sold: 0, no_project: 0 });
  });

  it('S40 un statut inconnu répond 400', async () => {
    expect((await list('?status=nope')).status).toBe(400);
    expect((await list('?status=')).status).toBe(400);
    expect((await list('?status=sold&status=completed')).status).toBe(400);
  });

  it('RG-SEC-01 la liste ne contient que mes montres', async () => {
    const other = await createUser(prisma);
    const theirs = await createWatch(prisma, other.id, { model: 'THEIRS' });
    await createProject(prisma, theirs.id);
    await createWatch(prisma, userId, { model: 'MINE' });

    const { body } = await list();

    expect(body.items.map((i: { model: string }) => i.model)).toEqual(['MINE']);
    expect(body.counts.all).toBe(1);
    expect(body.counts.in_progress).toBe(0);
  });

  it("RG-AFF-02 la marge n'apparaît que si la montre est vendue et calculable", async () => {
    const sold = await createWatch(prisma, userId, {
      model: 'sold',
      purchase_price: '80',
      resale_price: '200',
      resale_date: new Date('2025-06-01'),
    });
    const project = await createProject(prisma, sold.id, { status: 'completed' });
    await prisma.expenses.create({ data: { project_id: project.id, label: 'Joint', amount: '40', expense_date: new Date('2025-02-01') } });
    await createWatch(prisma, userId, { model: 'unsold', purchase_price: '80' });
    await createWatch(prisma, userId, { model: 'no-purchase', resale_price: '200', resale_date: new Date('2025-06-01') });

    const { body } = await list();

    expect(byModel(body, 'sold')?.margin).toBe('80.00');
    expect(byModel(body, 'unsold')?.margin).toBeNull();
    expect(byModel(body, 'no-purchase')?.margin).toBeNull();
  });

  it('RG-FIN-08 la marge de la liste additionne les coûts de tous les projets, pas du seul dernier', async () => {
    const watch = await createWatch(prisma, userId, {
      model: 'multi',
      purchase_price: '80',
      resale_price: '200',
      resale_date: new Date('2025-06-01'),
    });
    const old = await prisma.restoration_projects.create({
      data: { watch_id: watch.id, status: 'completed', created_at: new Date('2024-01-01') },
    });
    const recent = await prisma.restoration_projects.create({
      data: { watch_id: watch.id, status: 'completed', created_at: new Date('2025-01-01') },
    });
    await prisma.expenses.create({ data: { project_id: old.id, label: 'Joint', amount: '25', expense_date: new Date('2024-02-01') } });
    await prisma.expenses.create({ data: { project_id: recent.id, label: 'Verre', amount: '15', expense_date: new Date('2025-02-01') } });

    expect(byModel((await list()).body, 'multi')?.margin).toBe('80.00');
  });

  it('RG-FIN-06 une montre vendue sans projet a une marge, et une marge négative est signée', async () => {
    await createWatch(prisma, userId, {
      model: 'no-project',
      purchase_price: '80',
      resale_price: '200',
      resale_date: new Date('2025-06-01'),
    });
    const loss = await createWatch(prisma, userId, {
      model: 'loss',
      purchase_price: '80',
      resale_price: '70',
      resale_date: new Date('2025-06-01'),
    });
    const project = await createProject(prisma, loss.id, { status: 'completed' });
    await prisma.expenses.create({ data: { project_id: project.id, label: 'Joint', amount: '10', expense_date: new Date('2025-02-01') } });

    const { body } = await list();

    expect(byModel(body, 'no-project')).toMatchObject({ status: 'sold', margin: '120.00' });
    expect(byModel(body, 'loss')?.margin).toBe('-20.00');
  });

  it('S25 une liste vide donne items vide et des compteurs à zéro', async () => {
    const { body } = await list();
    expect(body).toEqual({
      items: [],
      counts: { all: 0, in_progress: 0, completed: 0, sold: 0, no_project: 0 },
      total: 0,
      page: 1,
      pageSize: 8,
      totalMargin: '0.00',
    });
  });

  const addSteps = async (projectId: number, done: number, total: number) => {
    for (let i = 1; i <= total; i++) {
      await prisma.restoration_steps.create({
        data: { project_id: projectId, step_order: i, label: `Étape ${i}`, is_completed: i <= done },
      });
    }
  };

  it('S25 la carte porte achat, revente et progression', async () => {
    const watch = await createWatch(prisma, userId, {
      model: 'full',
      purchase_price: '95',
      purchase_date: new Date('2025-03-01'),
      resale_price: '200',
      resale_date: new Date('2025-06-01'),
    });
    await addSteps((await createProject(prisma, watch.id, { status: 'completed' })).id, 1, 3);

    expect(byModel((await list()).body, 'full')).toMatchObject({
      purchasePrice: '95.00',
      purchaseDate: '2025-03-01',
      resalePrice: '200.00',
      resaleDate: '2025-06-01',
      progress: { done: 1, total: 3 },
    });
  });

  it('RG-AFF-07 progress est null sans projet, { done: 0, total: 0 } pour un projet sans étape', async () => {
    await createWatch(prisma, userId, { model: 'none' });
    const empty = await createWatch(prisma, userId, { model: 'empty' });
    await createProject(prisma, empty.id);

    const { body } = await list();

    expect(byModel(body, 'none')?.progress).toBeNull();
    expect(byModel(body, 'empty')?.progress).toEqual({ done: 0, total: 0 });
  });

  it('RG-AFF-07 la progression suit le projet le plus récent, pas le plus ancien', async () => {
    const watch = await createWatch(prisma, userId, { model: 'two' });
    const old = await prisma.restoration_projects.create({
      data: { watch_id: watch.id, status: 'completed', created_at: new Date('2024-01-01') },
    });
    const recent = await prisma.restoration_projects.create({
      data: { watch_id: watch.id, status: 'in_progress', created_at: new Date('2025-05-01') },
    });
    await addSteps(old.id, 5, 5);
    await addSteps(recent.id, 2, 4);

    expect(byModel((await list()).body, 'two')?.progress).toEqual({ done: 2, total: 4 });
  });

  it('une montre sans prix ni date d’achat renvoie null pour ces champs', async () => {
    await createWatch(prisma, userId, { model: 'bare' });

    expect(byModel((await list()).body, 'bare')).toMatchObject({
      purchasePrice: null,
      purchaseDate: null,
      resalePrice: null,
      resaleDate: null,
    });
  });

  it('RG-AFF-10 totalMargin additionne les marges des montres vendues et reste global avec un filtre', async () => {
    await createWatch(prisma, userId, { model: 'gain', purchase_price: '100', resale_price: '180', resale_date: new Date('2025-06-01') });
    await createWatch(prisma, userId, { model: 'perte', purchase_price: '100', resale_price: '80', resale_date: new Date('2025-06-01') });
    await createWatch(prisma, userId, { model: 'invendue', purchase_price: '50' });

    expect((await list()).body.totalMargin).toBe('60.00');
    expect((await list('?status=no_project')).body.totalMargin).toBe('60.00');
  });

  it('RG-AFF-10 totalMargin vaut 0.00 sans aucune vente', async () => {
    await createWatch(prisma, userId, { model: 'invendue', purchase_price: '50' });
    expect((await list()).body.totalMargin).toBe('0.00');
  });

  it('RG-AFF-11 l’enveloppe renvoie total (après filtre), page et pageSize', async () => {
    await seedOnePerStatus();

    const { body } = await list('?status=completed');

    expect(body).toMatchObject({ total: 1, page: 1, pageSize: 8 });
    expect((await list()).body.total).toBe(4);
  });

  const models = (body: { items: WatchCard[] }) => body.items.map((i) => i.model);

  it('RG-AFF-08 la recherche trouve par marque ou modèle, sans casse ni accents', async () => {
    await createWatch(prisma, userId, { brand: 'Seiko', model: '6119-8100' });
    await createWatch(prisma, userId, { brand: 'Omega', model: 'Seamaster' });
    await createWatch(prisma, userId, { brand: 'Zénith', model: 'El Primero' });

    expect(models((await list('?q=SEIKO')).body)).toEqual(['6119-8100']);
    expect(models((await list('?q=seamas')).body)).toEqual(['Seamaster']);
    expect(models((await list(`?q=${encodeURIComponent('zenith')}`)).body)).toEqual(['El Primero']);
    expect(models((await list(`?q=${encodeURIComponent('zénith')}`)).body)).toEqual(['El Primero']);
  });

  it('RG-AFF-08 plusieurs mots : chacun doit être présent', async () => {
    await createWatch(prisma, userId, { brand: 'Seiko', model: '6119-8100' });
    await createWatch(prisma, userId, { brand: 'Seiko', model: 'SKX007' });

    expect(models((await list('?q=seiko%206119')).body)).toEqual(['6119-8100']);
    expect(models((await list('?q=6119%20seiko')).body)).toEqual(['6119-8100']);
  });

  it('RG-AFF-08 une recherche sans résultat renvoie items vide et total 0', async () => {
    await createWatch(prisma, userId, { brand: 'Seiko', model: '6119' });

    const { status, body } = await list('?q=omega');

    expect(status).toBe(200);
    expect(body).toMatchObject({ items: [], total: 0 });
  });

  it('RG-AFF-08 la recherche se combine au statut et counts reste global', async () => {
    const a = await createWatch(prisma, userId, { brand: 'Seiko', model: 'A' });
    await createProject(prisma, a.id);
    const b = await createWatch(prisma, userId, { brand: 'Seiko', model: 'B' });
    await createProject(prisma, b.id, { status: 'completed' });
    await createWatch(prisma, userId, { brand: 'Omega', model: 'C' });

    const { body } = await list('?q=seiko&status=completed');

    expect(models(body)).toEqual(['B']);
    expect(body.total).toBe(1);
    expect(body.counts).toEqual({ all: 3, in_progress: 1, completed: 1, sold: 0, no_project: 1 });
  });

  it('RG-AFF-08 un caractère spécial est cherché comme du texte', async () => {
    await createWatch(prisma, userId, { brand: 'Seiko', model: '100%' });
    await createWatch(prisma, userId, { brand: 'Seiko', model: 'plain' });

    expect(models((await list('?q=%25')).body)).toEqual(['100%']);
    expect(models((await list('?q=.*')).body)).toEqual([]);
  });

  describe('tri sur la date d’achat', () => {
    beforeEach(async () => {
      await createWatch(prisma, userId, { model: 'y2024', purchase_date: new Date('2024-01-01') });
      await createWatch(prisma, userId, { model: 'y2025', purchase_date: new Date('2025-01-01') });
      await createWatch(prisma, userId, { model: 'sans-date' });
    });

    it('RG-AFF-09 décroissant : la plus récente d’abord, sans date en dernier', async () => {
      expect(models((await list('?sort=purchase_date&order=desc')).body)).toEqual(['y2025', 'y2024', 'sans-date']);
      expect(models((await list('?sort=purchase_date')).body)).toEqual(['y2025', 'y2024', 'sans-date']);
    });

    it('RG-AFF-09 croissant : la plus ancienne d’abord, sans date toujours en dernier', async () => {
      expect(models((await list('?sort=purchase_date&order=asc')).body)).toEqual(['y2024', 'y2025', 'sans-date']);
    });

    it('RG-AFF-09 sans tri : les plus récemment ajoutées d’abord', async () => {
      expect(models((await list()).body)).toEqual(['sans-date', 'y2025', 'y2024']);
    });
  });

  it('RG-AFF-11 la pagination découpe la liste et total reste celui du filtre', async () => {
    for (let i = 1; i <= 10; i++) await createWatch(prisma, userId, { model: `M${String(i).padStart(2, '0')}` });

    const first = (await list('?pageSize=4')).body;
    expect(first.items).toHaveLength(4);
    expect(first).toMatchObject({ total: 10, page: 1, pageSize: 4 });

    const third = (await list('?page=3&pageSize=4')).body;
    expect(models(third)).toEqual(['M02', 'M01']);
    expect(third.page).toBe(3);

    expect((await list()).body.items).toHaveLength(8);
  });

  it('RG-AFF-11 une page hors limites renvoie items vide et un total exact', async () => {
    await createWatch(prisma, userId);
    await createWatch(prisma, userId);

    const { status, body } = await list('?page=99');

    expect(status).toBe(200);
    expect(body).toMatchObject({ items: [], total: 2, page: 99 });
  });

  it('les paramètres invalides répondent 400 avec leur code', async () => {
    const codeOf = async (query: string) => (await list(query)).body.code;

    expect(await codeOf('?q=')).toBe('INVALID_QUERY');
    expect(await codeOf('?sort=brand')).toBe('INVALID_SORT');
    expect(await codeOf('?order=up')).toBe('INVALID_ORDER');
    expect(await codeOf('?order=asc')).toBe('INVALID_ORDER');
    expect(await codeOf('?page=0')).toBe('INVALID_PAGE');
    expect(await codeOf('?pageSize=51')).toBe('INVALID_PAGE_SIZE');
    expect((await list('?page=0')).status).toBe(400);
  });
});
