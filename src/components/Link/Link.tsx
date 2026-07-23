/**
 * Link — the project's own underlined external-hyperlink primitive.
 *
 * Renders a single `<a target="_blank" rel="noopener noreferrer">` as an
 * `inline-flex` row of up to three vertically-centered items:
 *
 *     [prefixIcon?]  label  [suffixIcon?]
 *
 * with a small uniform gap between the icon(s) and the text. The label is
 * ALWAYS underlined (the reconciled Figma "Welcome" spec shows every link in
 * its underlined state); the underline is scoped to the label `<span>` so the
 * prefix/suffix icons are never underlined.
 *
 * NOTE: This is the project's OWN component named `Link`. It is NOT
 * `react-router`'s `Link` — there is no router in this project (AAP §0.4.3,
 * §0.7.2), and nothing here imports from any router package.
 *
 * Two documented usages compose this primitive (AAP §0.3.1 / §0.3.3), each a
 * combination of the `size`/`color` variants:
 *   1. Community-page link (`size="lg"`, `color="link"`) — rendered by
 *      `WelcomePage` below the "Like & Follow" preview panel. Prefix = the small
 *      multicolor Figma logo (icon_figma_small.png), suffix = the blue
 *      external-link glyph (icon_external_link_blue.svg). Label `#1D4ED8`,
 *      Inter 500 18/28, → `https://www.figma.com/@plusui`.
 *   2. Visit link (`size="sm"`, `color="text"`) — reused inside each
 *      `CommunityCard`. Suffix = the black external-link glyph
 *      (icon_external_link_visit.svg). Label `#030712`, Inter 500 16/24.
 *
 * Design authority: the Figma "Welcome" screen
 * (fileKey `U1wiYiDtkktS3L2hsXteNO`, screen node `5845:45077`; Link component
 * node `1965:12013`, State=hovered/underlined).
 *
 * TOKEN / STYLING BOUNDARY (AAP §0.8): this module sets NO inline styles and NO
 * colors. Every visual value (color, font family/weight/size/line-height, the
 * icon↔label gap, and the underline) lives in `Link.module.css` and resolves to
 * a `var(--token)`. The ONLY sizing this component owns is the icon pixel
 * `width`/`height` (structural values transcribed from the reconciled Figma
 * spec so non-square icons render at their exact box without distortion).
 *
 * ASSETS VIA PROPS: `Link` imports NO asset itself. Callers `import` an asset
 * (Vite resolves it to a URL `string`) and pass it down as `prefixIcon` /
 * `suffixIcon`; `Link` forwards the URL to the `Icon` sibling. `Link` therefore
 * never recreates, redraws, or recolors an icon — it only positions and sizes
 * the pre-colored asset it is handed.
 *
 * FLAT DESIGN: the reconciled spec has no elevation and no motion, so there is
 * NO shadow and NO transition/animation anywhere in this component or its
 * stylesheet.
 */
import Icon from '../Icon/Icon';
import styles from './Link.module.css';

/**
 * Props for the {@link Link} primitive.
 *
 * `label` and `href` are required; both icon slots are optional and only render
 * when supplied. `size` and `color` select the two visual variants declared in
 * `Link.module.css`. This interface is the component's public contract and is
 * consumed by `WelcomePage` (community-page link) and `CommunityCard` (visit
 * link).
 */
export interface LinkProps {
  /** Visible, underlined link text; also the anchor's accessible name (e.g. "Visit Plus UI's Figma Community Page", "Visit"). */
  label: string;
  /** Destination URL, forwarded VERBATIM to the anchor `href` — never normalized, trimmed, or appended to (AAP §0.8). */
  href: string;
  /** OPTIONAL Vite-imported asset URL rendered BEFORE the label (the community link's small Figma logo). Omit for links with no leading icon. */
  prefixIcon?: string;
  /** OPTIONAL Vite-imported asset URL rendered AFTER the label (the blue / black external-link glyph). Omit for links with no trailing icon. */
  suffixIcon?: string;
  /** Size variant: `'sm'` = 16px/24px (visit link), `'lg'` = 18px/28px (community-page link). Defaults to `'sm'`. */
  size?: 'sm' | 'lg';
  /** Color variant: `'link'` = `#1D4ED8` (community-page link), `'text'` = `#030712` (visit link). Defaults to `'link'`. */
  color?: 'link' | 'text';
  /** OPTIONAL extra class merged AFTER the component's own classes (e.g. for caller-specific alignment inside a card row). */
  className?: string;
}

/**
 * Render an underlined external hyperlink with optional leading/trailing icons.
 *
 * Structure (always a single `<a>`):
 *   - `href` is forwarded verbatim; `target="_blank"` + `rel="noopener
 *     noreferrer"` are ALWAYS set (mandatory for every outbound link, AAP §0.8).
 *   - Row order: optional prefix `Icon` → label `<span>` → optional suffix
 *     `Icon`. An `<Icon>` is emitted ONLY when its corresponding prop is truthy.
 *   - Variant classes are composed by ternary (never dynamic string-key
 *     lookup): the base `styles.link`, then the size class
 *     (`styles.sizeLg` | `styles.sizeSm`), then the color class
 *     (`styles.colorLink` | `styles.colorText`), then any caller `className`
 *     appended last. Falsy entries (e.g. an absent `className`) are dropped.
 *
 * Icon sizing (structural, from the reconciled Figma spec, node `1965:12013`):
 *   - Suffix external-link: `lg` → 24×24 (blue, square); `sm` → 16×18 (black,
 *     NON-SQUARE — distinct width/height so it is not distorted).
 *   - Prefix Figma logo: 24×24 (its confirmed display box; the source PNG is a
 *     512×512 square canvas whose centered mark renders ≈16×24 via the Icon's
 *     `object-fit: contain`, leaving ~4px transparent gutters).
 * Both icons are passed `alt=""`, which makes `Icon` mark them decorative
 * (`aria-hidden`) — the link's accessible name comes from the visible `label`,
 * so the icon (which merely duplicates the link's intent) is not announced
 * twice.
 *
 * @param props - See {@link LinkProps}.
 * @returns The anchor element with its (optional) icons and underlined label.
 */
export default function Link({
  label,
  href,
  prefixIcon,
  suffixIcon,
  size = 'sm',
  color = 'link',
  className,
}: LinkProps) {
  // Suffix external-link dimensions per the reconciled Figma spec (node
  // 1965:12013, AAP §0.3.4), keyed off the size variant:
  //   lg (community, blue)  -> 24 × 24 (square)
  //   sm (visit,   black)   -> 16 × 18 (NON-SQUARE)
  const suffixDims =
    size === 'lg' ? { width: 24, height: 24 } : { width: 16, height: 18 };

  // Prefix icon dimensions — the small Figma logo PNG (icon_figma_small.png,
  // node 5845:45112). CONFIRMED display box = 24 × 24 (the mark itself is ~16×24
  // and is centered within the square box by Icon's object-fit: contain).
  const prefixDims = { width: 24, height: 24 };

  // Compose variant classes by ternary (no dynamic string-key lookup): base
  // class first, then size, then color, then any caller class last. filter
  // drops the absent-className falsy entry before joining.
  const classes = [
    styles.link,
    size === 'lg' ? styles.sizeLg : styles.sizeSm,
    color === 'link' ? styles.colorLink : styles.colorText,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {prefixIcon && (
        <Icon
          src={prefixIcon}
          size={prefixDims.height}
          width={prefixDims.width}
          height={prefixDims.height}
          alt=""
        />
      )}
      <span className={styles.label}>{label}</span>
      {suffixIcon && (
        <Icon
          src={suffixIcon}
          size={suffixDims.height}
          width={suffixDims.width}
          height={suffixDims.height}
          alt=""
        />
      )}
    </a>
  );
}
