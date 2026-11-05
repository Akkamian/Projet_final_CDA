import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string;

  // RG-CPT-03 : 8 caractères minimum ; 72 au plus, bcrypt ignore le reste sans le dire.
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(72)
  password: string;
}
