import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

/** Email normalisé (espaces retirés, minuscules) puis validé (RG-CPT-02, RG-CPT-13). */
export const NormalizedEmail = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsEmail({}, { message: "Format d'adresse email invalide" }),
    MaxLength(255),
  );
