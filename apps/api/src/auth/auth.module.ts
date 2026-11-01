import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [MailModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService],
  exports: [TokensService],
})
export class AuthModule {}
