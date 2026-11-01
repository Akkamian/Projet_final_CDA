import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReferenceDataService {
  constructor(private readonly prisma: PrismaService) {}

  async listMovementTypes(): Promise<{ movementCode: 'manual' | 'automatic'; label: string }[]> {
    const rows = await this.prisma.movement_types.findMany({ orderBy: { movement_code: 'asc' } });
    return rows.map((row) => ({ movementCode: row.movement_code, label: row.label }));
  }

  async listComplications(): Promise<{ complicationCode: string; label: string }[]> {
    const rows = await this.prisma.complications.findMany({ orderBy: { complication_code: 'asc' } });
    return rows.map((row) => ({ complicationCode: row.complication_code, label: row.label }));
  }
}
