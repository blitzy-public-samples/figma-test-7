# figma-test-7

A [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) front-end that reproduces a single Figma **"Welcome"** screen — a tall, single-column landing page for the **"Plus UI"** design system — as pixel-faithful code. Every color, dimension, spacing value, corner radius, gradient, and typographic property is transcribed directly from the Figma source, and a repeatable [Playwright](https://playwright.dev/) screenshot workflow renders the page so its visual fidelity can be verified against the design.

The page is composed of five stacked, divider-separated sections, in order:

1. **Hero / Header** — brand lockup and hero copy over a full-bleed indigo-violet gradient.
2. **"Design 20x faster"** — value-proposition heading and body copy.
3. **"Like & Follow us on Figma Community!"** — engagement block with two annotated preview screenshots and a community link.
4. **"Key Principles"** — a 3×2 grid of six illustrated cards (Efficiency, Consistency, Modularity, Accessibility, Flexibility, Clarity).
5. **"Join Our Communities"** — a row of three brand cards (Figma Community, Discord, X).

## Tech stack

- **[React](https://react.dev/) `^19.2.0`** and **`react-dom` `^19.2.0`** — component-based UI and DOM renderer.
- **[Vite](https://vite.dev/) `^8.1.0`** (Rolldown-based) — dev server, production build, and preview server.
- **`@vitejs/plugin-react` `^6.0.0`** — React Fast Refresh and JSX transform for Vite.
- **[TypeScript](https://www.typescriptlang.org/) `~5.9.0`** — static typing and type-checking.
- **[Playwright](https://playwright.dev/) (`@playwright/test` `^1.55.0`)** — headless-browser rendering and screenshot capture for fidelity verification.
- **Styling** — native [CSS Modules](https://github.com/css-modules/css-modules) plus CSS custom-property design tokens. No CSS framework is used.

There is **no router** and **no state-management library**: the deliverable is a single standalone screen whose only navigation is external hyperlinks.

## Prerequisites

- **[Node.js](https://nodejs.org/) 22.x (Active LTS).** The version is pinned in [`.nvmrc`](./.nvmrc) — run `nvm use` to select it — and declared in [`package.json`](./package.json) via `engines` (`node >=22.12.0`).
- **npm** as the package manager (bundled with Node.js).

> Vite 8 requires Node.js `20.19+` or `22.12+`. Node.js 22.12+ satisfies this requirement.

## Getting started

Install dependencies:

```bash
npm install
```

Install the Chromium browser used by the screenshot script (one-time):

```bash
npx playwright install chromium
```

Start the Vite dev server:

```bash
npm run dev
```

Type-check and build for production (`tsc -b && vite build`):

```bash
npm run build
```

Serve the production build locally:

```bash
npm run preview
```

Capture verification screenshots — runs `node scripts/capture-screenshots.mjs`, which boots the preview server, sets a **1536 px** viewport width, and captures the full-page render into `screenshots/` (which is git-ignored). Requires a prior `npm run build` so `dist/` exists for the preview server to serve. This is the fidelity-verification deliverable:

```bash
npm run screenshot
```

## Project structure

```text
figma-test-7/
├── index.html                    # Vite entry HTML with the #root mount node
├── package.json                  # Dependencies, engines (Node 22), and npm scripts
├── package-lock.json             # Resolved dependency lockfile
├── tsconfig.json                 # App TypeScript configuration
├── tsconfig.node.json            # TypeScript configuration for vite.config.ts
├── vite.config.ts                # Vite configuration (registers @vitejs/plugin-react)
├── playwright.config.ts          # Playwright configuration for the screenshot workflow
├── .nvmrc                        # Pins Node.js 22 for contributors
├── .gitignore                    # Ignores node_modules/, dist/, screenshots/, etc.
├── scripts/
│   └── capture-screenshots.mjs   # Boots the preview server and captures the full-page render
└── src/
    ├── main.tsx                  # React root: imports the stylesheets and mounts <App/>
    ├── App.tsx                   # Renders <WelcomePage/>
    ├── vite-env.d.ts             # Vite client types + ambient *.svg / *.png module declarations
    ├── styles/                   # Design tokens, @font-face declarations, and global/reset CSS
    ├── components/               # Reusable UI components (Header, Divider, Link, Icon, Section, cards)
    ├── pages/
    │   └── WelcomePage/          # Composition of the five sections into the full page
    ├── data/                     # Content data for the principle and community cards
    └── assets/
        ├── icons/                # SVG icon assets downloaded from Figma
        ├── images/               # PNG image assets downloaded from Figma
        └── fonts/                # Self-hosted web fonts (Inter, Bubblegum Sans)
```

## Design source

The implementation is a faithful transcription of a single Figma frame, which is the **authoritative source for all tokens, layout, and assets**. Assets are downloaded from Figma by file key and node ID rather than recreated from their appearance.

- **Frame:** Welcome (1536 × 3324)
- **File key:** `U1wiYiDtkktS3L2hsXteNO`
- **Node ID:** `5845:45077`
- **URL:** <https://www.figma.com/design/U1wiYiDtkktS3L2hsXteNO/Plus-UI----FREE-Figma-UI-Kit-and-Design-System--2026--v2.0--Community-?node-id=5845-45077>
