import { Injectable } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { OwnershipService } from '../common/ownership.service.js';
import { projectPhotoUrls } from '../photos/photo-urls.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateWatchDto } from './dto/create-watch.dto.js';
import type { ResaleDto } from './dto/resale.dto.js';
import type { UpdateWatchDto } from './dto/update-watch.dto.js';
import { computeMargin } from './margin.js';
import type { WatchListQuery } from './list-query.js';
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
  purchasePrice: string | null;
  purchaseDate: string | null;
  resalePrice: string | null;
  resaleDate: string | null;
  /** Étapes du projet le plus récent (RG-AFF-07) ; null sans projet. */
  progress: { done: number; total: number } | null;
}

export interface WatchList {
  items: WatchCard[];
  counts: { all: number } & Record<DashboardStatus, number>;
  total: number;
  page: number;
  pageSize: number;
  /** Somme des marges de toutes les montres vendues (RG-AFF-10), indépendante du filtre. */
  totalMargin: string;
}

@Injectable()
export class WatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Tableau de bord : une carte par montre, en une seule requête (montres, complications, projets et coûts).
   * `counts` et `totalMargin` portent sur toutes les montres de l'utilisateur, quel que soit le filtre (S40, RG-AFF-10).
   * Les plus récemment ajoutées d'abord.
   */
  async list(userId: number, query: WatchListQuery): Promise<WatchList> {
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
            restoration_steps: { select: { is_completed: true } },
          },
        },
      },
    });

    const counts = { all: watches.length, in_progress: 0, completed: 0, sold: 0, no_project: 0 };
    const items: WatchCard[] = [];
    let totalMargin = new Prisma.Decimal(0);
    for (const watch of watches) {
      const resaleDate = watch.resale_date ? watch.resale_date.toISOString().slice(0, 10) : null;
      const latest = watch.restoration_projects[0] ?? null; // RG-PRJ-08 : le plus récent par created_at
      const margin = computeMargin({
        resalePrice: watch.resale_price,
        purchasePrice: watch.purchase_price,
        expenses: watch.restoration_projects.flatMap((p) => p.expenses.map((e) => e.amount)),
      });
      if (margin) totalMargin = totalMargin.plus(margin);
      const card: WatchCard = {
        id: watch.id,
        brand: watch.brand,
        model: watch.model,
        movementCode: watch.movement_code,
        complicationLabels: watch.comporte.map((c) => c.complications.label).sort((a, b) => a.localeCompare(b)),
        status: computeStatus({ resaleDate, latestProjectStatus: latest?.status as ProjectStatus | null ?? null }),
        thumbnailUrl: latest ? (latest.photo_after ?? latest.photo_before) : null,
        margin: margin?.toFixed(2) ?? null,
        purchasePrice: watch.purchase_price?.toFixed(2) ?? null,
        purchaseDate: watch.purchase_date ? watch.purchase_date.toISOString().slice(0, 10) : null,
        resalePrice: watch.resale_price?.toFixed(2) ?? null,
        resaleDate,
        progress: latest
          ? { done: latest.restoration_steps.filter((s) => s.is_completed).length, total: latest.restoration_steps.length }
          : null,
      };
      counts[card.status] += 1;
      if (query.status === undefined || card.status === query.status) items.push(card);
    }
    return { items, counts, total: items.length, page: query.page, pageSize: query.pageSize, totalMargin: totalMargin.toFixed(2) };
  }

  /**
   * Modifie la montre et, si `complicationCodes` est envoyé, remplace ses complications, dans une transaction.
   * Les étapes des projets existants ne sont jamais touchées (RG-MON-08) : seules les nouvelles révisions
   * utiliseront les complications modifiées.
   */
  async update(userId: number, watchId: number, dto: UpdateWatchDto): Promise<WatchDetail> {
    // @IsOptional laisse passer null ; ces colonnes sont obligatoires (RG-MON-01), la base répondrait 500.
    for (const [field, value] of [['marque', dto.brand], ['modèle', dto.model], ['type de mouvement', dto.movementCode], ['complications', dto.complicationCodes]] as const) {
      if (value === null) throw apiError(400, 'REQUIRED_FIELD', `Le champ « ${field} » ne peut pas être null`);
    }
    await this.ownership.findOwnedWatch(userId, watchId);

    const codes = dto.complicationCodes === undefined ? undefined : [...new Set(dto.complicationCodes)];
    if (codes) await this.assertKnownComplications(codes);

    await this.prisma.$transaction(async (tx) => {
      // Sous le verrou de la montre, comme setResale : une revente concurrente est vue ici et non écrasée, la base ne répond pas 500 (RG-FIN-10).
      await tx.$queryRaw`SELECT id FROM watches WHERE id = ${watchId} FOR UPDATE`;
      const current = await tx.watches.findUniqueOrThrow({ where: { id: watchId } });
      // RG-FIN-10 : la base la refuserait aussi (chk_watches_resale_after_purchase), mais en erreur 500.
      const purchaseDate = dto.purchaseDate === undefined ? current.purchase_date : dto.purchaseDate ? new Date(dto.purchaseDate) : null;
      if (purchaseDate && current.resale_date && purchaseDate > current.resale_date) {
        throw apiError(400, 'PURCHASE_AFTER_RESALE', 'La date d’achat ne peut pas être postérieure à la date de revente');
      }
      await tx.watches.update({
        where: { id: watchId },
        data: {
          brand: dto.brand,
          model: dto.model,
          movement_code: dto.movementCode,
          purchase_price: dto.purchasePrice === undefined ? undefined : dto.purchasePrice === null ? null : new Prisma.Decimal(dto.purchasePrice),
          purchase_date: dto.purchaseDate === undefined ? undefined : purchaseDate,
          updated_at: new Date(),
        },
      });
      if (codes) {
        await tx.comporte.deleteMany({ where: { watch_id: watchId } });
        await tx.comporte.createMany({ data: codes.map((complication_code) => ({ watch_id: watchId, complication_code })) });
      }
    });
    return this.findOne(userId, watchId);
  }

  /**
   * Saisie (S22) ou correction (S31) de la revente : prix et date s'écrivent ensemble (RG-FIN-03).
   * Refusée tant qu'un projet est en cours (RG-FIN-05), qu'il s'agisse d'une saisie ou d'une correction.
   * Les contrôles se font sous verrou de la montre : une revente et une modification concurrentes ne peuvent pas
   * se croiser, la base ne répond jamais 500 à la place du refus (RG-FIN-10, chk_watches_resale_after_purchase).
   */
  async setResale(userId: number, watchId: number, dto: ResaleDto): Promise<WatchDetail> {
    await this.ownership.findOwnedWatch(userId, watchId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM watches WHERE id = ${watchId} FOR UPDATE`;
      const current = await tx.watches.findUniqueOrThrow({ where: { id: watchId } });
      const inProgress = await tx.restoration_projects.count({ where: { watch_id: watchId, status: 'in_progress' } });
      if (inProgress > 0) {
        throw apiError(409, 'PROJECT_IN_PROGRESS', 'La revente est impossible tant qu’un projet est en cours : terminez-le d’abord');
      }
      const date = new Date(dto.date);
      if (current.purchase_date && date < current.purchase_date) {
        throw apiError(400, 'RESALE_BEFORE_PURCHASE', 'La date de revente ne peut pas précéder la date d’achat');
      }
      await tx.watches.update({
        where: { id: watchId },
        data: { resale_price: new Prisma.Decimal(dto.price), resale_date: date, updated_at: new Date() },
      });
    });
    return this.findOne(userId, watchId);
  }

  /** Annule la revente : la montre n'est plus vendue et aucune marge n'est calculée (S31, RG-FIN-12). Sans revente, rien ne change. */
  async clearResale(userId: number, watchId: number): Promise<WatchDetail> {
    await this.ownership.findOwnedWatch(userId, watchId);
    await this.prisma.watches.update({ where: { id: watchId }, data: { resale_price: null, resale_date: null, updated_at: new Date() } });
    return this.findOne(userId, watchId);
  }

  /**
   * Supprime la montre, vendue ou non, avec ses complications, ses projets et toutes leurs données (cascade, RG-MON-11) ;
   * les fichiers photos s'effacent après le commit, sans faire échouer la requête.
   */
  async remove(userId: number, watchId: number): Promise<void> {
    await this.ownership.findOwnedWatch(userId, watchId);
    const urls = await this.prisma.$transaction(async (tx) => {
      const found = await projectPhotoUrls(tx, { watch_id: watchId });
      await tx.watches.deleteMany({ where: { id: watchId, user_id: userId } });
      return found;
    });
    await Promise.all(urls.map((url) => this.storage.deleteQuietly(url)));
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
