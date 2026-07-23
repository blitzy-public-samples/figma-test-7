/**
 * Divider — the 1px full-width horizontal section separator.
 *
 * Renders a single, purely decorative-yet-semantic thematic break (`<hr>`)
 * that separates the five stacked content sections of the Welcome page. It is
 * rendered THREE times by `WelcomePage` (mapping to the Figma section-divider
 * instances `5845:45089`, `5845:45114`, and `5845:45165`) and reproduces the
 * Figma **Divider** component — Kind=Default, Orientation=Horizontal
 * (node `4796:80537`) — within the "Welcome" screen (fileKey
 * `U1wiYiDtkktS3L2hsXteNO`, node `5845:45077`).
 *
 * VISUAL SPEC (CONFIRMED from the reconciled Figma specification): a single
 * crisp 1px light-gray (`#9CA3AF`) rule that spans the full 1344px content
 * column, with square (butt) ends, NO corner radius, NO shadow/elevation, NO
 * opacity change, NO dash pattern, and NO animation. In the Figma source the
 * line is a stroked `<line>` (fill=none); it is reproduced here as an `<hr>`
 * whose visible line is drawn by `height: 1px` + `background-color` — a
 * pixel-identical result. All of those values live in the co-located CSS
 * Module `./Divider.module.css`, where the color resolves through the
 * `--color-border` design token (`#9CA3AF`, defined once in
 * `src/styles/tokens.css`). This keeps the component free of any hardcoded
 * visual value (AAP §0.8, token-driven styling).
 *
 * LAYOUT CONTRACT: the divider deliberately carries NO vertical margin — the
 * 64px inter-section spacing is owned by `WelcomePage`'s flex layout, so this
 * separator must never introduce spacing of its own (see the `margin: 0` rule
 * in `Divider.module.css`).
 *
 * WHY `<hr>` (and not `<div role="separator">`): `<hr>` is the correct
 * semantic element for a thematic break between sections and carries the
 * implicit ARIA `role="separator"` with a horizontal orientation for free — no
 * extra ARIA attributes are required. It renders no children, text, icons, or
 * image/SVG assets: it is a pure line.
 *
 * This component intentionally exposes NO size / orientation / color props —
 * the design defines exactly one horizontal variant. The only prop is an
 * optional `className` so a consumer (e.g. `WelcomePage`) can attach
 * layout-level classes without overriding the divider's own visuals.
 *
 * NOTE ON SCOPE: this is ONLY the full-width SECTION divider. The partial-width
 * 1px hairlines inside `PrincipleCard` / `CommunityCard` are separate CSS
 * borders within those components and do NOT use this `Divider`.
 */
import styles from './Divider.module.css';

/**
 * Props for the {@link Divider} component.
 *
 * The single horizontal variant means there are deliberately NO size,
 * orientation, or color props — the only knob is an optional extra class.
 */
export interface DividerProps {
  /**
   * OPTIONAL extra class appended AFTER the internal `styles.divider` base
   * class in the element's `class` attribute. (The order of names within the
   * `class` attribute does NOT determine the cascade: which declaration wins is
   * decided by CSS specificity and then by stylesheet source order, not by the
   * order classes are listed on the element. The base class is appended-to,
   * rather than replaced, purely to guarantee `.divider` is always present;
   * callers pass layout-only hooks such as margins that do not conflict with
   * the divider's own visual rules.) When omitted, ONLY `styles.divider` is
   * applied — no trailing space and no `undefined` leaks into the rendered
   * `class` attribute.
   */
  className?: string;
}

/**
 * Render the 1px full-width `#9CA3AF` horizontal section separator.
 *
 * Class composition: the internal `styles.divider` base class is always
 * applied first; when a `className` is provided it is appended after it
 * (single space separated). When `className` is absent, the element carries
 * exactly `styles.divider` with no trailing whitespace.
 *
 * @param props - See {@link DividerProps}.
 * @returns A single `<hr>` element carrying the scoped divider class.
 */
export default function Divider({ className }: DividerProps) {
  const classes = className ? `${styles.divider} ${className}` : styles.divider;
  return <hr className={classes} />;
}
