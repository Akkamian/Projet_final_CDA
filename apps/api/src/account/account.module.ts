import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

@Module({
  imports: [StorageModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
