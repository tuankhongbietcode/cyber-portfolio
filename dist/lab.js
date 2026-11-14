/* ═══════════════════════════════════════════════════════════════════════════
   Detection lab — a small SPL-style search over synthetic events.

   Everything here is generated in the visitor's browser from a fixed seed, so
   the story is the same on every visit: six log families, one intrusion hidden
   in the noise. No network request, no real log, no dependency.

   The query language is a deliberately small subset of Splunk SPL:
     search   field=value  field!=value  bytes>1000  *wild*  "a phrase"
              AND (implicit) · OR · NOT · ( )
     pipes    stats  sort  head  tail  table  top  dedup  where

   All values reach the page through textContent, never innerHTML.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const root = document.getElementById('labApp');
  if (!root) return;

  const t = (s) => (typeof window.t === 'function' ? window.t(s) : String(s ?? ''));
  const $ = (sel) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* ═════════════════════════════════════════════════════════════════════════
     1 · Synthetic data
     Documentation address ranges only (RFC 5737): 192.0.2.0/24 is ordinary
     internet traffic, 203.0.113.45 is the attacker, 198.51.100.77 is where the
     data goes. 10.20.0.0/16 is the internal network.
     ═════════════════════════════════════════════════════════════════════════ */
  const DAY = '2026-11-10';
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (s) => `${DAY} ${pad((s / 3600) | 0)}:${pad(((s % 3600) / 60) | 0)}:${pad(s % 60)}`;
  const at = (h, m, s = 0) => h * 3600 + m * 60 + s;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261110);
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = (a) => a[Math.floor(rand() * a.length)];
  /* Mostly a working day, with a thin spread across the rest. */
  const when = () => (rand() < 0.82 ? int(at(7, 30), at(18, 0)) : int(0, 86399));

  const HUMANS = ['a.tran', 'b.le', 'c.pham', 'd.nguyen', 'e.vo', 'f.hoang', 'g.dang',
    'h.bui', 'i.do', 'j.ngo', 'k.truong', 'l.huynh', 'm.phan', 'n.vu'];
  const WS = {};
  HUMANS.forEach((u, i) => { WS[u] = { host: 'WS-' + pad(i + 1), ip: '10.20.2.' + (11 + i) }; });
  const FS01 = '10.20.4.15';
  const WEB01 = '10.20.1.10';
  const ATTACKER = '203.0.113.45';
  const EXFIL = '198.51.100.77';

  const EVENTS = [];
  const add = (sec, o) => EVENTS.push({ _ts: sec, _time: stamp(sec), ...o });

  /* Windows Security — DC01 */
  for (let i = 0; i < 150; i++) {
    const u = pick(HUMANS);
    add(when(), { sourcetype: 'WinEventLog:Security', host: 'DC01', src_ip: WS[u].ip, user: u,
      action: 'success', status: '0x0', detail: `EventCode=4624 LogonType=${pick([2, 3])}` });
  }
  for (let i = 0; i < 18; i++) {
    const u = pick(HUMANS);
    add(when(), { sourcetype: 'WinEventLog:Security', host: 'DC01', src_ip: WS[u].ip, user: u,
      action: 'failure', status: '0xC000006A', detail: 'EventCode=4625 LogonType=2' });
  }
  for (let i = 0; i < 12; i++) {
    add(when(), { sourcetype: 'WinEventLog:Security', host: 'DC01', src_ip: WEB01, user: 'svc-web',
      action: 'success', status: '0x0', detail: 'EventCode=4624 LogonType=5' });
  }
  /* The real nightly backup: svc-backup, from the file server, at its usual hour. */
  [at(0, 30, 4), at(12, 30, 9)].forEach((s) => add(s, { sourcetype: 'WinEventLog:Security',
    host: 'DC01', src_ip: FS01, user: 'svc-backup', action: 'success', status: '0x0',
    detail: 'EventCode=4624 LogonType=5' }));

  /* Sysmon — workstations */
  const PROCS = [
    'Image=C:\\Program Files\\Google\\Chrome\\chrome.exe parent=explorer.exe',
    'Image=C:\\Program Files\\Microsoft Office\\EXCEL.EXE parent=explorer.exe',
    'Image=C:\\Windows\\System32\\notepad.exe parent=explorer.exe',
    'Image=C:\\Program Files\\Microsoft Office\\OUTLOOK.EXE parent=explorer.exe',
    'Image=C:\\Windows\\System32\\cmd.exe parent=explorer.exe',
  ];
  for (let i = 0; i < 80; i++) {
    const u = pick(HUMANS);
    add(when(), { sourcetype: 'sysmon', host: WS[u].host, src_ip: WS[u].ip, user: u,
      action: 'process_create', detail: pick(PROCS) });
  }
  add(at(0, 30, 11), { sourcetype: 'sysmon', host: 'FS01', src_ip: FS01, user: 'svc-backup',
    action: 'process_create',
    detail: 'Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe args=-File C:\\ops\\backup.ps1 parent=taskeng.exe' });

  /* Linux — LNX01 */
  for (let i = 0; i < 30; i++) {
    const u = pick(['a.tran', 'b.le']);
    add(when(), { sourcetype: 'linux_secure', host: 'LNX01', src_ip: WS[u].ip, user: u,
      action: 'success', detail: 'sshd: Accepted publickey port=22' });
  }
  for (let i = 0; i < 6; i++) {
    const u = pick(HUMANS);
    add(when(), { sourcetype: 'linux_secure', host: 'LNX01', src_ip: WS[u].ip, user: u,
      action: 'failure', detail: 'sshd: Failed password port=22' });
  }

  /* Oracle audit — DB01 */
  const TABLES = ['APP.ORDERS', 'APP.CUSTOMERS', 'APP.INVENTORY', 'APP.INVOICES'];
  for (let i = 0; i < 40; i++) {
    const u = pick(['svc-web', 'svc-web', 'svc-web', 'g.dang', 'h.bui']);
    add(when(), { sourcetype: 'oracle:audit', host: 'DB01', src_ip: u === 'svc-web' ? WEB01 : WS[u].ip,
      user: u, action: 'select', status: 'success', detail: `obj=${pick(TABLES)} rows=${int(1, 140)}` });
  }

  /* Web — WEB01 */
  const PATHS = ['/', '/products', '/cart', '/api/v1/items', '/login', '/static/app.js', '/about'];
  for (let i = 0; i < 130; i++) {
    const r = rand();
    add(when(), { sourcetype: 'access_combined', host: 'WEB01', src_ip: '192.0.2.' + int(1, 200),
      user: '-', action: rand() < 0.1 ? 'POST' : 'GET',
      status: r < 0.72 ? '200' : r < 0.86 ? '304' : r < 0.98 ? '404' : '500',
      detail: pick(PATHS) });
  }

  /* Firewall — FW01 */
  const flow = (sec, src, dst, port, action, bytes) => add(sec, { sourcetype: 'fw:traffic',
    host: 'FW01', src_ip: src, dest_ip: dst, dest_port: port, action, bytes,
    detail: `dest=${dst}:${port} bytes=${bytes}` });
  for (let i = 0; i < 90; i++) {
    const src = rand() < 0.2 ? FS01 : WS[pick(HUMANS)].ip;
    flow(when(), src, '192.0.2.' + int(1, 200), pick([443, 443, 443, 80, 53]),
      rand() < 0.9 ? 'allow' : 'deny', int(300, 900000));
  }
  flow(at(0, 31, 40), FS01, '192.0.2.50', 443, 'allow', 31588352);   // the real backup push

  /* ── The intrusion ───────────────────────────────────────────────────── */
  [['/admin', '404'], ['/wp-login.php', '404'], ['/.env', '404'], ['/backup.zip', '404'],
    ['/login', '200'], ['/login', '200']].forEach(([p, s], i) => add(at(2, 2 + i, 11 + i * 7), {
    sourcetype: 'access_combined', host: 'WEB01', src_ip: ATTACKER, user: '-', action: 'GET', status: s, detail: p }));

  /* Password spray: every human account once, then six of them a second time. */
  const sprayOrder = HUMANS.concat(HUMANS.slice(0, 6));
  sprayOrder.forEach((u, i) => add(at(2, 14) + i * 55 + int(0, 20), {
    sourcetype: 'WinEventLog:Security', host: 'DC01', src_ip: ATTACKER, user: u, action: 'failure',
    status: '0xC000006D', detail: 'EventCode=4625 LogonType=3' }));
  add(at(2, 30, 18), { sourcetype: 'WinEventLog:Security', host: 'DC01', src_ip: ATTACKER,
    user: 'svc-backup', action: 'failure', status: '0xC000006D', detail: 'EventCode=4625 LogonType=3' });
  add(at(2, 33, 41), { sourcetype: 'WinEventLog:Security', host: 'DC01', src_ip: ATTACKER,
    user: 'svc-backup', action: 'success', status: '0x0', detail: 'EventCode=4624 LogonType=3' });

  /* What the account did next */
  add(at(2, 36, 12), { sourcetype: 'sysmon', host: 'FS01', src_ip: FS01, user: 'svc-backup',
    action: 'process_create',
    detail: 'Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe args=-nop -w hidden -enc JABz...[truncated] parent=cmd.exe' });
  add(at(2, 38, 55), { sourcetype: 'sysmon', host: 'FS01', src_ip: FS01, user: 'svc-backup',
    action: 'process_create', detail: 'Image=C:\\Windows\\System32\\net.exe args=group "Domain Admins" /domain parent=powershell.exe' });
  add(at(2, 41, 7), { sourcetype: 'oracle:audit', host: 'DB01', src_ip: FS01, user: 'svc-backup',
    action: 'select', status: 'success', detail: 'obj=HR.SALARIES rows=48210' });
  flow(at(2, 44, 30), FS01, EXFIL, 443, 'allow', 51380224);

  EVENTS.sort((a, b) => a._ts - b._ts);
  EVENTS.forEach((e) => { e._raw = Object.keys(e).filter((k) => k !== '_ts' && k !== '_raw')
    .map((k) => String(e[k])).join(' '); });

  const DEFAULT_COLS = ['_time', 'sourcetype', 'host', 'src_ip', 'user', 'action', 'detail'];
  const SIDE_FIELDS = ['sourcetype', 'host', 'src_ip', 'user', 'action'];

  /* ═════════════════════════════════════════════════════════════════════════
     2 · Query language
     ═════════════════════════════════════════════════════════════════════════ */
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const unq = (s) => (s.length > 1 && s[0] === '"' && s[s.length - 1] === '"' ? s.slice(1, -1) : s);

  /* Split on `sep`, ignoring it inside quotes and parentheses. */
  function splitTop(s, sep) {
    const out = [];
    let cur = '';
    let q = false;
    let depth = 0;
    for (const c of s) {
      if (c === '"') q = !q;
      else if (!q && c === '(') depth++;
      else if (!q && c === ')') depth--;
      if (!q && depth === 0 && c === sep) { out.push(cur); cur = ''; } else cur += c;
    }
    if (q) throw new Error(t('Unterminated quote'));
    out.push(cur);
    return out;
  }

  function tokenize(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '(' || c === ')') { out.push({ k: c }); i++; continue; }
      let j = i;
      let q = false;
      while (j < s.length) {
        const d = s[j];
        if (d === '"') q = !q;
        else if (!q && (/\s/.test(d) || d === '(' || d === ')')) break;
        j++;
      }
      if (q) throw new Error(t('Unterminated quote'));
      const w = s.slice(i, j);
      out.push(w === 'AND' || w === 'OR' || w === 'NOT' ? { k: w } : { k: 'w', v: w });
      i = j;
    }
    return out;
  }

  const wildRe = (pat, anchored) => new RegExp(
    (anchored ? '^' : '') + pat.split('*').map(escRe).join('.*') + (anchored ? '$' : ''), 'i');

  function compare(actual, op, want) {
    if (op === '=' || op === '!=') {
      const has = actual !== undefined && actual !== null;
      const hit = has && wildRe(want, true).test(String(actual));
      return op === '=' ? hit : !hit;
    }
    const a = Number(actual);
    const b = Number(want);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
  }

  function term(w) {
    const m = /^([A-Za-z_][\w.]*)(!=|>=|<=|=|>|<)(.*)$/.exec(w);
    if (m) {
      const [, f, op, v] = m;
      const want = unq(v);
      return (e) => compare(e[f], op, want);
    }
    const word = unq(w);
    if (word === '*') return () => true;
    const re = wildRe(word, false);
    return (e) => re.test(e._raw);
  }

  /* expr := or (AND? or)* ; or := not (OR not)* ; not := NOT not | atom */
  function compile(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    function atom() {
      const k = peek();
      if (!k) throw new Error(t('Unexpected end of search'));
      if (k.k === '(') {
        p++;
        const e = expr();
        if (!peek() || peek().k !== ')') throw new Error(t('Missing closing parenthesis'));
        p++;
        return e;
      }
      if (k.k === 'w') { p++; return term(k.v); }
      throw new Error(`${t('Unexpected')} ${k.k}`);
    }
    function not() {
      if (peek() && peek().k === 'NOT') { p++; const x = not(); return (e) => !x(e); }
      return atom();
    }
    function or() {
      let l = not();
      while (peek() && peek().k === 'OR') {
        p++;
        const r = not();
        const a = l;
        l = (e) => a(e) || r(e);
      }
      return l;
    }
    function expr() {
      let l = or();
      while (peek() && peek().k !== ')') {
        if (peek().k === 'AND') p++;
        const r = or();
        const a = l;
        l = (e) => a(e) && r(e);
      }
      return l;
    }
    const f = expr();
    if (p < toks.length) throw new Error(t('Unmatched closing parenthesis'));
    return f;
  }

  const blank = (v) => v === undefined || v === null || v === '';
  function cmpVals(a, b) {
    if (!blank(a) && !blank(b)) {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    }
    return String(blank(a) ? '' : a).localeCompare(String(blank(b) ? '' : b), 'en', { numeric: true });
  }
  const words = (s) => s.split(/[\s,]+/).filter(Boolean);
  const CMDS = 'stats, sort, head, tail, table, top, dedup, where';

  function parseAgg(src) {
    const m = /^(count|dc|sum|avg|min|max|values|earliest|latest)(?:\(([^)]*)\))?(?:\s+as\s+([\w.]+))?$/i.exec(src.trim());
    if (!m) throw new Error(`${t('Cannot read this aggregate:')} ${src.trim()}`);
    const fn = m[1].toLowerCase();
    const field = (m[2] || '').trim();
    if (fn !== 'count' && !field) throw new Error(`${fn}() ${t('needs a field')}`);
    return { fn, field, name: m[3] || (field ? `${fn}(${field})` : fn) };
  }

  function cmdStats(arg, st) {
    const parts = arg.split(/\s+by\s+/i);
    if (parts.length > 2) throw new Error(t('stats: only one "by" clause'));
    const by = parts[1] ? words(parts[1]) : [];
    const aggs = (parts[0].trim() ? splitTop(parts[0], ',') : ['count']).map(parseAgg);
    const groups = new Map();
    for (const row of st.rows) {
      if (by.some((f) => row[f] === undefined)) continue;
      const key = by.map((f) => String(row[f])).join('\u0001');
      let g = groups.get(key);
      if (!g) {
        g = { keys: by.map((f) => row[f]), n: 0, acc: aggs.map(() => ({ set: new Set(), sum: 0, c: 0, lo: undefined, hi: undefined })) };
        groups.set(key, g);
      }
      g.n++;
      aggs.forEach((a, i) => {
        const v = a.field ? row[a.field] : undefined;
        if (a.field && v === undefined) return;
        const x = g.acc[i];
        x.c++;
        if (a.fn === 'dc' || a.fn === 'values') x.set.add(String(v));
        if (a.fn === 'sum' || a.fn === 'avg') x.sum += Number(v) || 0;
        if (x.lo === undefined || cmpVals(v, x.lo) < 0) x.lo = v;
        if (x.hi === undefined || cmpVals(v, x.hi) > 0) x.hi = v;
      });
    }
    const rows = [...groups.values()].map((g) => {
      const o = {};
      by.forEach((f, i) => { o[f] = g.keys[i]; });
      aggs.forEach((a, i) => {
        const x = g.acc[i];
        o[a.name] = a.fn === 'count' ? (a.field ? x.c : g.n)
          : a.fn === 'dc' ? x.set.size
            : a.fn === 'sum' ? x.sum
              : a.fn === 'avg' ? (x.c ? Math.round((x.sum / x.c) * 100) / 100 : '')
                : a.fn === 'min' || a.fn === 'earliest' ? x.lo
                  : a.fn === 'max' || a.fn === 'latest' ? x.hi
                    : [...x.set].sort().slice(0, 6).join(', ') + (x.set.size > 6 ? ', …' : '');
      });
      return o;
    });
    rows.sort((a, b) => { for (const f of by) { const c = cmpVals(a[f], b[f]); if (c) return c; } return 0; });
    return { kind: 'table', cols: by.concat(aggs.map((a) => a.name)), rows };
  }

  function cmdWhere(arg, st) {
    const m = /^\s*([\w.()]+)\s*(!=|>=|<=|=|>|<)\s*(.+?)\s*$/.exec(arg);
    if (!m) throw new Error(t('where: write it like  count>5  or  user="svc-backup"'));
    const [, f, op, v] = m;
    const want = unq(v);
    return { ...st, rows: st.rows.filter((r) => compare(r[f], op, want)) };
  }

  const COMMANDS = {
    stats: cmdStats,
    where: cmdWhere,
    sort(arg, st) {
      const keys = words(arg).map((w) => (w[0] === '-' ? [w.slice(1), -1] : w[0] === '+' ? [w.slice(1), 1] : [w, 1]))
        .filter(([f]) => f);
      if (!keys.length) throw new Error(t('sort: name a field, e.g.  sort -count'));
      const rows = st.rows.slice().sort((a, b) => {
        for (const [f, d] of keys) { const c = cmpVals(a[f], b[f]); if (c) return c * d; }
        return 0;
      });
      return { ...st, rows };
    },
    head(arg, st) { const n = arg.trim() ? Number(arg) : 10; return { ...st, rows: st.rows.slice(0, Math.max(0, n || 0)) }; },
    tail(arg, st) { const n = arg.trim() ? Number(arg) : 10; return { ...st, rows: st.rows.slice(-Math.max(1, n || 1)) }; },
    table(arg, st) {
      const cols = words(arg);
      if (!cols.length) throw new Error(t('table: list the fields to show'));
      return { ...st, cols };
    },
    dedup(arg, st) {
      const f = words(arg);
      if (!f.length) throw new Error(t('dedup: name a field'));
      const seen = new Set();
      return { ...st, rows: st.rows.filter((r) => {
        const k = f.map((x) => String(r[x])).join('\u0001');
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }) };
    },
    top(arg, st) {
      const w = words(arg);
      const n = /^\d+$/.test(w[0] || '') ? Number(w.shift()) : 10;
      const f = w[0];
      if (!f) throw new Error(t('top: name a field'));
      const counts = new Map();
      let total = 0;
      for (const r of st.rows) {
        if (r[f] === undefined) continue;
        counts.set(String(r[f]), (counts.get(String(r[f])) || 0) + 1);
        total++;
      }
      const rows = [...counts].sort((a, b) => b[1] - a[1]).slice(0, n)
        .map(([v, c]) => ({ [f]: v, count: c, percent: total ? Math.round((c / total) * 1000) / 10 : 0 }));
      return { kind: 'table', cols: [f, 'count', 'percent'], rows };
    },
  };

  function execute(q) {
    const parts = splitTop(q, '|').map((s) => s.trim());
    const base = parts[0].replace(/^search\s+/i, '') || '*';
    const matched = EVENTS.filter(compile(base));
    let st = { kind: 'events', cols: DEFAULT_COLS.slice(), rows: matched };
    for (const seg of parts.slice(1)) {
      const m = /^(\w+)\s*([\s\S]*)$/.exec(seg);
      if (!m) throw new Error(t('Empty command after a pipe'));
      const fn = COMMANDS[m[1].toLowerCase()];
      if (!fn) throw new Error(`${t('Unknown command')} "${m[1]}". ${t('Try:')} ${CMDS}`);
      st = fn(m[2], st);
    }
    return { base, matched, st };
  }

  /* ═════════════════════════════════════════════════════════════════════════
     3 · Rendering
     ═════════════════════════════════════════════════════════════════════════ */
  const input = $('#labQ');
  const stat = $('#labStat');
  const MAX_ROWS = 200;
  const history = [];
  let hIdx = 0;
  let last = null;

  function renderTable(st) {
    const host = $('#labTable');
    host.replaceChildren();
    if (!st.rows.length) {
      host.append(el('p', 'lab__empty', t('No results. Loosen the search, or try a mission step.')));
      return;
    }
    const table = el('table', 'lab__tbl');
    const head = el('tr');
    st.cols.forEach((c) => head.append(el('th', null, c)));
    const thead = el('thead');
    thead.append(head);
    table.append(thead);
    const body = el('tbody');
    st.rows.slice(0, MAX_ROWS).forEach((r) => {
      const tr = el('tr');
      st.cols.forEach((c) => {
        const v = r[c] === undefined ? '' : String(r[c]);
        const td = el('td', c === 'detail' ? 'lab__detail' : null, v);
        if (c === 'detail') td.title = v;
        if (c === 'action' && (v === 'failure' || v === 'deny')) td.classList.add('lab__v--bad');
        if (c === 'action' && (v === 'success' || v === 'allow')) td.classList.add('lab__v--ok');
        tr.append(td);
      });
      body.append(tr);
    });
    table.append(body);
    host.append(table);
    if (st.rows.length > MAX_ROWS) {
      host.append(el('p', 'lab__empty', `${t('Showing the first')} ${MAX_ROWS} ${t('of')} ${st.rows.length}. ${t('Narrow the search to see the rest.')}`));
    }
  }

  function renderFields(matched) {
    const host = $('#labFields');
    host.replaceChildren();
    SIDE_FIELDS.forEach((f) => {
      const counts = new Map();
      matched.forEach((e) => { if (e[f] !== undefined) counts.set(e[f], (counts.get(e[f]) || 0) + 1); });
      if (!counts.size) return;
      const box = el('div', 'lab__f');
      const h = el('h5', 'lab__fh', f);
      h.append(el('span', null, String(counts.size)));
      box.append(h);
      const ul = el('ul', 'lab__fl');
      [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([v, c]) => {
        const li = el('li');
        const b = el('button', 'lab__fv');
        b.type = 'button';
        b.dataset.f = f;
        b.dataset.v = v;
        b.title = `${f}=${v}`;
        b.append(el('span', null, v), el('b', null, String(c)));
        li.append(b);
        ul.append(li);
      });
      box.append(ul);
      host.append(box);
    });
  }

  function renderHist(matched) {
    const host = $('#labHist');
    host.replaceChildren();
    const per = new Array(24).fill(0);
    matched.forEach((e) => { per[(e._ts / 3600) | 0]++; });
    const max = Math.max(1, ...per);
    const W = 480;
    const H = 64;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': t('Events per hour') });
    per.forEach((n, h) => {
      const bh = n ? Math.max(2, Math.round((n / max) * H)) : 0;
      const r = svgEl('rect', { class: 'lab__b', x: h * 20 + 2, y: H - bh, width: 16, height: bh, rx: 2 });
      r.append(svgEl('title', {}));
      r.firstChild.textContent = `${pad(h)}:00 — ${n}`;
      svg.append(r);
    });
    host.append(svg);
    const axis = el('div', 'lab__axisrow');
    [0, 6, 12, 18, 24].forEach((h) => axis.append(el('span', null, pad(h) + ':00')));
    host.append(axis);
  }

  function setStat(msg, bad) {
    stat.textContent = msg;
    stat.classList.toggle('is-err', !!bad);
  }

  function run(q, remember) {
    if (remember && q.trim()) {
      if (history[history.length - 1] !== q) history.push(q);
      hIdx = history.length;
    }
    try {
      const t0 = performance.now();
      const res = execute(q);
      const ms = Math.max(1, Math.round(performance.now() - t0));
      last = { q, res, ms };
      renderTable(res.st);
      renderFields(res.matched);
      renderHist(res.matched);
      const extra = res.st.kind === 'table' ? ` · ${res.st.rows.length} ${t('results')}` : '';
      setStat(`${res.matched.length} ${t('events matched of')} ${EVENTS.length}${extra} · ${ms} ms`, false);
    } catch (err) {
      setStat(`${t('Error')}: ${err.message}`, true);
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     4 · Wiring
     ═════════════════════════════════════════════════════════════════════════ */
  $('#labForm').addEventListener('submit', (e) => { e.preventDefault(); run(input.value, true); });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      hIdx = Math.max(0, hIdx - 1);
      input.value = history[hIdx];
    } else if (e.key === 'ArrowDown' && history.length) {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] ?? '';
    }
  });

  root.addEventListener('click', (e) => {
    const step = e.target.closest('.lab__step');
    if (step) {
      input.value = step.dataset.q;
      step.classList.add('is-done');
      run(step.dataset.q, true);
      return;
    }
    const fv = e.target.closest('.lab__fv');
    if (fv) {
      const { f, v } = fv.dataset;
      const val = /[\s"()|=<>!]/.test(v) ? `"${v}"` : v;
      const parts = splitTop(input.value, '|');
      const base = parts[0].replace(/^\s*search\s+/i, '').trim();
      parts[0] = `${base && base !== '*' ? base + ' ' : ''}${f}=${val} `;
      input.value = parts.map((s) => s.trim()).join(' | ');
      run(input.value, true);
    }
  });

  /* Pick the story back up in the other language: the numbers don't change,
     only the sentence around them. */
  document.addEventListener('langchange', () => { if (last) run(last.q, false); });

  input.value = '* | tail 12';
  run(input.value, false);
})();
