import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';
import { ConfigModule } from './config/config.module.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReferenceDataModule } from './reference-data/reference-data.module.js';
import { StepGenerationModule } from './step-generation/step-generation.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, ReferenceDataModule, StepGenerationModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: PrismaExceptionFilter }],
})
export class AppModule {}
