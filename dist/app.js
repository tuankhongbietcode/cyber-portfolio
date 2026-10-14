/* ═══════════════════════════════════════════════════════════════════════════
   Võ Lê Anh Tuấn — portfolio shell
   A real (virtual) filesystem, tab completion, history, and a fullscreen mode.
   No dependencies. No build step.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ═══════════════════════════════════════════════════════════════════════
     1 · Theme
     ═══════════════════════════════════════════════════════════════════════ */
  const THEME_BG = { dark: '#0a0b0c', light: '#fbfbfa' };

  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;
    $$('meta[name="theme-color"]').forEach((m) => { m.content = THEME_BG[mode]; });
    try { localStorage.setItem('vlat273.theme', mode); } catch { /* private mode */ }
    /* anything that paints itself from the theme listens for this */
    document.dispatchEvent(new CustomEvent('themechange', { detail: mode }));
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('vlat273.theme'); } catch { /* ignore */ }
    const preferred = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    applyTheme(saved === 'light' || saved === 'dark' ? saved : preferred);
  })();

  const themeToggle = $('#themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  /* Platform-aware modifier key label */
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const modKey = $('.kbd-hint__key[data-key="mod"]');
  if (modKey) modKey.textContent = isMac ? '⌘' : 'Ctrl';

  /* ═══════════════════════════════════════════════════════════════════════
     2 · Page chrome — progress, sticky bar, reveals, active nav
     ═══════════════════════════════════════════════════════════════════════ */
  const bar = $('#progressBar');
  const topbar = $('.topbar');
  let ticking = false;

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    if (topbar) topbar.classList.toggle('is-stuck', scrollY > 8);
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* Reveal on scroll.
     threshold is 0, not a fraction: with a fraction, an element has to be that
     proportion visible before it fires, so the last short line in a section can
     land just inside the rootMargin and never reveal at all — which is exactly
     what happened to the closing line when the page was deep-linked to
     #contact and the reader stopped there. The -8% bottom margin already holds
     the reveal back until the element is properly on screen, so the threshold
     was only ever costing us the boundary case. */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced()) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }
  /* app.js is alive, so the no-JS failsafe is no longer needed */
  clearTimeout(window.__revealFailsafe);

  /* Active nav link */
  const navLinks = $$('.nav a');
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const navIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navIo.observe(s));
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3 · Virtual filesystem
     ═══════════════════════════════════════════════════════════════════════ */
  const dir = (children) => ({ type: 'dir', children });
  const file = (lines) => ({ type: 'file', lines: Array.isArray(lines) ? lines : [lines] });

  const FS = dir({
    'about.txt': file([
      'Võ Lê Anh Tuấn  ·  also written Anh Tuan Vo',
      'Cybersecurity student  ·  IT intern',
      '',
      'EDUCATION',
      '  Bachelor of Computer Science — Cyber Security',
      '  Swinburne University of Technology  ·  2023–2027',
      '  Best in Performance Award — TNE20002 Network Routing Principles',
      '',
      'CURRENT',
      '  Information Technology Intern @ Got It',
      '  Ho Chi Minh City, Vietnam',
      '',
      'HOW I GOT HERE',
      '  I came up through the infrastructure side — VLANs, firewalls,',
      '  virtual labs — then moved into Splunk and log pipelines, and from',
      '  there toward offensive security. Reading an attack path from both',
      '  sides is the entire point.',
      '',
      '  No certification is claimed here that I do not hold.',
    ]),

    'experience.log': file([
      '2026.09 — now      Got It    Information Technology Intern',
      '                             Microsoft 365 tenant, live users, no sandbox.',
      '                             Account lifecycle, endpoint support, ticket',
      '                             triage. Production — no rollback button.',
      '  takeaway                   The fastest way to understand an organisation is',
      '                             to sit where its users hit friction.',
      '',
      '2026.05 — 2026.08  VNCS      Security Consultant Intern',
      '                             Distributed Splunk Enterprise — Deployment',
      '                             Server pushing config to universal forwarders.',
      '                             Onboarded Windows Event, Sysmon, Linux, web app',
      '                             and firewall logs. Field extraction, time',
      '                             normalisation, dashboards, alerting, POC docs.',
      '  takeaway                   Ingestion is the easy half. A log nobody',
      '                             validated will lie to you during an incident.',
      '',
      '2025.11 — 2026.04  VNPRO     Network Administrator Intern',
      '                             Multi-VLAN production segments and the lab',
      '                             behind them. Cisco routing and switching,',
      '                             firewall and VPN config, VMware ESXi hosts,',
      '                             EVE-NG topologies, runbooks and backups.',
      '  takeaway                   Availability is a habit, not an event — a backup',
      '                             you never restored from is just optimism.',
      '',
      '2023 — 2027        Swinburne Bachelor of Computer Science — Cyber Security',
      '                             Best in Performance Award, TNE20002 Network',
      '                             Routing Principles. Networking first, then',
      '                             systems and security, offensive as the track.',
    ]),

    'skills.json': file([
      '{',
      '  "levels": {',
      '    "professional": "used in a paid role",',
      '    "lab": "used in practice, not yet in production",',
      '    "studying": "actively learning"',
      '  },',
      '',
      '  "offensive": {',
      '    "level": "lab",',
      '    "enumeration":       ["nmap", "ffuf", "netexec"],',
      '    "web testing":       ["burp suite", "ffuf"],',
      '    "active directory":  ["bloodhound", "netexec", "impacket", "kerbrute"],',
      '    "post-exploitation": ["impacket", "netexec", "bloodhound"],',
      '    "reporting":         ["markdown", "evidence discipline"]',
      '  },',
      '',
      '  "foundations": {',
      '    "level": "professional",',
      '    "networking":  ["cisco ios", "vlan", "firewall", "vpn"],',
      '    "siem":        ["splunk enterprise", "spl", "sysmon"],',
      '    "systems":     ["linux", "windows server", "vmware esxi", "eve-ng"],',
      '    "identity":    ["microsoft 365", "endpoint support"],',
      '    "scripting":   ["bash", "powershell", "python"],',
      '    "practice":    ["documentation", "backups", "troubleshooting"]',
      '  },',
      '',
      '  "track": [',
      '    { "name": "CPTS", "by": "offsec", "status": "in progress" }',
      '  ],',
      '',
      '  "studying": [',
      '    "active directory attack paths",',
      '    "web application security",',
      '    "detection engineering"',
      '  ],',
      '',
      '  "note": "tools are secondary — thinking is the skill"',
      '}',
    ]),

    'contact.txt': file([
      'email      anhtuanpm3939@gmail.com',
      'linkedin   linkedin.com/in/vlat273',
      'base       Ho Chi Minh City, Vietnam',
      'status     open to internship and junior security roles',
    ]),

    projects: dir({
      'splunk-lab.md': file([
        '# Distributed Splunk & multi-source log onboarding',
        '',
        'Stood up Splunk Enterprise as a distributed deployment — a Deployment',
        'Server pushing config to universal forwarders across mixed hosts — then',
        'brought several log families into one searchable surface: Windows Event',
        'Log, Sysmon, Linux syslog, web application logs and firewall feeds.',
        '',
        'The work that mattered was after ingestion: confirming events actually',
        'arrived, fixing field extraction where sourcetypes mis-parsed, normalising',
        'time, and turning the result into dashboards and alerts someone would act on.',
        '',
        'FLOW     collect → parse → normalise → validate',
        'STACK    Splunk Enterprise, Deployment Server, Universal Forwarders, SPL',
        'OUTPUT   dashboards, reports, alerts, POC documentation',
        'STATUS   verified professional record',
      ]),
      'virtual-lab.md': file([
        '# Virtual lab infrastructure operations',
        '',
        'Kept the training labs alive: VMware ESXi hosts and EVE-NG/UnetLab',
        'topologies that students and engineers depended on for routing, switching,',
        'firewall, VPN and wireless exercises.',
        '',
        'Provisioning was the easy half. The real work was monitoring, restoring',
        'from backup when a topology got wrecked mid-session, and writing the',
        'documentation that let someone else rebuild it without me.',
        '',
        'FLOW     provision → monitor → restore → document',
        'PLATFORM VMware ESXi, EVE-NG / UnetLab',
        'SCOPE    routing, switching, firewall, VPN, wireless, Cisco ISE',
        'STATUS   verified professional record',
      ]),
      'this-site.md': file([
        '# This site — a terminal you can actually use',
        '',
        'The page you are reading is itself the case study. No framework, no build',
        'step: plain HTML, one stylesheet, hand-written JavaScript. Nothing sits',
        'between you and the source.',
        '',
        'The shell in the hero is real. Virtual filesystem with ls, cd, cat and',
        'tree; fish-style ghost completion on Tab; command history; fullscreen on',
        'Ctrl+K. The portrait above the fold is 2,473 individual glyphs on a canvas',
        '— hover it and they are pushed aside and spring back to their exact home',
        'position.',
        '',
        'The portrait is built the way a halftone is: the artwork is decomposed',
        'into a grid of cells, each cell gets one glyph chosen by how much ink it',
        'covers, and the ink colour stays constant — so all the tone comes from',
        'density. A single-ink density field reads as text; a per-cell colour',
        'palette reads as a washed-out photo. Getting that wrong was the whole',
        'difference.',
        '',
        'FLOW     decompose → map → render → animate',
        'STACK    vanilla HTML, CSS, JavaScript — no framework, no bundler',
        'ENGINE   Canvas 2D glyph field, positional particle model',
        'DETAIL   JSON-LD, OG/Twitter cards, manifest, subset fonts, no-JS fallback',
        'VERIFY   view source — every line of it is right there',
      ]),
      'cpts-casefiles.md': file([
        '# Offensive security case files',
        '',
        'Where the CPTS work will live. Nothing goes up here that I cannot',
        'reproduce from an authorised lab with the evidence to back it —',
        'enumeration, foothold, privilege escalation, pivoting, and the report',
        'that ties it together.',
        '',
        'Every write-up gets sanitised first: no flags, no credentials, no client',
        'data. The point is methodology and remediation, not a scoreboard.',
        '',
        'FLOW     enumerate → foothold → escalate → report',
        'TRACK    CPTS — Certified Penetration Testing Specialist',
        'RULE     authorised labs only, sanitised before publishing',
        'STATUS   building — first case files land as labs complete',
      ]),
    }),

    '.secrets': dir({
      'flag.txt': file([
        'permission denied',
        '',
        'flags, credentials and client data are sanitised before anything',
        'gets published here. that is the whole rule.',
      ]),
    }),
  });

  const splitPath = (p) => p.split('/').filter((s) => s && s !== '.');

  function resolve(input) {
    const raw = String(input ?? '').trim();
    const absolute = raw.startsWith('~') || raw.startsWith('/');
    let segs = absolute ? splitPath(raw.replace(/^~/, '')) : state.cwd.slice();

    for (const part of splitPath(raw)) {
      if (part === '..') segs.pop();
      else segs.push(part);
    }

    let node = FS;
    for (const seg of segs) {
      if (node.type !== 'dir' || !node.children[seg]) {
        return { ok: false, missing: seg, path: segs };
      }
      node = node.children[seg];
    }
    return { ok: true, node, path: segs };
  }

  const isHidden = (name) => name.startsWith('.');
  const prettyPath = (segs) => (segs.length ? '~/' + segs.join('/') : '~');
  const sortedNames = (node, showHidden) =>
    Object.keys(node.children)
      .filter((n) => showHidden || !isHidden(n))
      .sort((a, b) => {
        const da = node.children[a].type === 'dir';
        const db = node.children[b].type === 'dir';
        return da === db ? a.localeCompare(b) : (da ? -1 : 1);
      });

  /* ═══════════════════════════════════════════════════════════════════════
     4 · Terminal
     ═══════════════════════════════════════════════════════════════════════ */
  const term = $('#term');
  const termOut = $('#termOut');
  const termBody = $('#termBody');
  const termForm = $('#termForm');
  const termInput = $('#termInput');
  const termSizer = $('#termSizer');
  const termGhost = $('#termGhost');
  const termPs1 = $('#termPs1');
  const termExpand = $('#termExpand');
  const termActText = $('.term__actText');

  if (!term || !termOut || !termInput) return; // page still works without the shell

  const MAX_LINES = 320;
  const state = { cwd: [], history: [], hi: -1, draft: '', intro: false };

  /* ── Output helpers ──────────────────────────────────────────────────── */
  function push(entry) {
    // Rendered as a <div>, not a <p>: some entries carry block-level markup.
    const el = document.createElement('div');
    if (entry === '' || entry == null) {
      el.className = 'gap';
    } else if (typeof entry === 'string') {
      el.textContent = entry;
    } else if (entry.html) {
      el.innerHTML = entry.html;
    } else {
      if (entry.cls) el.className = entry.cls;
      el.textContent = entry.text;
    }
    termOut.appendChild(el);
  }

  function print(entries) {
    (Array.isArray(entries) ? entries : [entries]).forEach(push);
    while (termOut.childElementCount > MAX_LINES) termOut.removeChild(termOut.firstElementChild);
    termOut.scrollTop = termOut.scrollHeight;
  }

  const echo = (cmd) =>
    print([{ html: `<span class="t-prompt">${esc(prompt())}</span> <span class="t-cmd">${esc(cmd)}</span>` }]);

  const prompt = () => `guest@vlat273:${prettyPath(state.cwd)}$`;

  function syncPrompt() {
    const p = prompt();
    termPs1.textContent = p;
    const title = $('.term__title');
    if (title) title.textContent = `guest@vlat273: ${prettyPath(state.cwd)}`;
  }

  function ok(msg) { print([{ cls: 't-accent', text: msg }]); }
  function err(msg) { print([{ cls: 't-err', text: msg }]); }
  function note(msg) { print([{ cls: 't-dim', text: msg }]); }

  /* ── Content blocks ──────────────────────────────────────────────────── */
  /* Padding is computed, so the box-drawing frame always lines up. */
  function banner() {
    const W = 30;
    const rows = [
      ['VÕ LÊ ANH TUẤN', 't-head'],
      ['cybersecurity · HCMC', 't-dim'],
      ['type `help` to begin', 't-dim'],
    ];
    const out = [{ html: `<span class="t-accent">╭${'─'.repeat(W)}╮</span>` }];
    rows.forEach(([text, cls]) => {
      out.push({
        html: `<span class="t-accent">│</span><span class="${cls}">${esc((' ' + text).padEnd(W, ' '))}</span><span class="t-accent">│</span>`,
      });
    });
    out.push({ html: `<span class="t-accent">╰${'─'.repeat(W)}╯</span>` });
    out.push('');
    print(out);
  }

  const HELP = [
    ['help', 'this list'],
    ['ls', 'list directory'],
    ['cd', 'change directory'],
    ['cat', 'print a file'],
    ['tree', 'recursive listing'],
    ['pwd', 'working directory'],
    ['whoami', 'who is behind this'],
    ['avatar', 'the portrait up top'],
    ['neofetch', 'system summary'],
    ['open', 'open a file or section'],
    ['goto', 'jump to a section'],
    ['contact', 'how to reach me'],
    ['links', 'profiles elsewhere'],
    ['history', 'past commands'],
    ['theme', 'dark / light'],
    ['banner', 'print the banner'],
    ['clear', 'clear the screen'],
  ];

  const helpHtml = () => `<div class="help">${
    HELP.map(([c, d]) => `<div><code>${c}</code><span>${d}</span></div>`).join('')
  }</div>`;

  function showHelp(arg) {
    if (!arg) {
      print([
        { html: helpHtml() },
        '',
        { cls: 't-dim', text: 'files live under ~ — try  ls  then  cat about.txt' },
        { cls: 't-dim', text: 'tab completes · ↑ recalls · ctrl+k goes fullscreen' },
      ]);
      return;
    }
    const hit = HELP.find(([c]) => c === arg);
    if (!hit) { err(`help: no entry for '${arg}'`); return; }
    print([
      { html: `<span class="t-accent">${esc(hit[0])}</span>  <span class="t-dim">— ${esc(hit[1])}</span>` },
    ]);
  }

  /* The logo box is generated from a width instead of hand-counted. `&gt;` is
     one cell on screen but four characters in source, which is exactly how
     the prompt row used to come out one cell short and shear the frame. */
  const LOGO_W = 16;
  const logoRow = (inner) => `   │ ${inner.padEnd(LOGO_W - 1)}│`;

  const NEOFETCH = {
    logo: [
      `   ╭${'─'.repeat(LOGO_W)}╮`,
      logoRow('●  ●  ●'),
      logoRow(''),
      logoRow('  >_'),
      logoRow(''),
      `   ╰${'─'.repeat(LOGO_W)}╯`,
    ],
    rows: [
      ['guest@vlat273', ''],
      ['─────────────', ''],
      ['OS', 'BCS Cyber Security'],
      ['School', 'Swinburne University'],
      ['Base', 'Ho Chi Minh City'],
      ['Focus', 'Offensive security'],
      ['Track', 'CPTS / OffSec'],
      ['Status', 'open to internship'],
    ],
  };

  function neofetch() {
    const rows = NEOFETCH.rows.map(([k, v]) => (
      `<p><span class="t-key">${k}</span>${v ? `<span class="t-dim">${v}</span>` : ''}</p>`
    )).join('');
    const logo = NEOFETCH.logo.map(esc).join('\n');
    print([
      { html: `<div class="nf"><pre class="nf__logo" aria-hidden="true">${logo}</pre><div class="nf__rows">${rows}</div></div>` },
      '',
      { html: '<span class="t-dim">tip: </span><span class="t-accent">avatar</span><span class="t-dim"> · </span><span class="t-accent">cat about.txt</span><span class="t-dim"> · </span><span class="t-accent">ls projects</span><span class="t-dim"> · </span><span class="t-accent">open work</span>' },
    ]);
  }

  /* ── The portrait ────────────────────────────────────────────────────── */
  /* The portrait in the masthead is a live glyph cloud (see portrait.js).
     Printing a second, static copy of it down here would only ever be the
     worse version, so this just points at the real one. */
  function cmdAvatar() {
    print([
      { html: '<span class="t-dim">→ </span><span class="t-head">Võ Lê Anh Tuấn</span><span class="t-dim"> · cybersecurity · Ho Chi Minh City</span>' },
      '',
      { html: '<span class="t-dim">the portrait up top is a cloud of glyphs. hover it, or tap it, to push them around.</span>' },
    ]);
    document.dispatchEvent(new CustomEvent('portrait:reveal'));
  }

  /* ── Sections the shell can jump to ──────────────────────────────────── */
  const SECTION_IDS = ['top', 'terminal', 'experience', 'work', 'toolkit', 'contact'];

  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) { err(`goto: no section named '${id}'`); return false; }
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    note(`→ ${id}`);
    return true;
  }

  const OPENABLE = {
    work: () => jumpTo('work'),
    experience: () => jumpTo('experience'),
    toolkit: () => jumpTo('toolkit'),
    contact: () => jumpTo('contact'),
    about: () => { print([{ html: '<span class="t-dim">cat about.txt</span>' }]); return cmdCat(['about.txt']); },
  };

  function openTarget(arg) {
    if (!arg) {
      print([
        { cls: 't-dim', text: 'open what? case files:' },
        { html: '<span class="t-accent">open projects/splunk-lab.md</span>' },
        { html: '<span class="t-accent">open projects/virtual-lab.md</span>' },
        { html: '<span class="t-accent">open projects/this-site.md</span>' },
        { html: '<span class="t-accent">open projects/cpts-casefiles.md</span>' },
        { cls: 't-dim', text: 'or jump: open work · experience · toolkit · contact' },
      ]);
      return;
    }
    if (OPENABLE[arg]) { OPENABLE[arg](); return; }

    const res = resolve(arg);
    if (res.ok && res.node.type === 'file') { cmdCat([arg]); return; }

    const idx = Number(arg);
    if (Number.isInteger(idx) && idx >= 1 && idx <= 4) {
      const card = $$('.case')[idx - 1];
      if (card) {
        card.open = true;
        card.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
        note(`→ case ${String(idx).padStart(3, '0')}`);
      }
      return;
    }
    err(`open: nothing called '${arg}'`);
  }

  /* ── Commands ────────────────────────────────────────────────────────── */
  function cmdLs(args) {
    const flags = args.filter((a) => a.startsWith('-'));
    const showHidden = flags.some((f) => f.includes('a'));
    const target = args.filter((a) => !a.startsWith('-'))[0] ?? '';
    const res = resolve(target);
    if (!res.ok) { err(`ls: cannot access '${target}': no such file or directory`); return; }
    if (res.node.type === 'file') { print([res.path[res.path.length - 1]]); return; }

    const names = sortedNames(res.node, showHidden);
    if (!names.length) { note('(empty)'); return; }

    print([{
      html: `<div class="ls">${names.map((n) => {
        const d = res.node.children[n].type === 'dir';
        return `<span class="${d ? 'ls__d' : 'ls__f'}${isHidden(n) ? ' ls__h' : ''}">${esc(n)}${d ? '/' : ''}</span>`;
      }).join('')}</div>`,
    }]);
  }

  function cmdCd(args) {
    const target = args[0] ?? '~';
    const res = resolve(target);
    if (!res.ok) { err(`cd: no such file or directory: ${target}`); return; }
    if (res.node.type !== 'dir') { err(`cd: not a directory: ${target}`); return; }
    state.cwd = res.path;
    syncPrompt();
  }

  function cmdCat(args) {
    if (!args.length) { err('cat: missing file operand'); return; }
    const target = args[0];
    const res = resolve(target);
    if (!res.ok) { err(`cat: ${target}: no such file or directory`); return; }
    if (res.node.type === 'dir') { err(`cat: ${target}: is a directory`); return; }
    print(res.node.lines.map((l) => (l === '' ? '' : { text: l })));
  }

  function cmdTree(args) {
    const res = resolve(args[0] ?? '');
    if (!res.ok) { err(`tree: '${args[0]}': no such file or directory`); return; }
    const lines = [{ cls: 't-dim', text: prettyPath(res.path) }];
    let dirs = 0, files = 0;

    (function walk(node, prefix) {
      const names = sortedNames(node, false);
      names.forEach((name, i) => {
        const child = node.children[name];
        const last = i === names.length - 1;
        const branch = last ? '└── ' : '├── ';
        if (child.type === 'dir') {
          dirs++;
          lines.push({ cls: 't-accent', text: `${prefix}${branch}${name}/` });
          walk(child, prefix + (last ? '    ' : '│   '));
        } else {
          files++;
          lines.push({ text: `${prefix}${branch}${name}` });
        }
      });
    })(res.node, '');

    lines.push('');
    lines.push({ cls: 't-dim', text: `${dirs} directories, ${files} files` });
    print(lines);
  }

  function cmdWhoami() {
    print([
      { cls: 't-head', text: 'Võ Lê Anh Tuấn' },
      { cls: 't-dim', text: 'cybersecurity student · IT intern · Ho Chi Minh City' },
      '',
      { html: '<span class="t-dim">currently   </span>Information Technology Intern @ Got It' },
      { html: '<span class="t-dim">studying    </span>BCS Cyber Security, Swinburne (2023–2027)' },
      { html: '<span class="t-dim">direction   </span>offensive security · CPTS track' },
      { html: '<span class="t-dim">rule        </span>no claim I cannot back with evidence' },
    ]);
  }

  function cmdHistory() {
    if (!state.history.length) { note('no history yet'); return; }
    print(state.history.map((h, i) => ({ html: `<span class="t-dim">${String(i + 1).padStart(3, ' ')}</span>  ${esc(h)}` })));
  }

  function cmdContact() {
    print([
      { html: '<span class="t-dim">email     </span><a class="t-accent" href="mailto:anhtuanpm3939@gmail.com">anhtuanpm3939@gmail.com</a>' },
      { html: '<span class="t-dim">linkedin  </span><a class="t-accent" href="https://www.linkedin.com/in/vlat273/" target="_blank" rel="me noopener">linkedin.com/in/vlat273</a>' },
      { html: '<span class="t-dim">base      </span>Ho Chi Minh City, Vietnam' },
      { html: '<span class="t-dim">status    </span>open to internship and junior security roles' },
    ]);
  }

  function cmdTheme(args) {
    const want = args[0];
    if (want !== 'dark' && want !== 'light') {
      note(`theme is ${document.documentElement.dataset.theme} · usage: theme dark | theme light`);
      return;
    }
    applyTheme(want);
    ok(`theme → ${want}`);
  }

  function cmdClear() { termOut.replaceChildren(); }

  function cmdSudo() {
    print([
      { cls: 't-err', text: 'guest is not in the sudoers file.' },
      { cls: 't-dim', text: 'This incident has been logged. (It is a static site. Nothing was logged.)' },
    ]);
  }

  function cmdRm() {
    print([
      { cls: 't-warn', text: 'rm: destructive commands are not implemented here.' },
      { cls: 't-dim', text: 'The filesystem is read-only, and honestly that is the right default.' },
    ]);
  }

  function cmdExit() {
    print([
      { cls: 't-dim', text: 'there is no exit — only scrolling.' },
      { html: '<span class="t-dim">try </span><span class="t-accent">goto contact</span><span class="t-dim"> instead.</span>' },
    ]);
  }

  const COMMANDS = {
    help: (a) => showHelp(a[0]),
    ls: cmdLs,
    cd: cmdCd,
    cat: cmdCat,
    tree: cmdTree,
    pwd: () => print([prettyPath(state.cwd)]),
    whoami: cmdWhoami,
    avatar: cmdAvatar,
    neofetch,
    open: (a) => openTarget(a[0]),
    goto: (a) => { if (!a[0]) note(`sections: ${SECTION_IDS.join(' · ')}`); else jumpTo(a[0]); },
    contact: cmdContact,
    links: cmdContact,
    history: cmdHistory,
    theme: cmdTheme,
    banner: () => { banner(); },
    clear: cmdClear,
    /* easter eggs */
    sudo: cmdSudo,
    rm: cmdRm,
    exit: cmdExit,
    quit: cmdExit,
    coffee: () => print([{ cls: 't-warn', text: 'HTTP 418 — I am a teapot, not a barista.' }]),
    hack: () => print([{ cls: 't-dim', text: 'nice. now try the part that takes notes.' }]),
    flag: () => print([{ cls: 't-err', text: 'flags are sanitised before publishing. that is the rule.' }]),
  };

  const COMMAND_NAMES = Object.keys(COMMANDS).sort();

  /* ── Runner ──────────────────────────────────────────────────────────── */
  function run(raw) {
    const line = raw.trim();
    if (!line) return;

    echo(line);
    state.history.push(line);
    if (state.history.length > 100) state.history.shift();

    const parts = line.split(/\s+/);
    const name = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (Object.prototype.hasOwnProperty.call(COMMANDS, name)) {
      try {
        const result = COMMANDS[name](args);
        /* commands are free to return a promise; surface a rejection as an error */
        if (result && typeof result.then === 'function') {
          result.catch((e) => err(`error: ${e.message}`));
        }
      } catch (e) {
        err(`error: ${e.message}`);
      }
    } else {
      err(`command not found: ${name}`);
      note('type `help` for the list, or press tab to complete.');
    }
    termOut.scrollTop = termOut.scrollHeight;
  }

  /* ── Input sizing, ghost completion ──────────────────────────────────── */
  function resizeInput() {
    termSizer.textContent = termInput.value || '';
    termInput.style.width = Math.max(termSizer.getBoundingClientRect().width, 8) + 'px';
  }

  /**
   * Work out what the last token of `value` could complete to.
   * Returns { base, list, frag } — `base` is everything before the fragment
   * (including a trailing space), `list` the full candidate strings.
   */
  function computeCandidates(value) {
    const parts = value.split(' ');
    const prefix = parts.slice(0, -1).join(' ');
    const last = parts[parts.length - 1];
    const base = prefix ? prefix + ' ' : '';

    if (parts.length === 1) {
      const list = last ? COMMAND_NAMES.filter((c) => c.startsWith(last)) : COMMAND_NAMES.slice();
      return { base, list, frag: last };
    }

    const slash = last.lastIndexOf('/');
    const dirPart = slash >= 0 ? last.slice(0, slash + 1) : '';
    const frag = slash >= 0 ? last.slice(slash + 1) : last;

    const res = resolve(dirPart || '');
    if (!res.ok || res.node.type !== 'dir') return { base, list: [], frag };

    const list = sortedNames(res.node, false)
      .filter((n) => n.startsWith(frag))
      .map((n) => dirPart + n + (res.node.children[n].type === 'dir' ? '/' : ''));
    return { base, list, frag };
  }

  function renderGhost() {
    const value = termInput.value;
    const atEnd = termInput.selectionStart === value.length && termInput.selectionEnd === value.length;
    if (!value || !atEnd) { termGhost.textContent = ''; return; }

    const { list, frag } = computeCandidates(value);
    if (!list.length) { termGhost.textContent = ''; return; }

    const first = list[0];
    termGhost.textContent = first.startsWith(frag) ? first.slice(frag.length) : '';
  }

  /* Tab cycles through candidates; typing resets the cycle. */
  let tab = { active: false, base: '', list: [], index: 0 };

  function complete() {
    if (tab.active && tab.list.length) {
      tab.index = (tab.index + 1) % tab.list.length;
    } else {
      const { base, list } = computeCandidates(termInput.value);
      if (!list.length) return;
      tab = { active: true, base, list, index: 0 };
    }

    termInput.value = tab.base + tab.list[tab.index];
    resizeInput();
    renderGhost();

    if (tab.list.length > 1 && tab.index === 0) {
      print([{ cls: 't-dim', text: tab.list.slice(0, 12).join('   ') + (tab.list.length > 12 ? '   …' : '') }]);
    }
  }

  /* ── Fullscreen ──────────────────────────────────────────────────────── */
  function setFullscreen(on) {
    term.classList.toggle('term--full', on);
    document.body.classList.toggle('term-open', on);
    if (termExpand) termExpand.setAttribute('aria-pressed', String(on));
    if (termActText) termActText.textContent = on ? 'collapse' : 'expand';
  }
  const isFullscreen = () => term.classList.contains('term--full');

  if (termExpand) {
    termExpand.addEventListener('click', () => {
      setFullscreen(!isFullscreen());
      termInput.focus();
    });
  }

  function focusTerminal(expand) {
    if (expand) setFullscreen(true);
    termInput.focus({ preventScroll: true });
    termInput.setSelectionRange(termInput.value.length, termInput.value.length);
  }

  const openBtn = $('#openTerminal');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      term.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => focusTerminal(true), reduced() ? 0 : 340);
    });
  }

  const topBtn = $('#focusTerminalTop');
  if (topBtn) {
    topBtn.addEventListener('click', () => {
      term.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => focusTerminal(true), reduced() ? 0 : 340);
    });
  }

  /* ── Input events ────────────────────────────────────────────────────── */
  termInput.addEventListener('input', () => {
    state.intro = false;          // any typing cancels the intro animation
    tab.active = false;           // and restarts tab cycling
    resizeInput();
    renderGhost();
  });

  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      complete();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!state.history.length) return;
      if (state.hi === -1) { state.draft = termInput.value; state.hi = state.history.length; }
      state.hi = Math.max(0, state.hi - 1);
      termInput.value = state.history[state.hi];
      resizeInput(); renderGhost();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.hi === -1) return;
      state.hi++;
      if (state.hi >= state.history.length) {
        state.hi = -1;
        termInput.value = state.draft;
      } else {
        termInput.value = state.history[state.hi];
      }
      resizeInput(); renderGhost();
      return;
    }
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      print([{ html: `<span class="t-prompt">${esc(prompt())}</span> <span class="t-dim">${esc(termInput.value)}^C</span>` }]);
      termInput.value = '';
      resizeInput(); renderGhost();
      return;
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      cmdClear();
      return;
    }
    if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      termInput.value = '';
      resizeInput(); renderGhost();
      return;
    }
    if (e.key === 'Escape' && isFullscreen()) {
      e.preventDefault();
      setFullscreen(false);
      term.scrollIntoView({ behavior: 'auto', block: 'center' });
      return;
    }
    /* Ctrl/Cmd+K is deliberately NOT handled here — it bubbles to the global
       listener below. Handling it in both places toggled twice and cancelled out. */
  });

  termForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.intro = false;
    const value = termInput.value;
    termInput.value = '';
    state.hi = -1;
    state.draft = '';
    tab.active = false;
    resizeInput();
    renderGhost();
    run(value);
  });

  /* Click anywhere in the terminal body to focus the prompt */
  termBody.addEventListener('mousedown', (e) => {
    if (e.target.closest('a')) return;
    if (e.target === termInput) return;
    e.preventDefault();
    termInput.focus({ preventScroll: true });
    const len = termInput.value.length;
    termInput.setSelectionRange(len, len);
  });

  /* ── Global shortcuts ────────────────────────────────────────────────── */
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '')
      || document.activeElement?.isContentEditable;

    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setFullscreen(!isFullscreen());
      focusTerminal(isFullscreen());
      return;
    }
    if (e.key === 'Escape' && isFullscreen()) { setFullscreen(false); return; }
    if (e.key === '/' && !typing && !isFullscreen()) {
      e.preventDefault();
      focusTerminal(false);
    }
  });

  /* ── Intro ───────────────────────────────────────────────────────────── */
  async function intro() {
    syncPrompt();
    resizeInput();

    const live = termOut.getAttribute('aria-live');
    termOut.setAttribute('aria-live', 'off');   // don't narrate the animation
    state.intro = true;

    banner();
    print([{ html: '<span class="t-dim">[ session established ]</span> <span class="t-dim">·</span> <span class="t-accent">guest@vlat273</span>' }]);

    if (!reduced()) {
      await sleep(420);
      const cmd = 'neofetch';
      for (let i = 1; i <= cmd.length; i++) {
        if (!state.intro) break;
        termInput.value = cmd.slice(0, i);
        resizeInput();
        renderGhost();
        await sleep(62);
      }
      if (state.intro) {
        await sleep(240);
        termInput.value = '';
        resizeInput();
        renderGhost();
        run(cmd);
      }
    } else {
      run('neofetch');
    }

    state.intro = false;
    termOut.setAttribute('aria-live', live || 'polite');
  }

  intro();
})();
