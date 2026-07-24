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
import { mkdir, readFile } from 'node:fs/promises';
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

// Deterministic identity that proves a reachable server is THIS figma-test-7 "Welcome"
// build and not an unrelated service that merely answered on the port (CWE-345). The
// public strings `id="root"` and the hero/title text are necessary but NOT sufficient —
// any page could copy them — so identity is anchored to the BUILD ARTIFACT itself:
//   • APP_SENTINEL_TEXT — the AAP hero <h1> copy (node 5845:45213) and the <title>;
//     a necessary marker, and the render sentinel re-checked in the live DOM.
//   • VITE_ENTRY_RE / VITE_CSS_RE — match the hashed ES-module entry and stylesheet Vite
//     injects into index.html (`/assets/index-<hash>.(js|css)`). The hash is content-
//     derived and unique to this build, so requiring the SERVED HTML to reference the
//     SAME hashed entry that our local `dist/index.html` declares — AND requiring that
//     asset to actually be served as JavaScript from the same origin — ties the check to
//     THIS specific build. A generic page cannot forge a matching content hash and serve
//     the corresponding bundle.
const APP_SENTINEL_TEXT = 'Welcome to Plus UI';
const ROOT_MOUNT_MARKER = 'id="root"';
const VITE_ENTRY_RE =
  /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\/assets\/index-[A-Za-z0-9_-]+\.js)["']/i;
const JS_CONTENT_TYPE_RE = /(java|ecma)script/i;

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
 *
 * The greedy match can also swallow trailing sentence punctuation that immediately follows
 * a URL in prose (e.g. `…http://localhost:4173.` or `…http://localhost:4173,`). Left in the
 * captured token, that punctuation makes the value fail to parse, so `safeOrigin` would fall
 * back to its `<unparseable-url>` sentinel and mangle an otherwise-actionable message. Split
 * the trailing punctuation off first, redact the URL portion to its origin, then re-append
 * the punctuation — the path/query (where secrets live) is still dropped.
 * @param {string} text
 * @returns {string}
 */
function redactUrlsInText(text) {
  return String(text).replace(/https?:\/\/[^\s"'`)]+/gi, (match) => {
    const trailing = match.match(/[.,;:!?]+$/);
    const urlPart = trailing ? match.slice(0, -trailing[0].length) : match;
    return safeOrigin(urlPart) + (trailing ? trailing[0] : '');
  });
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

// Hosts a locally-spawned `vite preview` can bind to. Any already-running server (reuse
// mode) may live at any http(s) host, but SPAWN mode can only auto-start a LOCAL,
// plain-HTTP preview bound to a port — so a non-local host or an https scheme is not
// spawnable and must produce an accurate diagnostic instead of a misleading boot timeout.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

/**
 * Whether PREVIEW_URL describes a server this script could START itself. `vite preview`
 * serves PLAIN HTTP bound to a local port, so only an `http:` URL on a local host is
 * spawnable. (A reachable server at any http(s) host is still REUSED — this gate only
 * governs the auto-spawn path.)
 * @param {URL} url
 * @returns {boolean}
 */
function isLocallySpawnable(url) {
  return url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
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
    // Node 22 provides a global fetch (stable since Node 18); bound each probe so a hung socket can't stall us.
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
 * Read this build's hashed entry-module path (`/assets/index-<hash>.js`) from the local
 * `dist/index.html`, or return null if `dist/` is absent/unreadable (e.g. the reuse path
 * where only a remote server is available). When present, it lets `assertServerIdentity`
 * require the SERVED entry hash to EQUAL this build's — the strongest build-specific tie.
 * @returns {Promise<string | null>}
 */
async function readBuiltEntryFromDist() {
  try {
    const html = await readFile(DIST_INDEX_HTML, 'utf8');
    const match = html.match(VITE_ENTRY_RE);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Assert a reachable server is THIS figma-test-7 "Welcome" build — not an unrelated 2xx
 * service that merely answered on the port (CWE-345). Checks, in order: a 2xx HTML
 * response; the `#root` mount node and hero title text; a Vite-built hashed ES-module
 * entry in the served HTML that (when `dist/` is present) EQUALS this build's entry hash;
 * and that the referenced entry asset is actually served as JavaScript from the same
 * origin. Any shortfall throws a sanitized error so a spoof/placeholder page can never be
 * certified as a passing screenshot.
 * @param {URL} url
 * @returns {Promise<void>}
 */
async function assertServerIdentity(url) {
  let status;
  let contentType;
  let body;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      redirect: 'manual',
    });
    status = res.status;
    contentType = res.headers.get('content-type') ?? '';
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
  if (!/text\/html/i.test(contentType)) {
    throw new Error(
      `The service at ${safeOrigin(url)} served content-type ${JSON.stringify(contentType)} ` +
        `at \`/\`; expected an HTML document. Refusing to capture an unrelated service.`,
    );
  }
  // Necessary (but not sufficient) app markers.
  for (const marker of [ROOT_MOUNT_MARKER, APP_SENTINEL_TEXT]) {
    if (!body.includes(marker)) {
      throw new Error(
        `The service at ${safeOrigin(url)} does not look like the figma-test-7 ` +
          `"Welcome" app (missing ${JSON.stringify(marker)} in the served HTML); ` +
          `refusing to capture a screenshot of an unrelated service.`,
      );
    }
  }
  // Build-specific contract: the served HTML must reference a Vite-built hashed ES-module
  // entry, and — when we can read our own build — it must be the SAME content hash.
  const servedMatch = body.match(VITE_ENTRY_RE);
  if (!servedMatch) {
    throw new Error(
      `The service at ${safeOrigin(url)} does not reference a Vite-built ES-module entry ` +
        `(\`/assets/index-<hash>.js\`) in its HTML; refusing to capture a non-Vite build.`,
    );
  }
  const servedEntry = servedMatch[1];
  const expectedEntry = await readBuiltEntryFromDist();
  if (expectedEntry && servedEntry !== expectedEntry) {
    throw new Error(
      `The service at ${safeOrigin(url)} serves entry ${JSON.stringify(servedEntry)}, which ` +
        `does not match this build's ${JSON.stringify(expectedEntry)} (content-hash mismatch); ` +
        `refusing to certify a screenshot of a different build/app.`,
    );
  }
  // The referenced entry asset must actually be served as JavaScript from the SAME origin —
  // proving the server hosts our real bundle, not just HTML that names it.
  const assetUrl = new URL(servedEntry, url);
  let assetStatus;
  let assetType;
  try {
    const res = await fetch(assetUrl, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      redirect: 'manual',
    });
    assetStatus = res.status;
    assetType = res.headers.get('content-type') ?? '';
  } catch (err) {
    throw new Error(
      `The Vite entry asset ${JSON.stringify(servedEntry)} at ${safeOrigin(url)} could not ` +
        `be fetched for identity verification: ${sanitizeError(err)}`,
    );
  }
  if (assetStatus < 200 || assetStatus >= 300) {
    throw new Error(
      `The Vite entry asset ${JSON.stringify(servedEntry)} at ${safeOrigin(url)} returned ` +
        `HTTP ${assetStatus}; the server names our bundle but does not serve it.`,
    );
  }
  if (!JS_CONTENT_TYPE_RE.test(assetType)) {
    throw new Error(
      `The Vite entry asset ${JSON.stringify(servedEntry)} at ${safeOrigin(url)} was served ` +
        `as content-type ${JSON.stringify(assetType)}; expected JavaScript.`,
    );
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
// Conventional 128+signum termination-exit codes, so an interrupted run reports the signal
// that stopped it (SIGINT→130, SIGTERM→143, SIGHUP→129) rather than a generic 1.
// SIGHUP MUST be handled here (CWE-404): Chromium is launched with handleSIGHUP:false
// (below), so without our own handler a controlling-terminal hang-up would take Node's
// default action — terminate WITHOUT running cleanup — orphaning the detached `vite
// preview` process GROUP. Routing SIGHUP through the same single idempotent cleanup
// guarantees the spawned server tree is always reaped before we exit.
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    // Preserve a non-zero, signal-specific exit code (128 + signum) across cleanup.
    process.exitCode = SIGNAL_EXIT_CODES[signal] ?? 1;
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
    // Spawn-contract guard (m-1): nothing is answering at PREVIEW_URL, so we would auto-
    // start a server — but this script can only spawn a LOCAL, plain-HTTP `vite preview`
    // bound to a port. If the configured URL is https or a non-local host, spawning a
    // local http server and then probing that URL could never succeed; rather than boot a
    // server and fail later with a misleading "did not become reachable / run npm run
    // build" timeout, fail fast here with an accurate scheme/host diagnostic. (An already-
    // running server at any http(s) host is still reused — that path is handled above.)
    if (!isLocallySpawnable(previewUrl)) {
      const reason =
        previewUrl.protocol === 'https:'
          ? 'uses https:, which `vite preview` does not serve (it binds plain HTTP)'
          : `targets non-local host ${JSON.stringify(previewUrl.hostname)}, which cannot be spawned locally`;
      throw new Error(
        `No server is running at ${safeOrigin(previewUrl)}, and PREVIEW_URL ${reason}. ` +
          `This script can only auto-start a local plain-HTTP \`vite preview\`. Either ` +
          `start that server yourself and re-run (it will be reused after an identity ` +
          `check), or set PREVIEW_URL to a local http URL such as ` +
          `http://localhost:${DEFAULT_PREVIEW_PORT}.`,
      );
    }
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

  // Runtime-health capture for the acceptance gate (M-3): a console error, uncaught page
  // error, failed request, or 4xx/5xx response makes the render suspect and blocks
  // certification. `/favicon.ico` is intentionally excluded — the favicon was removed by
  // design (M-2), so a 404 for it is expected and irrelevant to fidelity.
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const errorResponses = [];
  const isFaviconUrl = (u) => /\/favicon\.ico(?:$|\?)/i.test(u);
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isFaviconUrl(text)) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (err) => pageErrors.push(err?.message ?? String(err)));
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (isFaviconUrl(u)) return;
    failedRequests.push(`${u.split('/').pop()} (${req.failure()?.errorText ?? 'failed'})`);
  });
  page.on('response', (res) => {
    const u = res.url();
    if (isFaviconUrl(u)) return;
    if (res.status() >= 400) errorResponses.push(`HTTP ${res.status()} ${u.split('/').pop()}`);
  });

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

  // Acceptance gate (M-3) — the render must be COMPLETE and STRUCTURALLY CORRECT before we
  // certify a screenshot. A visible <h1> plus fonts.ready can still pass a materially
  // incomplete page (missing sections, broken images, a failed chunk), so assert the full
  // structure, the exact external links, every image decoded, the self-hosted fonts, the
  // runtime health gathered during load, and the exact frame dimensions. Any shortfall
  // throws (non-zero exit) BEFORE welcome.png is written, so a bad artifact is never emitted.
  const REQUIRED_HREFS = [
    'https://www.plusui.com/',
    'https://www.figma.com/@plusui',
    'https://discord.gg/Y5a78GGX',
    'https://twitter.com/PlusUI_Official',
  ];
  const EXPECTED_COUNTS = { h1: 1, h2: 4, h3: 9, main: 1 };
  const MIN_IMAGES = 20;
  const EXPECTED_FRAME_HEIGHT = 3324; // AAP fixed-frame height for "Welcome" (5845:45077)

  const audit = await page.evaluate(() => {
    const all = (sel) => Array.from(document.querySelectorAll(sel));
    const imgs = all('img');
    return {
      counts: {
        h1: all('h1').length,
        h2: all('h2').length,
        h3: all('h3').length,
        main: all('main').length,
        img: imgs.length,
      },
      anchors: all('a').map((a) => ({
        href: a.getAttribute('href'),
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
      })),
      brokenImages: imgs
        .filter((im) => !im.complete || im.naturalWidth === 0)
        .map((im) => (im.currentSrc || im.src || '(inline)').split('/').pop()),
      loadedFontFaces: Array.from(document.fonts)
        .filter((f) => f.status === 'loaded')
        .map((f) => `${f.family}|${f.weight}`),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });

  const problems = [];

  // (1) Structural landmark/heading counts must match the reconciled composition exactly.
  for (const [tag, want] of Object.entries(EXPECTED_COUNTS)) {
    if (audit.counts[tag] !== want) {
      problems.push(`expected ${want} <${tag}>, found ${audit.counts[tag]}`);
    }
  }

  // (2) Images: a minimum count, and every one actually decoded (no broken/empty assets).
  if (audit.counts.img < MIN_IMAGES) {
    problems.push(`expected >= ${MIN_IMAGES} <img>, found ${audit.counts.img}`);
  }
  if (audit.brokenImages.length) {
    problems.push(
      `${audit.brokenImages.length} image(s) failed to load: ${audit.brokenImages.join(', ')}`,
    );
  }

  // (3) External links: each required href must exist exactly, opening safely in a new tab.
  for (const href of REQUIRED_HREFS) {
    const match = audit.anchors.find((a) => a.href === href);
    if (!match) {
      problems.push(`missing required external link ${href}`);
      continue;
    }
    if (match.target !== '_blank') {
      problems.push(`link ${href} must set target="_blank"`);
    }
    const rel = match.rel ?? '';
    if (!/\bnoopener\b/.test(rel) || !/\bnoreferrer\b/.test(rel)) {
      problems.push(`link ${href} rel must include noopener and noreferrer (got ${JSON.stringify(rel)})`);
    }
  }

  // (4) Self-hosted fonts: Inter 400/500/600 and Bubblegum Sans 400 must all be painted.
  const interWeights = new Set(
    audit.loadedFontFaces.filter((f) => f.startsWith('Inter|')).map((f) => f.split('|')[1]),
  );
  for (const w of ['400', '500', '600']) {
    if (!interWeights.has(w)) problems.push(`Inter weight ${w} not loaded`);
  }
  if (!audit.loadedFontFaces.some((f) => f.startsWith('Bubblegum Sans|'))) {
    problems.push('Bubblegum Sans 400 not loaded');
  }

  // (5) Runtime health captured during load must be clean.
  if (consoleErrors.length) problems.push(`console error(s): ${consoleErrors.slice(0, 5).join(' | ')}`);
  if (pageErrors.length) problems.push(`page error(s): ${pageErrors.slice(0, 5).join(' | ')}`);
  if (failedRequests.length) problems.push(`failed request(s): ${failedRequests.slice(0, 5).join(' | ')}`);
  if (errorResponses.length) problems.push(`error response(s): ${errorResponses.slice(0, 5).join(' | ')}`);

  // (6) Exact frame dimensions. Width must equal the configured viewport width. For the
  // fidelity frame (1536) the 3324 px height is asserted EXACTLY; for a non-standard width
  // override the pinned min-height is asserted as a floor.
  if (audit.scrollWidth !== viewportWidth) {
    problems.push(`page width ${audit.scrollWidth}px, expected ${viewportWidth}px`);
  }
  if (viewportWidth === 1536) {
    if (audit.scrollHeight !== EXPECTED_FRAME_HEIGHT) {
      problems.push(`page height ${audit.scrollHeight}px, expected exactly ${EXPECTED_FRAME_HEIGHT}px`);
    }
  } else if (audit.scrollHeight < EXPECTED_FRAME_HEIGHT) {
    problems.push(`page height ${audit.scrollHeight}px below the ${EXPECTED_FRAME_HEIGHT}px floor`);
  }

  if (problems.length) {
    throw new Error(
      `Acceptance gate failed — refusing to certify an incomplete/incorrect render:\n  - ${problems.join('\n  - ')}`,
    );
  }
  console.log(
    `Acceptance gate passed: ${audit.counts.h1} h1 / ${audit.counts.h2} h2 / ${audit.counts.h3} h3 / ` +
      `${audit.counts.main} main, ${audit.anchors.length} links, ${audit.counts.img} images, ` +
      `${audit.loadedFontFaces.length} font faces, ${audit.scrollWidth}x${audit.scrollHeight}px.`,
  );

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
