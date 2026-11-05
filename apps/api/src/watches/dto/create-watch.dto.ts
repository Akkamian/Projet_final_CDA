import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { HasMaxTwoDecimals } from '../../common/has-max-two-decimals.validator.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.validator.js';

const trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

// PostgreSQL ne stocke pas le caractère NUL dans un texte : on le refuse en 400 plutôt que de répondre 500.
// oxlint-disable-next-line no-control-regex -- le caractère de contrôle est justement ce qu'on cherche à refuser
const NO_NUL = /^[^\u0000]*$/;
const NO_NUL_MESSAGE = { message: 'Le texte contient un caractère interdit' };

// Un prix peut arriver en texte (« 80.50 ») : on le lit comme nombre ; tout autre texte reste tel quel et sera refusé.
export const numericText = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value,
  );

export class StepDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'Le libellé d’une étape est obligatoire' })
  @MaxLength(255, { message: 'Le libellé d’une étape est limité à 255 caractères' })
  @Matches(NO_NUL, NO_NUL_MESSAGE)
  label: string;
}

export class CreateWatchDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'La marque est obligatoire' })
  @MaxLength(255, { message: 'La marque est limitée à 255 caractères' })
  @Matches(NO_NUL, NO_NUL_MESSAGE)
  brand: string;

  @trim()
  @IsString()
  @IsNotEmpty({ message: 'Le modèle est obligatoire' })
  @MaxLength(255, { message: 'Le modèle est limité à 255 caractères' })
  @Matches(NO_NUL, NO_NUL_MESSAGE)
  model: string;

  @IsIn(['manual', 'automatic'], { message: 'Le type de mouvement doit être « manual » ou « automatic »' })
  movementCode: 'manual' | 'automatic';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(NO_NUL, { each: true, ...NO_NUL_MESSAGE })
  complicationCodes?: string[];

  // NUMERIC(10,2) : jamais plus de 99999999.99, jamais plus de deux décimales (RG-MON-07).
  @IsOptional()
  @numericText()
  @IsNumber({}, { message: 'Le prix d’achat doit être un nombre' })
  @HasMaxTwoDecimals({ message: 'Le prix d’achat doit avoir deux décimales au plus' })
  @Min(0, { message: 'Le prix d’achat ne peut pas être négatif' })
  @Max(99999999.99, { message: 'Le prix d’achat est trop élevé' })
  purchasePrice?: number | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date d’achat doit être au format AAAA-MM-JJ' })
  @IsNotFutureDate({ message: 'La date d’achat doit être une date existante, pas dans le futur' })
  purchaseDate?: string | null;

  @IsArray()
  @ArrayNotEmpty({ message: 'Le projet doit contenir au moins une étape' })
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: StepDto[];
}
