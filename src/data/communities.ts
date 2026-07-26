/**
 * communities — content data for the "Join Our Communities" card row.
 *
 * This is a PURELY PRESENTATIONAL data module: it holds the ordered content for
 * the three cards in the Welcome page's "Join Our Communities" section and
 * nothing else. It performs NO data fetching, holds NO state, has NO side
 * effects, and imports NO React — it is static content that the view layer maps
 * over (AAP §0.7.2).
 *
 * CROSS-FILE CONTRACT
 *   • Consumes the `CommunityCardProps` shape declared by the sibling component
 *     `src/components/CommunityCard/CommunityCard.tsx`:
 *       interface CommunityCardProps { logoSrc: string; brandName: string; visitHref: string }
 *     Imported here as a TYPE-ONLY import (see below) so this data module never
 *     pulls the component's runtime or its CSS Module into the bundle.
 *   • Exposes the named export `communities: CommunityCardProps[]`, which
 *     `src/pages/WelcomePage/WelcomePage.tsx` imports
 *     (`import { communities } from '../../data/communities';`) and maps onto
 *     three `<CommunityCard … />` instances (one per array entry, in array
 *     order) inside the light-gray (`#F3F4F6`) "Join Our Communities" panel.
 *   • Each entry carries EXACTLY the three members of `CommunityCardProps`
 *     (`logoSrc`, `brandName`, `visitHref`) — no `id`, no `alt`, no extra keys.
 *     `CommunityCard` derives the logo `alt` from `brandName` and imports its own
 *     constant Visit-link icon, so neither belongs in this data.
 *
 * ASSET RESOLUTION
 *   Each `logoSrc` is an ES-module import of a `logo_*.png` from
 *   `src/assets/images/`. Vite resolves every such import to a fingerprinted
 *   URL, and `src/vite-env.d.ts` (`/// <reference types="vite/client" />`) types
 *   `*.png` default imports as `string` — which is exactly what
 *   `CommunityCardProps.logoSrc` requires. (No local `declare module '*.png'` is
 *   added here; that would duplicate `vite/client` and break the build.)
 *
 * WHY `import type`
 *   The project compiles under strict TypeScript with `verbatimModuleSyntax` and
 *   `isolatedModules`. A value import of a type would fail to elide and break the
 *   build, so the props interface MUST be brought in via `import type`.
 *
 * DESIGN AUTHORITY (content fidelity)
 *   Brand names, ordering, and outbound URLs are transcribed from the Figma
 *   "Welcome" screen — fileKey `U1wiYiDtkktS3L2hsXteNO`, screen node `5845:45077`,
 *   `CommunityCard` component node `5845:45179` — as reconciled in AAP §0.3.1 /
 *   §0.3.3 / §0.8. Per-card Figma instance node IDs are annotated inline. The
 *   four external hrefs across the page are preserved BYTE-FOR-BYTE (AAP §0.8):
 *   no trailing-slash change, no scheme change, no `www` add/remove, and the X
 *   destination stays on `twitter.com` (never rewritten to `x.com`). Do not
 *   paraphrase, reorder, or edit these strings.
 *
 * ORDER
 *   Entries follow the Figma left→right card order: Figma Community, then
 *   Discord, then X.
 */
import type { CommunityCardProps } from '../components/CommunityCard/CommunityCard';

import logoFigmaCommunity from '../assets/images/logo_figma_community.png';
import logoDiscord from '../assets/images/logo_discord.png';
import logoX from '../assets/images/logo_x.png';

/**
 * The three "Join Our Communities" cards, in Figma left→right order.
 *
 * Rendered by `WelcomePage` as three `<CommunityCard>` instances. Each entry
 * carries exactly the three members of {@link CommunityCardProps}: the resolved
 * brand-logo URL (`logoSrc`), the brand name (`brandName`), and the verbatim
 * outbound "Visit" destination (`visitHref`).
 */
export const communities: CommunityCardProps[] = [
  // Card 1 — Figma Community · instance node 5845:45179
  {
    logoSrc: logoFigmaCommunity,
    brandName: 'Figma Community',
    visitHref: 'https://www.figma.com/@plusui',
  },
  // Card 2 — Discord · instance node 5845:45191
  {
    logoSrc: logoDiscord,
    brandName: 'Discord',
    visitHref: 'https://discord.gg/Y5a78GGX',
  },
  // Card 3 — X · instance node 5845:45202
  {
    logoSrc: logoX,
    brandName: 'X',
    visitHref: 'https://twitter.com/PlusUI_Official',
  },
];
