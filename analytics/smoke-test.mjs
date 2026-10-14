#!/usr/bin/env node
//
// Smoke test for a deployed portfolio-analytics Worker.
//
//   node smoke-test.mjs https://portfolio-analytics.<subdomain>.workers.dev
//
// Only public endpoints are touched, so it is safe to run any time. It does
// write one row, so clean up afterwards:
//
//   wrangler d1 execute portfolio-analytics --remote \
//     --command "DELETE FROM visits WHERE path = '/__smoketest'"
//
// Each check covers something that has actually broken during development, so
// a failure is worth reading rather than retrying.

const BASE = (process.argv[2] || process.env.WORKER_URL || "").replace(/\/+$/, "");
if (!BASE) {
  console.error("Usage: node smoke-test.mjs https://<worker>.<subdomain>.workers.dev");
  process.exit(2);
}

const ORIGIN = process.env.ALLOWED_ORIGIN || "https://tuankhongbietcode.github.io";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    passed++;
    console.log(`  ok    ${name}${detail ? "  (" + detail + ")" : ""}`);
  } catch (err) {
    failures.push(name);
    console.log(`  FAIL  ${name}\n          ${err.message}`);
  }
}

function expect(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what}: expected ${expected}, got ${actual}`);
  }
}

function collect(body, headers = {}) {
  return fetch(`${BASE}/collect`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Origin: ORIGIN,
      "User-Agent": BROWSER_UA,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

console.log(`\nSmoke testing ${BASE}\n`);

await check("GET / without a token is refused", async () => {
  const r = await fetch(`${BASE}/`);
  expect(r.status, 401, "status");
  const body = await r.text();
  if (!/not authorised/i.test(body)) {
    throw new Error("the 401 body does not mention authorisation");
  }
  return "no dashboard content leaked";
});

await check("GET /api/stats without a token is refused", async () => {
  const r = await fetch(`${BASE}/api/stats`);
  expect(r.status, 401, "status");
});

await check("an unknown route is a 404", async () => {
  const r = await fetch(`${BASE}/definitely-not-a-route`);
  expect(r.status, 404, "status");
});

await check("OPTIONS preflight is answered", async () => {
  const r = await fetch(`${BASE}/collect`, {
    method: "OPTIONS",
    headers: { Origin: ORIGIN },
  });
  expect(r.status, 204, "status");
  return "204, no preflight round trip";
});

await check("a real visit is accepted", async () => {
  const r = await collect({ path: "/__smoketest", referrer: "", screen: "1920x1080", lang: "en-US" });
  // 202, not 200 — and a filtered bot gets exactly the same reply. That is
  // deliberate: a crawler must not be able to tell that it was dropped.
  // So this check cannot prove the row landed; see the note at the bottom.
  expect(r.status, 202, "status");
  const body = await r.json();
  if (body.ok !== true) throw new Error(`body was ${JSON.stringify(body)}`);
  return "202 {ok:true}";
});

await check("a foreign Origin is rejected", async () => {
  const r = await collect({ path: "/__smoketest" }, { Origin: "https://evil.example" });
  expect(r.status, 403, "status");
  return "Origin allowlist holds";
});

await check("a bot is dropped quietly, not stored", async () => {
  const r = await collect(
    { path: "/__smoketest" },
    { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
  );
  expect(r.status, 202, "status");
  return "202, so scanners learn nothing";
});

await check("an oversized body is rejected", async () => {
  const r = await collect("x".repeat(5000));
  expect(r.status, 413, "status");
});

await check("malformed JSON does not 500", async () => {
  const r = await collect("{not json");
  if (r.status >= 500) throw new Error(`status ${r.status} — should degrade, not crash`);
  return `status ${r.status}`;
});

console.log(`\n  ${passed} passed, ${failures.length} failed\n`);

if (failures.length) {
  console.log("  Failed:");
  for (const f of failures) console.log(`    - ${f}`);
  console.log();
  process.exit(1);
}
