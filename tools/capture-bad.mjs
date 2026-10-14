/* Loop until the flaky 33-character banner row appears, then dump its HTML.
   The frame is '─'.repeat(W) and the rows are padEnd(W), so a row one wider
   than the frame cannot come from the same call — this finds out what did. */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = 'file:///C:/Users/Tuna/Documents/Codex/2026-10-13/new-chat/work/cyber-portfolio/dist/index.html';
const PORT = 9399;
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

  for (let attempt = 1; attempt <= 8; attempt++) {
    await send('Page.navigate', { url: PAGE });
    await sleep(2600);
    await evaluate('document.getElementById("langToggle").click()');
    await sleep(3000);

    const rows = await evaluate(`(() => {
      return [...document.querySelectorAll('#termOut > div')].slice(0, 5).map((d) => ({
        total: d.textContent.length,
        cp: [...d.textContent].length,
        text: d.textContent,
        html: d.innerHTML,
      }));
    })()`);

    const bad = rows.find((r) => r.total !== 32);
    console.log(`attempt ${attempt}: totals ${rows.map((r) => r.total).join(',')} ${bad ? '<-- BAD' : ''}`);
    if (bad) {
      console.log('\n--- the offending row ---');
      console.log('textContent :', JSON.stringify(bad.text));
      console.log('total/cp    :', bad.total, '/', bad.cp);
      console.log('innerHTML   :', JSON.stringify(bad.html));
      console.log('\nhex         :', [...bad.text].map((c) => c.codePointAt(0).toString(16)).join(' '));
      console.log('\n--- all five ---');
      for (const r of rows) console.log(`  ${r.total}cp  ${JSON.stringify(r.text)}`);
      break;
    }
  }
} finally {
  if (ws) ws.close();
  chrome.kill();
  try { rmSync(process.env.TEMP + '/cdp-' + PORT + '-' + process.pid, { recursive: true, force: true }); } catch {}
  try { rmSync(process.env.TEMP + '/cdp-profile-' + PORT + '-' + process.pid, { recursive: true, force: true }); } catch {}
}
