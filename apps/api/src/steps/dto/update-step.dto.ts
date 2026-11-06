import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

const trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

// PostgreSQL ne stocke pas le caractère NUL dans un texte : on le refuse en 400 plutôt que de répondre 500.
// oxlint-disable-next-line no-control-regex -- le caractère de contrôle est justement ce qu'on cherche à refuser
const NO_NUL = /^[^\u0000]*$/;
const NO_NUL_MESSAGE = { message: 'Le texte contient un caractère interdit' };

/** Champs facultatifs : un champ absent reste inchangé ; `notes` à null l'efface (S16). Le rang ne se change que par le réordonnancement. */
export class UpdateStepDto {
  // `ValidateIf` plutôt que `IsOptional` : null est refusé pour le libellé (RG-ETP-08), seul `undefined` le laisse inchangé.
  @ValidateIf((_, value) => value !== undefined)
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'Le libellé d’une étape est obligatoire' })
  @MaxLength(255, { message: 'Le libellé d’une étape est limité à 255 caractères' })
  @Matches(NO_NUL, NO_NUL_MESSAGE)
  label?: string;

  @IsOptional()
  @IsString()
  @Matches(NO_NUL, NO_NUL_MESSAGE)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
