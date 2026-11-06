import { PrismaService } from '../src/prisma/prisma.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';

describe('contraintes de la base', () => {
  const prisma = new PrismaService();

  beforeEach(async () => {
    await resetUserData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('étapes types', () => {
    it('RG-ETP-01 refuse une étape type avec mouvement et complication', async () => {
      await expect(
        prisma.template_steps.create({
          data: { label: 'Étape double', step_order: 9001, movement_code: 'manual', complication_code: 'date' },
        }),
      ).rejects.toThrow();
    });

    it('RG-ETP-01 refuse une étape type sans mouvement ni complication', async () => {
      await expect(
        prisma.template_steps.create({ data: { label: 'Étape orpheline', step_order: 9002 } }),
      ).rejects.toThrow();
    });

    it('RG-ETP-02 refuse deux étapes de même rang dans une liste', async () => {
      const existing = await prisma.template_steps.findFirstOrThrow({ where: { movement_code: 'manual' } });
      await expect(
        prisma.template_steps.create({
          data: { label: 'Libellé inédit', step_order: existing.step_order, movement_code: 'manual' },
        }),
      ).rejects.toThrow();
    });

    it('RG-ETP-02 refuse deux étapes de même libellé dans une liste', async () => {
      const existing = await prisma.template_steps.findFirstOrThrow({ where: { movement_code: 'manual' } });
      await expect(
        prisma.template_steps.create({
          data: { label: existing.label, step_order: 9003, movement_code: 'manual' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('projets', () => {
    it('RG-PRJ-09 refuse un second projet en cours sur la même montre', async () => {
      const user = await createUser(prisma);
      const watch = await createWatch(prisma, user.id);
      await createProject(prisma, watch.id, { status: 'in_progress' });
      await expect(createProject(prisma, watch.id, { status: 'in_progress' })).rejects.toThrow();
    });

    it('RG-PRJ-09 accepte un projet terminé en plus du projet en cours', async () => {
      const user = await createUser(prisma);
      const watch = await createWatch(prisma, user.id);
      await createProject(prisma, watch.id, { status: 'in_progress' });
      await expect(createProject(prisma, watch.id, { status: 'completed' })).resolves.toBeDefined();
    });
  });

  describe('mesures', () => {
    async function aProject() {
      const user = await createUser(prisma);
      const watch = await createWatch(prisma, user.id);
      return createProject(prisma, watch.id);
    }
    const valid = { rate_seconds_per_day: 3.5, beat_error_ms: 0.4, amplitude_degrees: 270 };

    it('RG-PER-03 refuse un beat error négatif', async () => {
      const project = await aProject();
      await expect(
        prisma.performance_measurements.create({ data: { project_id: project.id, ...valid, beat_error_ms: -0.1 } }),
      ).rejects.toThrow();
    });

    it('RG-PER-03 refuse une amplitude négative', async () => {
      const project = await aProject();
      await expect(
        prisma.performance_measurements.create({ data: { project_id: project.id, ...valid, amplitude_degrees: -1 } }),
      ).rejects.toThrow();
    });

    it('S19 accepte une marche négative (la montre retarde)', async () => {
      const project = await aProject();
      await expect(
        prisma.performance_measurements.create({ data: { project_id: project.id, ...valid, rate_seconds_per_day: -12.5 } }),
      ).resolves.toBeDefined();
    });
  });

  describe('revente', () => {
    it('RG-FIN-10 refuse une revente antérieure à l’achat', async () => {
      const user = await createUser(prisma);
      await expect(
        createWatch(prisma, user.id, {
          purchase_date: new Date('2026-05-01'),
          resale_price: 100,
          resale_date: new Date('2026-04-30'),
        }),
      ).rejects.toThrow();
    });

    it('RG-FIN-10 accepte une revente quand la date d’achat est inconnue', async () => {
      const user = await createUser(prisma);
      await expect(
        createWatch(prisma, user.id, { purchase_date: null, resale_price: 100, resale_date: new Date('2026-04-30') }),
      ).resolves.toBeDefined();
    });

    it('RG-FIN-03 refuse un prix de revente sans date', async () => {
      const user = await createUser(prisma);
      await expect(createWatch(prisma, user.id, { resale_price: 100, resale_date: null })).rejects.toThrow();
    });
  });

  describe('suppression en cascade', () => {
    it('RG-SEC-05 supprimer un projet efface étapes, photos, mesures et coûts mais garde la montre', async () => {
      const user = await createUser(prisma);
      const watch = await createWatch(prisma, user.id);
      const project = await createProject(prisma, watch.id);
      const step = await prisma.restoration_steps.create({
        data: { project_id: project.id, step_order: 1, label: 'Déposer les aiguilles' },
      });
      await prisma.step_pics.create({ data: { restoration_step_id: step.id, url: '/uploads/a.webp' } });
      await prisma.performance_measurements.create({
        data: { project_id: project.id, rate_seconds_per_day: 1, beat_error_ms: 0.2, amplitude_degrees: 250 },
      });
      await prisma.expenses.create({
        data: { project_id: project.id, label: 'Couronne', amount: 12, expense_date: new Date('2026-01-10') },
      });

      await prisma.restoration_projects.delete({ where: { id: project.id } });

      expect(await prisma.restoration_steps.count({ where: { project_id: project.id } })).toBe(0);
      expect(await prisma.step_pics.count()).toBe(0);
      expect(await prisma.performance_measurements.count({ where: { project_id: project.id } })).toBe(0);
      expect(await prisma.expenses.count({ where: { project_id: project.id } })).toBe(0);
      expect(await prisma.watches.count({ where: { id: watch.id } })).toBe(1);
    });
  });

  // Garde-fou : `prisma db pull` lit l'index partiel RG-PRJ-09 comme un @unique complet sur watch_id et
  // transforme la relation en 1-1. Si ce test casse après un db pull, retirer ce @unique de schema.prisma.
  it('RG-MON-10 une montre a plusieurs projets : la relation Prisma est une liste', async () => {
    const user = await createUser(prisma);
    const watch = await createWatch(prisma, user.id);
    await createProject(prisma, watch.id, { status: 'completed' });
    await createProject(prisma, watch.id, { status: 'in_progress' });

    const loaded = await prisma.watches.findUniqueOrThrow({
      where: { id: watch.id },
      include: { restoration_projects: true },
    });

    expect(Array.isArray(loaded.restoration_projects)).toBe(true);
    expect(loaded.restoration_projects).toHaveLength(2);
  });
});
