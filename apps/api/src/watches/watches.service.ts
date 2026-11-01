import { Injectable } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWatchDto } from './dto/create-watch.dto.js';
import { toWatchDetail, WATCH_DETAIL_INCLUDE, type WatchDetail } from './watch-detail.js';

@Injectable()
export class WatchesService {
  constructor(private readonly prisma: PrismaService) {}

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
