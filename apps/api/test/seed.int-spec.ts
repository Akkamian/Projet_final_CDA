import { PrismaService } from '../src/prisma/prisma.service.js';

describe('seed du référentiel', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('charge 2 types de mouvement et 5 complications', async () => {
    expect(await prisma.movement_types.count()).toBe(2);
    expect(await prisma.complications.count()).toBe(5);
  });

  it('charge 22 étapes de base manuelles et 24 automatiques', async () => {
    expect(await prisma.template_steps.count({ where: { movement_code: 'manual' } })).toBe(22);
    expect(await prisma.template_steps.count({ where: { movement_code: 'automatic' } })).toBe(24);
  });

  it('charge 15 étapes de complications réparties comme prévu', async () => {
    const counts = await prisma.template_steps.groupBy({
      by: ['complication_code'],
      where: { complication_code: { not: null } },
      _count: { _all: true },
    });
    const byCode = Object.fromEntries(counts.map((c) => [c.complication_code, c._count._all]));
    expect(byCode).toEqual({
      chronograph: 5,
      date: 3,
      day_date: 3,
      small_seconds: 2,
      power_reserve: 2,
    });
  });
});
