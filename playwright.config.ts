import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration — screenshot-fidelity verification of the Figma
 * "Welcome" frame.
 *
 *   Figma design source:
 *     fileKey = U1wiYiDtkktS3L2hsXteNO
 *     node    = 5845:45077  ("Welcome")
 *     frame   = 1536 × 3324 px
 *
 * The primary verification deliverable is produced by the standalone script
 * `scripts/capture-screenshots.mjs`, which drives Playwright's API directly:
 * it boots the Vite preview server, opens the rendered page, and captures a
 * full-page PNG at the exact Figma design width. This config file exists to
 * provide shared, aligned defaults for any `@playwright/test`-driven checks
 * that live under `./scripts`, so that ad-hoc tests observe the same
 * pixel-faithful rendering environment the capture script relies on:
 *
 *   • baseURL           → the Vite `preview` server (default port 4173)
 *   • viewport.width    → 1536 px, the Figma frame width (fidelity-critical)
 *   • deviceScaleFactor → 1, for a 1:1 mapping of CSS px to device px
 *
 * Only the Chromium engine is configured: the capture workflow targets
 * Chromium and its browser binary is provisioned once via
 * `npx playwright install chromium`.
 *
 * @see https://www.figma.com/design/U1wiYiDtkktS3L2hsXteNO/Plus-UI----FREE-Figma-UI-Kit-and-Design-System--2026--v2.0--Community-?node-id=5845-45077
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Playwright tests and the capture workflow are co-located under ./scripts.
  testDir: './scripts',

  // Independent test files may run concurrently — safe for read-only,
  // stateless screenshot rendering of a static page.
  fullyParallel: true,

  // Concise, single-screen-friendly console output.
  reporter: 'list',

  // Defaults shared by every project below.
  use: {
    // Target the Vite preview server (the production build served locally),
    // which is what the capture script renders against.
    baseURL: 'http://localhost:4173',

    // Match the Figma design frame WIDTH exactly (1536 px). This is the
    // fidelity-critical value. The height here is only an initial value;
    // the capture script performs a full-page screenshot that expands to the
    // full ~3324 px document height, so the effective capture height is
    // driven by content, not by this number.
    viewport: { width: 1536, height: 1024 },

    // Capture at 1:1 device pixels so the rendered PNG maps exactly to design
    // pixels (no 2× retina upscaling that would distort a pixel comparison).
    deviceScaleFactor: 1,
  },

  projects: [
    {
      name: 'chromium',
      // Start from the realistic "Desktop Chrome" environment, then RE-ASSERT
      // the 1536 px design width. The Desktop Chrome preset ships a 1280×720
      // viewport that would otherwise override the shared `use.viewport`
      // above and silently break pixel fidelity — so the override is required.
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1536, height: 1024 },
        deviceScaleFactor: 1,
      },
    },
  ],

  // NOTE: The `webServer` block is intentionally left commented out.
  // `scripts/capture-screenshots.mjs` starts (and stops) the Vite preview
  // server itself; enabling `webServer` here as well would double-boot
  // port 4173 and cause an "address already in use" conflict. Uncomment this
  // block ONLY if you drive verification purely through `npx playwright test`
  // (i.e. the capture script no longer manages the server on its own).
  //
  // webServer: {
  //   command: 'npm run preview',
  //   url: 'http://localhost:4173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
})
