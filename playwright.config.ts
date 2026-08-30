import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = process.env.DOC_E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: externalBaseURL || 'http://localhost:3101',
    channel: 'chromium',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run dev -- --hostname 127.0.0.1 --port 3101',
        url: 'http://localhost:3101/en/signin',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          AUTH_SECRET: 'local-visual-test-only',
          NEXTAUTH_URL: 'http://localhost:3101',
          NEXT_PUBLIC_APP_URL: 'http://localhost:3101',
        },
      },
})
