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
import { IsNotFutureDate } from '../../common/is-not-future-date.validator.js';

const trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

// Un prix peut arriver en texte (« 80.50 ») : on le lit comme nombre ; tout autre texte reste tel quel et sera refusé.
const numericText = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value,
  );

export class StepDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'Le libellé d’une étape est obligatoire' })
  @MaxLength(255)
  label: string;
}

export class CreateWatchDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'La marque est obligatoire' })
  @MaxLength(255)
  brand: string;

  @trim()
  @IsString()
  @IsNotEmpty({ message: 'Le modèle est obligatoire' })
  @MaxLength(255)
  model: string;

  @IsIn(['manual', 'automatic'], { message: 'Le type de mouvement doit être « manual » ou « automatic »' })
  movementCode: 'manual' | 'automatic';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  complicationCodes?: string[];

  // NUMERIC(10,2) : jamais plus de 99999999.99, jamais plus de deux décimales (RG-MON-07).
  @IsOptional()
  @numericText()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Le prix d’achat doit être un nombre à deux décimales au plus' })
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
