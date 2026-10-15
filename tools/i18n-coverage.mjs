/* Report which translatable strings on the page have no Vietnamese entry.
   Run: node tools/i18n-coverage.mjs            -> everything missing
        node tools/i18n-coverage.mjs --quiet    -> only the ones that look wrong */
import { readFileSync } from 'node:fs';
import { extractStrings } from './extract-strings.mjs';

const KEYS = new Set();
const src = readFileSync(new URL('../dist/i18n.js', import.meta.url), 'utf8');
/* The capture is the raw body of a JS string literal, so \" and \\ are still
   escaped here. Decode before storing, or a key containing a quote compares
   unequal to the same text coming from the DOM and reads as unused. */
for (const m of src.matchAll(/^\s{4}"((?:[^"\\]|\\.)*)":/gm)) {
  try { KEYS.add(JSON.parse('"' + m[1] + '"')); } catch { KEYS.add(m[1]); }
}

/* Names, numbers, dates, brands and product terms are deliberately left
   English — the dictionary is a fall-through table, not a full mirror. */const KEEP = new Set([
  'Võ Lê Anh Tuấn', 'vlat273', 'Got It', 'VNCS', 'VNPRO', 'Swinburne University of Technology',
  'Swinburne', '01', '02', '03', '04', '05', '001', '002', '003', '004', '005', '2026', '©',
  '↗', '↑', '/', '·', '+', 'K', 'Ctrl', '.', ',', '&rsquo;', '2023–2027', '2023', '2026.05 — 2026.08',
  '2025.11 — 2026.04', 'CPTS', 'OffSec', 'anhtuanpm3939@gmail.com', 'linkedin.com/in/vlat273',
  'TNE20002 — Network Routing Principles · Swinburne University of Technology',
  'Certified Penetration Testing Specialist · OffSec', 'CPTS — Certified Penetration Testing Specialist',
  'Nmap', 'ffuf', 'NetExec', 'Burp Suite', 'BloodHound', 'Impacket', 'Kerbrute', 'Markdown',
  'Wireshark', 'SPL', 'Bash', 'PowerShell', 'Python', 'Linux', 'Windows Server', 'Cisco IOS',
  'VMware ESXi', 'EVE-NG', 'EVE-NG / UnetLab', 'Microsoft 365', 'SIEM', 'Splunk', 'Splunk Enterprise',
  'Sysmon', 'Windows Event Log', 'Windows Event, Sysmon, Linux, web app, firewall', 'Linux syslog',
  'Firewall / syslog', 'Universal', 'Forwarders', 'Indexer · Search Head', 'SPLUNK ENTERPRISE',
  'VMWARE ESXI', 'Splunk Enterprise, Deployment Server, Universal Forwarders, SPL',
  'VMware ESXi, EVE-NG / UnetLab', 'Routing', 'Switching', 'Firewall', 'VPN', 'Wireless', 'Cisco ISE',
  'Routing, switching, firewall, VPN, wireless, Cisco ISE', 'SIEM & detection', 'Scripting',
  'Splunk Enterprise, SPL, Deployment Server, universal forwarders, dashboards, alerting',
  'lab use', 'professional', 'lab', 'studying', 'SQL injection (auth bypass)',
  'Active Directory', 'Post-exploitation', 'Canvas', 'Front end', 'AppSec', 'Web',
  '>_', 'LinkedIn', 'Swinburne · 2023–2027', 'guest@vlat273: ~', 'guest@vlat273:~$',
  'cat experience.log', 'VLAN', '2023 — 2027',
  'Dashboard', 'JSON-LD, OG/Twitter cards, manifest, self-hosted subset fonts, full no-JS fallback',
  'Stack', 'Engine', 'Detail', 'Track', 'Verify', 'Focus', 'Status', 'Output', 'Environment', 'Owned',
  'Also', 'Studying', 'Recognition', 'Sources', 'Platform', 'Scope', 'Found',
  'Fixed', 'Verified', 'Rule', 'Practice', 'Remediation', 'Reporting', 'Enumeration', 'Systems',
  'Networking', 'Contact', 'Email', 'Base', 'Terminal', 'Work', 'Toolkit', 'Experience',
  'Expected', 'Deployment Server', 'Universal Forwarders', 'eve-ng', 'nmap',
  /* The CV row label, a bare arrow glyph, and the footer's date stamp are
     language-neutral — an abbreviation, a symbol, and an ISO month. */
  'CV', '↓', '2026-10',
  'Access control',
]);

/* Read the live page, not a cached copy of it — a stale list hides every
   string that changed since the cache was written. */
const found = extractStrings();

const seen = new Set(found);
for (const key of found) {
  if (seen.has(key) && (KEYS.has(key) || KEEP.has(key))) continue;
  console.log(JSON.stringify(key));
}
console.log(`\n# checked ${found.length} unique · missing ${[...seen].filter((k) => !KEYS.has(k) && !KEEP.has(k)).length}`);

/* The other direction: keys nothing asks for any more. They are harmless at
   runtime — the table just falls through — but they rot quietly and make the
   dictionary harder to trust.

   Both sides have to be normalised before comparing: the page wraps its lines
   and uses HTML entities, app.js uses double spaces inside its literals, and
   t() calls sometimes hide their argument in a ternary. So collect every
   string literal in app.js rather than only the t() arguments, and compare on
   whitespace-collapsed text. That over-collects, which under-reports orphans
   — the safe direction for a list someone deletes from. */
if (process.argv.includes('--orphans')) {
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
  const used = new Set(found.map(norm));

  const unent = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rsquo;/g, '\u2019')
    .replace(/&mdash;/g, '\u2014').replace(/&nbsp;/g, ' ');
  for (const m of html.matchAll(/\s(?:aria-label|title|placeholder)="([^"]*)"/g)) used.add(norm(unent(m[1])));

  const unq = (s) => { try { return JSON.parse('"' + s.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'); } catch { return s; } };
  for (const m of app.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) used.add(norm(unq(m[1])));
  for (const m of app.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) used.add(norm(unq(m[1])));

  /* The filesystem is translated wholesale by fs()'s mapper, not one call per
     line, so execute the block and walk it exactly the way fs() does. */
  const fsStart = app.indexOf('const FS_EN = dir({');
  const fsEnd = app.indexOf('\n  });', fsStart);
  if (fsStart !== -1 && fsEnd !== -1) {
    const dir = (c) => ({ type: 'dir', children: c });
    const file = (l) => ({ type: 'file', lines: [].concat(l) });
    try {
      new Function('dir', 'file', app.slice(fsStart, fsEnd + 6).replace('const FS_EN =', 'globalThis.__FS_EN ='))(dir, file);
      const walk = (n) => {
        if (n.type === 'file') { for (const l of n.lines) if (typeof l === 'string') used.add(norm(l)); return; }
        for (const k in n.children) walk(n.children[k]);
      };
      if (globalThis.__FS_EN) walk(globalThis.__FS_EN);
    } catch { /* a syntax change in app.js is caught by the other tests */ }
  }

  const orphans = [...KEYS].filter((k) => !used.has(norm(k)) && !KEEP.has(k));
  for (const k of orphans) console.log('ORPHAN ' + JSON.stringify(k));
  console.log(`# orphans ${orphans.length} (of ${KEYS.size} keys)`);
}
