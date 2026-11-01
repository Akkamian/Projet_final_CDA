import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../common/public.decorator.js';
import { AuthService } from './auth.service.js';
import { EmailDto } from './dto/email.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TokenDto } from './dto/token.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<void> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(204)
  verifyEmail(@Body() dto: TokenDto): Promise<void> {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(204)
  resendVerification(@Body() dto: EmailDto): Promise<void> {
    return this.auth.resendVerification(dto.email);
  }
}
