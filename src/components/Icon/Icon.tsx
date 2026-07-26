/**
 * Icon — a thin, asset-agnostic image primitive.
 *
 * Renders a single, PRE-COLORED downloaded asset (an SVG or PNG, which Vite
 * resolves to a URL `string`) as one `<img>` at an EXACT pixel size. It is one
 * of the project's shared UI primitives (one component per folder, with a
 * co-located CSS Module) and is consumed by:
 *   - `Header`        — the white Plus UI symbol (32×33) and the white
 *                       external-link icon (16×18) beside "www.plusui.com".
 *   - `Link`          — optional prefix/suffix icons (the small Figma logo, the
 *                       blue external-link 24×24, the black "visit"
 *                       external-link 16×18).
 *   - Section heading — the outline heart (40×40) trailing the "Like & Follow
 *                       us on Figma Community!" heading.
 *
 * `Icon` is deliberately asset-agnostic: it never owns or imports an asset.
 * The asset URL is always supplied by the caller via the `src` prop (callers
 * `import` the asset — Vite returns a URL string — and pass it down), which
 * keeps this primitive generic and reusable.
 *
 * Design authority: the Figma "Welcome" screen
 * (fileKey `U1wiYiDtkktS3L2hsXteNO`, node `5845:45077`; icon set `5845:6572`).
 *
 * WHY A PLAIN `<img>` (and not inline SVG or an icon font): every glyph is
 * downloaded as its own individually PRE-COLORED asset — for example, the
 * external-link glyph exists as three distinct files (white / blue / black) —
 * so NO runtime recoloring, `filter`, or `fill` is required or wanted. This
 * component adds no color, no shadow, and no animation; it only sizes the
 * asset to the exact Figma dimensions. Several icons are NON-SQUARE (16×18,
 * 32×33), which is precisely why `width`/`height` may override the square
 * `size` fallback so each asset renders at its exact box without distortion.
 *
 * The HIDDEN Figma icon variant `5845:6506` (Kind=solid, Size=md*,
 * Container=line-height) is intentionally NOT implemented: this primitive
 * exposes NO `variant` / `kind` / `color` selector prop and performs no
 * runtime recoloring (each glyph is a pre-colored asset). Sizing, by contrast,
 * IS part of the public API — a required numeric `size` prop (the square
 * width/height fallback) plus optional `width`/`height` overrides that
 * reproduce the design's non-square icons (e.g. 16×18, 32×33) exactly.
 */
import styles from './Icon.module.css';

/**
 * Props for the {@link Icon} primitive.
 *
 * `size` provides square sizing; `width`/`height` optionally override it to
 * reproduce the design's non-square icons exactly. `alt` is always applied,
 * and an empty `alt` marks the icon as decorative (see {@link Icon}).
 */
export interface IconProps {
  /** Vite-imported asset URL (import of an .svg/.png resolves to a string via vite/client types). */
  src: string;
  /** Square size in px; used for BOTH width and height unless width/height override it. Contextual values: 16, 18, 24, 32, 40. */
  size: number;
  /** Accessible alt text. Pass "" for purely decorative icons (the component then also sets aria-hidden). */
  alt: string;
  /** OPTIONAL explicit width in px for NON-SQUARE icons (e.g., external-link 16×18, Plus UI symbol 32×33). Falls back to `size`. */
  width?: number;
  /** OPTIONAL explicit height in px for NON-SQUARE icons. Falls back to `size`. */
  height?: number;
  /** OPTIONAL extra class merged after the internal `.icon` class (e.g., for caller-specific spacing/alignment). */
  className?: string;
}

/**
 * Render a pre-colored icon asset as a single, exactly-sized `<img>`.
 *
 * Behavior:
 * - Sizing: `width` / `height` fall back to `size`, becoming px HTML
 *   attributes that match the Figma dimensions exactly (square or non-square).
 * - Accessibility: `alt` is always passed through; when `alt === ''` the icon
 *   is purely decorative and is also hidden from assistive technology via
 *   `aria-hidden`, otherwise `aria-hidden` is left unset.
 * - Class merge: the internal `styles.icon` base class is always applied
 *   first, then any caller-provided `className` is appended.
 *
 * @param props - See {@link IconProps}.
 * @returns The icon `<img>` element.
 */
export default function Icon({
  src,
  size,
  alt,
  width,
  height,
  className,
}: IconProps) {
  // Keep the internal `.icon` base class first, then append any caller class
  // (falsy values dropped, single-space separated). Never drop `styles.icon`.
  const classes = [styles.icon, className].filter(Boolean).join(' ');

  return (
    <img
      src={src}
      alt={alt}
      // `size` is the square fallback; `width`/`height` allow exact non-square
      // dimensions (e.g. 16×18, 32×33) — matching the Figma boxes precisely.
      width={width ?? size}
      height={height ?? size}
      className={classes}
      // Decorative icons (empty alt) are hidden from assistive tech; otherwise
      // leave aria-hidden undefined so informative icons expose their alt.
      aria-hidden={alt === '' ? true : undefined}
      // Prevent ghost-drag of the icon image (small fidelity/UX nicety).
      draggable={false}
    />
  );
}
