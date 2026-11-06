import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator.js';
import { parseId } from '../common/parse-id.js';
import type { MeasurementDetail } from '../watches/watch-detail.js';
import { MeasurementDto, UpdateMeasurementDto } from './dto/measurement.dto.js';
import { MeasurementsService } from './measurements.service.js';

@Controller('projects/:projectId/measurements')
export class MeasurementsController {
  constructor(private readonly measurements: MeasurementsService) {}

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: MeasurementDto): Promise<MeasurementDetail> {
    return this.measurements.add(user.id, parseId(projectId), dto);
  }

  @Patch(':measurementId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('measurementId') measurementId: string,
    @Body() dto: UpdateMeasurementDto,
  ): Promise<MeasurementDetail> {
    return this.measurements.update(user.id, parseId(projectId), parseId(measurementId), dto);
  }

  @Delete(':measurementId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('measurementId') measurementId: string): Promise<void> {
    return this.measurements.remove(user.id, parseId(projectId), parseId(measurementId));
  }
}
