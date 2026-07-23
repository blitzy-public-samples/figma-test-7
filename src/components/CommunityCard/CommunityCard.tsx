/**
 * CommunityCard — the repeated card in the "Join Our Communities" section.
 *
 * `WelcomePage` renders THREE instances of this card in a single row inside the
 * light-gray (`#F3F4F6`) "Join Our Communities" panel: Figma Community, Discord,
 * and X. Each card is a self-contained unit — a centered brand-logo SHOWCASE on
 * top, then a FOOTER row holding the brand name and a "Visit" external link —
 * so it is authored as an `<article>` (matching the sibling `PrincipleCard`).
 *
 * Design authority (authoritative for every value): the Figma "Welcome" screen,
 * fileKey `U1wiYiDtkktS3L2hsXteNO`, component node `5845:45179` (content
 * instances `5845:45191` Discord, `5845:45202` X) on screen `5845:45077`.
 * Reconciled spec: AAP §0.3.3. Confirmed box model (all values live as tokens in
 * the co-located CSS Module — this component only supplies structure/content):
 *   - Card: 384px wide, `#FFFFFF` surface, 1px `#9CA3AF` inside stroke on all
 *     four sides, 4px radius, `overflow: hidden` (so the showcase's top corners
 *     follow the radius), vertical stack (showcase above footer). No shadow.
 *   - Showcase: a fixed 200px band that centers the brand logo both horizontally
 *     and vertically. The per-brand logo renders at its exact design size
 *     (Figma Community 192×96, Discord 124×124, X 72×72); the co-located CSS
 *     Module owns that sizing (`max-width`/`max-height`/`object-fit: contain`),
 *     which is why the `<img>` below declares no width/height — the three logos
 *     have three different design sizes and this component receives only the
 *     brand name, so a single hardcoded dimension pair cannot apply.
 *   - Hairline: a 1px `#9CA3AF` line between showcase and footer, drawn as the
 *     footer's top border (NOT a separate element and NOT the full-width
 *     `Divider` component).
 *   - Footer: 24px padding on all sides, `space-between` so the brand name sits
 *     at the start and the Visit link at the end, both vertically centered.
 *   - Brand name: Inter Medium 500, 24px/32px, `#030712`.
 *   - Visit link: Inter Medium 500, 16px/24px, `#030712`, underlined, with the
 *     black external-link glyph (16×18).
 *
 * DATA FLOW — this component imports NO logo asset. `src/data/communities.ts`
 * performs the three `logo_*.png` ES-module imports (Vite resolves each to a URL
 * string) and exports `{ logoSrc, brandName, visitHref }` entries; `WelcomePage`
 * maps them onto `<CommunityCard … />`. `logoSrc` therefore arrives here as an
 * already-resolved image URL string, passed straight through to the `<img>`.
 * The ONLY asset this component imports directly is the Visit-link icon, which
 * is CONSTANT across all three cards (so it is not a prop): the black
 * square-up-right external-link glyph (`icon_external_link_visit.svg`, node
 * `5845:45199`, 16×18), forwarded to `Link` as its `suffixIcon`.
 *
 * SEMANTICS / ACCESSIBILITY (AAP §0.8) — the brand name is an `<h3>` to preserve
 * the page's heading hierarchy (`<h1>` hero → `<h2>` section headings → `<h3>`
 * card titles); it must never be an `<h1>` or `<h2>`. The logo `<img>` carries
 * the brand name as its non-empty `alt` (an informative label, never empty).
 * The outbound Visit link's `target="_blank"` + `rel="noopener noreferrer"` and
 * the verbatim `href` are all handled inside the `Link` primitive.
 *
 * TOKEN / STYLING BOUNDARY (AAP §0.8) — this `.tsx` sets NO inline styles and NO
 * colors/spacing. Every visual value lives in `CommunityCard.module.css` and
 * resolves to a `var(--token)`. The component only wires structure, the logo
 * `src`/`alt`, the brand name, and the `Link` props.
 *
 * LAYOUT OWNERSHIP — the single row, the inter-card gaps, and the surrounding
 * `#F3F4F6` panel are owned by `WelcomePage`, not by this card. The card only
 * defines its own fixed 384px footprint and internal composition.
 *
 * FLAT DESIGN — the reconciled spec has no elevation and no motion, so there is
 * NO shadow and NO transition/animation anywhere in this component or its
 * stylesheet.
 */
import Link from '../Link/Link';
import visitIcon from '../../assets/icons/icon_external_link_visit.svg';
import styles from './CommunityCard.module.css';

/**
 * Props for {@link CommunityCard}.
 *
 * This is an exact cross-file contract: `src/data/communities.ts` builds objects
 * of this shape and `WelcomePage` spreads them onto the component. All three
 * members are required strings — there are no optional or additional props. The
 * Visit-link icon is intentionally NOT a prop (it is constant across all three
 * cards and is imported directly by this module).
 */
export interface CommunityCardProps {
  /**
   * Resolved logo URL for the showcase (one of the `logo_*.png` assets).
   * Imported in `src/data/communities.ts` — where Vite turns the asset import
   * into a URL string — and passed through `WelcomePage`. Centered (H+V) at its
   * exact per-brand design size inside the 200px showcase by the CSS Module.
   */
  logoSrc: string;
  /**
   * Brand name shown as the card title and as the logo's `alt` text — one of
   * "Figma Community", "Discord", or "X". Rendered in an `<h3>`.
   */
  brandName: string;
  /**
   * Exact external destination URL for the "Visit" link, forwarded VERBATIM to
   * the anchor `href` (never normalized, trimmed, or appended to): Figma
   * Community → `https://www.figma.com/@plusui`, Discord →
   * `https://discord.gg/Y5a78GGX`, X → `https://twitter.com/PlusUI_Official`.
   */
  visitHref: string;
}

/**
 * Render one "Join Our Communities" card: a centered brand logo on the 200px
 * showcase, then the brand name (`<h3>`) and an underlined "Visit" external link
 * in the footer, separated from the showcase by the 1px in-card hairline.
 *
 * Purely presentational and stateless — it holds no state, has no interactive
 * affordances of its own, and produces no side effects; every visual value is
 * resolved through the co-located CSS Module's design tokens, and the outbound
 * anchor behavior is owned by the `Link` primitive.
 *
 * @param props - See {@link CommunityCardProps}.
 * @returns The community card `<article>` element.
 */
export default function CommunityCard({
  logoSrc,
  brandName,
  visitHref,
}: CommunityCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.showcase}>
        {/*
          Logo intentionally has NO width/height: the three brand logos have
          three different design sizes (192×96 / 124×124 / 72×72) and this card
          receives only `brandName`, so sizing is delegated to the CSS Module
          (max-width / max-height / object-fit: contain). `alt` is the brand
          name (non-empty, informative) per AAP §0.8.
        */}
        <img className={styles.logo} src={logoSrc} alt={brandName} />
      </div>
      <div className={styles.footer}>
        <h3 className={styles.brandName}>{brandName}</h3>
        {/*
          Visit link in its visit variant: size="sm" → Inter 500 16px/24px,
          color="text" → #030712, underlined label + the black external-link
          glyph. The icon is CONSTANT across all three cards, so it is imported
          directly here (not a prop) and forwarded as `suffixIcon`. `Link` owns
          the anchor (target="_blank" + rel="noopener noreferrer"), the verbatim
          href, and the 16×18 icon sizing for the `sm` variant.

          BLITZY [FIGMA]: The reconciled Figma render (node 5845:45179 and its
          Discord/X instances) shows the external-link glyph LEADING the word
          "Visit" (icon to the LEFT of the label). This file follows the AAP
          §0.3.3 Component Inventory and its own spec, which define the Visit
          icon as a `suffix` (trailing), and the `Link` primitive is architected
          for that (its `sm` suffix renders the correct 16×18; a prefix slot
          renders 24×24). Rendering the icon on the LEFT at the correct 16×18
          size would require a `Link` prefix-sizing change, which is outside this
          single file's scope — flagged here for holistic review by the Link /
          page owner so all Visit links stay consistent.
        */}
        <Link
          label="Visit"
          href={visitHref}
          suffixIcon={visitIcon}
          size="sm"
          color="text"
        />
      </div>
    </article>
  );
}
