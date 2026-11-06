import { config as loadEnv } from 'dotenv'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

loadEnv({ path: '.env', quiet: true })

// Ports dédiés : les serveurs de développement (API 3000, web 5173) ne sont ni utilisés ni touchés.
const API_PORT = 3200
const WEB_PORT = 5273
const testDb = process.env.TEST_DATABASE_URL ?? ''
if (!new URL(testDb || 'postgresql://x/y').pathname.slice(1).endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test')
}

export default defineConfig({
  testDir: './e2e',
  // Les parcours partagent une base et un MailDev : un test à la fois.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { baseURL: `http://localhost:${WEB_PORT}`, channel: 'chrome', trace: 'retain-on-failure' },
  webServer: [
    {
      // Base de test remise à neuf, puis API compilée à part (dist-e2e : le dist du développement reste intact).
      command:
        'npm run db:reset -w apps/api && npx tsc -p apps/api/tsconfig.build.json --outDir apps/api/dist-e2e --incremental false && node apps/api/dist-e2e/main.js',
      url: `http://localhost:${API_PORT}/health`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: testDb,
        PORT: String(API_PORT),
        WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
        JWT_SESSION_SECRET: 'e2e-session-secret',
        JWT_LINK_SECRET: 'e2e-link-secret',
        COOKIE_SECURE: 'false',
        THROTTLE_LIMIT: '1000',
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: '1025',
        MAIL_FROM: 'no-reply@watch-tracker.local',
        STORAGE_DRIVER: 'local',
        UPLOAD_DIR: join(tmpdir(), 'wrt-e2e-uploads'),
      },
    },
    {
      command: `npm run dev -w apps/web -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
    },
  ],
})
