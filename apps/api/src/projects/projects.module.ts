import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { WatchesModule } from '../watches/watches.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [WatchesModule, StorageModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
