/* Visitor analytics — self-hosted. Off until an endpoint is pasted below, so
   the page makes no third-party request at all by default. The endpoint is
   your own Cloudflare Worker, which writes the visit into your own D1
   database; no analytics vendor sits in the path. Setup and the privacy
   trade-offs: analytics/README.md

   This lives in its own file (rather than inline in index.html) so the
   page's CSP can pin script-src to 'self' without a content hash — setup.sh
   rewrites the ENDPOINT line below in place, which would otherwise break a
   hash-pinned inline script every time it ran. */
(function () {
  var ENDPOINT = "https://portfolio-analytics.tunah.workers.dev/collect"; // ← e.g. "https://portfolio-analytics.you.workers.dev/collect"

  if (!ENDPOINT) return; // not configured: send nothing

  // Honour the browser's opt-out rather than counting anyway.
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  var payload = JSON.stringify({
    path: location.pathname,
    referrer: document.referrer || "",
    screen: screen.width + "x" + screen.height,
    lang: navigator.language || ""
  });

  // text/plain keeps this a CORS "simple request", so no preflight is sent
  // and the beacon costs one request instead of two.
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }));
  } else {
    fetch(ENDPOINT, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "text/plain" },
      mode: "no-cors",
      keepalive: true
    }).catch(function () {});
  }
})();
