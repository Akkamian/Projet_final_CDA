import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Changement de mot de passe (S4, RG-CPT-11). */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  currentPassword: string;

  // RG-CPT-03 : 8 caractères minimum ; 72 au plus, bcrypt ignore le reste sans le dire.
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(72)
  newPassword: string;
}
