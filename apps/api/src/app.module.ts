import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';
import { ConfigModule } from './config/config.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { HealthController } from './health.controller.js';
import { MeasurementsModule } from './measurements/measurements.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReferenceDataModule } from './reference-data/reference-data.module.js';
import { StepGenerationModule } from './step-generation/step-generation.module.js';
import { StepsModule } from './steps/steps.module.js';
import { WatchesModule } from './watches/watches.module.js';

@Module({
  imports: [ConfigModule, AuthModule, PrismaModule, ReferenceDataModule, StepGenerationModule, StepsModule, WatchesModule, PhotosModule, MeasurementsModule, ExpensesModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
