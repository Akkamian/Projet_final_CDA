import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import type { CreateWatchDto } from '../src/watches/dto/create-watch.dto.js';
import { WatchesService } from '../src/watches/watches.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('POST /watches : créer une montre et son premier projet', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;

  const valid = (overrides: object = {}) => ({
    brand: 'Seiko',
    model: '6119-8100',
    movementCode: 'automatic',
    complicationCodes: ['chronograph', 'date'],
    purchasePrice: 80,
    purchaseDate: '2025-03-01',
    steps: [{ label: 'Déposer le bracelet' }, { label: 'Ouvrir le boîtier' }, { label: 'Déposer les aiguilles' }],
    ...overrides,
  });
  const post = (body: unknown, auth: string | null = authorization) => {
    const req = request(app.getHttpServer()).post('/watches');
    return (auth ? req.set('Authorization', auth) : req).send(body as object);
  };
  const counts = async () => ({
    watches: await prisma.watches.count(),
    comporte: await prisma.comporte.count(),
    projects: await prisma.restoration_projects.count(),
    steps: await prisma.restoration_steps.count(),
  });
  const nothing = { watches: 0, comporte: 0, projects: 0, steps: 0 };

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

  it('S5 crée la montre, ses complications, son projet en cours et ses étapes', async () => {
    const res = await post(valid());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      brand: 'Seiko',
      model: '6119-8100',
      movementCode: 'automatic',
      purchasePrice: '80.00',
      purchaseDate: '2025-03-01',
      resalePrice: null,
      resaleDate: null,
      margin: null,
      complications: [
        { code: 'chronograph', label: 'Chronographe' },
        { code: 'date', label: 'Date' },
      ],
    });
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0]).toMatchObject({ status: 'in_progress', completedAt: null });
    expect(res.body.projects[0].steps).toHaveLength(3);

    const watch = await prisma.watches.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(watch.user_id).toBe(userId);
    expect(await counts()).toEqual({ watches: 1, comporte: 2, projects: 1, steps: 3 });
  });

  it('RG-ETP-07 les étapes sont renumérotées 1..n, note vide, non terminées', async () => {
    const res = await post(valid());

    const steps = await prisma.restoration_steps.findMany({ orderBy: { step_order: 'asc' } });
    expect(steps.map((s) => [s.step_order, s.label])).toEqual([
      [1, 'Déposer le bracelet'],
      [2, 'Ouvrir le boîtier'],
      [3, 'Déposer les aiguilles'],
    ]);
    expect(steps.every((s) => s.notes === null && !s.is_completed && s.completed_at === null)).toBe(true);
    expect(res.body.projects[0].steps).toEqual([
      expect.objectContaining({ stepOrder: 1, label: 'Déposer le bracelet', notes: null, isCompleted: false, completedAt: null, photos: [] }),
      expect.objectContaining({ stepOrder: 2 }),
      expect.objectContaining({ stepOrder: 3 }),
    ]);
  });

  it('S8 le projet contient exactement la liste ajustée', async () => {
    const preview = await request(app.getHttpServer())
      .get('/step-previews')
      .query({ movementCode: 'manual', complicationCodes: 'chronograph,date' })
      .set('Authorization', authorization);
    expect(preview.body).toHaveLength(30);

    // Ajustement de l'utilisateur : retire la première étape, en ajoute une, inverse les deux suivantes.
    const labels: string[] = preview.body.map((s: { label: string }) => s.label);
    const adjusted = [labels[2], labels[1], ...labels.slice(3), 'Étape ajoutée à la main'];
    const res = await post(valid({ movementCode: 'manual', steps: adjusted.map((label) => ({ label })) }));

    expect(res.status).toBe(201);
    const saved = await prisma.restoration_steps.findMany({ orderBy: { step_order: 'asc' } });
    expect(saved.map((s) => s.label)).toEqual(adjusted);
    expect(saved.map((s) => s.step_order)).toEqual(adjusted.map((_, i) => i + 1));
  });

  it('S8 le référentiel et les autres projets ne changent pas', async () => {
    const other = await createUser(prisma);
    const otherWatch = await createWatch(prisma, other.id);
    const otherProject = await createProject(prisma, otherWatch.id);
    await prisma.restoration_steps.create({ data: { project_id: otherProject.id, step_order: 1, label: 'Étape d’un autre' } });
    const reference = async () => ({
      templates: await prisma.template_steps.findMany({ orderBy: { id: 'asc' } }),
      otherSteps: await prisma.restoration_steps.findMany({ where: { project_id: otherProject.id } }),
      otherWatch: await prisma.watches.findUniqueOrThrow({ where: { id: otherWatch.id } }),
    });
    const before = await reference();

    expect((await post(valid())).status).toBe(201);

    expect(await reference()).toEqual(before);
  });

  it('RG-PRJ-03 si la création des étapes échoue, ni montre ni projet ne sont enregistrés', async () => {
    // Un libellé de 256 caractères est refusé par la base (VARCHAR(255)) : on contourne le DTO pour atteindre l'écriture.
    const dto = valid({ steps: [{ label: 'Étape valide' }, { label: 'x'.repeat(256) }] }) as unknown as CreateWatchDto;

    // P2000 : valeur trop longue pour la colonne — l'échec vient bien de la base, après l'écriture de la montre.
    await expect(app.get(WatchesService).create(userId, dto)).rejects.toMatchObject({ code: 'P2000' });

    expect(await counts()).toEqual(nothing);
  });

  it('RG-MON-06 prix et date d’achat facultatifs', async () => {
    const omitted = await post(valid({ purchasePrice: undefined, purchaseDate: undefined }));
    expect(omitted.status).toBe(201);
    expect(omitted.body).toMatchObject({ purchasePrice: null, purchaseDate: null });

    const explicitNull = await post(valid({ purchasePrice: null, purchaseDate: null }));
    expect(explicitNull.status).toBe(201);
    expect(explicitNull.body).toMatchObject({ purchasePrice: null, purchaseDate: null });
  });

  it('S5 accepte une date d’achat d’aujourd’hui et refuse une date future ou inexistante', async () => {
    expect((await post(valid({ purchaseDate: today() }))).status).toBe(201);
    for (const purchaseDate of [tomorrow(), '2025-02-30', '01/03/2025', 'hier', 20250301]) {
      expect((await post(valid({ purchaseDate }))).status, String(purchaseDate)).toBe(400);
    }
  });

  it('RG-MON-07 accepte 0, 80.5, "80.50" et le maximum 99999999.99', async () => {
    for (const purchasePrice of [0, 80.5, '80.50', 99999999.99]) {
      const res = await post(valid({ purchasePrice }));
      expect(res.status, String(purchasePrice)).toBe(201);
    }
    const stored = await prisma.watches.findMany({ orderBy: { id: 'asc' } });
    expect(stored.map((w) => w.purchase_price?.toFixed(2))).toEqual(['0.00', '80.50', '80.50', '99999999.99']);
  });

  it('RG-MON-07 refuse un prix négatif, trop grand, à 3 décimales ou qui n’est pas un nombre (400, jamais 500)', async () => {
    for (const purchasePrice of [-1, '-0.01', 100000000, '100000000', 12.345, '12.345', 'abc', '', '1e3', {}, [80], true]) {
      const res = await post(valid({ purchasePrice }));
      expect(res.status, JSON.stringify(purchasePrice)).toBe(400);
    }
    expect(await counts()).toEqual(nothing);
  });

  it('RG-MON-01 refuse sans marque, sans modèle ou sans type de mouvement', async () => {
    for (const overrides of [
      { brand: undefined },
      { brand: '' },
      { brand: '   ' },
      { model: undefined },
      { model: '' },
      { movementCode: undefined },
      { movementCode: 'quartz' },
    ]) {
      const res = await post(valid(overrides));
      expect(res.status, JSON.stringify(overrides)).toBe(400);
    }
    expect(await counts()).toEqual(nothing);
  });

  it('RG-GEN-02 refuse une marque de 256 caractères et en accepte 255', async () => {
    expect((await post(valid({ brand: 'a'.repeat(256) }))).status).toBe(400);
    expect((await post(valid({ model: 'a'.repeat(256) }))).status).toBe(400);
    expect((await post(valid({ steps: [{ label: 'a'.repeat(256) }] }))).status).toBe(400);
    expect((await post(valid({ brand: 'a'.repeat(255), steps: [{ label: 'b'.repeat(255) }] }))).status).toBe(201);
  });

  it('RG-GEN-02 retire les espaces autour de la marque, du modèle et des libellés', async () => {
    const res = await post(valid({ brand: '  Seiko ', model: ' 6119 ', steps: [{ label: ' Déposer ' }] }));
    expect(res.body).toMatchObject({ brand: 'Seiko', model: '6119' });
    expect(res.body.projects[0].steps[0].label).toBe('Déposer');
  });

  it('RG-MON-04 refuse une complication inconnue', async () => {
    const res = await post(valid({ complicationCodes: ['chronograph', 'tourbillon'] }));
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.stringContaining('tourbillon'));
    expect(await counts()).toEqual(nothing);
  });

  it('RG-MON-04 une complication répétée n’est associée qu’une fois à la montre', async () => {
    const res = await post(valid({ complicationCodes: ['date', 'date'] }));
    expect(res.status).toBe(201);
    expect(res.body.complications).toEqual([{ code: 'date', label: 'Date' }]);
  });

  it('RG-MON-04 une montre sans complication est acceptée (liste absente ou vide)', async () => {
    expect((await post(valid({ complicationCodes: undefined }))).body.complications).toEqual([]);
    expect((await post(valid({ complicationCodes: [] }))).body.complications).toEqual([]);
  });

  it('S5 refuse une liste d’étapes vide, absente ou mal formée (400, jamais 500)', async () => {
    for (const steps of [undefined, [], 'Déposer', [null], [{}], [{ label: '' }], [{ label: 5 }], [{ label: 'ok', extra: 1 }]]) {
      const res = await post(valid({ steps }));
      expect(res.status, JSON.stringify(steps)).toBe(400);
    }
    expect(await counts()).toEqual(nothing);
  });

  it('refuse des types incorrects sans jamais répondre 500', async () => {
    for (const overrides of [{ brand: 5 }, { complicationCodes: 'date' }, { complicationCodes: [5] }, { movementCode: 3 }]) {
      const res = await post(valid(overrides));
      expect(res.status, JSON.stringify(overrides)).toBe(400);
    }
  });

  it('RG-SEC-03 POST /watches sans jeton donne 401', async () => {
    const res = await post(valid(), null);
    expect(res.status).toBe(401);
    expect(await counts()).toEqual(nothing);
  });

  it('RG-MON-05 la montre appartient à l’utilisateur du jeton : un userId dans le corps est refusé', async () => {
    const other = await createUser(prisma);
    const res = await post(valid({ userId: other.id, user_id: other.id }));
    expect(res.status).toBe(400);
    expect(await counts()).toEqual(nothing);
  });
});
