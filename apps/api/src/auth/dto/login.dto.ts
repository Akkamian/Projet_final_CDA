import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizedEmail } from '../../common/normalized-email.decorator.js';

export class LoginDto {
  @NormalizedEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password: string;
}
