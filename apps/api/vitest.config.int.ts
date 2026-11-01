import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '../../.env', quiet: true });

// Tests d'intégration : vraie base PostgreSQL (TEST_DATABASE_URL), un fichier à la fois.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.int-spec.ts'],
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      WEB_ORIGIN: 'http://localhost:5173',
      JWT_SESSION_SECRET: 'test-session-secret',
      JWT_LINK_SECRET: 'test-link-secret',
      COOKIE_SECURE: 'false',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      MAIL_FROM: 'no-reply@test.local',
    },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
