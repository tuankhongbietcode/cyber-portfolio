/**
 * Unit tests for the pure helpers in src/index.js.
 *
 * These run in plain Node — no wrangler, no Cloudflare account, no network.
 *   node --test test/
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isBot,
  constantTimeEqual,
  clamp,
  deviceFromUA,
  browserFromUA,
  escapeHtml,
  referrerHost,
} from "../src/index.js";

/* ---------------------------------------------------------------- bots */

test("isBot treats a missing User-Agent as a bot", () => {
  assert.equal(isBot(""), true);
  assert.equal(isBot(undefined), true);
  assert.equal(isBot(null), true);
});

test("isBot catches common crawlers, monitors and scripts", () => {
  const bots = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0)",
    "python-requests/2.31.0",
    "curl/8.4.0",
    "Wget/1.21",
    "Go-http-client/1.1",
    "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0",
    "UptimeRobot/2.0",
    "Mozilla/5.0 (compatible; SemrushBot/7~bl)",
    "zgrab/0.x",
  ];
  for (const ua of bots) {
    assert.equal(isBot(ua), true, `expected bot: ${ua}`);
  }
});

test("isBot lets real browsers through", () => {
  const humans = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  ];
  for (const ua of humans) {
    assert.equal(isBot(ua), false, `expected human: ${ua}`);
  }
});

test("isBot does not flag a UA that merely contains a bot-like substring", () => {
  // "robotics" contains "bot"; the pattern must not fire on it.
  assert.equal(isBot("Mozilla/5.0 RoboticsReader/1.0"), false);
});

/* ------------------------------------------------------------- secrets */

test("constantTimeEqual accepts identical strings", () => {
  assert.equal(constantTimeEqual("s3cret-token", "s3cret-token"), true);
});

test("constantTimeEqual rejects different strings", () => {
  assert.equal(constantTimeEqual("s3cret-token", "s3cret-tokeX"), false);
  assert.equal(constantTimeEqual("short", "much-longer-value"), false);
  assert.equal(constantTimeEqual("", "x"), false);
});

test("constantTimeEqual rejects non-strings rather than coercing", () => {
  assert.equal(constantTimeEqual(undefined, "x"), false);
  assert.equal(constantTimeEqual(null, null), false);
  assert.equal(constantTimeEqual(12345, "12345"), false);
});

/* --------------------------------------------------------------- clamp */

test("clamp strips control characters", () => {
  assert.equal(clamp("hello\u0000world\u001f", 50), "helloworld");
});

test("clamp caps the length", () => {
  assert.equal(clamp("abcdefghij", 4), "abcd");
});

test("clamp turns empty and blank values into null", () => {
  assert.equal(clamp("", 10), null);
  assert.equal(clamp("   ", 10), null);
  assert.equal(clamp(null, 10), null);
  assert.equal(clamp(undefined, 10), null);
});

/* -------------------------------------------------------------- device */

test("deviceFromUA classifies form factor", () => {
  assert.equal(deviceFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "Mobile");
  assert.equal(deviceFromUA("Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36"), "Mobile");
  assert.equal(deviceFromUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "Tablet");
  assert.equal(deviceFromUA("Mozilla/5.0 (Linux; Android 14; SM-X700) Safari/537.36"), "Tablet");
  assert.equal(deviceFromUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"), "Desktop");
  assert.equal(deviceFromUA(""), "Desktop");
});

test("browserFromUA identifies the major browsers", () => {
  assert.equal(browserFromUA("Mozilla/5.0 ... Edg/120.0"), "Edge");
  assert.equal(browserFromUA("Mozilla/5.0 ... OPR/105.0"), "Opera");
  assert.equal(browserFromUA("Mozilla/5.0 ... Firefox/121.0"), "Firefox");
  assert.equal(browserFromUA("Mozilla/5.0 ... Chrome/120.0 Safari/537.36"), "Chrome");
  assert.equal(browserFromUA("Mozilla/5.0 ... Version/17.0 Safari/605.1.15"), "Safari");
  assert.equal(browserFromUA("something else"), "Other");
});

/* ------------------------------------------------------------ escaping */

test("escapeHtml neutralises a stored-XSS payload", () => {
  const payload = '<script>alert("xss")</script>';
  const out = escapeHtml(payload);
  assert.equal(out.includes("<"), false);
  assert.equal(out.includes(">"), false);
  assert.equal(out, "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
});

test("escapeHtml escapes ampersands and single quotes", () => {
  assert.equal(escapeHtml("a & b"), "a &amp; b");
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("escapeHtml handles the attribute-breaking case", () => {
  // This is the payload that would escape a double-quoted HTML attribute.
  assert.equal(escapeHtml('" onmouseover="alert(1)'), "&quot; onmouseover=&quot;alert(1)");
});

test("escapeHtml turns nullish into an empty string", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

/* ------------------------------------------------------------ referrer */

test("referrerHost reduces a URL to its host", () => {
  assert.equal(referrerHost("https://www.linkedin.com/in/vlat273/"), "www.linkedin.com");
  assert.equal(referrerHost("https://www.google.com/search?q=cyber"), "www.google.com");
});

test("referrerHost falls back to 'direct' for missing or malformed values", () => {
  assert.equal(referrerHost(""), "direct");
  assert.equal(referrerHost(null), "direct");
  assert.equal(referrerHost("not a url"), "direct");
});
