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
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Patch('password')
  @HttpCode(204)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.account.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
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
