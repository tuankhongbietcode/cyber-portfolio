/* Count the exact trailing-space run on each banner row, in the browser.
   The box-drawing frame is drawn with '─'.repeat(W), so the rows must also be
   exactly W wide or the right-hand │ drifts. */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = 'file:///C:/Users/Tuna/Documents/Codex/2026-10-13/new-chat/work/cyber-portfolio/dist/index.html';
const PORT = 9388;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/cdp-' + PORT + '-' + process.pid,
  `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });

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

  const probe = `(() => {
    const rows = [...document.querySelectorAll('#termOut > div')].slice(0, 5);
    return rows.map((d) => {
      const t = d.textContent;
      const m = t.match(/^(.*?)( *)$/);
      const mono = "500 .74rem 'JetBrains Mono', monospace";
      const s = document.createElement('span');
      s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:' + mono;
      s.textContent = t;
      document.body.appendChild(s);
      const px = s.getBoundingClientRect().width;
      s.remove();
      return {
        total: t.length, text: t,
        body: m[1].length,
        trail: m[2].length,
        px: Math.round(px * 100) / 100,
      };
    });
  })()`;

  const report = async (label) => {
    const rows = await evaluate(probe);
    console.log(`\n${label}`);
    for (const r of rows) {
      console.log(`  total ${r.total}  body ${r.body}  trailingSpaces ${r.trail}  ${r.px}px`);
    }
    const totals = new Set(rows.map((r) => r.total));
    console.log(`  distinct totals: ${[...totals].join(', ')}`);
    return totals.size === 1;
  };

  const en = await report('ENGLISH');
  await evaluate('document.getElementById("langToggle").click()');
  await sleep(3200);
  const vi = await report('VIETNAMESE');

  console.log(`\nEnglish aligned: ${en}`);
  console.log(`Vietnamese aligned: ${vi}`);
  if (!en || !vi) process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill();
  try { rmSync(process.env.TEMP + '/cdp-' + PORT + '-' + process.pid, { recursive: true, force: true }); } catch {}
  try { rmSync(process.env.TEMP + '/cdp-profile-' + PORT + '-' + process.pid, { recursive: true, force: true }); } catch {}
}
