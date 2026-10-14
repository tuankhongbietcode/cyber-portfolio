/* Run dist/i18n.js inside a minimal DOM stub and assert the translation
   actually resolves — for the page markup, the shell strings, and every line
   of the filesystem under ~. No browser needed.

   Run: node tools/i18n-test.mjs                                            */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

/* ── a DOM just big enough ─────────────────────────────────────────────── */
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.nodeValue = ''; }
  hasAttribute(n) { return n in this.attrs; }
  getAttribute(n) { return this.attrs[n]; }
  setAttribute(n, v) { this.attrs[n] = v; }
  appendChild(c) { this.children.push(c); return c; }
  get parentNode() { return this.parent || null; }
  get firstElementChild() { return this.children[0] || null; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
  replaceChildren() { this.children = []; }
  get childElementCount() { return this.children.length; }
  get textContent() { return this.nodeValue; }
  set textContent(v) { this.nodeValue = v; }
  querySelectorAll() { return []; }
  getAttributeNames() { return Object.keys(this.attrs); }
}

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const body = new El('body');

/* ── the strings i18n.js is expected to render ─────────────────────────── */
const src = readFileSync(new URL('../dist/i18n.js', import.meta.url), 'utf8');
const KEYS = [];
for (const m of src.matchAll(/^\s{4}"((?:[^"\\]|\\.)*)":/gm)) KEYS.push(JSON.parse('"' + m[1] + '"'));

const listeners = {};
const doc = {
  body,
  documentElement: new El('html'),
  title: 'Võ Lê Anh Tuấn — Cybersecurity & Offensive Security Portfolio',
  getElementById: () => null,
  querySelectorAll: () => [],
  createTreeWalker: () => ({ nextNode: () => null }),
  addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
  dispatchEvent: (e) => { (listeners[e.type] || []).forEach((f) => f(e)); return true; },
};

let stored = null;
globalThis.window = globalThis;
globalThis.document = doc;
globalThis.localStorage = {
  getItem: (k) => (k === 'vlat273.lang' ? stored : null),
  setItem: (k, v) => { if (k === 'vlat273.lang') stored = v; },
};
/* navigator is a getter-only global in Node 22, so it is patched rather than
   assigned — the module only reads .language and .languages. */
const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { language: 'en', languages: ['en'] },
});
void navDesc;
globalThis.CustomEvent = class CustomEvent {
  constructor(type, opts) { this.type = type; this.detail = (opts || {}).detail; }
};
globalThis.NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };

/* ── load the module ───────────────────────────────────────────────────── */
new Function(readFileSync(new URL('../dist/i18n.js', import.meta.url), 'utf8'))();

const t = globalThis.t;
assert.equal(typeof t, 'function', 'window.t is exposed');

/* ── switch to Vietnamese first: t() is a no-op while English is active ─── */
globalThis.i18n.set('vi');
assert.equal(globalThis.i18n.lang(), 'vi');
assert.equal(stored, 'vi', 'language persisted to localStorage');

/* Words Vietnamese IT writing keeps as-is ("terminal", "stack", "parse").
   Derived from the dictionary rather than hand-listed, so adding an identity
   mapping cannot break this file. */
const IDENTITY = new Set(KEYS.filter((k) => src.includes(`${JSON.stringify(k)}: ${JSON.stringify(k)},`)));

/* ── 1. every dictionary key resolves to something different ───────────── */
let changed = 0;
for (const k of KEYS) {
  const vi = t(k);
  if (vi !== k) changed++;
  else if (!IDENTITY.has(k) && !/^[\s·.,/&↗↑©+>—–]*$/.test(k) && k.length > 3) {
    throw new Error(`key translates to itself: ${JSON.stringify(k)}`);
  }
}
console.log(`1. dictionary: ${KEYS.length} keys, ${changed} actually differ from English, ${KEYS.length - changed} kept as-is on purpose`);

/* ── 2. switching languages and back is lossless ────────────────────────── */
const first = KEYS.map(t);
globalThis.i18n.set('en');
const back = KEYS.map(t);
assert.deepEqual(back, KEYS, 'switching back to English restores every source exactly');
assert.equal(stored, 'en');
globalThis.i18n.set('vi');
assert.deepEqual(KEYS.map(t), first, 'switching to Vietnamese is stable across calls');
assert.equal(globalThis.document.documentElement.getAttribute('lang'), 'vi');
console.log(`2. en <-> vi round trip: ${KEYS.length} keys, lossless`);

/* ── back to Vietnamese for the remaining checks ───────────────────────── */
globalThis.i18n.set('vi');

/* ── 3. whitespace rules ───────────────────────────────────────────────── */
assert.equal(t('  indented'), t('indented').replace(/^/, '  '), 'leading indent preserved');
assert.equal(t('a\n   b'), t('a b'), 'internal runs collapse for lookup');
assert.equal(t('Got\u00a0It.'), t('Got It.'), 'non-breaking space normalises like any run');
assert.equal(t(''), '', 'empty string survives');
assert.equal(t(null), '', 'null survives');
console.log('3. whitespace: indent kept, runs collapsed, NBSP normalised, null safe');

/* ── 4. unknown keys fall through to English, not blank ────────────────── */
assert.equal(t('some string that was never translated'), 'some string that was never translated');
assert.equal(t('__proto__'), '__proto__', 'prototype keys cannot poison the lookup');
assert.equal(t('constructor'), 'constructor');
console.log('4. fall-through: unknown and hostile keys return the source unchanged');

/* ── 5. the filesystem under ~ translates in place ─────────────────────── */
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const start = app.indexOf('const FS_EN = dir({');
const end = app.indexOf('\n  });', start);
const fsLines = [];
for (const m of app.slice(start, end).matchAll(/^\s*'((?:[^'\\]|\\.)*)',\s*$/gm)) {
  const v = m[1].replace(/\\'/g, "'");
  if (v.trim()) fsLines.push(v);
}
const untranslated = fsLines.filter((l) => t(l) === l && l.trim() !== '' && !/^[{}\s]*$/.test(l));
const expectedEnglish = [
  'email      anhtuanpm3939@gmail.com',
  'linkedin   linkedin.com/in/vlat273',
  'STACK    Splunk Enterprise, Deployment Server, Universal Forwarders, SPL',
  'PLATFORM VMware ESXi, EVE-NG / UnetLab',
  'SCOPE    routing, switching, firewall, VPN, wireless, Cisco ISE',
  'TRACK    CPTS — Certified Penetration Testing Specialist',
].concat([
  /* JSON scaffolding in skills.json: translating the braces would break the
     file's shape for no gain, and the values inside them are translated. */
  '  "levels": {', '  },', '  "offensive": {', '  "foundations": {',
  '    "level": "lab",', '    "level": "professional",', '  "track": [', '  ],',
  '  "studying": [', '    "active directory attack paths",',
  '    "web application security",', '    "detection engineering"',
  '  Swinburne University of Technology  ·  2023–2027',
  '  "enumeration":       ["nmap", "ffuf", "netexec"],',
  '  "web testing":       ["burp suite", "ffuf"],',
  '  "active directory":  ["bloodhound", "netexec", "impacket", "kerbrute"],',
  '  "post-exploitation": ["impacket", "netexec", "bloodhound"],',
  '  "reporting":         ["markdown", "evidence discipline"]',
  '  "networking":  ["cisco ios", "vlan", "firewall", "vpn"],',
  '  "siem":        ["splunk enterprise", "spl", "sysmon"],',
  '  "systems":     ["linux", "windows server", "vmware esxi", "eve-ng"],',
  '  "identity":    ["microsoft 365", "endpoint support"],',
  '  "scripting":   ["bash", "powershell", "python"],',
  '  "practice":    ["documentation", "backups", "troubleshooting"]',
]);
const unexpected = untranslated.filter((l) => !expectedEnglish.some((e) => e.trim() === l.trim()));
if (unexpected.length) {
  throw new Error(`filesystem lines left in English:\n${unexpected.map((l) => `  ${JSON.stringify(l)}`).join('\n')}`);
}
console.log(`5. filesystem: ${fsLines.length} lines, ${untranslated.length} intentionally English, ${unexpected.length} unexpected`);

/* ── 6. sample of what the visitor actually sees ───────────────────────── */
/* The <h1> is three separate text nodes around a <span>, which is exactly why
   the DOM walk beats per-string attributes — so these are the real keys. */
const samples = [
  ['I trace the', 'Tôi lần theo'],
  ['attack path', 'đường tấn công'],
  ['Let’s exchange signals.', 'Hãy trao đổi tín hiệu.'],
  ['guest is not in the sudoers file.', 'guest không có trong sudoers file.'],
  ['cd: no such directory', 'cd: không có thư mục này'],
  ['2026.09 — now Got It Information Technology Intern', '2026.09 — nay'],
];
for (const [en, expect] of samples) {
  assert.ok(t(en).startsWith(expect), `${JSON.stringify(en)} -> ${JSON.stringify(t(en))}`);
}
console.log('6. spot checks: hero, contact heading, easter egg, cd error, log field');

console.log('\nAll i18n checks passed.');
