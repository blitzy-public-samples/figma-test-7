/**
 * Vite build / dev / preview configuration.
 *
 * Registers `@vitejs/plugin-react`, which supplies the automatic JSX transform
 * and React Fast Refresh so the React 19 + TypeScript application builds for
 * production and hot-reloads during development.
 *
 * Intentionally minimal by design:
 *  - CSS Modules (`*.module.css`) are handled by Vite out of the box, so no
 *    `css.modules` configuration is required.
 *  - Assets (icons, images, fonts) are imported via relative ES-module paths,
 *    so no path aliases are needed.
 *  - The page is served from the site root, so no `base` override is set.
 *  - The dev and preview server defaults (ports 5173 / 4173) are left as-is;
 *    the screenshot-verification workflow targets the preview server.
 *
 * This module executes in the Node build context and is type-checked through
 * `tsconfig.node.json`.
 *
 * @see https://vite.dev/config/
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
