import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { storageConfig } from './config/configuration.js';
import { GENERATED_KEY, UPLOADS_PREFIX } from './storage/local-storage.driver.js';

/** Réglages communs au démarrage réel (main.ts) et aux tests d'intégration. */
export function configureApp(app: INestApplication): void {
  // D5 : en production l'API est sur un sous-domaine, le front doit être autorisé explicitement.
  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  serveLocalUploads(app as NestExpressApplication);
}

/** Driver local : le dossier est servi en statique, sans contrôle de propriété (RG-SEC-06, compromis assumé). Avec S3, les URLs pointent le bucket. */
function serveLocalUploads(app: NestExpressApplication): void {
  const storage = storageConfig(process.env);
  if (storage.driver !== 'local') return;
  // Seules les clés produites par le service de stockage sont servies : rien d'autre posé dans le dossier ne sort.
  app.use(UPLOADS_PREFIX, (req: Request, res: Response, next: NextFunction) => {
    if (GENERATED_KEY.test(req.path.slice(1))) next();
    else res.status(404).end();
  });
  app.useStaticAssets(storage.uploadDir, {
    prefix: UPLOADS_PREFIX,
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });
}
