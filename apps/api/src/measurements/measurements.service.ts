import { Injectable } from '@nestjs/common';
import { OwnershipService } from '../common/ownership.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toMeasurementDetail, type MeasurementDetail } from '../watches/watch-detail.js';
import type { MeasurementDto, UpdateMeasurementDto } from './dto/measurement.dto.js';

@Injectable()
export class MeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async add(userId: number, projectId: number, dto: MeasurementDto): Promise<MeasurementDetail> {
    await this.ownership.findOwnedProject(userId, projectId);
    const row = await this.prisma.performance_measurements.create({
      data: {
        project_id: projectId,
        measured_at: new Date(dto.measuredAt),
        rate_seconds_per_day: dto.rateSecondsPerDay,
        beat_error_ms: dto.beatErrorMs,
        amplitude_degrees: dto.amplitudeDegrees,
        watch_position: dto.watchPosition ?? null,
      },
    });
    return toMeasurementDetail(row);
  }

  /** Un champ absent reste inchangé ; la position à null est effacée (S33, RG-PER-05). */
  async update(userId: number, projectId: number, measurementId: number, dto: UpdateMeasurementDto): Promise<MeasurementDetail> {
    await this.ownership.findOwnedMeasurement(userId, projectId, measurementId);
    const data: Prisma.performance_measurementsUpdateInput = {};
    if (dto.measuredAt !== undefined) data.measured_at = new Date(dto.measuredAt);
    if (dto.rateSecondsPerDay !== undefined) data.rate_seconds_per_day = dto.rateSecondsPerDay;
    if (dto.beatErrorMs !== undefined) data.beat_error_ms = dto.beatErrorMs;
    if (dto.amplitudeDegrees !== undefined) data.amplitude_degrees = dto.amplitudeDegrees;
    if (dto.watchPosition !== undefined) data.watch_position = dto.watchPosition;
    return toMeasurementDetail(await this.prisma.performance_measurements.update({ where: { id: measurementId }, data }));
  }

  async remove(userId: number, projectId: number, measurementId: number): Promise<void> {
    await this.ownership.findOwnedMeasurement(userId, projectId, measurementId);
    await this.prisma.performance_measurements.deleteMany({ where: { id: measurementId, project_id: projectId } });
  }
}
