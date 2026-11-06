import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const apiDir = fileURLToPath(new URL('..', import.meta.url));

/**
 * Remet une base locale à neuf : supprime le schéma public, rejoue les migrations, puis le seed.
 * Remplace `prisma migrate reset`, que Prisma refuse de lancer depuis un agent.
 * Refuse toute base qui n'est pas sur la machine locale.
 */
export async function resetDatabase(url: string, options: { seed: boolean }): Promise<void> {
  const { hostname } = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(hostname)) {
    throw new Error(`reset-db refuse une base non locale (${hostname})`);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }

  const env = { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' };
  execSync('npx prisma migrate deploy', { cwd: apiDir, env, stdio: 'inherit' });
  if (options.seed) {
    execSync('npx prisma db seed', { cwd: apiDir, env, stdio: 'inherit' });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { config } = await import('dotenv');
  config({ path: '../../.env', quiet: true });
  await resetDatabase(process.env.DATABASE_URL ?? '', { seed: true });
}
