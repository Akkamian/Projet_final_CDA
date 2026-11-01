import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Réglages communs au démarrage réel (main.ts) et aux tests d'intégration. */
export function configureApp(app: INestApplication): void {
  // D5 : en production l'API est sur un sous-domaine, le front doit être autorisé explicitement.
  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
