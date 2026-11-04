import { Injectable } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { OwnershipService } from '../common/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWatchDto } from './dto/create-watch.dto.js';
import { computeMargin } from './margin.js';
import { computeStatus, type DashboardStatus, type ProjectStatus } from './status.js';
import { toWatchDetail, WATCH_DETAIL_INCLUDE, type WatchDetail } from './watch-detail.js';

export interface WatchCard {
  id: number;
  brand: string;
  model: string;
  movementCode: 'manual' | 'automatic';
  complicationLabels: string[];
  status: DashboardStatus;
  thumbnailUrl: string | null;
  margin: string | null;
}

export interface WatchList {
  items: WatchCard[];
  counts: { all: number } & Record<DashboardStatus, number>;
}

@Injectable()
export class WatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  /**
   * Tableau de bord : une carte par montre, en une seule requête (montres, complications, projets et coûts).
   * `counts` porte sur toutes les montres de l'utilisateur, quel que soit le filtre (S40).
   * Les plus récemment ajoutées d'abord.
   */
  async list(userId: number, status?: DashboardStatus): Promise<WatchList> {
    const watches = await this.prisma.watches.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' },
      include: {
        comporte: { include: { complications: true } },
        restoration_projects: {
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          select: {
            status: true,
            photo_before: true,
            photo_after: true,
            expenses: { select: { amount: true } },
          },
        },
      },
    });

    const counts = { all: watches.length, in_progress: 0, completed: 0, sold: 0, no_project: 0 };
    const items: WatchCard[] = [];
    for (const watch of watches) {
      const resaleDate = watch.resale_date ? watch.resale_date.toISOString().slice(0, 10) : null;
      const latest = watch.restoration_projects[0] ?? null; // RG-PRJ-08 : le plus récent par created_at
      const card: WatchCard = {
        id: watch.id,
        brand: watch.brand,
        model: watch.model,
        movementCode: watch.movement_code,
        complicationLabels: watch.comporte.map((c) => c.complications.label).sort((a, b) => a.localeCompare(b)),
        status: computeStatus({ resaleDate, latestProjectStatus: latest?.status as ProjectStatus | null ?? null }),
        thumbnailUrl: latest ? (latest.photo_after ?? latest.photo_before) : null,
        margin: computeMargin({
          resalePrice: watch.resale_price,
          purchasePrice: watch.purchase_price,
          expenses: watch.restoration_projects.flatMap((p) => p.expenses.map((e) => e.amount)),
        })?.toFixed(2) ?? null,
      };
      counts[card.status] += 1;
      if (status === undefined || card.status === status) items.push(card);
    }
    return { items, counts };
  }

  /** Détail d'une montre avec tous ses projets (RG-PRJ-08) ; 404 si elle n'est pas à cet utilisateur (RG-SEC-01). */
  async findOne(userId: number, watchId: number): Promise<WatchDetail> {
    await this.ownership.findOwnedWatch(userId, watchId);
    const watch = await this.prisma.watches.findFirstOrThrow({
      where: { id: watchId, user_id: userId },
      include: WATCH_DETAIL_INCLUDE,
    });
    return toWatchDetail(watch);
  }

  /**
   * Crée la montre, ses complications, son premier projet et ses étapes en une seule écriture imbriquée :
   * Prisma l'exécute dans une transaction, si une partie échoue rien n'est enregistré (RG-PRJ-03).
   */
  async create(userId: number, dto: CreateWatchDto): Promise<WatchDetail> {
    // Une complication répétée ne s'associe qu'une fois (RG-MON-04, clé primaire de `comporte`).
    const codes = [...new Set(dto.complicationCodes ?? [])];
    await this.assertKnownComplications(codes);

    const watch = await this.prisma.watches.create({
      data: {
        user_id: userId,
        brand: dto.brand,
        model: dto.model,
        movement_code: dto.movementCode,
        purchase_price: dto.purchasePrice == null ? null : new Prisma.Decimal(dto.purchasePrice),
        purchase_date: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        comporte: { create: codes.map((complication_code) => ({ complication_code })) },
        restoration_projects: {
          create: {
            // RG-ETP-07 : la liste envoyée est la liste définitive, renumérotée 1, 2, 3…
            restoration_steps: { create: dto.steps.map((step, index) => ({ step_order: index + 1, label: step.label })) },
          },
        },
      },
      include: WATCH_DETAIL_INCLUDE,
    });
    return toWatchDetail(watch);
  }

  private async assertKnownComplications(codes: string[]): Promise<void> {
    if (codes.length === 0) return;
    const known = await this.prisma.complications.findMany({
      where: { complication_code: { in: codes } },
      select: { complication_code: true },
    });
    const knownCodes = new Set(known.map((c) => c.complication_code));
    const unknown = codes.filter((code) => !knownCodes.has(code));
    if (unknown.length > 0) {
      throw apiError(400, 'UNKNOWN_COMPLICATION', `Complication inconnue : ${unknown.join(', ')}`);
    }
  }
}
