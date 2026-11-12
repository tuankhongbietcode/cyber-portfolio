/* Scroll-reveal only hides content when this script actually ran, so the
   page is fully readable with JavaScript disabled. The timer is a failsafe
   in case app.js never loads: after 3s everything is shown regardless. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  window.__revealFailsafe = setTimeout(function () { root.classList.remove('js'); }, 3000);
})();

/* Re-derive the absolute URLs from the address actually being used, so the
   baked-in GitHub Pages values in the head stay correct if the site is ever
   served from another host. */
(function () {
  var here = location.origin + location.pathname;
  var abs = function (p) { return new URL(p, here).href; };
  var set = function (sel, attr, val) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('link[rel="canonical"]', 'href', here);
  set('meta[property="og:url"]', 'content', here);
  set('meta[property="og:image"]', 'content', abs('og-image.png'));
  set('meta[name="twitter:image"]', 'content', abs('og-image.png'));
})();
