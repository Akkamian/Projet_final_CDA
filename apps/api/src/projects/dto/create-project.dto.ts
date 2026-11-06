import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { StepDto } from '../../watches/dto/create-watch.dto.js';

/** Nouvelle révision (S9) : la liste des étapes envoyée est la liste définitive, comme à la création d'une montre (RG-ETP-07). */
export class CreateProjectDto {
  @IsArray({ message: 'Les étapes doivent former une liste' })
  @ArrayNotEmpty({ message: 'Le projet doit contenir au moins une étape' })
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: StepDto[];
}
