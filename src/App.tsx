import WelcomePage from './pages/WelcomePage/WelcomePage';

/**
 * App — application root.
 *
 * Renders the single standalone <WelcomePage/> (the pixel-faithful Figma
 * "Welcome" screen). There is no router: the only navigation on the page is the
 * external hyperlinks owned by the child components. Exported as the module
 * default to satisfy the main.tsx import contract (`import App from './App'`).
 */
export default function App() {
  return <WelcomePage />;
}
