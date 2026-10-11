/*
 * The theme, before the first paint (docs/plans/redesign-redo.md, PR 5).
 *
 * A classic script linked at the top of <head>, so it runs before the page
 * renders: no flash of the wrong theme, and no inline script (the CSP's
 * script-src is 'self'). Sets data-theme and color-scheme on <html>: the
 * visitor's saved choice (localStorage "site:theme", set by the theme
 * toggle), otherwise light, whatever the system prefers (the friend import,
 * docs/reviews/friend-import.md). Blocked storage counts as nothing saved.
 */
(function () {
  var KEY = 'site:theme';
  var root = document.documentElement;

  function saved() {
    try {
      var value = window.localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function apply() {
    var theme = saved() || 'light';
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }

  apply();
  // A choice made in another tab.
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) apply();
  });
})();
