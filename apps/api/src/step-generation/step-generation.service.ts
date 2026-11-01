import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { orderSteps, type GeneratedStep } from './order-steps.js';

export type MovementCode = 'manual' | 'automatic';

@Injectable()
export class StepGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compose la checklist proposée : étapes du type de mouvement + étapes de chaque complication,
   * triées selon RG-ETP-04. Ne persiste rien (l'aperçu est ajustable côté client avant création).
   */
  async generate(movementCode: MovementCode, complicationCodes: string[]): Promise<GeneratedStep[]> {
    const codes = [...new Set(complicationCodes)];

    const known = await this.prisma.complications.count({ where: { complication_code: { in: codes } } });
    if (known !== codes.length) {
      throw new BadRequestException('Une des complications demandées est inconnue');
    }

    const rows = await this.prisma.template_steps.findMany({
      where: { OR: [{ movement_code: movementCode }, { complication_code: { in: codes } }] },
      select: {
        label: true,
        step_order: true,
        complication_code: true,
        complications: { select: { label: true } },
      },
    });

    return orderSteps(
      rows.map((row) => ({
        label: row.label,
        stepOrder: row.step_order,
        complicationCode: row.complication_code,
        complicationLabel: row.complications?.label ?? null,
      })),
    );
  }
}
