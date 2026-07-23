/**
 * Header — the full-bleed indigo→violet gradient HERO band at the very top of
 * the Welcome page.
 *
 * Reproduces the Figma "Doc Header" component (node `5845:45213`) from the
 * "Welcome" screen (`5845:45077`, fileKey `U1wiYiDtkktS3L2hsXteNO`). It renders
 * a gradient cover containing two stacked groups:
 *   1. BRAND ROW (space-between): the Plus UI logo lockup on the LEFT (symbol
 *      icon + wordmark) and the external website link on the RIGHT (external-link
 *      icon + label).
 *   2. HERO COPY: the single page `<h1>` title followed by a subtitle `<p>`.
 *
 * `WelcomePage` renders this component full-bleed at the top, above the 1344px
 * body content column, and supplies every text string and asset URL via props.
 *
 * DESIGN AUTHORITY (read-only): the reconciled Figma "Welcome" specification.
 * Every visual value (gradient `linear-gradient(70deg, #312E81 3%, #4338CA 91%)`,
 * white `#FFFFFF` foreground, cover padding 64/96, inter-group gap 48px,
 * border-radius `4px 4px 0 0`, the 8px symbol↔wordmark and icon↔label gaps, the
 * 16px h1↔subtitle gap, and every type style — H1 Inter 600 48/48, subtext
 * Inter 400 18/28, wordmark Helvetica Neue 700 27, link Inter 500 16/24) lives
 * in the co-located CSS Module `Header.module.css`, resolved from the global
 * `tokens.css` custom properties. There are NO shadows/elevation and NO
 * motion/animation anywhere in this band (enforced in the CSS Module).
 *
 * SCOPE / EXCLUSIONS: the Figma "Doc Header" component defines an optional
 * nested Chip / Pro Chip slot (`1513:3438`). In this "Welcome" usage that
 * variant is `Chip=false` / `Pro Chip=false` → HIDDEN, so NO chip/badge/tag
 * element is rendered here (and there is no chip-related prop).
 *
 * ASSET POLICY: this component imports NO `.svg`/`.png` asset itself. Both icon
 * URLs (`logoSrc`, `externalIconSrc`) arrive as props — `WelcomePage` imports
 * the pre-colored Figma assets (Vite resolves each import to a URL string) and
 * passes them down. Icons are drawn by the shared `Icon` primitive; this
 * component never recreates, redraws, or recolors a glyph.
 */
import styles from './Header.module.css';
import Icon from '../Icon/Icon';

/**
 * Props for the {@link Header} hero band.
 *
 * All seven props are REQUIRED strings. The two `*Src` props are Vite-imported
 * asset URLs (an `import` of an `.svg`/`.png` resolves to a `string` via the
 * `vite/client` module types); the remaining five are display/href text that
 * `WelcomePage` supplies verbatim from the reconciled Figma content.
 */
export interface HeaderProps {
  /** Hero `<h1>` text, e.g. `"Welcome to Plus UI"`. */
  title: string;
  /** Hero subtitle paragraph text (rendered as a `<p>` below the title). */
  subtitle: string;
  /** Vite-imported URL of `plusui_symbol.svg` — the white Plus UI mark (32×33). */
  logoSrc: string;
  /** Brand wordmark text shown beside the symbol, e.g. `"Plus UI"`. */
  wordmark: string;
  /** Website link label, e.g. `"www.plusui.com"`. */
  linkLabel: string;
  /** Website link href, e.g. `"https://www.plusui.com/"` (opened in a new tab). */
  linkHref: string;
  /** Vite-imported URL of `icon_external_link_header.svg` — white external-link glyph (16×18). */
  externalIconSrc: string;
}

/**
 * Render the Welcome-page hero band.
 *
 * Structure (top→bottom, left→right — mirrors the Figma layout order):
 * - `<header class=hero>` — the gradient cover (semantic page banner).
 *   - `<div class=brandRow>` — space-between utility row.
 *     - `<div class=lockup>` — LEFT: the logo symbol `Icon` (32×33, decorative)
 *       followed by the `<span class=wordmark>` brand text. The lockup is NOT a
 *       link — only the right-hand website affordance is interactive.
 *     - `<a class=link>` — RIGHT: an external website link, external-link `Icon`
 *       (16×18, decorative) FIRST, then the `{linkLabel}` text. Opens in a new
 *       tab with the safe `rel="noopener noreferrer"` relationship.
 *   - `<div class=copy>` — the hero copy column.
 *     - `<h1 class=title>` — the single `<h1>` for the entire page.
 *     - `<p class=subtitle>` — the supporting subtitle paragraph.
 *
 * Accessibility: both icons pass `alt=""` because they are purely decorative —
 * the adjacent wordmark/label text carries the meaning, so `Icon` marks them
 * `aria-hidden` to avoid duplicate screen-reader announcements while still
 * satisfying the "`alt` on every image" rule.
 *
 * @param props - See {@link HeaderProps}.
 * @returns The hero `<header>` element.
 */
export default function Header({
  title,
  subtitle,
  logoSrc,
  wordmark,
  linkLabel,
  linkHref,
  externalIconSrc,
}: HeaderProps) {
  return (
    <header className={styles.hero}>
      {/* Brand row: logo lockup (left) <-> website link (right) */}
      <div className={styles.brandRow}>
        <div className={styles.lockup}>
          {/* Plus UI symbol — 32×33, white pre-colored asset; decorative
              (the adjacent wordmark conveys the brand). */}
          <Icon src={logoSrc} size={32} width={32} height={33} alt="" />
          <span className={styles.wordmark}>{wordmark}</span>
        </div>

        {/* External website link — icon BEFORE label; opens in a new tab. */}
        <a
          className={styles.link}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* White square-up-right external-link glyph — 16×18; decorative
              (the adjacent label conveys the destination). */}
          <Icon src={externalIconSrc} size={16} width={16} height={18} alt="" />
          {linkLabel}
        </a>
      </div>

      {/* Hero copy: the page's single <h1> + supporting subtitle. */}
      <div className={styles.copy}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </header>
  );
}
