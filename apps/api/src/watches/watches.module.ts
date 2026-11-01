import { Module } from '@nestjs/common';
import { WatchesController } from './watches.controller.js';
import { WatchesService } from './watches.service.js';

@Module({
  controllers: [WatchesController],
  providers: [WatchesService],
})
export class WatchesModule {}
