import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

describe('PATCH /watches/:id : modifier une montre', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let authorization: string;

  const patch = (id: number | string, body: unknown, auth: string | null = authorization) => {
    const req = request(app.getHttpServer()).patch(`/watches/${id}`);
    return (auth ? req.set('Authorization', auth) : req).send(body as object);
  };
  const codesOf = async (watchId: number) =>
    (await prisma.comporte.findMany({ where: { watch_id: watchId }, orderBy: { complication_code: 'asc' } })).map(
      (c) => c.complication_code,
    );
  const withComplications = async (codes: string[], opts: Parameters<typeof createWatch>[2] = {}) => {
    const watch = await createWatch(prisma, userId, opts);
    for (const code of codes) await prisma.comporte.create({ data: { watch_id: watch.id, complication_code: code } });
    return watch;
  };

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

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    const watch = await createWatch(prisma, userId);
    expect((await patch(watch.id, { brand: 'X' }, null)).status).toBe(401);
  });

  it('S10 modifie les champs envoyés et laisse les autres intacts', async () => {
    const watch = await createWatch(prisma, userId, { brand: 'Seiko', model: '6119', purchase_price: '80' });

    const res = await patch(watch.id, { model: '6139', purchaseDate: '2025-03-01' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ brand: 'Seiko', model: '6139', purchasePrice: '80.00', purchaseDate: '2025-03-01' });
  });

  it("RG-MON-06 un prix ou une date d'achat à null les efface", async () => {
    const watch = await createWatch(prisma, userId, { purchase_price: '80', purchase_date: new Date('2025-01-01') });

    const res = await patch(watch.id, { purchasePrice: null, purchaseDate: null });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ purchasePrice: null, purchaseDate: null });
  });

  it('S10 remplace l’ensemble des complications de la montre', async () => {
    const watch = await withComplications(['chronograph', 'date']);

    const res = await patch(watch.id, { complicationCodes: ['date', 'small_seconds'] });

    expect(res.status).toBe(200);
    expect(await codesOf(watch.id)).toEqual(['date', 'small_seconds']);
    expect(res.body.complications.map((c: { code: string }) => c.code)).toEqual(['date', 'small_seconds']);
  });

  it('RG-MON-04 une liste vide retire toutes les complications, une liste absente ne touche à rien', async () => {
    const watch = await withComplications(['chronograph']);

    await patch(watch.id, { model: 'Autre' });
    expect(await codesOf(watch.id)).toEqual(['chronograph']);

    await patch(watch.id, { complicationCodes: [] });
    expect(await codesOf(watch.id)).toEqual([]);
  });

  it('RG-MON-04 une complication répétée ne s’associe qu’une fois', async () => {
    const watch = await createWatch(prisma, userId);
    const res = await patch(watch.id, { complicationCodes: ['date', 'date'] });
    expect(res.status).toBe(200);
    expect(await codesOf(watch.id)).toEqual(['date']);
  });

  it('S10 une complication inconnue répond 400 et ne change rien', async () => {
    const watch = await withComplications(['chronograph']);

    const res = await patch(watch.id, { model: 'Autre', complicationCodes: ['date', 'inconnue'] });

    expect(res.status).toBe(400);
    expect(await codesOf(watch.id)).toEqual(['chronograph']);
    expect((await prisma.watches.findUniqueOrThrow({ where: { id: watch.id } })).model).toBe('6119-8100');
  });

  it('S10 modifier les complications n’affecte pas les étapes des projets existants', async () => {
    const watch = await withComplications(['chronograph']);
    const project = await createProject(prisma, watch.id);
    await prisma.restoration_steps.createMany({
      data: [
        { project_id: project.id, step_order: 1, label: 'Ouvrir le boîtier' },
        { project_id: project.id, step_order: 2, label: 'Déposer les aiguilles chrono' },
      ],
    });
    const before = await prisma.restoration_steps.findMany({ where: { project_id: project.id }, orderBy: { id: 'asc' } });

    const res = await patch(watch.id, { complicationCodes: ['date'], movementCode: 'automatic' });

    expect(res.status).toBe(200);
    const after = await prisma.restoration_steps.findMany({ where: { project_id: project.id }, orderBy: { id: 'asc' } });
    expect(after).toEqual(before);
    expect(res.body.projects[0].steps.map((s: { label: string }) => s.label)).toEqual([
      'Ouvrir le boîtier',
      'Déposer les aiguilles chrono',
    ]);
  });

  it('RG-MON-08 la fiche relue renvoie les complications modifiées, que le front passera au prochain aperçu', async () => {
    // L'aperçu (GET /step-previews) ne garde aucun état : il reçoit les codes dans la requête. La garantie « seules les
    // nouvelles révisions utilisent les complications modifiées » se vérifie ici sur les étapes existantes (test
    // précédent) et sera complétée par la tâche du nouveau projet sur une montre existante.
    const watch = await withComplications(['chronograph']);
    await patch(watch.id, { complicationCodes: ['date'] });

    const detail = await request(app.getHttpServer()).get(`/watches/${watch.id}`).set('Authorization', authorization);

    expect(detail.body.complications.map((c: { code: string }) => c.code)).toEqual(['date']);
  });

  it('RG-MON-04 complicationCodes à null répond 400 et ne retire rien (une liste vide sert à tout retirer)', async () => {
    const watch = await withComplications(['chronograph']);

    expect((await patch(watch.id, { complicationCodes: null })).status).toBe(400);
    expect(await codesOf(watch.id)).toEqual(['chronograph']);
  });

  it('RG-SEC-01 la montre d’un autre utilisateur répond 404 et reste intacte', async () => {
    const other = await createUser(prisma);
    const theirs = await createWatch(prisma, other.id, { brand: 'Rolex' });

    const foreign = await patch(theirs.id, { brand: 'Piraté' });
    const missing = await patch(theirs.id + 1000, { brand: 'Piraté' });

    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect((await prisma.watches.findUniqueOrThrow({ where: { id: theirs.id } })).brand).toBe('Rolex');
  });

  it('RG-SEC-04 un identifiant mal formé répond 404', async () => {
    for (const id of ['abc', '-1', '0', '2147483648']) expect((await patch(id, { brand: 'X' })).status).toBe(404);
  });

  it('RG-FIN-10 refuse une date d’achat postérieure à la revente', async () => {
    const watch = await createWatch(prisma, userId, {
      purchase_date: new Date('2025-01-01'),
      resale_price: '200',
      resale_date: new Date('2025-06-01'),
    });

    const res = await patch(watch.id, { purchaseDate: '2025-07-01' });

    expect(res.status).toBe(400);
    expect((await prisma.watches.findUniqueOrThrow({ where: { id: watch.id } })).purchase_date).toEqual(new Date('2025-01-01'));
  });

  it('RG-FIN-10 accepte une date d’achat égale à la date de revente', async () => {
    const watch = await createWatch(prisma, userId, { resale_price: '200', resale_date: new Date('2025-06-01') });
    expect((await patch(watch.id, { purchaseDate: '2025-06-01' })).status).toBe(200);
  });

  it('RG-GEN-01 / RG-MON-07 refuse une date future, un prix négatif ou hors bornes', async () => {
    const watch = await createWatch(prisma, userId);
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const body of [{ purchaseDate: tomorrow }, { purchasePrice: -1 }, { purchasePrice: 100000000 }, { purchasePrice: 1.234 }]) {
      expect((await patch(watch.id, body)).status).toBe(400);
    }
  });

  it('RG-MON-01 refuse une marque, un modèle ou un mouvement vide ou null (jamais 500)', async () => {
    const watch = await createWatch(prisma, userId);
    for (const body of [{ brand: '' }, { brand: null }, { model: '  ' }, { model: null }, { movementCode: null }, { movementCode: 'quartz' }]) {
      expect((await patch(watch.id, body)).status).toBe(400);
    }
  });

  it('S10 refuse les champs qui ne se modifient pas ici (étapes, revente)', async () => {
    const watch = await createWatch(prisma, userId);
    for (const body of [{ steps: [{ label: 'X' }] }, { resalePrice: 100 }, { resaleDate: '2025-01-01' }]) {
      expect((await patch(watch.id, body)).status).toBe(400);
    }
  });

  it('RG-FIN-10 une revente validée pendant la modification est vue : refus 400, jamais 500', async () => {
    const watch = await createWatch(prisma, userId);
    let concurrent: Promise<request.Response> | undefined;

    // Une revente tient le verrou de la montre ; la modification démarre, puis la revente est validée.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM watches WHERE id = ${watch.id} FOR UPDATE`;
      await tx.watches.update({ where: { id: watch.id }, data: { resale_price: 100, resale_date: new Date('2024-06-01') } });
      concurrent = patch(watch.id, { purchaseDate: '2024-12-01' }).then((r) => r);
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    const res = await concurrent!;
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PURCHASE_AFTER_RESALE');
  });
});
