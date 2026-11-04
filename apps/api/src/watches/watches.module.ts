import { Module } from '@nestjs/common';
import { OwnershipService } from '../common/ownership.service.js';
import { WatchesController } from './watches.controller.js';
import { WatchesService } from './watches.service.js';

@Module({
  controllers: [WatchesController],
  providers: [WatchesService, OwnershipService],
  exports: [OwnershipService],
})
export class WatchesModule {}
