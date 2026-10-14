/* Click the language toggle in a real browser and read the page back.
   Verifies the wiring end to end: button → setLang → DOM rewrite → terminal
   redraw → persistence.

   Run: node tools/toggle-test.mjs                                          */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_ = 'file:///C:/Users/Tuna/Documents/Codex/2026-10-13/new-chat/work/cyber-portfolio/dist/index.html';
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/cdp-profile-' + PORT + '-' + process.pid,
  `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore', detached: false });

let ws;
try {
  /* wait for the debugger */
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome debugger never came up');

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
    if (r.result?.exceptionDetails) throw new Error(expr + ' -> ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  await send('Page.enable');
  await send('Page.navigate', { url: URL_ });
  await sleep(2500);

  const read = async () => ({
    lang: await evaluate('document.documentElement.getAttribute("lang")'),
    code: await evaluate('document.getElementById("langCode").textContent'),
    hero: await evaluate('document.querySelector(".hero h1").textContent.trim()'),
    badge: await evaluate('document.getElementById("langToggle").getAttribute("aria-label")'),
    stored: await evaluate('localStorage.getItem("vlat273.lang")'),
    termLines: await evaluate('document.querySelectorAll("#termOut > div").length'),
    banner: await evaluate('[...document.querySelectorAll("#termOut > div")].map(d=>d.textContent).find(t=>t.includes("╭"))||""'),
  });

  const before = await read();
  await evaluate('document.getElementById("langToggle").click()');
  await sleep(600);
  const after = await read();
  await evaluate('document.getElementById("langToggle").click()');
  await sleep(600);
  const back = await read();

  /* A visitor who has already run a command keeps their transcript: the switch
     must not wipe it, and the shell must still answer afterwards. */
  const typedRead = async () => ({
    lang: await evaluate('document.documentElement.getAttribute("lang")'),
    first: await evaluate('[...document.querySelectorAll("#termOut > div")].map(d=>d.textContent).find(t=>t.includes("VÕ LÊ ANH TUẤN"))||""'),
    note: await evaluate('[...document.querySelectorAll("#termOut > div")].map(d=>d.textContent).join("\\n").includes("banner")'),
    answers: await evaluate('document.querySelectorAll("#termOut > div").length'),
  });
  await evaluate(`(() => {
    const f = document.getElementById('termForm');
    const i = document.getElementById('termInput');
    i.value = 'help';
    f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  })()`);
  await sleep(400);
  const englishHelp = await evaluate('document.querySelectorAll("#termOut > div").length');
  await evaluate('document.getElementById("langToggle").click()');
  await sleep(900);
  const typed = await typedRead();

  const show = (label, s) => {
    console.log(`\n${label}`);
    console.log(`  html lang     ${s.lang}`);
    console.log(`  toggle label  ${s.code}  (aria-label: ${s.badge})`);
    console.log(`  localStorage  ${s.stored}`);
    console.log(`  hero h1       ${s.hero}`);
    console.log(`  term frame    ${JSON.stringify(s.banner.slice(0, 34))}`);
    console.log(`  term lines    ${s.termLines}`);
  };
  show('START (default English)', before);
  show('AFTER ONE CLICK (Vietnamese)', after);
  show('AFTER CLICKING BACK (English)', back);
  show('AFTER TYPING `help` AND SWITCHING', {
    lang: typed.lang, code: '', badge: '', stored: '',
    hero: typed.first.slice(0, 34), banner: typed.first.slice(0, 34), termLines: typed.answers,
  });

  /* ── assertions ─────────────────────────────────────────────────────── */
  const fail = [];
  const ok = (cond, msg) => { if (!cond) fail.push(msg); };

  ok(before.lang === 'en' && before.code === 'EN', 'starts in English');
  ok(before.hero.startsWith('I trace the'), 'hero starts in English');
  ok(before.banner.startsWith('╭───'), `banner frame drawn in English, got ${JSON.stringify(before.banner.slice(0, 12))}`);

  ok(after.lang === 'vi' && after.code === 'VI', 'one click switches to Vietnamese');
  ok(after.stored === 'vi', 'choice persisted to localStorage');
  ok(after.hero.startsWith('Tôi lần theo'), 'hero retranslated');
  ok(after.badge === 'Đổi ngôn ngữ', `toggle aria-label translated, got "${after.badge}"`);
  ok(after.banner.startsWith('╭───'), `banner frame redrawn in Vietnamese, got ${JSON.stringify(after.banner.slice(0, 12))}`);
  ok(after.termLines > before.termLines * 0.5, 'terminal repainted');

  ok(back.lang === 'en' && back.code === 'EN', 'second click returns to English');
  ok(back.hero.startsWith('I trace the'), 'hero back to English');
  ok(back.stored === 'en', 'choice persisted again');

  /* the typed path: transcript survives, the note appears, the shell still runs */
  ok(typed.lang === 'vi', 'typed path switches to Vietnamese');
  ok(typed.answers >= englishHelp, 'transcript is not wiped once the visitor has typed');
  ok(typed.first.startsWith('│ VÕ LÊ ANH TUẤN'), 'the English banner is left as written');
  ok(typed.note, 'a note points at the banner command');
  ok(await evaluate('document.querySelectorAll("#termOut > div").length') > 1, 'shell still answers after the switch');

  if (fail.length) { console.error('\nFAILED:\n' + fail.map((f) => '  - ' + f).join('\n')); process.exitCode = 1; }
  else console.log('\nToggle works: click → Vietnamese, click → English, choice persisted, terminal repainted.');
} finally {
  if (ws) ws.close();
  chrome.kill();
  try { rmSync(process.env.TEMP + '/cdp-' + PORT + '-' + process.pid, { recursive: true, force: true }); } catch {}
  try { rmSync(process.env.TEMP + '/cdp-profile-' + PORT + '-' + process.pid, { recursive: true, force: true }); } catch {}
}
