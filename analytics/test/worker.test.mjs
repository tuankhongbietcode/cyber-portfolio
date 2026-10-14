/**
 * Integration tests for the Worker's request handling.
 *
 * The D1 binding is replaced with a stub that records the SQL and returns
 * canned rows, so these run in plain Node with no Cloudflare account and no
 * network. They exercise the real handler — including the auth gate and the
 * HTML escaping — rather than a reimplementation of it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";

/* ------------------------------------------------------------- harness */

const CANNED = {
  totals: { views: 42, visitors: 17, active_days: 9 },
  today: { views: 3, visitors: 2 },
  byDay: [{ day: "2026-10-14", views: 3, visitors: 2 }],
  topCountries: [{ country: "VN", views: 30 }],
  topCities: [{ city: "Ho Chi Minh City", country: "VN", views: 25 }],
  topReferrers: [{ referrer: "https://www.linkedin.com/in/vlat273/", views: 12 }],
  topPaths: [{ path: "/", views: 42 }],
  devices: [{ device: "Desktop", browser: "Chrome", views: 40 }],
  recent: [
    {
      ts: "2026-10-14T05:00:00.000Z",
      ip: "203.0.113.9",
      city: "Ho Chi Minh City",
      region: "SG",
      country: "VN",
      org: 'Evil " org',
      device: "Desktop",
      browser: "Chrome",
      path: "/",
      referrer: "",
      screen: "1920x1080",
      lang: "en-US",
      ua: "<script>alert('stored-xss')</script>",
    },
  ],
};

/** Pick the canned result that matches a SQL string. */
function resultFor(sql) {
  if (sql.includes("GROUP BY day")) return CANNED.byDay;
  if (sql.includes("GROUP BY city, country")) return CANNED.topCities;
  if (sql.includes("GROUP BY country")) return CANNED.topCountries;
  if (sql.includes("GROUP BY referrer")) return CANNED.topReferrers;
  if (sql.includes("GROUP BY path")) return CANNED.topPaths;
  if (sql.includes("GROUP BY device, browser")) return CANNED.devices;
  if (sql.includes("ORDER BY ts DESC LIMIT 100")) return CANNED.recent;
  return [];
}

function firstFor(sql) {
  if (sql.includes("COUNT(DISTINCT substr")) return CANNED.totals;
  if (sql.includes("substr(?1, 1, 10)")) return CANNED.today;
  return null;
}

function makeDB() {
  const calls = [];
  const prepared = (sql) => {
    const norm = sql.replace(/\s+/g, " ").trim();
    const exec = {
      async run() {
        calls.push({ sql: norm, args: [] });
        return { success: true };
      },
      async all() {
        calls.push({ sql: norm, args: [] });
        return { results: resultFor(norm) };
      },
      async first() {
        calls.push({ sql: norm, args: [] });
        return firstFor(norm);
      },
      bind(...args) {
        calls.push({ sql: norm, args });
        return {
          async run() {
            return { success: true };
          },
          async all() {
            return { results: resultFor(norm) };
          },
          async first() {
            return firstFor(norm);
          },
        };
      },
    };
    return exec;
  };
  return { calls, prepare: prepared };
}

const CTX = { waitUntil: () => {} };

function makeEnv(overrides = {}) {
  return {
    DB: makeDB(),
    ALLOWED_ORIGIN: "https://tuankhongbietcode.github.io",
    DASHBOARD_TOKEN: "correct-horse-battery-staple",
    RETENTION_DAYS: "90",
    ...overrides,
  };
}

function makeRequest(url, { method = "GET", body, headers = {}, cf = {} } = {}) {
  const req = new Request(url, { method, body, headers });
  // `cf` is injected by Cloudflare's edge; plain Node has no such property.
  Object.defineProperty(req, "cf", { value: cf, configurable: true });
  return req;
}

const HUMAN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const beacon = (overrides = {}) =>
  makeRequest("https://analytics.example.workers.dev/collect", {
    method: "POST",
    body: JSON.stringify({
      path: "/",
      referrer: "https://www.linkedin.com/in/vlat273/",
      screen: "1920x1080",
      lang: "en-US",
      ...overrides,
    }),
    headers: {
      "User-Agent": HUMAN_UA,
      "CF-Connecting-IP": "203.0.113.9",
      Origin: "https://tuankhongbietcode.github.io",
    },
    cf: {
      country: "VN",
      region: "SG",
      city: "Ho Chi Minh City",
      latitude: "10.75",
      longitude: "106.66",
      timezone: "Asia/Ho_Chi_Minh",
      asn: 7552,
      asOrganization: "Viettel Group",
    },
  });

/* -------------------------------------------------------------- /collect */

test("collect stores a visit with the IP and geolocation from the edge", async () => {
  const env = makeEnv();
  const res = await worker.fetch(beacon(), env, CTX);

  assert.equal(res.status, 202);

  const insert = env.DB.calls.find((c) => c.sql.startsWith("INSERT INTO visits"));
  assert.ok(insert, "expected an INSERT");

  const [ts, path, referrer, ip, country, region, city, lat, lon, tz, asn, org, ua, screen, lang, device, browser] =
    insert.args;

  assert.match(ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(path, "/");
  assert.equal(ip, "203.0.113.9");
  assert.equal(country, "VN");
  assert.equal(city, "Ho Chi Minh City");
  assert.equal(lat, "10.75");
  assert.equal(tz, "Asia/Ho_Chi_Minh");
  assert.equal(asn, 7552);
  assert.equal(org, "Viettel Group");
  assert.equal(screen, "1920x1080");
  assert.equal(lang, "en-US");
  assert.equal(device, "Desktop");
  assert.equal(browser, "Chrome");
  assert.ok(ua.startsWith("Mozilla/5.0"));
  assert.equal(referrer, "https://www.linkedin.com/in/vlat273/");
});

test("collect silently drops bots without storing them", async () => {
  const env = makeEnv();
  const req = makeRequest("https://analytics.example.workers.dev/collect", {
    method: "POST",
    body: JSON.stringify({ path: "/" }),
    headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
  });

  const res = await worker.fetch(req, env, CTX);

  // 202, not 403 — a filtered bot should not learn that it was filtered.
  assert.equal(res.status, 202);
  assert.equal(env.DB.calls.length, 0, "a bot must not reach the database");
});

test("collect rejects a beacon from another origin", async () => {
  const env = makeEnv();
  const req = makeRequest("https://analytics.example.workers.dev/collect", {
    method: "POST",
    body: JSON.stringify({ path: "/" }),
    headers: { "User-Agent": HUMAN_UA, Origin: "https://evil.example" },
  });

  const res = await worker.fetch(req, env, CTX);

  assert.equal(res.status, 403);
  assert.equal(env.DB.calls.length, 0);
});

test("collect rejects a body that is not JSON", async () => {
  const env = makeEnv();
  const req = makeRequest("https://analytics.example.workers.dev/collect", {
    method: "POST",
    body: "not json at all",
    headers: { "User-Agent": HUMAN_UA },
  });

  const res = await worker.fetch(req, env, CTX);

  assert.equal(res.status, 400);
  assert.equal(env.DB.calls.length, 0);
});

test("collect refuses GET", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/collect", {
      method: "GET",
      headers: { "User-Agent": HUMAN_UA },
    }),
    env,
    CTX
  );
  assert.equal(res.status, 405);
});

test("collect caps oversized fields rather than storing them whole", async () => {
  const env = makeEnv();
  // Long enough to be truncated by clamp(), short enough to pass the body cap.
  const res = await worker.fetch(beacon({ path: "/" + "a".repeat(500) }), env, CTX);

  assert.equal(res.status, 202);
  const insert = env.DB.calls.find((c) => c.sql.startsWith("INSERT INTO visits"));
  assert.equal(insert.args[1].length, 200);
});

test("collect rejects a body larger than the cap outright", async () => {
  const env = makeEnv();
  const res = await worker.fetch(beacon({ path: "/" + "a".repeat(5000) }), env, CTX);

  assert.equal(res.status, 413);
  assert.equal(env.DB.calls.length, 0, "an oversized body must not reach the database");
});

/* ------------------------------------------------------------- dashboard */

test("dashboard refuses to serve when no token is configured", async () => {
  const env = makeEnv({ DASHBOARD_TOKEN: "" });
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/"),
    env,
    CTX
  );
  assert.equal(res.status, 500);
  const body = await res.text();
  assert.match(body, /DASHBOARD_TOKEN is not set/);
});

test("dashboard rejects a missing token", async () => {
  const env = makeEnv();
  const res = await worker.fetch(makeRequest("https://analytics.example.workers.dev/"), env, CTX);
  assert.equal(res.status, 401);
});

test("dashboard rejects a wrong token", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/?token=wrong-guess"),
    env,
    CTX
  );
  assert.equal(res.status, 401);
});

test("dashboard escapes attacker-controlled fields — no stored XSS", async () => {
  const env = makeEnv();
  // Sent as a cookie rather than ?token=, because a query token always gets the
  // 302 that sets the cookie. This is the path that renders the page.
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/", {
      headers: { Cookie: "pa_token=correct-horse-battery-staple" },
    }),
    env,
    CTX
  );

  assert.equal(res.status, 200);
  const body = await res.text();

  // The canned row carries <script>alert('stored-xss')</script> in the UA and a
  // quote-breaking org string. Neither may survive into the HTML.
  assert.equal(body.includes("<script>alert('stored-xss')</script>"), false);
  assert.equal(body.includes('Evil " org'), false);
  assert.match(body, /&lt;script&gt;/);
  assert.match(body, /&quot;/);
});

test("dashboard exchanges a query token for a cookie and redirects", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/?token=correct-horse-battery-staple"),
    env,
    CTX
  );

  // First hit with ?token= is a 302 that sets the cookie.
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "/");

  const cookie = res.headers.get("Set-Cookie") || "";
  assert.match(cookie, /pa_token=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
});

test("dashboard accepts the token from a cookie", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/", {
      headers: { Cookie: "pa_token=correct-horse-battery-staple" },
    }),
    env,
    CTX
  );
  assert.equal(res.status, 200);
});

test("dashboard accepts the token from an Authorization header", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/", {
      headers: { Authorization: "Bearer correct-horse-battery-staple" },
    }),
    env,
    CTX
  );
  assert.equal(res.status, 200);
});

/* ------------------------------------------------------------- api/stats */

test("api/stats requires the token", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/api/stats"),
    env,
    CTX
  );
  assert.equal(res.status, 401);
});

test("api/stats returns the expected shape", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/api/stats?days=7&token=correct-horse-battery-staple"),
    env,
    CTX
  );

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.rangeDays, 7);
  assert.equal(data.totals.views, 42);
  assert.equal(data.totals.visitors, 17);
  assert.equal(data.recent.length, 1);
  assert.ok(Array.isArray(data.topCountries));
});

test("api/stats clamps an absurd range instead of trusting it", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/api/stats?days=99999&token=correct-horse-battery-staple"),
    env,
    CTX
  );
  const data = await res.json();
  assert.equal(data.rangeDays, 365);
});

/* --------------------------------------------------------------- routing */

test("unknown paths 404", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/nope"),
    env,
    CTX
  );
  assert.equal(res.status, 404);
});

test("OPTIONS returns a CORS preflight", async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    makeRequest("https://analytics.example.workers.dev/collect", { method: "OPTIONS" }),
    env,
    CTX
  );
  assert.equal(res.status, 204);
  assert.equal(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://tuankhongbietcode.github.io"
  );
});
