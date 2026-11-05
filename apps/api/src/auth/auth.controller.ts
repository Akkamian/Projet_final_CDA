import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/public.decorator.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { AuthService, type SessionTokens } from './auth.service.js';
import { EmailDto } from './dto/email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TokenDto } from './dto/token.dto.js';
import { REFRESH_COOKIE, refreshCookieOptions } from './refresh-cookie.js';
import { SESSION_LIFETIME_SECONDS } from './tokens.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

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

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ accessToken: string }> {
    return this.startSession(res, await this.auth.login(dto));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ accessToken: string }> {
    const cookies = req.cookies as Record<string, string> | undefined;
    return this.startSession(res, await this.auth.refresh(cookies?.[REFRESH_COOKIE]));
  }

  // Jeton sans état : se déconnecter revient à effacer le cookie (CONCEPTION-TECHNIQUE §5).
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private startSession(res: Response, tokens: SessionTokens): { accessToken: string } {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(),
      maxAge: SESSION_LIFETIME_SECONDS.refresh * 1000,
    });
    return { accessToken: tokens.accessToken };
  }

  private cookieOptions() {
    return refreshCookieOptions(this.config);
  }
}
