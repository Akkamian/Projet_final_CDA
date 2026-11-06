import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '../../.env', quiet: true });

// Le référentiel (types de mouvement, complications, étapes types) vit dans db/seed_reference_data.sql,
// relisible par un horloger. Le protocole simple de pg accepte plusieurs instructions d'un coup.
const sql = readFileSync(new URL('../../../db/seed_reference_data.sql', import.meta.url), 'utf8');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
  console.log('Seed du référentiel chargé.');
} finally {
  await client.end();
}
