import { applyTheme, initialTheme } from './lib/theme';
applyTheme(initialTheme());

// Activate the nonblocking font stylesheet without inline script (CSP-safe).
const fonts = document.querySelector<HTMLLinkElement>('#travel-eye-fonts');
if (fonts) {
  const activate = () => { fonts.media = 'all'; };
  if (fonts.sheet) activate();
  else fonts.addEventListener('load', activate, { once: true });
}
