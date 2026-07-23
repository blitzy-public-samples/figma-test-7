/**
 * Section — a code-only, reusable content-section layout helper.
 *
 * `Section` standardizes the recurring "H2 heading + body (+ optional panel)"
 * block used by the content sections of the Figma "Welcome" screen
 * (fileKey `U1wiYiDtkktS3L2hsXteNO`, screen `5845:45077`). It is NOT a distinct
 * Figma component — it is a code convenience introduced by the AAP (§0.3.3) so
 * that `WelcomePage` can render each section with identical vertical rhythm: an
 * `<h2>` heading followed by body paragraph(s) and/or a panel, stacked in a
 * column with a 24px gap.
 *
 * Real Figma section containers that map to this helper:
 *   - "Design 20x faster"     → node `5845:45079` (H2 + two body paragraphs)
 *   - "Key Principles"        → node `5845:45115` (H2 + body + 3×2 card panel)
 *   - "Join Our Communities"  → node `5845:45166` (H2 + body + 3-card panel)
 * A fourth usage is the "Like & Follow us on Figma Community!" section
 * (`5845:45090`) whose heading (`5845:45093`) is SemiBold and carries a trailing
 * outline-heart icon (`5845:45094`, `icon_heart.svg`, 40×40, `#030712`). Section
 * itself deliberately does NOT import that icon — the caller composes it into the
 * `heading` node (e.g. `<>Like &amp; Follow…<Icon … /></>`), which keeps this
 * helper generic and asset-agnostic (the same rationale as the `Icon` primitive).
 *
 * Styling authority: all visual values (typography, colors, the 24px section/
 * body gap, and the heading↔trailing-icon gap) live in the co-located
 * `Section.module.css`, which resolves them exclusively through the design
 * tokens in `src/styles/tokens.css`. This component owns NO literal styles — it
 * only wires class names — so there is no inline `style`, no hardcoded color or
 * spacing, and no `!important`. CONFIRMED styles (for reviewer context only):
 * `.heading` = Inter 500 (default) or 600 (semibold) / 36px / 40px / `#030712`;
 * `.body` = Inter 400 / 20px / 28px / `#030712`; vertical gaps 24px. There are
 * no shadows, no elevation, and no motion anywhere in the design.
 *
 * Accessibility & semantics: the root is a semantic `<section>` and the heading
 * is a semantic `<h2>`. The page has exactly ONE `<h1>` (in the `Header`
 * component); this helper never emits an `<h1>`. `Section` is presentational and
 * stateless — it uses no hooks, holds no state, and performs no side effects.
 */
import type { ReactNode } from 'react';
import styles from './Section.module.css';

/**
 * Props for the {@link Section} layout helper.
 *
 * The component is intentionally minimal: it renders whatever `heading` and
 * `children` nodes the caller supplies inside the standardized `<section>` /
 * `<h2>` / body scaffold, applying only layout and typography classes.
 */
export interface SectionProps {
  /**
   * Heading content. Plain text (e.g. `"Design 20x faster"`) OR text plus a
   * trailing icon node (e.g. `<>Like &amp; Follow…<Icon … /></>` for the
   * "Like & Follow" section). Rendered verbatim inside the `<h2>`; the flex
   * `.heading` rule vertically centers and 24px-gaps any trailing icon.
   */
  heading: ReactNode;
  /**
   * Heading weight variant. `'medium'` (Inter 500) is the default and is used by
   * three of the four sections; `'semibold'` (Inter 600) is used ONLY by the
   * "Like & Follow us on Figma Community!" heading (Figma node `5845:45093`).
   */
  headingVariant?: 'medium' | 'semibold';
  /**
   * Body content — one or more paragraphs and/or an optional panel. Rendered
   * inside a `.body` wrapper (a 24px-gapped column) ONLY when provided, so a
   * heading-only section emits no empty body wrapper.
   */
  children?: ReactNode;
  /**
   * Optional extra class appended to the root `<section>` (layout hooks supplied
   * by `WelcomePage`, e.g. a section id or scroll target). It is ADDED to the
   * internal `.section` class and never replaces it.
   */
  className?: string;
}

/**
 * Render a standardized content section: an `<h2>` heading over an optional
 * body block, stacked in a 24px-gapped column.
 *
 * Behavior:
 * - `headingVariant` defaults to `'medium'`; when `'semibold'`, BOTH
 *   `styles.heading` and `styles.headingSemibold` are applied to the `<h2>` so
 *   the semibold modifier layers on top of the shared heading rule.
 * - `heading` is rendered as-is, so callers may pass a plain string or a
 *   fragment that includes a trailing `<Icon>` (e.g. the outline heart).
 * - The `.body` wrapper is emitted ONLY when `children != null`, guaranteeing a
 *   heading-only section renders no empty `<div>`.
 * - `className`, when supplied, is appended (space-separated) to the root
 *   `<section>`'s class list; `styles.section` is always present.
 *
 * @param props - See {@link SectionProps}.
 * @returns The section `<section>` element.
 */
export default function Section({
  heading,
  headingVariant = 'medium',
  children,
  className,
}: SectionProps) {
  // Root class: always keep the internal `.section` base, then append the
  // caller-provided class (when present) — never replace the base class.
  const sectionClassName = className
    ? `${styles.section} ${className}`
    : styles.section;

  // Heading class: the shared `.heading` rule always applies; the SemiBold
  // variant layers the `.headingSemibold` weight modifier on top of it.
  const headingClassName =
    headingVariant === 'semibold'
      ? `${styles.heading} ${styles.headingSemibold}`
      : styles.heading;

  return (
    <section className={sectionClassName}>
      <h2 className={headingClassName}>{heading}</h2>
      {/* Emit the body wrapper ONLY when children are provided, so a
          heading-only section produces no empty `.body` div. */}
      {children != null && <div className={styles.body}>{children}</div>}
    </section>
  );
}
