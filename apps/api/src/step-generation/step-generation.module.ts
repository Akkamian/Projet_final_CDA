import { Module } from '@nestjs/common';
import { StepGenerationService } from './step-generation.service.js';
import { StepPreviewsController } from './step-previews.controller.js';

@Module({
  controllers: [StepPreviewsController],
  providers: [StepGenerationService],
  exports: [StepGenerationService],
})
export class StepGenerationModule {}
