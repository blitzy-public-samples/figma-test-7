/**
 * capture-screenshots.mjs — fidelity-verification screenshots for the Figma "Welcome" frame.
 *
 *   Frame:   Welcome
 *   fileKey: U1wiYiDtkktS3L2hsXteNO
 *   node:    5845:45077
 *   size:    1536 × 3324
 *   URL:     https://www.figma.com/design/U1wiYiDtkktS3L2hsXteNO/Plus-UI----FREE-Figma-UI-Kit-and-Design-System--2026--v2.0--Community-?node-id=5845-45077
 *
 * This standalone Node ESM script boots the Vite *preview* server (which serves the
 * production build from `dist/`), renders the app in headless Chromium at the exact
 * Figma frame WIDTH (1536 px, deviceScaleFactor 1), waits for the network to go idle
 * and the self-hosted fonts to finish loading, then writes a full-page PNG to
 * `<repo>/screenshots/welcome.png` so a reviewer can compare it against the Figma
 * source above.
 *
 * It imports NO application source — it drives the already-built app purely over HTTP.
 *
 * Prerequisites (run once): `npm install`, `npx playwright install chromium`, and a
 * production build (`npm run build` → `dist/`) so `vite preview` has content to serve.
 *
 * Run: `npm run screenshot`
 *
 * Environment overrides (all optional; defaults preserve the fidelity-critical values):
 *   PREVIEW_URL        preview server origin to render (default http://localhost:4173)
 *   VIEWPORT_WIDTH     capture width in CSS px      (default 1536 — DO NOT change for the standard run)
 *   VIEWPORT_HEIGHT    initial viewport height      (default 1024; fullPage expands to content height)
 *   CHROMIUM_ARGS      space-separated launch flags (default '--no-sandbox --disable-dev-shm-usage')
 *   SERVER_TIMEOUT_MS  preview-server readiness wait (default 60000)
 *   NAV_TIMEOUT_MS     page navigation timeout       (default 60000)
 *
 * @see https://www.figma.com/design/U1wiYiDtkktS3L2hsXteNO/Plus-UI----FREE-Figma-UI-Kit-and-Design-System--2026--v2.0--Community-?node-id=5845-45077
 * @see https://playwright.dev/docs/api/class-page#page-screenshot
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Phase A — Module setup & path resolution
// ---------------------------------------------------------------------------
// ESM has no `__dirname`; derive it from this module's URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(REPO_ROOT, 'screenshots');

// The Vite preview server origin. Kept aligned with playwright.config.ts baseURL.
const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173';

// 1536 px is the Figma frame width and is the single most fidelity-critical value —
// never round or substitute it. deviceScaleFactor is pinned to 1 for a 1:1 mapping of
// CSS px → device px (no 2× retina upscaling that would distort a pixel comparison).
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH ?? 1536);
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT ?? 1024);

const SERVER_TIMEOUT_MS = Number(process.env.SERVER_TIMEOUT_MS ?? 60_000);
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS ?? 60_000);
const SERVER_POLL_MS = 400; // interval between readiness probes
const PROBE_TIMEOUT_MS = 2_000; // per-probe timeout so a stuck socket can't stall the loop
const SETTLE_MS = 300; // final layout/paint settle before capture
const OUTPUT_FILENAME = 'welcome.png'; // stable name → a re-run overwrites the canonical file

// Container/CI-friendly Chromium flags. Headless capture as root inside a sandboxed
// container requires disabling the setuid sandbox; --disable-dev-shm-usage avoids
// /dev/shm exhaustion on small-shm CI images. Override via CHROMIUM_ARGS if needed.
const CHROMIUM_ARGS = (process.env.CHROMIUM_ARGS ?? '--no-sandbox --disable-dev-shm-usage')
  .split(' ')
  .map((arg) => arg.trim())
  .filter(Boolean);

/**
 * Derive the TCP port to launch `vite preview` on from PREVIEW_URL, so overriding the
 * URL (e.g. to avoid a port collision) also redirects the server we spawn. Falls back
 * to Vite's preview default (4173) when the URL omits an explicit port.
 * @param {string} url
 * @returns {number}
 */
function previewPort(url) {
  try {
    const parsed = new URL(url);
    return parsed.port ? Number(parsed.port) : 4173;
  } catch {
    return 4173;
  }
}

// ---------------------------------------------------------------------------
// Phase B — Preview server management
// ---------------------------------------------------------------------------
/** @type {import('node:child_process').ChildProcess | null} */
let serverProc = null;
let startedServer = false; // true only when THIS script spawned the preview server
let serverExited = false; // set by the child 'exit'/'error' listeners for fast-fail

/**
 * Probe whether an HTTP server is answering at `url`. Any HTTP response (even 404)
 * counts as "up"; a thrown connection/timeout error counts as "down".
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function isServerUp(url) {
  try {
    // Node 24 provides a global fetch; bound each probe so a hung socket can't stall us.
    await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Poll `isServerUp` every SERVER_POLL_MS until it returns true or `timeoutMs` elapses.
 * Aborts early (returns false) if the spawned preview process exits before becoming
 * reachable — e.g. when `dist/` is missing — so we surface a helpful error promptly.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (serverExited) return false;
    if (await isServerUp(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_MS));
  }
  return false;
}

/**
 * Terminate the preview server — and its whole child process tree — but ONLY if this
 * script spawned it. Safe to call multiple times (idempotent).
 */
function stopServer() {
  if (!startedServer || !serverProc || !serverProc.pid || serverProc.killed) return;
  try {
    // POSIX: `serverProc` was spawned `detached`, making it a process-group leader, so
    // the negative pid signals the whole group (`npm` → `vite preview`). Killing only
    // the `npm` pid would orphan the child `vite` process.
    // (On Windows this would instead require: `taskkill /pid <pid> /T /F`.)
    process.kill(-serverProc.pid, 'SIGTERM');
  } catch {
    // Fallback: group kill unavailable (or group already gone) — signal the pid directly.
    try {
      serverProc.kill('SIGTERM');
    } catch {
      /* process already exited — nothing to clean up */
    }
  }
}

// Ensure an interrupted run never leaves an orphaned preview server on the port.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopServer();
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Main flow — Phases C→F
// ---------------------------------------------------------------------------
/** @type {import('@playwright/test').Browser | null} */
let browser = null;
try {
  // Phase C — ensure output dir, launch browser, apply the fidelity-critical viewport.
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Preview server: (a) reuse an already-running one, or (b) spawn and manage our own.
  if (await isServerUp(PREVIEW_URL)) {
    startedServer = false;
    console.log(`Reusing preview server already reachable at ${PREVIEW_URL}`);
  } else {
    const port = previewPort(PREVIEW_URL);
    console.log(`Starting preview server (vite preview) on port ${port} …`);
    // `detached: true` → new process group so `stopServer()` can kill the whole tree.
    // We deliberately do NOT call `.unref()`: the script must retain control to stop it.
    serverProc = spawn(
      'npm',
      ['run', 'preview', '--', '--port', String(port), '--strictPort'],
      { cwd: REPO_ROOT, stdio: 'inherit', detached: true },
    );
    startedServer = true;
    serverProc.on('exit', () => {
      serverExited = true;
    });
    serverProc.on('error', (err) => {
      serverExited = true;
      console.error('Failed to spawn preview server:', err);
    });
    if (!(await waitForServer(PREVIEW_URL, SERVER_TIMEOUT_MS))) {
      throw new Error(
        `Preview server did not become reachable at ${PREVIEW_URL} within ` +
          `${Math.round(SERVER_TIMEOUT_MS / 1000)}s. Run \`npm run build\` first so ` +
          `\`dist/\` exists for \`vite preview\` to serve.`,
      );
    }
  }

  browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

  // Phase D — navigate and wait for render readiness (fonts MUST be painted first).
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
  // The design uses self-hosted Inter (400/500/600) and Bubblegum Sans (400). Capturing
  // before they load would paint text with fallback metrics and break visual equivalence.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(SETTLE_MS);

  // Phase E — capture the full-page render.
  const outPath = path.join(SCREENSHOTS_DIR, OUTPUT_FILENAME);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved full-page screenshot (${VIEWPORT_WIDTH}px wide): ${outPath}`);
} catch (err) {
  // Phase F — any failure yields a non-zero exit code for CI/operator visibility.
  console.error('Screenshot capture failed:', err);
  process.exitCode = 1;
} finally {
  // Always release the browser; stop the server only if we started it.
  if (browser) await browser.close();
  stopServer();
}
