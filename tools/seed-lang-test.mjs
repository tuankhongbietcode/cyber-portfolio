/* A returning visitor who chose Vietnamese must get Vietnamese on a fresh load,
   before any click. Run: node tools/seed-lang-test.mjs */
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_ = 'file:///C:/Users/Tuna/Documents/Codex/2026-10-13/new-chat/work/cyber-portfolio/dist/index.html';
const PORT = 9344;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/cdp-profile-' + PORT + '-' + process.pid,
  `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });
chrome.unref();

let ws;
try {
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const myId = ++id;
    pending.set(myId, res);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  await send('Page.enable');

  /* Seed the same origin's storage, then load the page cold. */
  await send('Page.navigate', { url: URL_ });
  await sleep(500);
  await evaluate('localStorage.setItem("vlat273.lang", "vi")');
  await send('Page.navigate', { url: URL_ + '?v=' + Date.now() });
  await sleep(2600);

  const lang = await evaluate('document.documentElement.getAttribute("lang")');
  const code = await evaluate('document.getElementById("langCode").textContent');
  const hero = await evaluate('document.querySelector(".hero h1").textContent.trim()');
  const banner = await evaluate('[...document.querySelectorAll("#termOut > div")].map(d=>d.textContent).find(t=>t.includes("TP.HCM"))||""');
  const stored = await evaluate('localStorage.getItem("vlat273.lang")');

  console.log(`html lang     ${lang}`);
  console.log(`toggle label  ${code}`);
  console.log(`localStorage  ${stored}`);
  console.log(`hero h1       ${hero}`);
  console.log(`banner row    ${JSON.stringify(banner)}`);

  const fail = [];
  if (lang !== 'vi') fail.push('seeded choice not honoured: html lang = ' + lang);
  if (code !== 'VI') fail.push('toggle label not VI');
  if (!hero.startsWith('Tôi lần theo')) fail.push('hero not Vietnamese: ' + hero);
  if (!banner.includes('an ninh mạng')) fail.push('terminal not Vietnamese');
  if ([...banner].length !== 32) fail.push(`banner row is ${[...banner].length}cp, want 32`);

  if (fail.length) { console.error('\nFAILED:/n' + fail.map((f) => '  - ' + f).join('\n')); process.exitCode = 1; }
  else console.log('\nReturning Vietnamese visitor: translated on first paint, banner aligned.');
} finally {
  try { if (ws) ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  const dir = process.env.TEMP + '/cdp-profile-' + PORT + '-' + process.pid;
  try { spawn('cmd', ['/c', 'rmdir', '/s', '/q', dir], { detached: true, stdio: 'ignore' }).unref(); } catch {}
  process.exit(process.exitCode || 0);
}
