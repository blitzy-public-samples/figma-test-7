/**
 * PrincipleCard — the repeated card in the "Key Principles" section.
 *
 * `WelcomePage` renders SIX instances of this card in a 3×2 wrap grid inside the
 * light-gray "Key Principles" panel: Efficiency, Consistency, Modularity,
 * Accessibility, Flexibility, and Clarity. Each card is a self-contained unit —
 * an illustrated COVER on top, then a BODY holding a title and a short
 * description — so it is authored as an `<article>`.
 *
 * Design authority (authoritative for every value): the Figma "Welcome" screen,
 * fileKey `U1wiYiDtkktS3L2hsXteNO`, component node `5845:45122` (content
 * instances `5845:45129` / `45136` / `45143` / `45150` / `45157`) on screen
 * `5845:45077`. Reconciled spec: AAP §0.3.3. Confirmed box model:
 *   - Card: 380px wide, #FFFFFF surface, 1px `#9CA3AF` inside stroke on all four
 *     sides, 4px radius, `overflow: hidden` (so the cover's top corners follow
 *     the radius), vertical stack (cover above body). No shadow/elevation.
 *   - Cover: 380×192 panel, `#E0E7FF` background, centering the 304×192
 *     illustration with ~38px lavender gutters left/right (the image's own baked
 *     `#E0E7FF` background blends seamlessly with the panel fill).
 *   - Hairline: a 1px `#9CA3AF` line between cover and body, drawn as the body's
 *     top border (NOT a separate element and NOT the full-width `Divider`).
 *   - Body: 16px vertical / 24px horizontal padding, 16px gap between the title
 *     and the description.
 *   - Title: Inter Medium 500, 24px/32px, `#030712`.
 *   - Description: Inter Regular 400, 20px/28px, `#030712` (wraps freely).
 * All of these values live as tokens in the co-located CSS Module; this
 * component only supplies structure and content.
 *
 * DATA FLOW — this component imports NO asset. `src/data/principles.ts` performs
 * the six `principle_*.png` ES-module imports (Vite resolves each to a URL
 * string) and exports `{ iconSrc, title, description }` entries; `WelcomePage`
 * maps them onto `<PrincipleCard … />`. `iconSrc` therefore arrives here as an
 * already-resolved image URL string, passed straight through to the `<img>`.
 *
 * SEMANTICS / ACCESSIBILITY — the title is an `<h3>` to preserve the page's
 * heading hierarchy (`<h1>` hero → `<h2>` section headings → `<h3>` card
 * titles); it must never be an `<h1>` or `<h2>`. The cover `<img>` carries the
 * principle name as its `alt` (a non-empty, informative label per AAP §0.8) and
 * declares its intrinsic `304×192` size to eliminate layout shift, which keeps
 * the fidelity screenshots deterministic.
 *
 * LAYOUT OWNERSHIP — the 3×2 grid, the inter-card gaps, and the surrounding
 * `#F3F4F6` panel are owned by `WelcomePage`, not by this card. The card only
 * defines its own fixed 380px footprint and internal composition.
 */
import styles from './PrincipleCard.module.css';

/**
 * Props for {@link PrincipleCard}.
 *
 * This is an exact cross-file contract: `src/data/principles.ts` builds objects
 * of this shape and `WelcomePage` spreads them onto the component. All three
 * members are required strings — there are no optional or additional props.
 */
export interface PrincipleCardProps {
  /**
   * Resolved illustration URL for the card cover (one of the `principle_*.png`
   * assets). Imported in `src/data/principles.ts` — where Vite turns the asset
   * import into a URL string — and passed through `WelcomePage`. Rendered at an
   * exact 304×192 inside the `#E0E7FF` cover panel.
   */
  iconSrc: string;
  /**
   * Principle name shown as the card title, e.g. "Efficiency". Also used as the
   * cover image's `alt` text so the illustration is announced by its principle
   * name to assistive technology.
   */
  title: string;
  /**
   * Short supporting sentence shown beneath the title, e.g. "Designed to reduce
   * friction and speed up user interactions." Wraps freely to multiple lines.
   */
  description: string;
}

/**
 * Render one "Key Principles" card: a 304×192 illustration on the `#E0E7FF`
 * cover, then the principle title (`<h3>`) and its description (`<p>`) in the
 * body, separated from the cover by the 1px in-card hairline.
 *
 * Purely presentational and stateless — it holds no state, has no interactive
 * affordances, and produces no side effects; every visual value is resolved
 * through the co-located CSS Module's design tokens.
 *
 * @param props - See {@link PrincipleCardProps}.
 * @returns The principle card `<article>` element.
 */
export default function PrincipleCard({
  iconSrc,
  title,
  description,
}: PrincipleCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        <img
          className={styles.coverImage}
          src={iconSrc}
          alt={title}
          width={304}
          height={192}
        />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>
    </article>
  );
}
