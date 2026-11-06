import { Module } from '@nestjs/common';
import { OwnershipService } from '../common/ownership.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { WatchesController } from './watches.controller.js';
import { WatchesService } from './watches.service.js';

@Module({
  imports: [StorageModule],
  controllers: [WatchesController],
  providers: [WatchesService, OwnershipService],
  exports: [OwnershipService],
})
export class WatchesModule {}
