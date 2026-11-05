import { Module } from '@nestjs/common';
import { WatchesModule } from '../watches/watches.module.js';
import { StepsController } from './steps.controller.js';
import { StepsService } from './steps.service.js';

@Module({
  imports: [WatchesModule],
  controllers: [StepsController],
  providers: [StepsService],
})
export class StepsModule {}
