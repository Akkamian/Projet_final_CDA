import { Global, Module } from '@nestjs/common';
import { configuration } from './configuration.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => configuration() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
