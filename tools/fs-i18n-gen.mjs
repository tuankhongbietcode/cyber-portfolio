/* Vietnamese copy for the filesystem under ~ (app.js).
   The English keys are read straight out of app.js so a typo cannot silently
   create a dead entry: every line in FS_EN must appear here exactly once, and
   every entry here must correspond to a real line.

   Run: node tools/fs-i18n-gen.mjs            (writes dist/i18n.js)     */
import { readFileSync, writeFileSync } from 'node:fs';

const PAD = (n) => ' '.repeat(n);

/* Key: the line exactly as app.js spells it. Value: the Vietnamese copy.
   Indentation is deliberately NOT in the value — t() puts the source line's
   own leading whitespace back in front, so a padded value would double it. */
const MAP = [
  ['Võ Lê Anh Tuấn  ·  also written Anh Tuan Vo', 'Võ Lê Anh Tuấn  ·  cũng viết là Anh Tuan Vo'],
  ['Cybersecurity student  ·  system & security', 'Sinh viên an ninh mạng  ·  quản trị hệ thống & bảo mật'],
  ['EDUCATION', 'HỌC VẤN'],
  ['CURRENT', 'HIỆN TẠI'],
  ['HOW I GOT HERE', 'TÔI ĐẾN ĐÂY BẰNG CÁCH NÀO'],
  ['  I came up through the infrastructure side — VLANs, firewalls,', '  Tôi đi lên từ mảng hạ tầng — VLAN, firewall,'],
  ['  virtual labs — then moved into Splunk and log pipelines, and from', '  lab ảo — rồi chuyển sang Splunk và pipeline log, và từ'],
  ['  there toward offensive security. Reading an attack path from both', '  đó tiến tới an ninh mạng tấn công. Đọc đường tấn công từ cả'],
  ['  sides is the entire point.', '  hai phía là toàn bộ ý nghĩa.'],
  ['  No certification is claimed here that I do not hold.', '  Không chứng chỉ nào được tuyên bố ở đây mà tôi chưa có.'],

  ['2026.09 — now      Got It    Systems & Security Intern', '2026.09 — nay      Got It    Thực tập sinh Quản trị & Bảo mật'],
  [`${PAD(29)}Microsoft 365 tenant, live users, no sandbox.`, `${PAD(29)}Tenant Microsoft 365 · người dùng thật, không sandbox.`],
  [`${PAD(29)}Account lifecycle, endpoint support, ticket`, `${PAD(29)}Vòng đời tài khoản, hỗ trợ thiết bị đầu cuối,`],
  [`${PAD(29)}triage. Production — no rollback button.`, `${PAD(29)}phân loại ticket. Production — không có nút rollback.`],
  ['  takeaway                   The fastest way to understand an organisation is', '  bài học                  Cách nhanh nhất để hiểu một tổ chức là'],
  [`${PAD(29)}to sit where its users hit friction.`, `${PAD(29)}ngồi đúng chỗ người dùng của họ gặp vướng mắc.`],

  ['2026.05 — 2026.08  VNCS      Security Consultant Intern', '2026.05 — 2026.08  VNCS      Thực tập sinh Tư vấn An ninh mạng'],
  [`${PAD(29)}Distributed Splunk Enterprise — Deployment`, `${PAD(29)}Splunk Enterprise phân tán — Deployment`],
  [`${PAD(29)}Server pushing config to universal forwarders.`, `${PAD(29)}Server đẩy cấu hình xuống universal forwarder.`],
  [`${PAD(29)}Onboarded Windows Event, Sysmon, Linux, web app`, `${PAD(29)}Đưa vào log Windows Event, Sysmon, Linux, web app`],
  [`${PAD(29)}and firewall logs. Field extraction, time`, `${PAD(29)}và firewall. Trích xuất trường, chuẩn hóa`],
  [`${PAD(29)}normalisation, dashboards, alerting, POC docs.`, `${PAD(29)}thời gian, dashboard, cảnh báo, tài liệu POC.`],
  ['  takeaway                   Ingestion is the easy half. A log nobody', '  bài học                  Thu thập log là nửa dễ. Một log không ai'],
  [`${PAD(29)}validated will lie to you during an incident.`, `${PAD(29)}kiểm chứng sẽ nói dối bạn giữa lúc sự cố.`],

  ['2025.11 — 2026.04  VNPRO     Network Administrator Intern', '2025.11 — 2026.04  VNPRO     Thực tập sinh Quản trị Mạng'],
  [`${PAD(29)}Multi-VLAN production segments and the lab`, `${PAD(29)}Các đoạn mạng production nhiều VLAN và`],
  [`${PAD(29)}behind them. Cisco routing and switching,`, `${PAD(29)}phòng lab đằng sau. Routing và switching Cisco,`],
  [`${PAD(29)}firewall and VPN config, VMware ESXi hosts,`, `${PAD(29)}cấu hình firewall và VPN, host VMware ESXi,`],
  [`${PAD(29)}EVE-NG topologies, runbooks and backups.`, `${PAD(29)}topology EVE-NG, runbook và sao lưu.`],
  ['  takeaway                   Availability is a habit, not an event — a backup', '  bài học                  Tính sẵn sàng là thói quen, không phải sự kiện —'],
  [`${PAD(29)}you never restored from is just optimism.`, `${PAD(29)}bản sao lưu bạn chưa từng khôi phục chỉ là lạc quan.`],

  ['2023 — 2027        Swinburne Bachelor of Computer Science — Cyber Security', '2023 — 2027        Swinburne Cử nhân Khoa học Máy tính — An ninh mạng'],
  [`${PAD(29)}Best in Performance Award, TNE20002 Network`, `${PAD(29)}Giải Best in Performance, TNE20002 Network`],
  [`${PAD(29)}Routing Principles. Networking first, then`, `${PAD(29)}Routing Principles. Mạng trước, rồi hệ thống`],
  [`${PAD(29)}systems and security, offensive as the track.`, `${PAD(29)}và an ninh, tấn công là hướng đi.`],

  ['    "professional": "used in a paid role",', '  "chuyên nghiệp": "đã dùng trong công việc có lương",'],
  ['    "lab": "used in practice, not yet in production",', '  "lab": "đã dùng khi luyện tập, chưa dùng ở production",'],
  ['    "studying": "actively learning"', '  "đang học": "đang học chủ động"'],
  ['    { "name": "CPTS", "by": "offsec", "status": "in progress" }', '    { "name": "CPTS", "by": "offsec", "status": "đang học" }'],
  ['  "note": "tools are secondary — thinking is the skill"', '  "note": "công cụ là thứ yếu — tư duy mới là kỹ năng"'],

  ['base       Ho Chi Minh City, Vietnam', 'base       TP. Hồ Chí Minh, Việt Nam'],
  ['status     open to internship and junior security roles', 'status     sẵn sàng thực tập và vị trí junior an ninh'],

  ['# Distributed Splunk & multi-source log onboarding', '# Onboarding log đa nguồn trên Splunk phân tán'],
  ['Stood up Splunk Enterprise as a distributed deployment — a Deployment', 'Dựng Splunk Enterprise dưới dạng triển khai phân tán — một'],
  ['Server pushing config to universal forwarders across mixed hosts — then', 'Deployment Server đẩy cấu hình xuống universal forwarder trên nhiều'],
  ['brought several log families into one searchable surface: Windows Event', 'hệ điều hành — rồi gộp nhiều họ log về một bề mặt tìm kiếm:'],
  ['Log, Sysmon, Linux syslog, web application logs and firewall feeds.', 'Windows Event Log, Sysmon, Linux syslog, log ứng dụng web và firewall.'],
  ['The work that mattered was after ingestion: confirming events actually', 'Phần quan trọng nằm sau khi thu thập: xác nhận sự kiện thật sự'],
  ['arrived, fixing field extraction where sourcetypes mis-parsed, normalising', 'đến, sửa trích xuất trường ở chỗ sourcetype parse sai, chuẩn hóa'],
  ['time, and turning the result into dashboards and alerts someone would act on.', 'thời gian, và biến kết quả thành dashboard và cảnh báo mà người ta sẽ hành động.'],
  ['FLOW     collect → parse → normalise → validate', 'FLOW     thu thập → parse → chuẩn hóa → kiểm chứng'],
  ['OUTPUT   dashboards, reports, alerts, POC documentation', 'OUTPUT   dashboard, báo cáo, cảnh báo, tài liệu POC'],
  ['STATUS   verified professional record', 'STATUS   hồ sơ làm việc đã xác minh'],

  ['# Virtual lab infrastructure operations', '# Vận hành hạ tầng lab ảo'],
  ['Kept the training labs alive: VMware ESXi hosts and EVE-NG/UnetLab', 'Giữ các lab đào tạo sống: host VMware ESXi và topology'],
  ['topologies that students and engineers depended on for routing, switching,', 'EVE-NG/UnetLab mà sinh viên và kỹ sư phụ thuộc cho routing,'],
  ['firewall, VPN and wireless exercises.', 'switching, firewall, VPN và wireless.'],
  ['Provisioning was the easy half. The real work was monitoring, restoring', 'Dựng lab là nửa dễ. Phần thật sự là giám sát, khôi phục'],
  ['from backup when a topology got wrecked mid-session, and writing the', 'từ backup khi topology hỏng giữa buổi học, và viết tài liệu'],
  ['documentation that let someone else rebuild it without me.', 'để người khác dựng lại được khi không có tôi.'],
  ['FLOW     provision → monitor → restore → document', 'FLOW     dựng → giám sát → khôi phục → tài liệu hóa'],

  ['# This site — a terminal you can actually use', '# Trang này — một terminal dùng được thật'],
  ['The page you are reading is itself the case study. No framework, no build', 'Trang bạn đang đọc chính là case study. Không framework, không'],
  ['step: plain HTML, one stylesheet, hand-written JavaScript. Nothing sits', 'bước build: HTML thuần, một stylesheet, JavaScript viết tay. Không'],
  ['between you and the source.', 'có gì nằm giữa bạn và mã nguồn.'],
  ['The shell in the hero is real. Virtual filesystem with ls, cd, cat and', 'Shell ở phần đầu là thật. Hệ thống tệp ảo với ls, cd, cat và'],
  ['tree; fish-style ghost completion on Tab; command history; fullscreen on', 'tree; tự hoàn thành kiểu fish trên Tab; lịch sử lệnh; toàn màn hình'],
  ['Ctrl+K. The portrait above the fold is 2,473 individual glyphs on a canvas', 'khi bấm Ctrl+K. Bức chân dung phía trên là 2,473 glyph riêng lẻ'],
  ['— hover it and they are pushed aside and spring back to their exact home', 'trên canvas — rê chuột vào và chúng bị đẩy ra rồi bật về đúng'],
  ['position.', 'vị trí ban đầu.'],
  ['The portrait is built the way a halftone is: the artwork is decomposed', 'Bức chân dung được dựng theo cách làm halftone: ảnh được phân rã'],
  ['into a grid of cells, each cell gets one glyph chosen by how much ink it', 'thành lưới các ô, mỗi ô nhận một glyph chọn theo lượng mực nó'],
  ['covers, and the ink colour stays constant — so all the tone comes from', 'phủ, và màu mực giữ nguyên — nên toàn bộ sáng tối đến từ'],
  ['density. A single-ink density field reads as text; a per-cell colour', 'mật độ. Một trường mật đơn nhất đọc thành chữ; một bảng màu'],
  ['palette reads as a washed-out photo. Getting that wrong was the whole', 'theo ô đọc thành ảnh phai. Làm sai chỗ đó là khác biệt'],
  ['difference.', 'lớn nhất.'],
  ['FLOW     decompose → map → render → animate', 'FLOW     phân rã → ánh xạ → vẽ → chuyển động'],
  ['STACK    vanilla HTML, CSS, JavaScript — no framework, no bundler', 'STACK    HTML, CSS, JavaScript thuần — không framework, không bundler'],
  ['ENGINE   Canvas 2D glyph field, positional particle model', 'ENGINE   Trường glyph Canvas 2D, mô hình hạt định vị'],
  ['DETAIL   JSON-LD, OG/Twitter cards, manifest, subset fonts, no-JS fallback', 'DETAIL   JSON-LD, thẻ OG/Twitter, manifest, font subset, fallback khi tắt JS'],
  ['VERIFY   view source — every line of it is right there', 'VERIFY   xem mã nguồn — từng dòng đều ở ngay đó'],

  ['# Offensive security case files', '# Case file an ninh mạng tấn công'],
  ['Where the CPTS work will live. Nothing goes up here that I cannot', 'Nơi công việc CPTS sẽ sống. Không có gì lên đây mà tôi không'],
  ['reproduce from an authorised lab with the evidence to back it —', 'tái hiện được từ lab có cho phép cùng bằng chứng đi kèm —'],
  ['enumeration, foothold, privilege escalation, pivoting, and the report', 'liệt kê, giành foothold, leo thang đặc quyền, pivot, và báo cáo'],
  ['that ties it together.', 'buộc chúng lại với nhau.'],
  ['Every write-up gets sanitised first: no flags, no credentials, no client', 'Mỗi write-up đều được làm sạch trước: không flag, không'],
  ['data. The point is methodology and remediation, not a scoreboard.', 'credential, không dữ liệu khách hàng. Trọng tâm là phương pháp và cách khắc phục.'],
  ['FLOW     enumerate → foothold → escalate → report', 'FLOW     liệt kê → foothold → leo thang → báo cáo'],
  ['RULE     authorised labs only, sanitised before publishing', 'RULE     chỉ lab có cho phép, làm sạch trước khi công bố'],
  ['STATUS   building — first case files land as labs complete', 'STATUS   đang xây — case file đầu tiên lên khi lab xong'],

  ['permission denied', 'không có quyền'],
  ['flags, credentials and client data are sanitised before anything', 'flag, credential và dữ liệu khách hàng được làm sạch trước khi'],
  ['gets published here. that is the whole rule.', 'được công bố ở đây. đó là toàn bộ nguyên tắc.'],
];

/* ── validate against app.js ───────────────────────────────────────────── */
const src = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const start = src.indexOf('const FS_EN = dir({');
const end = src.indexOf('\n  });', start);
const block = src.slice(start, end);

const norm = (s) => s.trim().replace(/\s+/g, ' ');

/* Lines that stay English on purpose: JSON syntax, contact addresses, and
   product stacks where a translation would only add noise. t() falls through
   to the source for these, exactly as it does for a name in the markup. */
const KEEP = new Set([
  '{', '}', '  "levels": {', '  },', '  "offensive": {', '  "foundations": {',
  '    "level": "lab",', '    "level": "professional",', '  "track": [', '  ],',
  '  "studying": [', '    "active directory attack paths",',
  '    "web application security",', '    "detection engineering"',
  'email      anhtuanpm3939@gmail.com', 'linkedin   linkedin.com/in/vlat273',
  'STACK    Splunk Enterprise, Deployment Server, Universal Forwarders, SPL',
  'PLATFORM VMware ESXi, EVE-NG / UnetLab',
  'SCOPE    routing, switching, firewall, VPN, wireless, Cisco ISE',
  'TRACK    CPTS — Certified Penetration Testing Specialist',
  '  Swinburne University of Technology  ·  2023–2027',
  /* tool arrays: the names are the names */
  '    "enumeration":       ["nmap", "ffuf", "netexec"],',
  '    "web testing":       ["burp suite", "ffuf"],',
  '    "active directory":  ["bloodhound", "netexec", "impacket", "kerbrute"],',
  '    "post-exploitation": ["impacket", "netexec", "bloodhound"],',
  '    "reporting":         ["markdown", "evidence discipline"]',
  '    "networking":  ["cisco ios", "vlan", "firewall", "vpn"],',
  '    "siem":        ["splunk enterprise", "spl", "sysmon"],',
  '    "systems":     ["linux", "windows server", "vmware esxi", "eve-ng"],',
  '    "identity":    ["microsoft 365", "endpoint support"],',
  '    "scripting":   ["bash", "powershell", "python"],',
  '    "practice":    ["documentation", "backups", "troubleshooting"]',
]);

const real = new Set();
for (const m of block.matchAll(/^\s*'((?:[^'\\]|\\.)*)',\s*$/gm)) {
  const v = m[1].replace(/\\'/g, "'");
  if (v.trim()) real.add(v);
}

const jsKeys = new Set();
for (const m of readFileSync(new URL('../dist/i18n.js', import.meta.url), 'utf8').matchAll(/^\s{4}"((?:[^"\\]|\\.)*)":/gm)) {
  jsKeys.add(m[1]);
}

const mapped = new Map();
let bad = 0;
let trimmed = 0;
for (const [k, v] of MAP) {
  const key = norm(k);
  /* The whitespace either side of a value comes from the source line, never
     from the copy — t() re-attaches it. Values here are written with the
     source indent for readability; trimming is what makes them correct. */
  const val = v.trim();
  if (v !== val) trimmed++;
  if (mapped.has(key)) { console.error(`DUPLICATE key: ${JSON.stringify(key)}`); bad++; }
  mapped.set(key, val);
  if (![...real].some((r) => norm(r) === key)) { console.error(`DEAD key (not in app.js): ${JSON.stringify(k)}`); bad++; }
}
for (const k of real) {
  const key = norm(k);
  /* already covered by an entry written into i18n.js by hand — e.g.
     "Systems & Security Intern @ Got It", which loses its two-space
     indent on the way through t(). */
  if (!mapped.has(key) && !KEEP.has(k) && !jsKeys.has(key)) {
    console.error(`MISSING key: ${JSON.stringify(k)}`); bad++;
  }
}
if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1); }

const collide = [...mapped.keys()].filter((k) => jsKeys.has(k));
if (collide.length) {
  console.error(`ALREADY PRESENT in i18n.js: ${collide.map((k) => JSON.stringify(k)).join(', ')}`);
  process.exit(1);
}

/* ── emit ──────────────────────────────────────────────────────────────── */
const body = [...mapped].map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
const file = readFileSync(new URL('../dist/i18n.js', import.meta.url), 'utf8');
/* The block goes at the end of the VI object, immediately before the brace
   that closes it. */
const marker = '\n  };\n\n  function lookup(key) {';
if (!file.includes(marker)) { console.error('marker not found — did the shell section move?'); process.exit(1); }
const out = file.replace(
  marker,
  `\n\n    /* ── the filesystem under ~ ─────────────────────────────────────── */\n${body}${marker}`,
);
writeFileSync(new URL('../dist/i18n.js', import.meta.url), out);
console.log(`wrote ${MAP.length} filesystem entries (${mapped.size} unique, ${real.size} lines in app.js, ${trimmed} indents normalised)`);
