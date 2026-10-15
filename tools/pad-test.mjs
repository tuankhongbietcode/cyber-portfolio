/* Measure the banner rows in a real browser to confirm the box-drawing frame
   still lines up once the copy is Vietnamese. Run: node tools/pad-test.mjs */
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = 'file:///C:/Users/Tuna/Documents/Codex/2026-10-13/new-chat/work/cyber-portfolio/dist/index.html';
const PORT = 9366;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MONO = "500 .74rem 'JetBrains Mono', monospace";

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/cdp-' + PORT + '-' + process.pid,
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
  await send('Page.navigate', { url: PAGE });
  await sleep(3200);

  const MEASURE = `(() => {
    const mono = ${JSON.stringify(MONO)};
    return [...document.querySelectorAll('#termOut > div')].slice(0, 5).map((d) => {
      const text = d.textContent;
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:' + mono;
      probe.textContent = text;
      document.body.appendChild(probe);
      const px = Math.round(probe.getBoundingClientRect().width);
      probe.remove();
      return { text, cp: [...text].length, px };
    });
  })()`;

  const show = (label) => evaluate(MEASURE).then((rows) => {
    console.log(`\n${label}`);
    for (const r of rows) console.log(`  ${String(r.cp).padStart(3)}cp ${String(r.px).padStart(4)}px  ${JSON.stringify(r.text)}`);
    const widths = [...new Set(rows.map((r) => r.px))];
    console.log(`  distinct widths: ${widths.length} -> ${widths.join(', ')}`);
    return widths.length === 1;
  });

  const enAligned = await show('ENGLISH banner (baseline)');
  await evaluate('document.getElementById("langToggle").click()');
  await sleep(3200);
  const viAligned = await show('VIETNAMESE banner (after the switch)');

  console.log(`\nEnglish frame aligned: ${enAligned}`);
  console.log(`Vietnamese frame aligned: ${viAligned}`);
  if (!enAligned || !viAligned) process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  // Best-effort, non-blocking cleanup: hand the deletion to a detached shell
  // that outlives this process, so we never block on files Chrome still locks.
  for (const suffix of ['cdp', 'cdp-profile']) {
    const dir = process.env.TEMP + '/' + suffix + '-' + PORT + '-' + process.pid;
    try { spawn('cmd', ['/c', 'rmdir', '/s', '/q', dir], { detached: true, stdio: 'ignore' }).unref(); } catch {}
  }
  process.exit(process.exitCode || 0);
}
