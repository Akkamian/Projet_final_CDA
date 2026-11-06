import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { HasMaxTwoDecimals } from '../../common/has-max-two-decimals.validator.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.validator.js';
import { numericText } from '../../watches/dto/create-watch.dto.js';

// PostgreSQL ne stocke pas le caractère NUL dans un texte : on le refuse en 400 plutôt que de répondre 500.
// oxlint-disable-next-line no-control-regex -- le caractère de contrôle est justement ce qu'on cherche à refuser
const NO_NUL = /^[^\u0000]*$/;

const trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

const label = () =>
  applyDecorators(
    trim(),
    IsString(),
    IsNotEmpty({ message: 'Le libellé du coût est obligatoire' }),
    MaxLength(255, { message: 'Le libellé du coût est limité à 255 caractères' }),
    Matches(NO_NUL, { message: 'Le texte contient un caractère interdit' }),
  );

// NUMERIC(10,2) : jamais plus de 99999999.99, jamais plus de deux décimales ; positif ou nul (RG-FIN-02).
const amount = () =>
  applyDecorators(
    numericText(),
    IsNumber({}, { message: 'Le montant doit être un nombre' }),
    HasMaxTwoDecimals({ message: 'Le montant doit avoir deux décimales au plus' }),
    Min(0, { message: 'Le montant ne peut pas être négatif' }),
    Max(99999999.99, { message: 'Le montant est trop élevé' }),
  );

// Colonne DATE : un jour AAAA-MM-JJ, pas un horodatage, et pas dans le futur (RG-GEN-01).
const expenseDate = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date du coût doit être au format AAAA-MM-JJ' }),
    IsNotFutureDate({ message: 'La date du coût doit être une date existante, pas dans le futur' }),
  );

/** Un champ absent reste inchangé ; `null` est refusé (la base répondrait 500) : aucun champ du coût n'est facultatif. */
const whenSent = () => ValidateIf((_, value) => value !== undefined);

/** Coût additionnel d'un projet (S21) : libellé, montant et date obligatoires (RG-FIN-01). */
export class ExpenseDto {
  @label()
  label: string;

  @amount()
  amount: number;

  @expenseDate()
  expenseDate: string;
}

/** Modification (S32, RG-FIN-11) : mêmes contrôles qu'à la saisie, sur les seuls champs envoyés. */
export class UpdateExpenseDto {
  @whenSent()
  @label()
  label?: string;

  @whenSent()
  @amount()
  amount?: number;

  @whenSent()
  @expenseDate()
  expenseDate?: string;
}
