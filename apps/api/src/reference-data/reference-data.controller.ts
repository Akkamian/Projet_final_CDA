import { Controller, Get } from '@nestjs/common';
import { ReferenceDataService } from './reference-data.service.js';

// Données de référence : lecture seule, aucune route d'écriture (RG-ETP-03).
@Controller()
export class ReferenceDataController {
  constructor(private readonly referenceData: ReferenceDataService) {}

  @Get('movement-types')
  movementTypes() {
    return this.referenceData.listMovementTypes();
  }

  @Get('complications')
  complications() {
    return this.referenceData.listComplications();
  }
}
