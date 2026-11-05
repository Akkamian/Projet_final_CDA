import type { Prisma } from '../generated/prisma/client.js';

/**
 * URL de tous les fichiers photos des projets désignés : photos d'étape, état initial et état final.
 * À lire AVANT la suppression des lignes (elles partent en cascade) ; les fichiers s'effacent après le commit.
 */
export async function projectPhotoUrls(
  tx: Prisma.TransactionClient,
  where: Prisma.restoration_projectsWhereInput,
): Promise<string[]> {
  const [pics, projects] = await Promise.all([
    tx.step_pics.findMany({
      where: { restoration_steps: { restoration_projects: where } },
      select: { url: true },
    }),
    tx.restoration_projects.findMany({
      where,
      select: { photo_before: true, photo_after: true },
    }),
  ]);
  return [
    ...pics.map((p) => p.url),
    ...projects.flatMap((p) => [p.photo_before, p.photo_after]),
  ].filter((url): url is string => url !== null);
}
