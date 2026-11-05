import { Injectable } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { OwnershipService } from '../common/ownership.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { toStepDetail, type StepDetail } from '../watches/watch-detail.js';

const WITH_PHOTOS = { step_pics: { orderBy: { id: 'asc' } } } satisfies Prisma.restoration_stepsInclude;

@Injectable()
export class StepsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly storage: StorageService,
  ) {}

  /** Étape ajoutée à la suite des existantes : rang = dernier rang + 1 (RG-ETP-09). */
  async add(userId: number, projectId: number, label: string): Promise<StepDetail> {
    await this.ownership.findOwnedProject(userId, projectId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const last = await tx.restoration_steps.aggregate({ where: { project_id: projectId }, _max: { step_order: true } });
      const step = await tx.restoration_steps.create({
        data: { project_id: projectId, label, step_order: (last._max.step_order ?? 0) + 1 },
        include: WITH_PHOTOS,
      });
      return toStepDetail(step);
    });
  }

  /** Un champ absent reste inchangé ; la date de réalisation suit l'état coché (RG-ETP-10, RG-ETP-14). */
  async update(
    userId: number,
    projectId: number,
    stepId: number,
    dto: { label?: string; notes?: string | null; isCompleted?: boolean },
  ): Promise<StepDetail> {
    const current = await this.ownership.findOwnedStep(userId, projectId, stepId);
    const data: Prisma.restoration_stepsUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.isCompleted !== undefined) {
      data.is_completed = dto.isCompleted;
      // Valider une étape déjà validée garde sa date d'origine.
      data.completed_at = dto.isCompleted ? (current.completed_at ?? new Date()) : null;
    }
    const step = await this.prisma.restoration_steps.update({ where: { id: stepId }, data, include: WITH_PHOTOS });
    return toStepDetail(step);
  }

  /** Supprime l'étape (ses photos et leurs fichiers partent avec elle) puis renumérote 1..n en une transaction (RG-ETP-15, RG-ETP-13). */
  async remove(userId: number, projectId: number, stepId: number): Promise<void> {
    await this.ownership.findOwnedStep(userId, projectId, stepId);
    const photos = await this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const urls = await tx.step_pics.findMany({ where: { restoration_step_id: stepId }, select: { url: true } });
      await tx.restoration_steps.deleteMany({ where: { id: stepId, project_id: projectId } });
      await tx.$executeRaw`
        UPDATE restoration_steps s SET step_order = r.rank
        FROM (SELECT id, row_number() OVER (ORDER BY step_order, id)::smallint AS rank
              FROM restoration_steps WHERE project_id = ${projectId}) r
        WHERE s.id = r.id`;
      return urls;
    });
    // Les lignes de photos sont parties en cascade : leurs fichiers aussi, une fois la transaction validée.
    await Promise.all(photos.map((photo) => this.storage.deleteQuietly(photo.url)));
  }

  /** La liste doit être exactement l'ensemble des étapes du projet (RG-ETP-12) ; renumérotation 1..n en un seul lot (RG-ETP-13). */
  async reorder(userId: number, projectId: number, stepIds: number[]): Promise<StepDetail[]> {
    await this.ownership.findOwnedProject(userId, projectId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const existing = await tx.restoration_steps.findMany({ where: { project_id: projectId }, select: { id: true } });
      const given = new Set(stepIds);
      const sameSet = given.size === stepIds.length && existing.length === given.size && existing.every((s) => given.has(s.id));
      if (!sameSet) {
        throw apiError(400, 'INVALID_STEP_ORDER', 'La liste doit contenir exactement les étapes du projet, chacune une seule fois');
      }
      await tx.$executeRaw`
        UPDATE restoration_steps s SET step_order = v.rank::smallint
        FROM unnest(${stepIds}::int[]) WITH ORDINALITY AS v(id, rank)
        WHERE s.id = v.id AND s.project_id = ${projectId}`;
      const steps = await tx.restoration_steps.findMany({
        where: { project_id: projectId },
        orderBy: { step_order: 'asc' },
        include: WITH_PHOTOS,
      });
      return steps.map(toStepDetail);
    });
  }

  /** Sérialise les écritures concurrentes sur les étapes d'un même projet (deux ajouts ne prennent jamais le même rang). */
  private async lockProject(tx: Prisma.TransactionClient, projectId: number): Promise<void> {
    await tx.$queryRaw`SELECT id FROM restoration_projects WHERE id = ${projectId} FOR UPDATE`;
  }
}
