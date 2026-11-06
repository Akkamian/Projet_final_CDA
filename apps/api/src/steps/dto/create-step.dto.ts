import { StepDto } from '../../watches/dto/create-watch.dto.js';

/** Ajout d'une étape : un libellé obligatoire, 255 caractères maximum (RG-ETP-08, RG-GEN-02). */
export class CreateStepDto extends StepDto {}
