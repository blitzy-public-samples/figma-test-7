/**
 * principles — content data for the "Key Principles" 3×2 card grid.
 *
 * This is a PURELY PRESENTATIONAL data module: it holds the ordered content for
 * the six cards in the Welcome page's "Key Principles" section and nothing else.
 * It performs NO data fetching, holds NO state, has NO side effects, and imports
 * NO React — it is static content that the view layer maps over.
 *
 * CROSS-FILE CONTRACT
 *   • Consumes the `PrincipleCardProps` shape declared by the sibling component
 *     `src/components/PrincipleCard/PrincipleCard.tsx`:
 *       interface PrincipleCardProps { iconSrc: string; title: string; description: string }
 *     Imported here as a TYPE-ONLY import (see below) so this data module never
 *     pulls the component's runtime or its CSS Module into the bundle.
 *   • Exposes the named export `principles: PrincipleCardProps[]`, which
 *     `src/pages/WelcomePage/WelcomePage.tsx` imports and maps onto six
 *     `<PrincipleCard … />` instances (one per array entry, in array order).
 *
 * ASSET RESOLUTION
 *   Each `iconSrc` is an ES-module import of a `principle_*.png` cover
 *   illustration from `src/assets/images/`. Vite resolves every such import to a
 *   fingerprinted URL, and `src/vite-env.d.ts` (`/// <reference types="vite/client" />`)
 *   types `*.png` default imports as `string` — which is exactly what
 *   `PrincipleCardProps.iconSrc` requires. (No local `declare module '*.png'` is
 *   added here; that would duplicate `vite/client` and break the build.)
 *
 * WHY `import type`
 *   The project compiles under strict TypeScript with `verbatimModuleSyntax` and
 *   `isolatedModules`. A value import of a type would fail to elide and break the
 *   build, so the props interface MUST be brought in via `import type`.
 *
 * DESIGN AUTHORITY (content fidelity)
 *   Every title and description below is transcribed VERBATIM from the Figma
 *   "Welcome" screen — fileKey `U1wiYiDtkktS3L2hsXteNO`, screen node `5845:45077`.
 *   The per-card Figma instance node IDs are annotated inline. Titles are the
 *   principle names; descriptions are the exact supporting sentences (exact
 *   wording, capitalization, and punctuation — including the comma in the
 *   Modularity copy and each sentence's terminal period). Do not paraphrase,
 *   reorder, or edit these strings.
 *
 * ORDER
 *   Entries follow the Figma grid's reading order (top-left → bottom-right):
 *   Efficiency, Consistency, Modularity (row 1) then Accessibility, Flexibility,
 *   Clarity (row 2).
 */
import type { PrincipleCardProps } from '../components/PrincipleCard/PrincipleCard';

import principleEfficiency from '../assets/images/principle_efficiency.png';
import principleConsistency from '../assets/images/principle_consistency.png';
import principleModularity from '../assets/images/principle_modularity.png';
import principleAccessibility from '../assets/images/principle_accessibility.png';
import principleFlexibility from '../assets/images/principle_flexibility.png';
import principleClarity from '../assets/images/principle_clarity.png';

/**
 * The six "Key Principles" cards, in Figma 3×2 reading order.
 *
 * Rendered by `WelcomePage` as six `<PrincipleCard>` instances. Each entry
 * carries exactly the three members of {@link PrincipleCardProps}: the resolved
 * cover-image URL (`iconSrc`), the principle name (`title`), and the verbatim
 * supporting sentence (`description`).
 */
export const principles: PrincipleCardProps[] = [
  // Row 1 · Column 1 — Figma instance node 5845:45122
  {
    iconSrc: principleEfficiency,
    title: 'Efficiency',
    description: 'Designed to reduce friction and speed up user interactions.',
  },
  // Row 1 · Column 2 — Figma instance node 5845:45129
  {
    iconSrc: principleConsistency,
    title: 'Consistency',
    description: 'A unified design language across all components.',
  },
  // Row 1 · Column 3 — Figma instance node 5845:45136
  {
    iconSrc: principleModularity,
    title: 'Modularity',
    description: 'Flexible, scalable components that adapt easily.',
  },
  // Row 2 · Column 1 — Figma instance node 5845:45143
  {
    iconSrc: principleAccessibility,
    title: 'Accessibility',
    description: 'Built to be inclusive and usable for everyone.',
  },
  // Row 2 · Column 2 — Figma instance node 5845:45150
  {
    iconSrc: principleFlexibility,
    title: 'Flexibility',
    description: 'Customizable components for any use case.',
  },
  // Row 2 · Column 3 — Figma instance node 5845:45157
  {
    iconSrc: principleClarity,
    title: 'Clarity',
    description: 'Clear visuals and interactions that communicate instantly.',
  },
];
