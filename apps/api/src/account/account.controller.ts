import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Patch,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
} from '../auth/refresh-cookie.js';
import {
  SESSION_LIFETIME_SECONDS,
  TokensService,
} from '../auth/tokens.service.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/current-user.decorator.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/configuration.js';
import { AccountService } from './account.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';

@Controller('account')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly tokens: TokensService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Le changement ferme les autres sessions : l'appareil courant reçoit une session neuve pour rester connecté. */
  @Patch('password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    await this.account.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    res.cookie(REFRESH_COOKIE, this.tokens.signSession('refresh', user.id), {
      ...refreshCookieOptions(this.config),
      maxAge: SESSION_LIFETIME_SECONDS.refresh * 1000,
    });
    return { accessToken: this.tokens.signSession('access', user.id) };
  }

  @Delete()
  @HttpCode(204)
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.account.deleteAccount(user.id, dto.password);
    // La session est fermée : le cookie de renouvellement est effacé (S35).
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.config));
  }
}
