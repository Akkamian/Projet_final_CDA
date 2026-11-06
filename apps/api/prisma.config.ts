import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Le .env vit à la racine du monorepo ; les variables déjà définies (tests) ne sont pas écrasées.
config({ path: '../../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
