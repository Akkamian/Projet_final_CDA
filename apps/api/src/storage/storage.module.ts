import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { LocalStorageDriver } from './local-storage.driver.js';
import { S3StorageDriver } from './s3-storage.driver.js';
import { StorageService } from './storage.service.js';

@Module({
  providers: [
    {
      provide: StorageService,
      inject: [APP_CONFIG],
      useFactory: ({ storage }: AppConfig): StorageService =>
        storage.driver === 's3' ? new S3StorageDriver(storage) : new LocalStorageDriver(storage.uploadDir),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
