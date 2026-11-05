import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { WatchesModule } from '../watches/watches.module.js';
import { StepsController } from './steps.controller.js';
import { StepsService } from './steps.service.js';

@Module({
  imports: [WatchesModule, StorageModule],
  controllers: [StepsController],
  providers: [StepsService],
})
export class StepsModule {}
