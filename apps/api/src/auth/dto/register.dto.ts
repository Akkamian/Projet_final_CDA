import { Equals, IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizedEmail } from '../../common/normalized-email.decorator.js';

export class RegisterDto {
  @NormalizedEmail()
  email: string;

  // 8 caractères minimum (RG-CPT-03) ; 72 au plus : bcrypt ignore le reste sans le dire.
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(72)
  password: string;

  // RG-CPT-17 : CGV et Politique de Confidentialité acceptées.
  @IsBoolean()
  @Equals(true, { message: 'Vous devez accepter les conditions générales et la politique de confidentialité' })
  acceptTerms: boolean;
}
