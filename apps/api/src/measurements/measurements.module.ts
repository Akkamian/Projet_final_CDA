import { Module } from '@nestjs/common';
import { WatchesModule } from '../watches/watches.module.js';
import { MeasurementsController } from './measurements.controller.js';
import { MeasurementsService } from './measurements.service.js';

@Module({
  imports: [WatchesModule],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
})
export class MeasurementsModule {}
