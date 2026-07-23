import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for rendering the Welcome page and capturing
 * fidelity-verification screenshots against the Figma frame
 * (fileKey U1wiYiDtkktS3L2hsXteNO, node 5845:45077, 1536 x 3324).
 *
 * The screenshot deliverable is produced by scripts/capture-screenshots.mjs,
 * which drives Playwright's API directly against the Vite preview server.
 * This config provides shared defaults (preview URL + 1536px design width)
 * for any Playwright-based checks.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1536, height: 1024 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
