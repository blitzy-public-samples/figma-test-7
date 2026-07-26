import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Global stylesheets are imported here ONCE, in strict cascade order:
//   tokens.css  -> the CSS custom-property design tokens (must load first so the
//                  values are defined before any consumer reads them)
//   fonts.css   -> the @font-face declarations (Inter / Bubblegum Sans)
//   global.css  -> the reset + base document styles that apply the tokens
// No other module imports these; component styling flows through CSS Modules.
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/global.css';

import App from './App';

// The #root mount node is declared in index.html. It is guaranteed to exist at
// runtime, so the non-null assertion is the correct, intentional contract here.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
