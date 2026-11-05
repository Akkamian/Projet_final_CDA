import { IsArray, IsInt } from 'class-validator';

/** Liste complète des étapes du projet, dans le nouvel ordre. Que ce soit exactement l'ensemble du projet se vérifie dans le service (RG-ETP-12). */
export class ReorderStepsDto {
  @IsArray()
  @IsInt({ each: true })
  stepIds: number[];
}
