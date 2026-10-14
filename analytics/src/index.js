/**
 * Portfolio analytics — a self-hosted Cloudflare Worker.
 *
 * Routes
 *   POST /collect    receive one beacon from the portfolio page and store it
 *   GET  /           dashboard (HTML), protected by DASHBOARD_TOKEN
 *   GET  /api/stats  the same data as JSON
 *
 * Everything runs on Cloudflare's free plan. Geolocation comes from
 * `request.cf`, which Cloudflare fills in at the edge, so no third-party
 * geolocation API is involved and no data leaves your own D1 database.
 *
 * PRIVACY: unlike hosted analytics, this worker stores the raw visitor IP.
 * That is deliberate — it is the thing Umami will not give you — and it
 * carries obligations. Read the "Privacy" section of README.md before you
 * point real traffic at it.
 */

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

const BOT_PATTERN =
  /bot(?![a-z])|crawl|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|python-requests|python-urllib|curl\/|wget\/|go-http-client|okhttp|axios\/|monitor|uptime|pingdom|lighthouse|preview|scanner|nmap|masscan|zgrab|semrush|ahrefs|dataprovider/i;

const MAX_BODY_BYTES = 2048;
const DEFAULT_RETENTION_DAYS = 90;
const COOKIE_NAME = "pa_token";

/* ------------------------------------------------------------------ *
 * Pure helpers — exported so they can be unit tested without Workers
 * ------------------------------------------------------------------ */

/** True when the User-Agent looks like a crawler, monitor or script. */
export function isBot(userAgent) {
  if (!userAgent) return true; // a real browser always sends one
  return BOT_PATTERN.test(userAgent);
}

/** Length-independent comparison, so a token cannot be guessed byte by byte. */
export function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Strip control characters and cap the length of anything visitor-supplied. */
export function clamp(value, max) {
  if (value === null || value === undefined) return null;
  const s = String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return s ? s.slice(0, max) : null;
}

/** Coarse device class. Deliberately not fingerprinting — just the form factor. */
export function deviceFromUA(userAgent) {
  const ua = userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "Tablet";
  if (/Mobile|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

/** The browser name, for a dashboard column that is not a wall of UA string. */
export function browserFromUA(userAgent) {
  const ua = userAgent || "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

/**
 * Escape everything before it reaches the dashboard.
 *
 * User-Agent and Referer are attacker-controlled strings. Rendering them
 * unescaped would turn the analytics dashboard into a stored-XSS delivery
 * mechanism — the one bug this tool must not have.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Shorten a referrer to its host, so the dashboard stays readable. */
export function referrerHost(referrer) {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).host || "direct";
  } catch {
    return "direct";
  }
}

/* ------------------------------------------------------------------ *
 * Ingest
 * ------------------------------------------------------------------ */

async function collect(request, env, ctx) {
  const userAgent = request.headers.get("User-Agent") || "";
  if (isBot(userAgent)) {
    // Accept and discard: a bot should not be able to tell it was filtered.
    return json({ ok: true }, 202, env);
  }

  // Cheap guard against another site beaconspamming this endpoint. A browser
  // sending a cross-origin POST always includes Origin, so a mismatch is a
  // clear signal. Requests with no Origin at all (curl, scripts) are allowed
  // through — Cloudflare's own DDoS protection covers the volume case.
  const origin = request.headers.get("Origin");
  if (origin && env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
    return json({ ok: false }, 403, env);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false }, 413, env);

  let payload = {};
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json({ ok: false }, 400, env);
  }

  const cf = request.cf || {};

  const row = {
    ts: new Date().toISOString(),
    path: clamp(payload.path, 200),
    referrer: clamp(payload.referrer, 300),
    ip: clamp(request.headers.get("CF-Connecting-IP"), 64),
    country: clamp(cf.country, 8),
    region: clamp(cf.region, 80),
    city: clamp(cf.city, 80),
    latitude: clamp(cf.latitude, 16),
    longitude: clamp(cf.longitude, 16),
    timezone: clamp(cf.timezone, 64),
    asn: cf.asn ? Number(cf.asn) : null,
    org: clamp(cf.asOrganization, 120),
    ua: clamp(userAgent, 300),
    screen: clamp(payload.screen, 24),
    lang: clamp(payload.lang, 24),
    device: deviceFromUA(userAgent),
    browser: browserFromUA(userAgent),
  };

  await env.DB.prepare(
    `INSERT INTO visits
       (ts, path, referrer, ip, country, region, city, latitude, longitude,
        timezone, asn, org, ua, screen, lang, device, browser)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`
  )
    .bind(
      row.ts, row.path, row.referrer, row.ip, row.country, row.region,
      row.city, row.latitude, row.longitude, row.timezone, row.asn, row.org,
      row.ua, row.screen, row.lang, row.device, row.browser
    )
    .run();

  // Occasionally drop rows past the retention window. Cheap, and it keeps a
  // free-tier database from growing forever.
  const days = Number(env.RETENTION_DAYS || DEFAULT_RETENTION_DAYS);
  if (days > 0 && Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM visits WHERE ts < ?1").bind(cutoff).run().catch(() => {})
    );
  }

  return json({ ok: true }, 202, env);
}

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

function tokenFromRequest(request, url) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const qs = url.searchParams.get("token");
  if (qs) return qs;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isAuthorised(request, url, env) {
  const expected = env.DASHBOARD_TOKEN;
  if (!expected) return false; // refuse to serve an unprotected dashboard
  return constantTimeEqual(tokenFromRequest(request, url) || "", expected);
}

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

async function stats(env, days) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS views,
            COUNT(DISTINCT ip) AS visitors,
            COUNT(DISTINCT substr(ts, 1, 10)) AS active_days
       FROM visits WHERE ts >= ?1`
  )
    .bind(since)
    .first();

  const today = await env.DB.prepare(
    "SELECT COUNT(*) AS views, COUNT(DISTINCT ip) AS visitors FROM visits WHERE substr(ts, 1, 10) = substr(?1, 1, 10)"
  )
    .bind(new Date().toISOString())
    .first();

  const byDay = await env.DB.prepare(
    `SELECT substr(ts, 1, 10) AS day, COUNT(*) AS views, COUNT(DISTINCT ip) AS visitors
       FROM visits WHERE ts >= ?1 GROUP BY day ORDER BY day DESC LIMIT 30`
  )
    .bind(since)
    .all();

  const topCountries = await env.DB.prepare(
    `SELECT COALESCE(country, '??') AS country, COUNT(*) AS views
       FROM visits WHERE ts >= ?1 GROUP BY country ORDER BY views DESC LIMIT 12`
  )
    .bind(since)
    .all();

  const topCities = await env.DB.prepare(
    `SELECT COALESCE(city, 'unknown') AS city, COALESCE(country, '??') AS country, COUNT(*) AS views
       FROM visits WHERE ts >= ?1 GROUP BY city, country ORDER BY views DESC LIMIT 12`
  )
    .bind(since)
    .all();

  const topReferrers = await env.DB.prepare(
    `SELECT referrer, COUNT(*) AS views FROM visits
      WHERE ts >= ?1 AND referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer ORDER BY views DESC LIMIT 12`
  )
    .bind(since)
    .all();

  const topPaths = await env.DB.prepare(
    `SELECT COALESCE(path, '/') AS path, COUNT(*) AS views
       FROM visits WHERE ts >= ?1 GROUP BY path ORDER BY views DESC LIMIT 12`
  )
    .bind(since)
    .all();

  const devices = await env.DB.prepare(
    `SELECT device, browser, COUNT(*) AS views FROM visits
      WHERE ts >= ?1 GROUP BY device, browser ORDER BY views DESC LIMIT 12`
  )
    .bind(since)
    .all();

  const recent = await env.DB.prepare(
    `SELECT ts, ip, city, region, country, org, device, browser, path, referrer, screen, lang
       FROM visits ORDER BY ts DESC LIMIT 100`
  ).all();

  return {
    rangeDays: days,
    totals: totals || { views: 0, visitors: 0, active_days: 0 },
    today: today || { views: 0, visitors: 0 },
    byDay: byDay.results || [],
    topCountries: topCountries.results || [],
    topCities: topCities.results || [],
    topReferrers: topReferrers.results || [],
    topPaths: topPaths.results || [],
    devices: devices.results || [],
    recent: recent.results || [],
  };
}

async function statsApi(request, env, url) {
  if (!isAuthorised(request, url, env)) return json({ error: "unauthorised" }, 401, env);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 1), 365);
  return json(await stats(env, days), 200, env);
}

async function dashboard(request, env, url) {
  if (!env.DASHBOARD_TOKEN) {
    return html(noticePage("DASHBOARD_TOKEN is not set",
      "Set it with <code>npx wrangler secret put DASHBOARD_TOKEN</code> before using the dashboard. " +
      "The worker refuses to serve an unprotected dashboard."), 500);
  }
  if (!isAuthorised(request, url, env)) {
    return html(noticePage("Not authorised",
      "Append <code>?token=YOUR_TOKEN</code> to the URL once. A cookie is then set and you can " +
      "drop the parameter."), 401);
  }

  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 1), 365);
  const data = await stats(env, days);

  // If the token arrived in the query string, move it into a cookie and
  // redirect, so it does not sit in the address bar or in browser history.
  if (url.searchParams.get("token")) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + (days !== 30 ? `?days=${days}` : ""),
        "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(env.DASHBOARD_TOKEN)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      },
    });
  }

  return html(renderDashboard(data, days, Number(env.RETENTION_DAYS || DEFAULT_RETENTION_DAYS)), 200);
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function bar(value, max, width = 22) {
  if (!max) return "";
  const filled = Math.max(1, Math.round((value / max) * width));
  return "█".repeat(filled);
}

function table(rows, headers, cell) {
  if (!rows.length) return `<p class="empty">No data in this range.</p>`;
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map(cell).join("\n")}</tbody></table>`;
}

function renderDashboard(d, days, retentionDays) {
  const maxDay = Math.max(1, ...d.byDay.map((r) => r.views));
  const maxCountry = Math.max(1, ...d.topCountries.map((r) => r.views));
  const maxRef = Math.max(1, ...d.topReferrers.map((r) => r.views));
  const maxPath = Math.max(1, ...d.topPaths.map((r) => r.views));

  const flag = (cc) => {
    if (!cc || cc.length !== 2 || cc === "??") return "";
    return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) + " ";
  };

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Portfolio analytics</title>
<style>
  :root { --bg:#0a0b0c; --panel:#121415; --line:#242729; --fg:#e6e8e6; --dim:#8b918f; --acc:#5eead4; --warn:#fbbf24; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; padding:28px; }
  h1 { font-size:18px; margin:0 0 4px; letter-spacing:-.01em; }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:.12em; color:var(--dim);
       margin:32px 0 12px; font-weight:600; }
  a { color:var(--acc); }
  .sub { color:var(--dim); margin:0 0 24px; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px 16px; }
  .card b { display:block; font-size:26px; line-height:1.15; color:var(--acc); }
  .card span { color:var(--dim); font-size:12px; }
  table { width:100%; border-collapse:collapse; background:var(--panel);
          border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  th, td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--dim); font-size:11px; text-transform:uppercase; letter-spacing:.1em; font-weight:600; }
  tr:last-child td { border-bottom:0; }
  td.num { color:var(--acc); text-align:right; white-space:nowrap; }
  .spark { color:var(--acc); letter-spacing:-1px; }
  .empty { color:var(--dim); font-style:italic; }
  .warn { background:#1d1a0f; border:1px solid #3a3316; color:var(--warn);
          padding:12px 14px; border-radius:8px; margin-bottom:24px; }
  .nav { margin-bottom:20px; font-size:12px; color:var(--dim); }
  .nav a { margin-right:12px; }
  .ua { color:var(--dim); font-size:11px; max-width:420px; overflow-wrap:anywhere; }
</style></head>
<body>
<h1>Portfolio analytics</h1>
<p class="sub">Self-hosted on your own Cloudflare Worker and D1 database.</p>

<div class="warn">
  This worker stores raw visitor IP addresses. That is personal data under GDPR and
  Vietnam's Decree 13 — see the Privacy section of the README. Rows older than
  <b>${escapeHtml(String(retentionDays))} days</b> are swept away automatically; the
  figures below cover the last <b>${escapeHtml(String(days))} days</b>.
</div>

<div class="nav">
  Range:
  <a href="?days=1">24h</a><a href="?days=7">7d</a><a href="?days=30">30d</a><a href="?days=90">90d</a>
  &nbsp;·&nbsp; <a href="/api/stats?days=${days}">JSON</a>
</div>

<div class="cards">
  <div class="card"><b>${d.totals.views ?? 0}</b><span>pageviews</span></div>
  <div class="card"><b>${d.totals.visitors ?? 0}</b><span>unique IPs</span></div>
  <div class="card"><b>${d.today.views ?? 0}</b><span>views today</span></div>
  <div class="card"><b>${d.today.visitors ?? 0}</b><span>visitors today</span></div>
  <div class="card"><b>${d.totals.active_days ?? 0}</b><span>active days</span></div>
</div>

<h2>Views per day</h2>
${table(d.byDay, ["Day", "Views", "Uniq", ""], (r) => `<tr>
  <td>${escapeHtml(r.day)}</td><td class="num">${r.views}</td><td class="num">${r.visitors}</td>
  <td class="spark">${bar(r.views, maxDay)}</td></tr>`)}

<h2>Where they came from</h2>
${table(d.topReferrers, ["Referrer", "Views", ""], (r) => `<tr>
  <td>${escapeHtml(referrerHost(r.referrer))}</td><td class="num">${r.views}</td>
  <td class="spark">${bar(r.views, maxRef)}</td></tr>`)}

<h2>Countries</h2>
${table(d.topCountries, ["Country", "Views", ""], (r) => `<tr>
  <td>${flag(r.country)}${escapeHtml(r.country)}</td><td class="num">${r.views}</td>
  <td class="spark">${bar(r.views, maxCountry)}</td></tr>`)}

<h2>Cities</h2>
${table(d.topCities, ["City", "Country", "Views"], (r) => `<tr>
  <td>${escapeHtml(r.city)}</td><td>${escapeHtml(r.country)}</td>
  <td class="num">${r.views}</td></tr>`)}

<h2>Pages</h2>
${table(d.topPaths, ["Path", "Views", ""], (r) => `<tr>
  <td>${escapeHtml(r.path)}</td><td class="num">${r.views}</td>
  <td class="spark">${bar(r.views, maxPath)}</td></tr>`)}

<h2>Devices</h2>
${table(d.devices, ["Device", "Browser", "Views"], (r) => `<tr>
  <td>${escapeHtml(r.device)}</td><td>${escapeHtml(r.browser)}</td>
  <td class="num">${r.views}</td></tr>`)}

<h2>Recent visits</h2>
${table(d.recent, ["Time (UTC)", "IP", "City", "Country", "Org", "Device", "Path", "Ref", "UA"],
  (r) => `<tr>
    <td>${escapeHtml((r.ts || "").replace("T", " ").slice(0, 19))}</td>
    <td>${escapeHtml(r.ip)}</td>
    <td>${escapeHtml(r.city)}</td>
    <td>${flag(r.country)}${escapeHtml(r.country)}</td>
    <td class="ua">${escapeHtml(r.org)}</td>
    <td>${escapeHtml(r.device)} / ${escapeHtml(r.browser)}</td>
    <td>${escapeHtml(r.path)}</td>
    <td class="ua">${escapeHtml(referrerHost(r.referrer))}</td>
    <td class="ua">${escapeHtml(r.ua)}</td>
  </tr>`)}
</body></html>`;
}

function noticePage(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#0a0b0c;color:#e6e8e6;font:14px/1.6 ui-monospace,Menlo,monospace;
padding:48px;max-width:640px}h1{font-size:16px}code{background:#121415;border:1px solid #242729;
padding:2px 6px;border-radius:4px;color:#5eead4}</style></head>
<body><h1>${escapeHtml(title)}</h1><p>${body}</p></body></html>`;
}

/* ------------------------------------------------------------------ *
 * Response helpers
 * ------------------------------------------------------------------ */

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

function html(body, status) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store",
    },
  });
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    switch (url.pathname) {
      case "/collect":
        if (request.method !== "POST") return json({ error: "method not allowed" }, 405, env);
        return collect(request, env, ctx);

      case "/api/stats":
        return statsApi(request, env, url);

      case "/":
      case "/dashboard":
        return dashboard(request, env, url);

      default:
        return new Response("Not found", { status: 404 });
    }
  },
};
