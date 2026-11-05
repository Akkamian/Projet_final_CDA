import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { WatchesModule } from '../watches/watches.module.js';
import { PhotosController } from './photos.controller.js';
import { PhotosService } from './photos.service.js';

@Module({
  imports: [WatchesModule, StorageModule],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
