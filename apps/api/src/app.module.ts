import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReferenceDataModule } from './reference-data/reference-data.module.js';
import { StepGenerationModule } from './step-generation/step-generation.module.js';

@Module({
  imports: [PrismaModule, ReferenceDataModule, StepGenerationModule],
  controllers: [HealthController],
})
export class AppModule {}
