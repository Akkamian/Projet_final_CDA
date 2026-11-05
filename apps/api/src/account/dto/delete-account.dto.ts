import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Confirmation par le mot de passe (S35, RG-CPT-15). */
export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password: string;
}
