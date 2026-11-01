import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { GeneratedStep } from './order-steps.js';
import { StepGenerationService } from './step-generation.service.js';

@Controller('step-previews')
export class StepPreviewsController {
  constructor(private readonly generation: StepGenerationService) {}

  // Route publique tant que la garde d'authentification n'existe pas (tâche 9 du plan).
  @Get()
  preview(
    @Query('movementCode') movementCode?: string,
    @Query('complicationCodes') complicationCodes?: string,
  ): Promise<GeneratedStep[]> {
    if (movementCode !== 'manual' && movementCode !== 'automatic') {
      throw new BadRequestException('movementCode doit valoir « manual » ou « automatic »');
    }
    const codes = (complicationCodes ?? '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean);
    return this.generation.generate(movementCode, codes);
  }
}
