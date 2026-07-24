/* =============================================================================
 * WelcomePage.tsx — the composed "Welcome" screen
 * -----------------------------------------------------------------------------
 * Pixel-faithful reproduction of the Figma "Welcome" landing page
 * (fileKey U1wiYiDtkktS3L2hsXteNO, root frame node 5845:45077, 1536 x 3324).
 *
 * This is the top of the render tree below <App/>. It COMPOSES the sibling
 * components (src/components/*), MAPS the sibling data modules (src/data/*),
 * and PLACES the raster screenshots + icons from src/assets/*. It owns only the
 * structure + data wiring; the page layout (content column, inter-section
 * rhythm, the three light-gray panels, and the "Like & Follow" preview
 * scaffolding) lives in the co-located WelcomePage.module.css, and each visual
 * primitive's typography/color lives in its own component's CSS Module. Global
 * token/font/reset stylesheets are imported ONCE in src/main.tsx — never here.
 *
 * Composition (top -> bottom, AAP section 0.3.1 / 0.6.3):
 *   full-bleed gradient Header
 *   -> "Design 20x faster" (two body paragraphs)
 *   -> Divider
 *   -> "Like & Follow us on Figma Community!" (semibold H2 + trailing heart;
 *      body; #F3F4F6 preview panel with two raster screenshots, green arrows,
 *      and handwritten annotations; community link)
 *   -> Divider
 *   -> "Key Principles" (body; 3x2 grid of six PrincipleCards)
 *   -> Divider
 *   -> "Join Our Communities" (body; row of three CommunityCards)
 * The page terminates in the .content 96px bottom padding — there is NO footer.
 *
 * RASTER STAYS RASTER (AAP section 0.8): the two "Like & Follow" preview regions
 * are rasterized in the source and are placed as <img> assets — their interior
 * UI is NOT reconstructed as live DOM.
 *
 * BLITZY [CONTENT] FLAG MANIFEST
 * -----------------------------------------------------------------------------
 * The five section body paragraphs are authored text nodes whose exact
 * characters live only in the Figma canvas. During this build the Figma REST API
 * was hard rate-limited (HTTP 429, retry-after ~3.4 days) across every attempt,
 * so their verbatim strings could not be machine-read. Per the sanctioned
 * graceful-degradation-with-a-flag pattern, each paragraph below renders an
 * on-brand approximation (grounded in the Plus UI positioning) so the page
 * renders fully for the fidelity screenshots, and each is preceded by an inline
 * BLITZY [CONTENT] flag naming its Figma node and the exact reconcile path.
 * To lock in the verbatim copy once the API quota resets, call
 * get_figma_data(fileKey U1wiYiDtkktS3L2hsXteNO, node <id>) for each of:
 *   5845:45084, 5845:45088 (Design 20x faster),
 *   5845:45096            (Like & Follow),
 *   5845:45120            (Key Principles),
 *   5845:45173            (Join Our Communities),
 * and replace the corresponding <p> text. Every other value on this page is a
 * CONFIRMED Figma value.
 * ========================================================================== */

import Header from '../../components/Header/Header';
import Divider from '../../components/Divider/Divider';
import Section from '../../components/Section/Section';
import Link from '../../components/Link/Link';
import Icon from '../../components/Icon/Icon';
import PrincipleCard from '../../components/PrincipleCard/PrincipleCard';
import CommunityCard from '../../components/CommunityCard/CommunityCard';

import { principles } from '../../data/principles';
import { communities } from '../../data/communities';

import plusuiSymbol from '../../assets/icons/plusui_symbol.svg';
import headerExternalIcon from '../../assets/icons/icon_external_link_header.svg';
import heartIcon from '../../assets/icons/icon_heart.svg';
import arrowLikeGreen from '../../assets/icons/arrow_like_green.svg';
import arrowFollowGreen from '../../assets/icons/arrow_follow_green.svg';
import blueExternalIcon from '../../assets/icons/icon_external_link_blue.svg';

import screenshotLikeBase from '../../assets/images/screenshot_like_base.png';
import screenshotLikeOverlay from '../../assets/images/screenshot_like_overlay-8b1b9b.png';
import screenshotFollowBase from '../../assets/images/screenshot_follow_base.png';
import screenshotFollowOverlay from '../../assets/images/screenshot_follow_overlay-30152e.png';
import figmaSmall from '../../assets/images/icon_figma_small.png';

import styles from './WelcomePage.module.css';

/**
 * WelcomePage — single-screen composition of the Figma "Welcome" frame.
 *
 * Exported as the module default to satisfy the App.tsx import contract
 * (`import WelcomePage from './pages/WelcomePage/WelcomePage'`).
 */
export default function WelcomePage() {
  return (
    <div className={styles.page}>
      {/* Hero / Doc Header (node 5845:45213) — full-bleed indigo->violet gradient
          band. Header renders the page's single <h1> and owns its own gradient,
          cover padding, brand lockup, and website link. External href preserved
          verbatim incl. the trailing slash. */}
      <Header
        title="Welcome to Plus UI"
        subtitle="We're delighted you've joined us! Here's essential information to kickstart your journey."
        logoSrc={plusuiSymbol}
        wordmark="Plus UI"
        linkLabel="www.plusui.com"
        linkHref="https://www.plusui.com/"
        externalIconSrc={headerExternalIcon}
      />

      {/* Centered 1344px content column: 96px padding, 64px inter-section gap. */}
      <div className={styles.content}>
        {/* Section "Design 20x faster" (nodes 5845:45079 / 45080) — two body
            paragraphs. Section owns the H2 + body typography; pass plain <p>. */}
        <Section heading="Design 20x faster">
          {/* BLITZY [CONTENT] Figma 5845:45084: verbatim copy unavailable this build (Figma REST API HTTP 429, retry ~3.4d); on-brand approximation for render/screenshot fidelity — reconcile via get_figma_data(U1wiYiDtkktS3L2hsXteNO, 5845:45084). */}
          <p>
            Plus UI is the free Figma design system that bridges design and code,
            taking you from pixel to production without the busywork. Every screen,
            component, and token is crafted so your team can move from idea to
            interface dramatically faster.
          </p>
          {/* BLITZY [CONTENT] Figma 5845:45088: verbatim copy unavailable this build (Figma REST API HTTP 429, retry ~3.4d); on-brand approximation for render/screenshot fidelity — reconcile via get_figma_data(U1wiYiDtkktS3L2hsXteNO, 5845:45088). */}
          <p>
            Because each element is fully structured and connected to a
            multi-framework component library, the work you do in Figma flows
            straight into your codebase — so you spend your time designing, not
            rebuilding.
          </p>
        </Section>

        <Divider />

        {/* Section "Like & Follow us on Figma Community!" (nodes 5845:45090 /
            45093 / 45094 / 45096 / 45097 / 45113). SemiBold H2 with a trailing
            40x40 outline heart; the Section .heading flex gap:16px auto-spaces
            text<->heart (no manual space). Heading text passed as a JS string
            literal so the `&` is safe. */}
        <Section
          headingVariant="semibold"
          heading={
            <>
              {'Like & Follow us on Figma Community!'}
              <Icon src={heartIcon} size={40} width={40} height={40} alt="" />
            </>
          }
        >
          {/* BLITZY [CONTENT] Figma 5845:45096: verbatim copy unavailable this build (Figma REST API HTTP 429, retry ~3.4d); on-brand approximation for render/screenshot fidelity — reconcile via get_figma_data(U1wiYiDtkktS3L2hsXteNO, 5845:45096). */}
          <p>
            If Plus UI helps speed up your workflow, show it some love. Like the
            file and follow us on Figma Community to get notified the moment new
            components, templates, and updates go live.
          </p>

          {/* Preview panel (node 5845:45097): #F3F4F6, 48px padding, 4px radius.
              RASTER STAYS RASTER — the two preview regions are <img> only; the
              cropped overlays, green arrows, and handwritten annotations are
              layered above via the module's absolute-positioning scaffolding.
              Document order is significant: first item = LIKE (:first-child),
              second = FOLLOW (:last-child), matching the CSS geometry. */}
          <div className={`${styles.panel} ${styles.previewPanel}`}>
            <div className={styles.previewItem}>
              <img
                className={styles.previewImage}
                src={screenshotLikeBase}
                alt="Plus UI file card on Figma Community"
              />
              <img className={styles.previewOverlay} src={screenshotLikeOverlay} alt="" />
              <img className={styles.previewArrow} src={arrowLikeGreen} alt="" />
              <span className={`${styles.annotation} ${styles.annotationLike}`}>like!</span>
            </div>
            <div className={styles.previewItem}>
              <img
                className={styles.previewImage}
                src={screenshotFollowBase}
                alt="Plus UI profile page on Figma Community"
              />
              <img className={styles.previewOverlay} src={screenshotFollowOverlay} alt="" />
              <img className={styles.previewArrow} src={arrowFollowGreen} alt="" />
              <span className={`${styles.annotation} ${styles.annotationFollow}`}>follow</span>
            </div>
          </div>

          {/* Community link (node 5845:45113): blue, underlined, Inter 500 18/28,
              small Figma logo prefix + blue external-link suffix. Link renders an
              <a target="_blank" rel="noopener noreferrer">; href verbatim. */}
          <Link
            size="lg"
            color="link"
            prefixIcon={figmaSmall}
            suffixIcon={blueExternalIcon}
            label="Visit Plus UI's Figma Community Page"
            href="https://www.figma.com/@plusui"
          />
        </Section>

        <Divider />

        {/* Section "Key Principles" (nodes 5845:45115 / 45118 / 45120 / 45121) —
            body paragraph + a 3x2 wrap grid of six PrincipleCards mapped from the
            data module (Efficiency, Consistency, Modularity, Accessibility,
            Flexibility, Clarity). */}
        <Section heading="Key Principles">
          {/* BLITZY [CONTENT] Figma 5845:45120: verbatim copy unavailable this build (Figma REST API HTTP 429, retry ~3.4d); on-brand approximation for render/screenshot fidelity — reconcile via get_figma_data(U1wiYiDtkktS3L2hsXteNO, 5845:45120). */}
          <p>
            Every decision in Plus UI is guided by a small set of principles that
            keep the system coherent as it grows. They shape how components look,
            behave, and fit together across your projects.
          </p>
          <div className={`${styles.panel} ${styles.principlesPanel}`}>
            {principles.map((principle) => (
              <PrincipleCard key={principle.title} {...principle} />
            ))}
          </div>
        </Section>

        <Divider />

        {/* Section "Join Our Communities" (nodes 5845:45166 / 45171 / 45173 /
            45174) — body paragraph + a single row of three CommunityCards mapped
            from the data module (Figma Community, Discord, X). */}
        <Section heading="Join Our Communities">
          {/* BLITZY [CONTENT] Figma 5845:45173: verbatim copy unavailable this build (Figma REST API HTTP 429, retry ~3.4d); on-brand approximation for render/screenshot fidelity — reconcile via get_figma_data(U1wiYiDtkktS3L2hsXteNO, 5845:45173). */}
          <p>
            Plus UI is better with company. Join us across Figma Community,
            Discord, and X to share feedback, ask questions, and stay in the loop
            on everything we're building next.
          </p>
          <div className={`${styles.panel} ${styles.communitiesPanel}`}>
            {communities.map((community) => (
              <CommunityCard key={community.brandName} {...community} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
