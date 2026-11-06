import bcrypt from 'bcrypt';
import type { Prisma } from '../../src/generated/prisma/client.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

let counter = 0;

/** Vide les données utilisateur (en cascade) et laisse le référentiel intact. */
export async function resetUserData(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
}

export async function createUser(
  prisma: PrismaService,
  opts: { email?: string; password?: string; verified?: boolean } = {},
): Promise<{ id: number; email: string; password: string }> {
  counter += 1;
  const email = opts.email ?? `user-${counter}@test.local`;
  const password = opts.password ?? 'password123';
  const user = await prisma.users.create({
    data: {
      email,
      // 4 tours : le minimum de bcrypt, suffisant en test et bien plus rapide que les 10 de la production.
      password_hash: await bcrypt.hash(password, 4),
      email_verified_at: opts.verified === false ? null : new Date(),
    },
  });
  return { id: user.id, email, password };
}

export async function createWatch(
  prisma: PrismaService,
  userId: number,
  opts: Partial<Prisma.watchesUncheckedCreateInput> = {},
): Promise<{ id: number }> {
  return prisma.watches.create({
    data: { user_id: userId, movement_code: 'manual', brand: 'Seiko', model: '6119-8100', ...opts },
    select: { id: true },
  });
}

export async function createProject(
  prisma: PrismaService,
  watchId: number,
  opts: { status?: 'in_progress' | 'completed' } = {},
): Promise<{ id: number }> {
  return prisma.restoration_projects.create({
    data: { watch_id: watchId, status: opts.status ?? 'in_progress' },
    select: { id: true },
  });
}
