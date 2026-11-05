import { config } from 'dotenv';

/** En dev le .env est à la racine du monorepo ; en production seules les variables de l'hébergeur comptent, un .env envoyé par erreur est ignoré. */
export function loadDevEnv(
  env: NodeJS.ProcessEnv = process.env,
  load: typeof config = config,
): void {
  if (env.NODE_ENV === 'production') return;
  load({ path: '../../.env', quiet: true });
}
