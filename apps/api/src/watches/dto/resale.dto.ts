import { IsNumber, Matches, Max, Min } from 'class-validator';
import { HasMaxTwoDecimals } from '../../common/has-max-two-decimals.validator.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.validator.js';
import { numericText } from './create-watch.dto.js';

/**
 * Revente (S22, S31) : prix et date obligatoires ensemble (RG-FIN-03). La même forme sert à la saisie et à la correction.
 * La date n'est comparée à la date d'achat que dans le service, sous verrou (RG-FIN-10).
 */
export class ResaleDto {
  // NUMERIC(10,2) : jamais plus de 99999999.99, jamais plus de deux décimales ; positif ou nul (RG-FIN-04).
  @numericText()
  @IsNumber({}, { message: 'Le prix de revente doit être un nombre' })
  @HasMaxTwoDecimals({ message: 'Le prix de revente doit avoir deux décimales au plus' })
  @Min(0, { message: 'Le prix de revente ne peut pas être négatif' })
  @Max(99999999.99, { message: 'Le prix de revente est trop élevé' })
  price: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date de revente doit être au format AAAA-MM-JJ' })
  @IsNotFutureDate({ message: 'La date de revente doit être une date existante, pas dans le futur' })
  date: string;
}
