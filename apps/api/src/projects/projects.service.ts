import { Injectable } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { OwnershipService } from '../common/ownership.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toWatchDetail,
  WATCH_DETAIL_INCLUDE,
  type ProjectDetail,
} from '../watches/watch-detail.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';

type Tx = Prisma.TransactionClient;

const alreadyInProgress = () =>
  apiError(
    409,
    'PROJECT_ALREADY_IN_PROGRESS',
    'Un projet est déjà en cours sur cette montre',
  );
const watchSold = () =>
  apiError(
    409,
    'WATCH_SOLD',
    'Cette montre est vendue : annulez d’abord la revente',
  );

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  /** Nouvelle révision (S9) : refusée si la montre est vendue (RG-PRJ-05) ou si un projet y est en cours (RG-PRJ-09). */
  async create(
    userId: number,
    watchId: number,
    dto: CreateProjectDto,
  ): Promise<ProjectDetail> {
    await this.ownership.findOwnedWatch(userId, watchId);
    const created = await this.guarded(() =>
      this.prisma.$transaction(async (tx) => {
        await this.assertOpenable(tx, watchId);
        return tx.restoration_projects.create({
          data: {
            watch_id: watchId,
            // RG-ETP-07 : la liste envoyée est la liste définitive, renumérotée 1, 2, 3…
            restoration_steps: {
              create: dto.steps.map((step, index) => ({
                step_order: index + 1,
                label: step.label,
              })),
            },
          },
          select: { id: true },
        });
      }),
    );
    return this.detail(userId, watchId, created.id);
  }

  /** Terminer (S11, RG-PRJ-06) : l'écriture ne réussit que si le projet est encore en cours, donc une seule fois même en parallèle. */
  async complete(userId: number, projectId: number): Promise<ProjectDetail> {
    const project = await this.ownership.findOwnedProject(userId, projectId);
    const { count } = await this.prisma.restoration_projects.updateMany({
      where: { id: projectId, status: 'in_progress' },
      data: { status: 'completed', completed_at: new Date() },
    });
    if (count === 0)
      throw apiError(
        409,
        'PROJECT_ALREADY_COMPLETED',
        'Ce projet est déjà terminé',
      );
    return this.detail(userId, project.watch_id, projectId);
  }

  /** Rouvrir (S28, RG-PRJ-10) : refusé si la montre est vendue (RG-PRJ-05) ou si un autre projet est en cours (RG-PRJ-09). */
  async reopen(userId: number, projectId: number): Promise<ProjectDetail> {
    const owned = await this.ownership.findOwnedProject(userId, projectId);
    await this.guarded(() =>
      this.prisma.$transaction(async (tx) => {
        await this.assertOpenable(tx, owned.watch_id);
        const current = await tx.restoration_projects.findUniqueOrThrow({
          where: { id: projectId },
        });
        // Sous verrou, un projet en cours est forcément le seul en cours de la montre : c'est celui-ci.
        if (current.status === 'in_progress') throw alreadyInProgress();
        await tx.restoration_projects.update({
          where: { id: projectId },
          data: { status: 'in_progress', completed_at: null },
        });
      }),
    );
    return this.detail(userId, owned.watch_id, projectId);
  }

  /**
   * Les contrôles se font sous le verrou de la montre, le même que celui de la revente : une revente et l'ouverture d'un
   * projet ne peuvent pas se croiser (RG-PRJ-05, RG-FIN-05). Le verrou sérialise aussi les ouvertures entre elles.
   */
  private async assertOpenable(tx: Tx, watchId: number): Promise<void> {
    await tx.$queryRaw`SELECT id FROM watches WHERE id = ${watchId} FOR UPDATE`;
    const watch = await tx.watches.findUniqueOrThrow({
      where: { id: watchId },
    });
    if (watch.resale_date !== null) throw watchSold();
    if (
      (await tx.restoration_projects.count({
        where: { watch_id: watchId, status: 'in_progress' },
      })) > 0
    )
      throw alreadyInProgress();
  }

  /** Dernier filet : si l'index unique partiel (RG-PRJ-09) refuse malgré les contrôles, la réponse reste un 409 explicite. */
  private async guarded<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw alreadyInProgress();
      throw e;
    }
  }

  private async detail(
    userId: number,
    watchId: number,
    projectId: number,
  ): Promise<ProjectDetail> {
    const watch = await this.prisma.watches.findFirstOrThrow({
      where: { id: watchId, user_id: userId },
      include: WATCH_DETAIL_INCLUDE,
    });
    return toWatchDetail(watch).projects.find(
      (p) => p.id === projectId,
    ) as ProjectDetail;
  }
}
