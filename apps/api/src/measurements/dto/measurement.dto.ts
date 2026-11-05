import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { HasMaxTwoDecimals } from '../../common/has-max-two-decimals.validator.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.validator.js';
import { numericText } from '../../watches/dto/create-watch.dto.js';

// PostgreSQL ne stocke pas le caractère NUL dans un texte : on le refuse en 400 plutôt que de répondre 500.
// oxlint-disable-next-line no-control-regex -- le caractère de contrôle est justement ce qu'on cherche à refuser
const NO_NUL = /^[^\u0000]*$/;

const trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

// NUMERIC(5,2) : jamais plus de 999.99 en valeur absolue, jamais plus de deux décimales.
const measure = (label: string, min: number) =>
  applyDecorators(
    numericText(),
    IsNumber({}, { message: `${label} doit être un nombre` }),
    HasMaxTwoDecimals({ message: `${label} doit avoir deux décimales au plus` }),
    Min(min, { message: min < 0 ? `${label} est trop faible` : `${label} ne peut pas être négatif (RG-PER-03)` }),
    Max(999.99, { message: `${label} est trop élevé` }),
  );

// La marche est négative quand la montre retarde ; beat error et amplitude ne le sont jamais (RG-PER-03).
const rate = () => measure('La marche', -999.99);
const beatError = () => measure('Le beat error', 0);
const amplitude = () => measure('L’amplitude', 0);
const measuredAt = () => IsNotFutureDate({ message: 'La date de mesure doit être une date existante, pas dans le futur' });
const position = () =>
  applyDecorators(
    IsOptional(),
    trim(),
    IsString(),
    MaxLength(50, { message: 'La position est limitée à 50 caractères' }),
    Matches(NO_NUL, { message: 'Le texte contient un caractère interdit' }),
  );

/** Un champ absent reste inchangé ; `null` est refusé (la base répondrait 500), sauf pour la position qu'il efface. */
const whenSent = () => ValidateIf((_, value) => value !== undefined);

/** Mesure au timegrapher (S19) : date, marche, beat error et amplitude obligatoires, position facultative (RG-PER-02). */
export class MeasurementDto {
  @measuredAt()
  measuredAt: string;

  @rate()
  rateSecondsPerDay: number;

  @beatError()
  beatErrorMs: number;

  @amplitude()
  amplitudeDegrees: number;

  @position()
  watchPosition?: string | null;
}

/** Modification (S33, RG-PER-05) : mêmes contrôles qu'à la saisie, sur les seuls champs envoyés. */
export class UpdateMeasurementDto {
  @whenSent()
  @measuredAt()
  measuredAt?: string;

  @whenSent()
  @rate()
  rateSecondsPerDay?: number;

  @whenSent()
  @beatError()
  beatErrorMs?: number;

  @whenSent()
  @amplitude()
  amplitudeDegrees?: number;

  @position()
  watchPosition?: string | null;
}
