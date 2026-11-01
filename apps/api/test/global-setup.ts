import { resetDatabase } from '../scripts/reset-db.js';

// Repart d'une base de test neuve : migrations, puis seed du référentiel.
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  await resetDatabase(url, { seed: true });
}
