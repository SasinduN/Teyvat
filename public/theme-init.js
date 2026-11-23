/*
 * The theme, before the first paint (docs/plans/redesign-redo.md, PR 5; handoff Task 7).
 *
 * A classic script linked at the top of <head>, so it runs before the page
 * renders: no flash of the wrong theme, and no inline script (the CSP's
 * script-src is 'self'). Sets data-theme and color-scheme on <html>:
 *   1. the visitor's saved choice (localStorage "site:theme", set by the
 *      theme toggle) always wins;
 *   2. otherwise the site's default mode, which the server writes on <html>
 *      as data-default-mode (Admin → Appearance, `site_settings.default_mode`):
 *      "dark", or "auto" to follow the device (prefers-color-scheme);
 *   3. otherwise light.
 * Blocked storage counts as nothing saved. `resolveTheme` in
 * shared/default-mode.ts is the same rule for the app.
 */
(function () {
  var KEY = 'site:theme';
  var root = document.documentElement;
  var device = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    try {
      var value = window.localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function siteDefault() {
    var mode = root.getAttribute('data-default-mode');
    if (mode === 'dark') return 'dark';
    if (mode === 'auto') return device && device.matches ? 'dark' : 'light';
    return 'light';
  }

  function apply() {
    var theme = saved() || siteDefault();
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }

  apply();
  // A choice made in another tab.
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) apply();
  });
  // Auto, with nothing chosen: follow the device when it switches.
  if (device) {
    var follow = function () {
      if (root.getAttribute('data-default-mode') === 'auto' && !saved()) apply();
    };
    if (device.addEventListener) device.addEventListener('change', follow);
    else if (device.addListener) device.addListener(follow);
  }
})();
