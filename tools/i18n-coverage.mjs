/* Report which translatable strings on the page have no Vietnamese entry.
   Run: node tools/i18n-coverage.mjs            -> everything missing
        node tools/i18n-coverage.mjs --quiet    -> only the ones that look wrong */
import { readFileSync } from 'node:fs';

const KEYS = new Set();
const src = readFileSync(new URL('../dist/i18n.js', import.meta.url), 'utf8');
for (const m of src.matchAll(/^\s{4}"((?:[^"\\]|\\.)*)":/gm)) KEYS.add(m[1]);

/* Names, numbers, dates, brands and product terms are deliberately left
   English — the dictionary is a fall-through table, not a full mirror. */
const KEEP = new Set([
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
  'Also', 'Studying', 'Recognition', 'Signals', 'Sources', 'Stack', 'Platform', 'Scope', 'Found',
  'Fixed', 'Verified', 'Rule', 'Practice', 'Remediation', 'Reporting', 'Enumeration', 'Systems',
  'Networking', 'Contact', 'Email', 'Base', 'Terminal', 'Work', 'Toolkit', 'Experience',
  'Expected', 'Deployment Server', 'Universal Forwarders', 'eve-ng', 'nmap',
]);

const seen = new Set();
for (const line of readFileSync(new URL('../.strings.txt', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*(?:\(\d+\)\s+)?"(.*)"\s*$/);
  if (!m) continue;
  let key;
  try { key = JSON.parse('"' + m[1] + '"'); } catch { continue; }
  if (seen.has(key)) continue;
  seen.add(key);
  if (KEYS.has(key) || KEEP.has(key)) continue;
  console.log(JSON.stringify(key));
}
console.log(`\n# checked ${seen.size} · missing ${seen.size - [...seen].filter((k) => KEYS.has(k) || KEEP.has(k)).length}`);
