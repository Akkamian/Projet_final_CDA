import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateWatchDto } from './create-watch.dto.js';

/**
 * Champs de la création sauf les étapes, tous facultatifs : un champ absent reste inchangé (S10).
 * `complicationCodes` présent remplace tout l'ensemble ; `purchasePrice` ou `purchaseDate` à null les efface (RG-MON-06).
 * Le prix et la date de revente ne se modifient pas ici (tâche 26).
 */
export class UpdateWatchDto extends PartialType(OmitType(CreateWatchDto, ['steps'] as const)) {}
