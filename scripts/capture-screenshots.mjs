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
 * Before it captures anything, the script VERIFIES that the server it is about to
 * photograph is genuinely the figma-test-7 "Welcome" app — a 2xx response, the same
 * origin, the `#root` mount node in the served HTML, and the hero <h1> actually
 * rendered in the DOM. This prevents an unrelated service (or an error page) that
 * merely answers on the port from being certified as a passing `welcome.png`.
 *
 * It imports NO application source — it drives the already-built app purely over HTTP.
 *
 * Prerequisites (run once): `npm install`, `npx playwright install chromium`, and a
 * production build (`npm run build` → `dist/`) so `vite preview` has content to serve.
 *
 * Run: `npm run screenshot`
 *
 * Environment overrides (all optional; every value is validated at startup — an invalid
 * value fails fast with a sanitized message and a non-zero exit BEFORE any filesystem,
 * network, or process side effect; defaults preserve the fidelity-critical values):
 *   PREVIEW_URL        preview server origin to render (default http://localhost:4173).
 *                      Must be an http(s) URL; a URL without an explicit port is
 *                      normalized to :4173 so the server we SPAWN and the URL we PROBE /
 *                      navigate always use the SAME port.
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
import { existsSync } from 'node:fs';
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
// The production build `vite preview` serves. `dist/index.html` is the exact entry file
// the preview server answers at `/`; its presence is the precondition for a spawn to be
// worth attempting (see the pre-flight guard on the spawn path below).
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const DIST_INDEX_HTML = path.join(DIST_DIR, 'index.html');

const DEFAULT_PREVIEW_URL = 'http://localhost:4173';
const DEFAULT_PREVIEW_PORT = 4173; // Vite's `preview` default; used when a URL omits a port.

const SERVER_POLL_MS = 400; // interval between readiness probes
const PROBE_TIMEOUT_MS = 2_000; // per-probe timeout so a stuck socket can't stall the loop
const SETTLE_MS = 300; // final layout/paint settle before capture
const SHUTDOWN_GRACE_MS = 5_000; // how long to await a SIGTERM'd server before escalating to SIGKILL
const REAP_TIMEOUT_MS = 2_000; // brief final wait for the OS to reap after SIGKILL
const BROWSER_CLOSE_TIMEOUT_MS = 10_000; // bound browser.close() so a wedged browser can't hang cleanup
const OUTPUT_FILENAME = 'welcome.png'; // stable name → a re-run overwrites the canonical file

// Deterministic identity markers that prove a reachable server is the figma-test-7
// "Welcome" app and not an unrelated service that merely answered on the port.
//   • APP_SENTINEL_TEXT is the AAP hero <h1> copy (node 5845:45213) and the <title>.
//   • APP_HTML_MARKERS are strings guaranteed to be present in the served index.html
//     shell (the `#root` mount node and the title) — checked before we spend time
//     launching a browser; the rendered <h1> is then re-checked in the live DOM.
const APP_SENTINEL_TEXT = 'Welcome to Plus UI';
const APP_HTML_MARKERS = ['id="root"', APP_SENTINEL_TEXT];

// ---------------------------------------------------------------------------
// Log-safety helpers (CWE-532) — never emit userinfo or signed query strings.
// ---------------------------------------------------------------------------
/**
 * Reduce a URL (string or URL) to a log-safe origin (`protocol//host[:port]`), dropping
 * any userinfo, path, query, and fragment so credentials or signed tokens carried in the
 * value never reach the logs. Returns a fixed sentinel string if the value can't be parsed.
 * @param {string | URL} url
 * @returns {string}
 */
function safeOrigin(url) {
  try {
    const u = url instanceof URL ? url : new URL(url);
    // `u.host` is hostname[:port] only — it never contains `username:password`.
    return `${u.protocol}//${u.host}`;
  } catch {
    return '<unparseable-url>';
  }
}

/**
 * Redact any embedded http(s) URLs in free text down to their origin, so a signed URL or
 * userinfo carried inside a fetch/Playwright error message is not logged verbatim.
 * @param {string} text
 * @returns {string}
 */
function redactUrlsInText(text) {
  return String(text).replace(/https?:\/\/[^\s"'`)]+/gi, (match) => safeOrigin(match));
}

/**
 * Extract a concise, log-safe string from an unknown thrown value: the message text only
 * (never the whole error object, which can carry request URLs/headers), with any URLs
 * inside it redacted to their origin.
 * @param {unknown} err
 * @returns {string}
 */
function sanitizeError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return redactUrlsInText(message);
}

// ---------------------------------------------------------------------------
// Configuration parsing & validation (CWE-20) — fail fast, before any side effect.
// ---------------------------------------------------------------------------
/**
 * Validate a bounded positive-integer environment override, returning `defaultValue`
 * when the variable is unset/blank. Throws a clear error for NaN, non-integers, and
 * out-of-range values so a bad override fails fast instead of surfacing late as
 * confusing Playwright/Chromium behavior.
 * @param {string} name
 * @param {number} defaultValue
 * @param {{ min: number, max: number }} bounds
 * @returns {number}
 */
function intEnv(name, defaultValue, { min, max }) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return defaultValue;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `${name} must be an integer in [${min}, ${max}] (got ${JSON.stringify(raw)}).`,
    );
  }
  return value;
}

/**
 * Parse and normalize PREVIEW_URL exactly once. Only http(s) is permitted; a URL without
 * an explicit port is normalized to :4173 so the server we SPAWN and the URL we PROBE /
 * navigate always share one port (this fixes the "spawn on 4173 but probe :80" class of
 * mismatch). Throws on a malformed URL or a non-http(s) scheme.
 * @param {string} raw
 * @returns {URL}
 */
function parsePreviewUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`PREVIEW_URL is not a valid URL (got ${JSON.stringify(raw)}).`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `PREVIEW_URL must use http: or https: (got protocol ${JSON.stringify(parsed.protocol)}).`,
    );
  }
  if (!parsed.port) parsed.port = String(DEFAULT_PREVIEW_PORT);
  return parsed;
}

/**
 * Build the validated, immutable run configuration from the environment. Any invalid
 * input throws here — before we touch the filesystem, spawn a server, or launch Chromium.
 * @returns {{
 *   previewUrl: URL, viewportWidth: number, viewportHeight: number,
 *   serverTimeoutMs: number, navTimeoutMs: number, chromiumArgs: string[]
 * }}
 */
function readConfig() {
  const previewUrl = parsePreviewUrl(process.env.PREVIEW_URL ?? DEFAULT_PREVIEW_URL);

  // 1536 px is the Figma frame width and the single most fidelity-critical value — never
  // round or substitute it. deviceScaleFactor is pinned to 1 (below) for a 1:1 CSS→device
  // px mapping (no 2× retina upscaling that would distort a pixel comparison).
  const viewportWidth = intEnv('VIEWPORT_WIDTH', 1536, { min: 1, max: 16384 });
  const viewportHeight = intEnv('VIEWPORT_HEIGHT', 1024, { min: 1, max: 16384 });
  const serverTimeoutMs = intEnv('SERVER_TIMEOUT_MS', 60_000, { min: 1_000, max: 600_000 });
  const navTimeoutMs = intEnv('NAV_TIMEOUT_MS', 60_000, { min: 1_000, max: 600_000 });

  // Container/CI-friendly Chromium flags. Headless capture as root inside a sandboxed
  // container requires disabling the setuid sandbox; --disable-dev-shm-usage avoids
  // /dev/shm exhaustion on small-shm CI images. Override via CHROMIUM_ARGS if needed.
  const chromiumArgs = (process.env.CHROMIUM_ARGS ?? '--no-sandbox --disable-dev-shm-usage')
    .split(' ')
    .map((arg) => arg.trim())
    .filter(Boolean);

  return {
    previewUrl,
    viewportWidth,
    viewportHeight,
    serverTimeoutMs,
    navTimeoutMs,
    chromiumArgs,
  };
}

let config;
try {
  config = readConfig();
} catch (err) {
  // Fail fast on bad configuration with a sanitized, single-line message (no stack, no
  // secrets) and a non-zero exit — before any filesystem/network/process side effect.
  console.error(`Invalid configuration: ${sanitizeError(err)}`);
  process.exit(1);
}
const { previewUrl, viewportWidth, viewportHeight, serverTimeoutMs, navTimeoutMs, chromiumArgs } =
  config;

// ---------------------------------------------------------------------------
// Phase B — Preview server management
// ---------------------------------------------------------------------------
/** @type {import('node:child_process').ChildProcess | null} */
let serverProc = null;
let startedServer = false; // true only when THIS script spawned the preview server
let serverExited = false; // set by the child 'exit'/'error' listeners for fast-fail

/**
 * Probe whether an HTTP server is answering at `url` with a SUCCESS (2xx) status. A
 * non-2xx response (404/500 or a 3xx redirect) or a thrown connection/timeout error
 * counts as "not ready" — an unrelated error page must never be treated as the app.
 * @param {string | URL} url
 * @returns {Promise<boolean>}
 */
async function isServerUp(url) {
  try {
    // Node 24 provides a global fetch; bound each probe so a hung socket can't stall us.
    // `redirect: 'manual'` keeps a 3xx visible as a non-2xx status instead of following it.
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      redirect: 'manual',
    });
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

/**
 * Fetch the server root and assert it is the figma-test-7 "Welcome" app: a 2xx response
 * whose served HTML contains the `#root` mount node and the hero title text. Throws a
 * sanitized error otherwise so an unrelated service (or an error page) answering on the
 * port can never be captured as a passing screenshot (CWE-345).
 * @param {URL} url
 * @returns {Promise<void>}
 */
async function assertServerIdentity(url) {
  let status;
  let body;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      redirect: 'manual',
    });
    status = res.status;
    body = await res.text();
  } catch (err) {
    throw new Error(
      `Preview server at ${safeOrigin(url)} could not be reached for identity ` +
        `verification: ${sanitizeError(err)}`,
    );
  }
  if (status < 200 || status >= 300) {
    throw new Error(
      `Preview server at ${safeOrigin(url)} returned HTTP ${status}; expected a 2xx ` +
        `response serving the figma-test-7 app.`,
    );
  }
  for (const marker of APP_HTML_MARKERS) {
    if (!body.includes(marker)) {
      throw new Error(
        `The service at ${safeOrigin(url)} does not look like the figma-test-7 ` +
          `"Welcome" app (missing ${JSON.stringify(marker)} in the served HTML); ` +
          `refusing to capture a screenshot of an unrelated service.`,
      );
    }
  }
}

/**
 * Poll `isServerUp` every SERVER_POLL_MS until it returns true or `timeoutMs` elapses.
 * Aborts early (returns false) if the spawned preview process exits before becoming
 * reachable — e.g. a `--strictPort` collision or a `vite preview` that crashes on boot —
 * so we surface a helpful error promptly instead of waiting out the full timeout.
 *
 * NOTE: the missing-`dist/` case does NOT reach here — it is rejected up front, before we
 * spawn (see the spawn path). Vite 8's `vite preview` does NOT exit when `dist/` is absent;
 * it starts and serves HTTP 404 at `/`, so `serverExited` would never trip and this loop
 * would otherwise burn the entire `timeoutMs` before failing. The pre-flight build check
 * turns that slow, opaque timeout into an instant, actionable error.
 * @param {URL} url
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
 * Signal the detached child's whole process GROUP (negative pid). Returns true when the
 * signal was delivered and false when group signaling is unavailable, so the caller can
 * fall back to a direct-pid signal. Never throws.
 * @param {number} pid
 * @param {NodeJS.Signals} signal
 * @returns {boolean}
 */
function signalGroup(pid, signal) {
  try {
    // POSIX: the child was spawned `detached`, so it leads its own process group; the
    // negative pid signals the whole group (`npm` → `vite preview`). Signaling only the
    // `npm` pid would orphan the child `vite` process. (On Windows this would instead
    // require `taskkill /pid <pid> /T /F`.)
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Terminate the preview server and its whole process tree — but ONLY if this script
 * spawned it. Idempotent and race-safe: it no-ops once the child has already exited (so a
 * recycled PID is never signalled), SIGTERMs the group, awaits exit up to
 * SHUTDOWN_GRACE_MS, then escalates the STILL-owned group to SIGKILL.
 * @returns {Promise<void>}
 */
async function stopServer() {
  const proc = serverProc;
  if (!startedServer || !proc || proc.pid == null || proc.killed || serverExited) {
    // Never started one, or it already exited — nothing safe to signal (avoids racing a
    // recycled PID).
    return;
  }
  const pid = proc.pid;

  // Resolve when the child fully exits (guarded against a missed event via serverExited).
  const exited = new Promise((resolve) => {
    if (serverExited) {
      resolve(undefined);
      return;
    }
    proc.once('exit', () => resolve(undefined));
  });

  // Graceful stop: SIGTERM the whole group (fall back to the pid if group kill fails).
  if (!signalGroup(pid, 'SIGTERM')) {
    try {
      proc.kill('SIGTERM');
    } catch {
      return; // already gone
    }
  }

  // Await graceful exit; escalate the STILL-owned group to SIGKILL on timeout.
  const graceTimedOut = await Promise.race([
    exited.then(() => false),
    new Promise((resolve) => setTimeout(() => resolve(true), SHUTDOWN_GRACE_MS)),
  ]);
  if (graceTimedOut && !serverExited) {
    if (!signalGroup(pid, 'SIGKILL')) {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
    // Give the OS a brief window to reap the process before the script exits.
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, REAP_TIMEOUT_MS)),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Phase B′ — single idempotent async cleanup (browser + owned server)
// ---------------------------------------------------------------------------
/** @type {import('@playwright/test').Browser | null} */
let browser = null;
let cleanedUp = false;

/**
 * Release every owned resource exactly once. Browser close and server shutdown live in
 * NESTED try/finally so a `browser.close()` rejection can never skip `stopServer()`, and
 * a second call (e.g. from both a signal handler and the main `finally`) is a no-op.
 * @returns {Promise<void>}
 */
async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  try {
    if (browser) {
      const closing = browser;
      browser = null;
      // Bound the close so a wedged browser can never hang shutdown; Playwright's
      // always-on 'exit' handler is the synchronous backstop if the close is abandoned.
      await Promise.race([
        closing.close(),
        new Promise((resolve) => setTimeout(resolve, BROWSER_CLOSE_TIMEOUT_MS)),
      ]);
    }
  } catch (err) {
    console.error('Error closing browser:', sanitizeError(err));
  } finally {
    await stopServer();
  }
}

// An interrupted run must still tear down the browser and any server we spawned. Signals
// set the failure exit code and run the SAME idempotent cleanup — instead of a synchronous
// `process.exit` that would bypass it — then exit once cleanup settles.
let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.exitCode = 1;
    cleanup().finally(() => process.exit(process.exitCode ?? 1));
  });
}

// ---------------------------------------------------------------------------
// Main flow — Phases C→F
// ---------------------------------------------------------------------------
try {
  // Phase C — ensure output dir, ensure a VERIFIED preview server, launch the browser.
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Preview server: (a) reuse an already-running one, or (b) spawn and manage our own.
  if (await isServerUp(previewUrl)) {
    startedServer = false;
    console.log(`Reusing preview server already reachable at ${safeOrigin(previewUrl)}`);
  } else {
    // Pre-flight: refuse to spawn `vite preview` when there is no production build to
    // serve. This must happen BEFORE the spawn because Vite 8's preview server does NOT
    // exit when `dist/` is missing — it boots and serves HTTP 404 at `/`. Without this
    // guard, `waitForServer` would never see a 2xx and never see the child exit, so it
    // would poll the ENTIRE `serverTimeoutMs` (default 60s) before failing — long enough
    // that an outer `timeout 30s` would kill the run (exit 124) before the diagnostic is
    // even printed. Checking for the build artifact up front converts that slow, opaque,
    // hang-like failure into an instant, actionable one, and means we never leave a
    // detached preview child that an abrupt external kill could orphan.
    if (!existsSync(DIST_INDEX_HTML)) {
      throw new Error(
        `No production build to preview: ${path.relative(REPO_ROOT, DIST_INDEX_HTML)} ` +
          `does not exist, so \`vite preview\` has nothing to serve. Run \`npm run build\` ` +
          `first so \`dist/\` exists, then re-run \`npm run screenshot\`.`,
      );
    }
    const port = previewUrl.port;
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
      console.error('Failed to spawn preview server:', sanitizeError(err));
    });
    if (!(await waitForServer(previewUrl, serverTimeoutMs))) {
      throw new Error(
        `Preview server did not become reachable at ${safeOrigin(previewUrl)} within ` +
          `${Math.round(serverTimeoutMs / 1000)}s. Run \`npm run build\` first so ` +
          `\`dist/\` exists for \`vite preview\` to serve.`,
      );
    }
  }

  // Verify (for BOTH the reuse and the spawn path) that the reachable server is really our
  // app before spending time launching a browser — an unrelated 2xx service is rejected.
  await assertServerIdentity(previewUrl);

  // Disable Playwright's own SIGINT/SIGTERM/SIGHUP handling so it does NOT install
  // competing process-signal handlers: its handler calls `process.exit(130)`, which could
  // preempt our async server teardown and orphan `vite preview`. This script owns a single
  // idempotent cleanup path; Playwright's always-on 'exit' handler still closes the browser
  // as a synchronous backstop even if our close is abandoned.
  browser = await chromium.launch({
    headless: true,
    args: chromiumArgs,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(navTimeoutMs);

  // Phase D — navigate, assert the response, and wait for render readiness.
  const response = await page.goto(previewUrl.href, {
    waitUntil: 'networkidle',
    timeout: navTimeoutMs,
  });
  if (!response) {
    throw new Error(`Navigation to ${safeOrigin(previewUrl)} produced no response.`);
  }
  const navStatus = response.status();
  if (navStatus < 200 || navStatus >= 300) {
    throw new Error(
      `Navigation to ${safeOrigin(previewUrl)} returned HTTP ${navStatus}; refusing to ` +
        `capture a non-success page.`,
    );
  }
  const landedOrigin = new URL(page.url()).origin;
  if (landedOrigin !== previewUrl.origin) {
    throw new Error(
      `Navigation redirected to an unexpected origin ${safeOrigin(page.url())} ` +
        `(expected ${safeOrigin(previewUrl)}).`,
    );
  }
  // Deterministic render sentinel: the AAP hero <h1> must be present and visible, proving
  // the React app actually rendered the "Welcome" page (not just an empty #root shell).
  await page
    .locator('h1', { hasText: APP_SENTINEL_TEXT })
    .first()
    .waitFor({ state: 'visible', timeout: navTimeoutMs });

  // The design uses self-hosted Inter (400/500/600) and Bubblegum Sans (400). Capturing
  // before they load would paint text with fallback metrics and break visual equivalence.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(SETTLE_MS);

  // Phase E — capture the full-page render.
  const outPath = path.join(SCREENSHOTS_DIR, OUTPUT_FILENAME);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved full-page screenshot (${viewportWidth}px wide): ${outPath}`);
} catch (err) {
  // Phase F — any failure yields a sanitized message and a non-zero exit for CI/operator
  // visibility (the full error object is never logged, so signed URLs can't leak).
  console.error('Screenshot capture failed:', sanitizeError(err));
  process.exitCode = 1;
} finally {
  // Always release the browser and stop a server we started — exactly once.
  await cleanup();
}
