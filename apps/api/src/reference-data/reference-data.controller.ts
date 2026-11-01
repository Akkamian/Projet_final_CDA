import { Controller, Get } from '@nestjs/common';
import { ReferenceDataService } from './reference-data.service.js';

// Données de référence : lecture seule, aucune route d'écriture (RG-ETP-03).
// Routes publiques tant que la garde d'authentification n'existe pas (tâche 9 du plan).
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
