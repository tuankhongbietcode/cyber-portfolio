/* ═══════════════════════════════════════════════════════════════════════════
   i18n — English / Vietnamese. No framework, no build step, no dependencies.

   How it works, and why this way:

   Every translatable string is keyed by its own English source text. The
   dictionary below only holds Vietnamese. A key that is missing — a proper
   noun, a tool name, a date — simply falls through and stays English, so an
   untranslated line is still a readable line rather than a blank one.

   The page is translated by walking the real DOM: every text node and every
   `aria-label` / `title` / `placeholder` gets looked up by its current value.
   That means markup needs no per-string attributes, text that is split around
   a <span class="accent"> or a <code> tag is translated in pieces, and markup
   nested inside a string survives untouched. The original English of each node
   is remembered in a WeakMap, so switching back and forth never degrades a
   string into a translation of a translation.

   JavaScript-generated strings (the terminal, the filesystem under ~) call
   window.t() directly, which uses the same dictionary and the same key rules.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORAGE_KEY = 'vlat273.lang';
  var SUPPORTED = ['en', 'vi'];
  var current = 'en';

  /* Subtrees that must not be touched: the terminal's own output is generated
     by app.js through t(), and CODE/KBD hold command names that stay as typed. */
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, TEXTAREA: 1, CODE: 1, KBD: 1, PRE: 1 };
  var ATTRS = ['aria-label', 'title', 'placeholder'];

  var originals = new WeakMap();   // Text node  -> English source
  var attrOriginals = new WeakMap(); // Element -> { attrName: English source }

  /* ── Lookup ───────────────────────────────────────────────────────────── */
  /* Vietnamese copy, keyed by the exact English source it replaces. */
  var VI = {
    /* chrome, nav, hero */
    "Võ Lê Anh Tuấn — Cybersecurity & Offensive Security Portfolio": "Võ Lê Anh Tuấn — Hồ sơ An ninh mạng & Tấn công",
    "Skip to content": "Bỏ qua đến nội dung",
    "cybersecurity": "an ninh mạng",
    "Terminal": "Terminal",
    "Experience": "Kinh nghiệm",
    "Work": "Dự án",
    "Toolkit": "Bộ công cụ",
    "Contact": "Liên hệ",
    "terminal": "terminal",
    "Cybersecurity": "An ninh mạng",
    "Ho Chi Minh City": "TP. Hồ Chí Minh",
    "I trace the": "Tôi lần theo",
    "attack path": "đường tấn công",
    "Cybersecurity student at Swinburne, and system administration and security at Got It. I moved through system administration and security into networks and SIEM, and now train toward offensive security — which means I read an attack path from both sides. Method first, evidence always, no inflated claims.": "Sinh viên an ninh mạng tại Swinburne, và quản trị hệ thống cùng bảo mật tại Got It. Tôi đi qua quản trị hệ thống và bảo mật rồi tới mạng và SIEM, và giờ luyện về an ninh mạng tấn công — nên tôi đọc được đường tấn công từ cả hai phía. Phương pháp đi trước, bằng chứng luôn có, không thổi phồng.",
    "Open the terminal": "Mở terminal",
    "Status": "Trạng thái",
    "Open to internship": "Sẵn sàng thực tập",
    "Focus": "Hướng đi",
    "Offensive security": "An ninh mạng tấn công",
    "Foundation": "Nền tảng",
    "Network · SIEM": "Mạng · SIEM",
    "Study": "Học tập",
    "completes ·": "tự hoàn thành ·",
    "history ·": "lịch sử lệnh ·",
    "fullscreen": "toàn màn hình",
    "expand": "mở rộng",
    "Switch colour theme": "Đổi màu giao diện",
    "Switch language": "Đổi ngôn ngữ",
    "Focus the terminal": "Focus vào terminal",
    "Toggle terminal fullscreen": "Bật/tắt toàn màn hình terminal",
    "Terminal command": "Lệnh terminal",
    "Terminal output": "Kết quả terminal",
    "ASCII portrait of Võ Lê Anh Tuấn": "Chân dung ASCII của Võ Lê Anh Tuấn",
    "Sections": "Các phần",

    /* experience */
    "Three internships and the degree running underneath them — each one a layer: the physical network, then the logs that describe it, then the operator who breaks it.": "Ba kỳ thực tập và bằng cấp chạy song song bên dưới — mỗi kỳ là một lớp: mạng vật lý, rồi các bản ghi mô tả nó, rồi người vận hành phá vỡ nó.",
    "2026.09 — now": "2026.09 — nay",
    "current": "hiện tại",
    "Systems & Security Intern": "Thực tập sinh Quản trị hệ thống & Bảo mật",
    "When my mentor moved on, I took over their remit: system administration, security and access control, and the users on top of them, in a live Microsoft 365 environment.": "Khi người mentor của tôi chuyển đi, tôi tiếp quản phần việc của họ: quản trị hệ thống, bảo mật và kiểm soát truy cập, cùng cả người dùng, trong môi trường Microsoft 365 đang chạy thật.",
    "Environment": "Môi trường",
    "Microsoft 365 tenant · live users, no sandbox": "Tenant Microsoft 365 · người dùng thật, không sandbox",
    "Owned": "Phụ trách",
    "System administration, security and access control, user accounts and ticket triage": "Quản trị hệ thống, bảo mật và kiểm soát truy cập, tài khoản người dùng và phân loại ticket",
    "Output": "Kết quả",
    "Working accounts and devices, hardened endpoints, resolved tickets": "Tài khoản và thiết bị hoạt động, thiết bị đầu cuối được gia cường, ticket đã xử lý",
    "Takeaway": "Bài học",
    "System administration": "Quản trị hệ thống",
    "Security & access control": "Bảo mật & kiểm soát truy cập",
    "User support": "Hỗ trợ người dùng",
    "Security Consultant Intern": "Thực tập sinh Tư vấn An ninh mạng",
    "Built and ran a distributed Splunk Enterprise lab — five log families onboarded and validated, then dashboards and alerts. Breakdown in case 001.": "Xây dựng và vận hành phòng lab Splunk Enterprise phân tán — năm họ log được đưa vào và kiểm chứng, rồi dashboard và cảnh báo. Chi tiết ở case 001.",
    "Distributed Splunk Enterprise — Deployment Server pushing config to universal forwarders across mixed hosts": "Splunk Enterprise phân tán — Deployment Server đẩy cấu hình xuống universal forwarder trên nhiều hệ điều hành",
    "Log onboarding, field extraction, time normalisation, dashboards, alerting": "Đưa log vào hệ thống, trích xuất trường, chuẩn hóa thời gian, dashboard, cảnh báo",
    "Five log families in one searchable surface, plus POC documentation": "Năm họ log trên một bề mặt tìm kiếm duy nhất, kèm tài liệu POC",
    "Ingestion is the easy half. A log nobody validated is a log that will lie to you in the middle of an incident.": "Thu thập log là nửa dễ. Một log không ai kiểm chứng sẽ nói dối bạn giữa lúc sự cố.",
    "Log onboarding": "Đưa log vào hệ thống",
    "Field extraction": "Trích xuất trường",
    "Alerting": "Cảnh báo",
    "Network Administrator Intern": "Thực tập sinh Quản trị Mạng",
    "Ran multi-VLAN production segments and the training lab behind them — routing, firewalls, VPN, ESXi, EVE-NG — with the runbooks and backups that keep it recoverable. Alongside that, asked for and received written approval to assess an internal web application: case 003.": "Vận hành các đoạn mạng production nhiều VLAN và phòng lab đào tạo đằng sau chúng — routing, firewall, VPN, ESXi, EVE-NG — cùng runbook và bản sao lưu giữ cho hệ thống khôi phục được. Song song đó, xin và được chấp thuận bằng văn bản để đánh giá một ứng dụng web nội bộ: case 003.",
    "Multi-VLAN production segments and the training lab behind them": "Các đoạn mạng production nhiều VLAN và phòng lab đào tạo đằng sau",
    "Routing and switching, firewall and VPN configuration, ESXi hosts, EVE-NG topologies": "Cấu hình routing và switching, firewall và VPN, host ESXi, topology EVE-NG",
    "Also": "Thêm nữa",
    "Authorised web application security assessment and code remediation — see case 003": "Đánh giá an ninh ứng dụng web có cho phép và sửa lỗi mã nguồn — xem case 003",
    "Runbooks, backups, restores, lab availability, remediation report": "Runbook, sao lưu, khôi phục, tính sẵn sàng của lab, báo cáo khắc phục",
    "Availability is a habit, not an event — a backup you have never restored from is just optimism with a timestamp.": "Tính sẵn sàng là thói quen, không phải sự kiện — bản sao lưu bạn chưa từng khôi phục chỉ là lạc quan có ghi giờ.",
    "Web app security": "An ninh ứng dụng web",
    "expected": "dự kiến",
    "Bachelor of Computer Science — Cyber Security": "Cử nhân Khoa học Máy tính — An ninh mạng",
    "The degree runs underneath all three internships. Networking and routing first, then systems and security fundamentals, with the offensive side as the specialisation I am steering toward.": "Bằng cấp chạy song song với cả ba kỳ thực tập. Mạng và routing trước, rồi hệ thống và nền tảng an ninh, với mảng tấn công là chuyên ngành tôi đang hướng tới.",
    "Recognition": "Ghi nhận",
    "Best in Performance Award — TNE20002 Network Routing Principles": "Giải Best in Performance — TNE20002 Network Routing Principles",
    "Studying": "Đang học",
    "Network routing, systems administration, security fundamentals": "Routing mạng, quản trị hệ thống, nền tảng an ninh",
    "BCS Cyber Security": "BCS An ninh mạng",

    /* work — section shell */
    "Five case files. Three expand on an internship above; two are new. Open one to see the evidence, not just the headline.": "Năm case file. Ba case mở rộng từ một kỳ thực tập ở trên; hai case là mới. Mở một cái để xem bằng chứng, không chỉ tiêu đề.",
    "case files": "case file",
    "verified professional record": "hồ sơ làm việc đã xác minh",
    "built and shipped": "đã xây và đã lên sóng",
    "still being built": "đang xây dở",
    "Verified record": "Hồ sơ đã xác minh",
    "What it demonstrates": "Điều này chứng minh",
    "From my VNCS internship — full role summary in Experience.": "Từ kỳ thực tập ở VNCS — tóm tắt đầy đủ ở mục Kinh nghiệm.",
    "From my VNPRO internship — full role summary in Experience.": "Từ kỳ thực tập ở VNPRO — tóm tắt đầy đủ ở mục Kinh nghiệm.",

    /* case 001 — splunk */
    "Distributed Splunk & multi-source log onboarding": "Onboarding log đa nguồn trên Splunk phân tán",
    "One deployment, five log families, validated end to end — then dashboards and alerts someone would actually act on.": "Một bộ triển khai, năm họ log, kiểm chứng từ đầu đến cuối — rồi dashboard và cảnh báo mà người ta thật sự sẽ hành động.",
    "Stood up Splunk Enterprise as a distributed deployment — a Deployment Server pushing config to universal forwarders across mixed hosts — then brought several log families into one searchable surface: Windows Event Log, Sysmon, Linux syslog, web application logs and firewall/syslog feeds.": "Dựng Splunk Enterprise dưới dạng triển khai phân tán — Deployment Server đẩy cấu hình xuống universal forwarder trên nhiều hệ điều hành — rồi gộp nhiều họ log về một bề mặt tìm kiếm: Windows Event Log, Sysmon, Linux syslog, log ứng dụng web và firewall/syslog.",
    "Onboarding the data was the bulk of it: field extraction written by hand in": "Đưa dữ liệu vào là phần lớn công việc: trích xuất trường viết tay trong",
    "with regex where the shipped add-ons mis-parsed, custom sourcetypes for the feeds no add-on covered, and everything normalised against the Splunk Common Information Model so a field means the same thing no matter which host it came from.": "với regex ở chỗ add-on có sẵn parse sai, sourcetype tự định nghĩa cho những nguồn không add-on nào phủ, và tất cả được chuẩn hóa theo Splunk Common Information Model để một trường mang cùng ý nghĩa bất kể đến từ host nào.",
    "Then the work that made it useful: confirming events actually arrived, correcting extraction where sourcetypes mis-parsed, normalising time before anything was trusted, and building the reports, dashboards and alerts — routed to email and chat — that somebody would actually act on.": "Rồi phần việc làm cho nó hữu dụng: xác nhận sự kiện thật sự đến, sửa trích xuất ở chỗ sourcetype parse sai, chuẩn hóa thời gian trước khi tin vào bất cứ thứ gì, và dựng báo cáo, dashboard cùng cảnh báo — gửi qua email và chat — mà người ta thật sự sẽ hành động.",
    "Five log sources feed universal forwarders across mixed hosts. The forwarders send events to a distributed Splunk Enterprise deployment — indexer and search head — which produces dashboards, alerts, reports and POC documentation. A deployment server pushes app and configuration to the forwarders.": "Năm nguồn log đổ vào universal forwarder trên nhiều hệ điều hành. Các forwarder gửi sự kiện tới bộ triển khai Splunk Enterprise phân tán — indexer và search head — tạo ra dashboard, cảnh báo, báo cáo và tài liệu POC. Deployment Server đẩy app và cấu hình xuống các forwarder.",
    "SOURCES": "NGUỒN",
    "FORWARDING": "CHUYỂN TIẾP",
    "OUTPUT": "ĐẦU RA",
    "app + config push": "đẩy app + cấu hình",
    "Web application": "Ứng dụng web",
    "mixed OS hosts": "nhiều hệ điều hành",
    "parse · index · normalise time": "parse · index · chuẩn hóa thời gian",
    "CIM · correlate across sources": "CIM · tương quan giữa các nguồn",
    "Dashboards": "Dashboard",
    "Alerts": "Cảnh báo",
    "Reports": "Báo cáo",
    "POC docs": "Tài liệu POC",
    "Scroll the diagram sideways to see all of it.": "Cuộn ngang sơ đồ để xem toàn bộ.",
    "Five log families, one searchable surface. The Deployment Server is the control plane: pushing app and config from one place is what keeps parsing consistent across hosts nobody configured by hand. Everything lands normalised to the Common Information Model, so a field means the same thing on every host.": "Năm họ log, một bề mặt tìm kiếm. Deployment Server là control plane: đẩy app và cấu hình từ một chỗ duy nhất là thứ giữ cho việc parse nhất quán trên những host không ai cấu hình tay. Mọi thứ đều được chuẩn hóa theo Common Information Model, nên một trường mang cùng ý nghĩa trên mọi host.",
    "Collect": "Thu thập",
    "Parse": "Parse",
    "Normalise": "Chuẩn hóa",
    "Validate": "Kiểm chứng",
    "Stack": "Stack",
    "Sources": "Nguồn",
    "Splunk Enterprise, Deployment Server, Forwarder Management, Universal Forwarders": "Splunk Enterprise, Deployment Server, Forwarder Management, Universal Forwarder",
    "Parsing": "Parse dữ liệu",
    "extraction, regex, custom sourcetypes, Splunk CIM": "trích xuất, regex, sourcetype tự định nghĩa, Splunk CIM",
    "Windows Event, Sysmon, Linux, Oracle, firewall": "Windows Event, Sysmon, Linux, Oracle, firewall",
    "Dashboards, reports, alerts routed to email and chat": "Dashboard, báo cáo, cảnh báo gửi qua email và chat",
    "Detection is downstream of data quality. The onboarding work — sourcetypes, extraction, time — is what decides whether the alert fires on the right thing. Normalising to CIM is what makes a search written once keep working when the next log source lands.": "Phát hiện nằm phía sau chất lượng dữ liệu. Công việc onboarding — sourcetype, trích xuất, thời gian — mới quyết định cảnh báo có bắn đúng mục tiêu hay không. Chuẩn hóa theo CIM là thứ giúp một câu search viết một lần vẫn chạy đúng khi nguồn log tiếp theo xuất hiện.",

    /* case 003 — authorised web app assessment */
    "Authorised web application assessment — and the fixes": "Đánh giá ứng dụng web có cho phép — và các bản sửa",
    "Reproduced, root-caused and remediated three vulnerabilities in a production PHP CMS — including one the original report missed.": "Tái hiện, tìm root cause và khắc phục ba lỗ hổng trên CMS PHP production — gồm một lỗ bản báo cáo gốc bỏ sót.",
    "I was interning on the network side, not in security. When an external bug hunter reported two serious flaws in an internal admin panel, I asked the company for permission to work on it, got approval, and only then started testing.": "Khi đó tôi thực tập ở mảng mạng, không phải an ninh. Khi một bug hunter bên ngoài báo cáo hai lỗ nghiêm trọng trên trang quản trị nội bộ, tôi xin công ty cho phép làm việc này, được chấp thuận, và chỉ bắt đầu test sau đó.",
    "The first two were a SQL injection that bypassed admin login outright, and an HTTP verb tampering flaw that escalated privileges — the authorisation check was written against": "Hai lỗ đầu là SQL injection bỏ qua hoàn toàn đăng nhập admin, và lỗ giả mạo HTTP method leo thang đặc quyền — phần kiểm tra phân quyền được viết cho",
    "while the application read its parameters from": "trong khi ứng dụng lại đọc tham số từ",
    ", so changing the request method walked straight past it. The third I found myself: the dashboard echoed the raw username back into the page instead of reading it from the database, which turned a logic mistake into a reflected XSS vector.": ", nên chỉ cần đổi method của request là đi vượt qua. Lỗ thứ ba tôi tự tìm ra: dashboard phản hồi nguyên username người dùng nhập vào trang thay vì đọc từ database, biến một lỗi logic thành vector XSS phản xạ.",
    "I also worked out that a far smaller payload than the original report used was enough to get in, and documented why — the login logic depended entirely on what the user typed, with nothing behind it.": "Tôi cũng tìm ra một payload nhỏ hơn nhiều so với bản báo cáo gốc là đủ để vào được, và ghi lại lý do — logic đăng nhập phụ thuộc hoàn toàn vào thứ người dùng gõ, không có gì đằng sau nó.",
    "Reproduce": "Tái hiện",
    "Root cause": "Nguyên nhân gốc",
    "Fix": "Sửa",
    "Re-test": "Test lại",
    "Found": "Tìm thấy",
    "SQL injection (auth bypass) · HTTP verb tampering (privilege escalation) · reflected XSS": "SQL injection (bỏ qua xác thực) · giả mạo HTTP method (leo thang đặc quyền) · XSS phản xạ",
    "Fixed": "Đã sửa",
    "Input sanitisation, removal of legacy default-password logic, explicit role checks, output encoding, method-pinned parameters,": "Làm sạch input, bỏ logic mật khẩu mặc định cũ, kiểm tra vai trò tường minh, mã hóa output, ghim tham số theo method,",
    "hardening": "gia cường",
    "Verified": "Đã kiểm chứng",
    "Re-tested after deploying to production — 3 of 4 items closed, the remainder documented rather than dropped": "Test lại sau khi deploy lên production — 3 trên 4 hạng mục đóng, phần còn lại được ghi chép chứ không bị bỏ",
    "Rule": "Nguyên tắc",
    "Written authorisation before testing, sanitised before publishing": "Có cho phép bằng văn bản trước khi test, làm sạch trước khi công bố",
    "That I can read the code that caused the flaw, not just run the tool that found it — and that I know to ask permission first.": "Rằng tôi đọc được mã gây ra lỗ hổng, không chỉ chạy công cụ tìm ra nó — và rằng tôi biết xin phép trước.",

    /* case 004 — this site */
    "This site — a terminal you can actually use": "Trang này — một terminal dùng được thật",
    "No framework, no build step. A working virtual filesystem, tab completion, and a portrait drawn from 2,473 live glyph particles.": "Không framework, không bước build. Một hệ thống tệp ảo chạy thật, tự hoàn thành bằng Tab, và một bức chân dung vẽ từ 2,473 hạt glyph sống.",
    "Front end": "Front end",
    "Shipped": "Đã lên sóng",
    "The page you are reading is itself the case study. There is no framework and no build step — it is plain HTML, one stylesheet, and hand-written JavaScript, which means it loads fast and there is nothing between you and the source.": "Trang bạn đang đọc chính là case study. Không framework, không bước build — chỉ HTML thuần, một stylesheet, và JavaScript viết tay, nên nó tải nhanh và không có gì nằm giữa bạn và mã nguồn.",
    "The shell in the hero is real: a virtual filesystem with": "Shell ở phần đầu là thật: một hệ thống tệp ảo với",
    "and": "và",
    ", fish-style ghost completion on": ", tự hoàn thành kiểu fish trên",
    ", command history, and a fullscreen mode on": ", lịch sử lệnh, và chế độ toàn màn hình khi bấm",
    ". The portrait above the fold is 2,473 individual glyphs on a canvas — hover it and they are pushed aside and spring back to their exact home position.": ". Bức chân dung phía trên là 2,473 glyph riêng lẻ trên canvas — rê chuột vào và chúng bị đẩy ra rồi bật về đúng vị trí ban đầu.",
    "The portrait is a halftone: the artwork is decomposed into cells, one glyph per cell, tone carried by density rather than colour.": "Bức chân dung là một halftone: ảnh được phân rã thành các ô, mỗi ô một glyph, sáng tối do mật độ quyết định chứ không do màu.",
    "Decompose": "Phân rã",
    "Map": "Ánh xạ",
    "Render": "Vẽ",
    "Animate": "Chuyển động",
    "Vanilla HTML, CSS and JavaScript — no framework, no bundler": "HTML, CSS và JavaScript thuần — không framework, không bundler",
    "Engine": "Engine",
    "Canvas 2D glyph field, positional particle model, fixed backing store": "Trường glyph Canvas 2D, mô hình hạt định vị, backing store cố định",
    "Detail": "Chi tiết",
    "JSON-LD, OG/Twitter cards, manifest, self-hosted subset fonts, full no-JS fallback": "JSON-LD, thẻ OG/Twitter, manifest, font subset tự host, fallback đầy đủ khi tắt JS",
    "Verify": "Kiểm chứng",
    "View source — every line of it is right there": "Xem mã nguồn — từng dòng đều ở ngay đó",
    "Craft under constraint. Accessibility, no-JS resilience and performance were treated as requirements, not clean-up work.": "Làm khéo trong ràng buộc. Khả năng truy cập, chịu lỗi khi tắt JS và hiệu năng được coi là yêu cầu, không phải việc dọn dẹp sau.",

    /* case 005 — case files */
    "Offensive security case files": "Case file an ninh mạng tấn công",
    "Where the CPTS work will live — enumeration, foothold, escalation, pivoting, and the report that ties it together.": "Nơi công việc CPTS sẽ sống — liệt kê, giành foothold, leo thang, pivot, và báo cáo buộc chúng lại với nhau.",
    "In progress": "Đang làm",
    "Nothing goes up here that I cannot reproduce from an authorised lab. Every write-up is sanitised first — no flags, no credentials, no client data.": "Không có gì lên đây mà tôi không tái hiện được từ một lab có cho phép. Mỗi write-up đều được làm sạch trước — không flag, không credential, không dữ liệu khách hàng.",
    "Enumerate": "Liệt kê",
    "Foothold": "Foothold",
    "Escalate": "Leo thang",
    "Report": "Báo cáo",
    "Track": "Lộ trình",
    "Authorised labs only, sanitised before publishing": "Chỉ lab có cho phép, làm sạch trước khi công bố",
    "Building — first case files land as labs complete": "Đang xây — case file đầu tiên lên khi lab xong",
    "Discipline about what I put my name on. A case file with a flag in it is worth less than no case file at all.": "Kỷ luật về thứ tôi gắn tên mình vào. Một case file có flag bên trong còn kém hơn là không có case file nào.",

    /* toolkit */
    "Tools are secondary — thinking is the skill. But a capability without the tool that implements it is just a category, so every entry below names the tools and where I actually used them.": "Công cụ là thứ yếu — tư duy mới là kỹ năng. Nhưng một năng lực không có công cụ hiện thực hóa nó chỉ là một danh mục, nên mỗi mục dưới đây đều nêu rõ công cụ và chỗ tôi thật sự đã dùng.",
    "professional": "chuyên nghiệp",
    "— used in a paid role": "— đã dùng trong công việc có lương",
    "lab": "lab",
    "— used in practice, not yet in production": "— đã dùng khi luyện tập, chưa dùng ở production",
    "studying": "đang học",
    "— actively learning": "— đang học chủ động",
    "Offensive": "Tấn công",
    "lab use": "dùng trong lab",
    "Enumeration": "Liệt kê",
    "Service discovery, banner analysis, content discovery — finding the surface before touching it": "Phát hiện dịch vụ, phân tích banner, dò nội dung — tìm bề mặt tấn công trước khi chạm vào",
    "Web testing": "Test web",
    "Request and response inspection, logic flaws, authorisation boundaries": "Soi request và response, lỗi logic, ranh giới phân quyền",
    "Trust relationships, credential exposure, delegation, attack-path mapping": "Quan hệ tin cậy, lộ credential, delegation, lập bản đồ đường tấn công",
    "Post-exploitation": "Sau khai thác",
    "Privilege escalation, pivoting and tunnelling, maintaining a clean trail of evidence": "Leo thang đặc quyền, pivot và tunnel, giữ dấu vết bằng chứng sạch",
    "Reporting": "Báo cáo",
    "Reproducible steps, honest impact, severity that survives a second opinion": "Các bước tái hiện được, mức độ tác động trung thực, mức nghiêm trọng đứng vững trước một ý kiến thứ hai",
    "Evidence discipline": "Kỷ luật bằng chứng",
    "Remediation": "Khắc phục",
    "Ordering fixes by what actually reduces risk, not by what is easiest to fix": "Sắp xếp bản sửa theo thứ thật sự giảm rủi ro, không theo thứ dễ sửa nhất",
    "Prioritisation": "Ưu tiên",
    "Defensive mapping": "Ánh xạ phòng thủ",
    "Foundations": "Nền tảng",
    "Networking": "Mạng",
    "VLAN design, routing and switching, firewall policy, VPN, wireless": "Thiết kế VLAN, routing và switching, chính sách firewall, VPN, wireless",
    "SIEM & detection": "SIEM & phát hiện",
    "Systems": "Hệ thống",
    "Linux and Windows administration, virtualisation, lab topology building": "Quản trị Linux và Windows, ảo hóa, dựng topology lab",
    "Identity & cloud": "Danh tính & đám mây",
    "Microsoft 365 administration — accounts, access control and the security around them": "Quản trị Microsoft 365 — tài khoản, kiểm soát truy cập và bảo mật quanh chúng",
    "Scripting": "Scripting",
    "Enough automation to stop repeating myself, and to read someone else's script before running it": "Đủ tự động hóa để khỏi lặp lại việc của mình, và để đọc script của người khác trước khi chạy",
    "Practice": "Thực hành",
    "Documentation, backups and restores, troubleshooting when the clock is running": "Tài liệu, sao lưu và khôi phục, xử lý sự cố khi đồng hồ đang chạy",
    "Runbooks": "Runbook",
    "Change notes": "Ghi chú thay đổi",
    "Certification track": "Lộ trình chứng chỉ",
    "in progress": "đang học",
    "No certification claimed": "Không chứng chỉ nào được tuyên bố",
    "If it is not held, it is not on this page. That is the rule.": "Chưa có thì không đưa lên trang này. Đó là nguyên tắc.",
    "by policy": "theo nguyên tắc",
    "Currently studying": "Đang học",
    "Active Directory attack paths": "Đường tấn công Active Directory",
    "Delegation, trust abuse, credential exposure": "Delegation, lạm dụng quan hệ tin cậy, lộ credential",
    "deepest focus": "tập trung nhất",
    "Web application security": "An ninh ứng dụng web",
    "Authorisation logic, server-side flaws, request smuggling": "Logic phân quyền, lỗi phía server, request smuggling",
    "ongoing": "đang tiếp diễn",
    "Detection engineering": "Kỹ thuật phát hiện",
    "Turning log sources into alerts worth waking up for": "Biến nguồn log thành cảnh báo đáng để thức dậy",
    "Working set": "Bộ đang dùng",

    /* contact + footer */
    "Let’s exchange signals.": "Hãy trao đổi tín hiệu.",
    "Open to internship and junior roles in security operations, SOC or offensive security — and to lab collaboration with people who take notes.": "Sẵn sàng cho vị trí thực tập và junior ở vận hành an ninh, SOC hoặc an ninh mạng tấn công — và cho hợp tác lab với những người chịu ghi chép.",
    "Email": "Email",
    "Base": "Nơi ở",
    "Ho Chi Minh City, Vietnam": "TP. Hồ Chí Minh, Việt Nam",
    "Authorised labs only": "Chỉ lab có cho phép",
    "Responsible disclosure": "Tiết lộ có trách nhiệm",
    "No unverified claims": "Không tuyên bố chưa kiểm chứng",
    "Download CV": "Tải CV",
    "Built by hand — no framework, no build step. Last updated": "Tự làm bằng tay — không framework, không bước build. Cập nhật lần cuối",
    "Back to top": "Lên đầu trang",

    /* ── the shell (app.js) ───────────────────────────────────────────── */
    "cybersecurity · HCMC": "an ninh mạng · TP.HCM",
    "type `help` to begin": "gõ `help` để bắt đầu",
    "session established": "phiên đã thiết lập",
    "collapse": "thu gọn",
    "this list": "danh sách này",
    "list directory": "liệt kê thư mục",
    "change directory": "đổi thư mục",
    "print a file": "in một tệp",
    "recursive listing": "liệt kê đệ quy",
    "working directory": "thư mục làm việc",
    "who is behind this": "ai đứng sau trang này",
    "the portrait up top": "bức chân dung phía trên",
    "system summary": "tóm tắt hệ thống",
    "open a file or section": "mở một tệp hoặc một phần",
    "jump to a section": "nhảy tới một phần",
    "how to reach me": "cách liên hệ tôi",
    "profiles elsewhere": "hồ sơ ở nơi khác",
    "past commands": "lệnh đã gõ",
    "dark / light": "tối / sáng",
    "print the banner": "in banner",
    "clear the screen": "xóa màn hình",
    "files live under ~ — try ls then cat about.txt": "các tệp nằm trong ~ — thử ls rồi cat about.txt",
    "tab completes · ↑ recalls · ctrl+k goes fullscreen": "tab tự hoàn thành · ↑ gõ lại lệnh cũ · ctrl+k toàn màn hình",
    "help: no entry for": "help: không có mục cho",
    "tip:": "gợi ý:",
    "·": "·",
    "· cybersecurity · Ho Chi Minh City": "· an ninh mạng · TP. Hồ Chí Minh",
    "the portrait up top is a cloud of glyphs. hover it, or tap it, to push them around.": "bức chân dung phía trên là một đám glyph. rê chuột, hoặc chạm vào, để đẩy chúng đi.",
    "goto: no section named": "goto: không có phần tên",
    "open what? case files:": "mở gì? các case file:",
    "or jump: open work · experience · toolkit · contact": "hoặc nhảy tới: open work · experience · toolkit · contact",
    "open: nothing called": "open: không có gì tên",
    "ls: cannot access": "ls: không truy cập được",
    ": no such file or directory": ": không có tệp hoặc thư mục này",
    "cd: no such directory": "cd: không có thư mục này",
    "cd: not a directory": "cd: không phải thư mục",
    ": is a directory": ": là một thư mục",
    "cat: missing file operand": "cat: thiếu tên tệp",
    "directories": "thư mục",
    "files": "tệp",
    "(empty)": "(trống)",
    "tree": "tree",
    "command not found": "không tìm thấy lệnh",
    "type `help` for the list, or press tab to complete.": "gõ `help` để xem danh sách, hoặc bấm tab để hoàn thành.",
    "cybersecurity student · system & security · Ho Chi Minh City": "sinh viên an ninh mạng · quản trị hệ thống & bảo mật · TP. Hồ Chí Minh",
    "System administration & security @ Got It": "Quản trị hệ thống & bảo mật @ Got It",
    "Systems & Security Intern @ Got It": "Thực tập sinh Quản trị hệ thống & Bảo mật @ Got It",
    "BCS Cyber Security, Swinburne (2023–2027)": "BCS An ninh mạng, Swinburne (2023–2027)",
    "offensive security · CPTS track": "an ninh mạng tấn công · lộ trình CPTS",
    "no claim I cannot back with evidence": "không tuyên bố gì mà tôi không có bằng chứng",
    "no history yet": "chưa có lịch sử",
    "open to internship and junior security roles": "sẵn sàng thực tập và vị trí junior an ninh",
    "open to internship": "sẵn sàng thực tập",
    "theme is": "giao diện đang là",
    "· usage: theme dark | theme light": "· dùng: theme dark | theme light",
    "theme →": "giao diện →",
    "guest is not in the sudoers file.": "guest không có trong sudoers file.",
    "This incident has been logged. (It is a static site. Nothing was logged.)": "Sự việc đã được ghi lại. (Đây là site tĩnh. Không có gì được ghi lại cả.)",
    "rm: destructive commands are not implemented here.": "rm: lệnh phá hoại không được cài ở đây.",
    "The filesystem is read-only, and honestly that is the right default.": "Hệ thống tệp chỉ đọc, và thành thật mà nói đó là mặc định đúng.",
    "there is no exit — only scrolling.": "không có lối ra — chỉ có cuộn.",
    "try": "thử",
    "instead.": "thay vì thế.",
    "HTTP 418 — I am a teapot, not a barista.": "HTTP 418 — tôi là ấm trà, không phải barista.",
    "nice. now try the part that takes notes.": "hay đấy. giờ thử phần chịu ghi chép xem.",
    "flags are sanitised before publishing. that is the rule.": "flag được làm sạch trước khi công bố. đó là nguyên tắc.",
    "language switched — type `banner` to see the shell again": "đã đổi ngôn ngữ — gõ `banner` để xem lại shell",

    /* ── the filesystem under ~ ─────────────────────────────────────── */
    "Võ Lê Anh Tuấn · also written Anh Tuan Vo": "Võ Lê Anh Tuấn  ·  cũng viết là Anh Tuan Vo",
    "Cybersecurity student · system & security": "Sinh viên an ninh mạng  ·  quản trị hệ thống & bảo mật",
    "EDUCATION": "HỌC VẤN",
    "CURRENT": "HIỆN TẠI",
    "HOW I GOT HERE": "TÔI ĐẾN ĐÂY BẰNG CÁCH NÀO",
    "I came up through the infrastructure side — VLANs, firewalls,": "Tôi đi lên từ mảng hạ tầng — VLAN, firewall,",
    "virtual labs — then moved into Splunk and log pipelines, and from": "lab ảo — rồi chuyển sang Splunk và pipeline log, và từ",
    "there toward offensive security. Reading an attack path from both": "đó tiến tới an ninh mạng tấn công. Đọc đường tấn công từ cả",
    "sides is the entire point.": "hai phía là toàn bộ ý nghĩa.",
    "No certification is claimed here that I do not hold.": "Không chứng chỉ nào được tuyên bố ở đây mà tôi chưa có.",
    "2026.09 — now Got It Systems & Security Intern": "2026.09 — nay      Got It    Thực tập sinh Quản trị & Bảo mật",
    "Microsoft 365 tenant, live users, no sandbox.": "Tenant Microsoft 365 · người dùng thật, không sandbox.",
    "System administration, security and access": "Quản trị hệ thống, bảo mật và kiểm soát",
    "control, plus user accounts. Production — no": "truy cập, cùng tài khoản người dùng. Production — không",
    "rollback button.": "có nút rollback.",
    "takeaway The fastest way to understand an organisation is": "bài học                  Cách nhanh nhất để hiểu một tổ chức là",
    "to sit where its users hit friction.": "ngồi đúng chỗ người dùng của họ gặp vướng mắc.",
    "2026.05 — 2026.08 VNCS Security Consultant Intern": "2026.05 — 2026.08  VNCS      Thực tập sinh Tư vấn An ninh mạng",
    "Distributed Splunk Enterprise — Deployment": "Splunk Enterprise phân tán — Deployment",
    "Server pushing config to universal forwarders.": "Server đẩy cấu hình xuống universal forwarder.",
    "Onboarded Windows Event, Sysmon, Linux, Oracle": "Đưa vào log Windows Event, Sysmon, Linux, Oracle",
    "and firewall logs. Hand-written transforms.conf": "và firewall. Trích xuất viết tay trong transforms.conf",
    "extraction and regex, custom sourcetypes, CIM": "với regex, sourcetype tự định nghĩa, chuẩn hóa CIM",
    "normalisation, dashboards and alerting.": "chuẩn hóa CIM, dashboard và cảnh báo.",
    "takeaway Ingestion is the easy half. A log nobody": "bài học                  Thu thập log là nửa dễ. Một log không ai",
    "validated will lie to you during an incident.": "kiểm chứng sẽ nói dối bạn giữa lúc sự cố.",
    "2025.11 — 2026.04 VNPRO Network Administrator Intern": "2025.11 — 2026.04  VNPRO     Thực tập sinh Quản trị Mạng",
    "Multi-VLAN production segments and the lab": "Các đoạn mạng production nhiều VLAN và",
    "behind them. Cisco routing and switching,": "phòng lab đằng sau. Routing và switching Cisco,",
    "firewall and VPN config, VMware ESXi hosts,": "cấu hình firewall và VPN, host VMware ESXi,",
    "EVE-NG topologies, runbooks and backups.": "topology EVE-NG, runbook và sao lưu.",
    "takeaway Availability is a habit, not an event — a backup": "bài học                  Tính sẵn sàng là thói quen, không phải sự kiện —",
    "you never restored from is just optimism.": "bản sao lưu bạn chưa từng khôi phục chỉ là lạc quan.",
    "2023 — 2027 Swinburne Bachelor of Computer Science — Cyber Security": "2023 — 2027        Swinburne Cử nhân Khoa học Máy tính — An ninh mạng",
    "Best in Performance Award, TNE20002 Network": "Giải Best in Performance, TNE20002 Network",
    "Routing Principles. Networking first, then": "Routing Principles. Mạng trước, rồi hệ thống",
    "systems and security, offensive as the track.": "và an ninh, tấn công là hướng đi.",
    "\"professional\": \"used in a paid role\",": "\"chuyên nghiệp\": \"đã dùng trong công việc có lương\",",
    "\"lab\": \"used in practice, not yet in production\",": "\"lab\": \"đã dùng khi luyện tập, chưa dùng ở production\",",
    "\"studying\": \"actively learning\"": "\"đang học\": \"đang học chủ động\"",
    "{ \"name\": \"CPTS\", \"by\": \"offsec\", \"status\": \"in progress\" }": "{ \"name\": \"CPTS\", \"by\": \"offsec\", \"status\": \"đang học\" }",
    "\"note\": \"tools are secondary — thinking is the skill\"": "\"note\": \"công cụ là thứ yếu — tư duy mới là kỹ năng\"",
    "base Ho Chi Minh City, Vietnam": "base       TP. Hồ Chí Minh, Việt Nam",
    "status open to internship and junior security roles": "status     sẵn sàng thực tập và vị trí junior an ninh",
    "# Distributed Splunk & multi-source log onboarding": "# Onboarding log đa nguồn trên Splunk phân tán",
    "Stood up Splunk Enterprise as a distributed deployment — a Deployment": "Dựng Splunk Enterprise dưới dạng triển khai phân tán — một",
    "Server pushing config to universal forwarders across mixed hosts — then": "Deployment Server đẩy cấu hình xuống universal forwarder trên nhiều",
    "brought several log families into one searchable surface: Windows Event": "hệ điều hành — rồi gộp nhiều họ log về một bề mặt tìm kiếm:",
    "Log, Sysmon, Linux syslog, Oracle audit and firewall feeds.": "Windows Event Log, Sysmon, Linux syslog, Oracle audit và firewall.",
    "Onboarding the data was the bulk of it: extensible field extraction": "Đưa dữ liệu vào là phần lớn công việc: trích xuất trường",
    "written by hand in transforms.conf with regex, custom sourcetypes for": "viết tay trong transforms.conf với regex, sourcetype tự định nghĩa cho",
    "the feeds no add-on covered, and everything normalised against the": "những nguồn không add-on nào phủ, và mọi thứ được chuẩn hóa theo",
    "Splunk Common Information Model.": "Common Information Model của Splunk.",
    "Then the work that made it useful: confirming events actually arrived,": "Rồi phần việc làm cho nó hữu dụng: xác nhận sự kiện thật sự đến,",
    "correcting extraction where sourcetypes mis-parsed, normalising time,": "sửa trích xuất ở chỗ sourcetype parse sai, chuẩn hóa thời gian,",
    "and turning the result into dashboards and alerts — routed to email": "và biến kết quả thành dashboard và cảnh báo — gửi qua email",
    "and chat — that somebody would act on.": "và chat — mà người ta sẽ hành động.",
    "FLOW collect → parse → normalise (CIM) → validate": "FLOW     thu thập → parse → chuẩn hóa (CIM) → kiểm chứng",
    "STACK Splunk Enterprise, Deployment Server, Forwarder Management": "STACK    Splunk Enterprise, Deployment Server, Forwarder Mgmt",
    "PARSING transforms.conf, regex, custom sourcetypes, CIM": "PARSING  transforms.conf, regex, sourcetype tự định nghĩa, CIM",
    "OUTPUT dashboards, reports, alerts to email and chat": "OUTPUT   dashboard, báo cáo, cảnh báo qua email và chat",
    "STATUS verified professional record": "STATUS   hồ sơ làm việc đã xác minh",
    "# Authorised web application assessment — and the fixes": "# Đánh giá ứng dụng web có cho phép — và các bản sửa",
    "Reproduced, root-caused and remediated three vulnerabilities in a production": "Tái hiện, tìm root cause và khắc phục ba lỗ hổng trên một",
    "PHP CMS — including one the original report missed — under written approval.": "CMS PHP production — gồm một lỗ bản báo cáo gốc bỏ sót — dưới sự chấp thuận bằng văn bản.",
    "# This site — a terminal you can actually use": "# Trang này — một terminal dùng được thật",
    "The page you are reading is itself the case study. No framework, no build": "Trang bạn đang đọc chính là case study. Không framework, không",
    "step: plain HTML, one stylesheet, hand-written JavaScript. Nothing sits": "bước build: HTML thuần, một stylesheet, JavaScript viết tay. Không",
    "between you and the source.": "có gì nằm giữa bạn và mã nguồn.",
    "The shell in the hero is real. Virtual filesystem with ls, cd, cat and": "Shell ở phần đầu là thật. Hệ thống tệp ảo với ls, cd, cat và",
    "tree; fish-style ghost completion on Tab; command history; fullscreen on": "tree; tự hoàn thành kiểu fish trên Tab; lịch sử lệnh; toàn màn hình",
    "Ctrl+K. The portrait above the fold is 2,473 individual glyphs on a canvas": "khi bấm Ctrl+K. Bức chân dung phía trên là 2,473 glyph riêng lẻ",
    "— hover it and they are pushed aside and spring back to their exact home": "trên canvas — rê chuột vào và chúng bị đẩy ra rồi bật về đúng",
    "position.": "vị trí ban đầu.",
    "The portrait is built the way a halftone is: the artwork is decomposed": "Bức chân dung được dựng theo cách làm halftone: ảnh được phân rã",
    "into a grid of cells, each cell gets one glyph chosen by how much ink it": "thành lưới các ô, mỗi ô nhận một glyph chọn theo lượng mực nó",
    "covers, and the ink colour stays constant — so all the tone comes from": "phủ, và màu mực giữ nguyên — nên toàn bộ sáng tối đến từ",
    "density. A single-ink density field reads as text; a per-cell colour": "mật độ. Một trường mật đơn nhất đọc thành chữ; một bảng màu",
    "palette reads as a washed-out photo. Getting that wrong was the whole": "theo ô đọc thành ảnh phai. Làm sai chỗ đó là khác biệt",
    "difference.": "lớn nhất.",
    "FLOW decompose → map → render → animate": "FLOW     phân rã → ánh xạ → vẽ → chuyển động",
    "STACK vanilla HTML, CSS, JavaScript — no framework, no bundler": "STACK    HTML, CSS, JavaScript thuần — không framework, không bundler",
    "ENGINE Canvas 2D glyph field, positional particle model": "ENGINE   Trường glyph Canvas 2D, mô hình hạt định vị",
    "DETAIL JSON-LD, OG/Twitter cards, manifest, subset fonts, no-JS fallback": "DETAIL   JSON-LD, thẻ OG/Twitter, manifest, font subset, fallback khi tắt JS",
    "VERIFY view source — every line of it is right there": "VERIFY   xem mã nguồn — từng dòng đều ở ngay đó",
    "# Offensive security case files": "# Case file an ninh mạng tấn công",
    "Where the CPTS work will live. Nothing goes up here that I cannot": "Nơi công việc CPTS sẽ sống. Không có gì lên đây mà tôi không",
    "reproduce from an authorised lab with the evidence to back it —": "tái hiện được từ lab có cho phép cùng bằng chứng đi kèm —",
    "enumeration, foothold, privilege escalation, pivoting, and the report": "liệt kê, giành foothold, leo thang đặc quyền, pivot, và báo cáo",
    "that ties it together.": "buộc chúng lại với nhau.",
    "Every write-up gets sanitised first: no flags, no credentials, no client": "Mỗi write-up đều được làm sạch trước: không flag, không",
    "data. The point is methodology and remediation, not a scoreboard.": "credential, không dữ liệu khách hàng. Trọng tâm là phương pháp và cách khắc phục.",
    "FLOW enumerate → foothold → escalate → report": "FLOW     liệt kê → foothold → leo thang → báo cáo",
    "RULE authorised labs only, sanitised before publishing": "RULE     chỉ lab có cho phép, làm sạch trước khi công bố",
    "STATUS building — first case files land as labs complete": "STATUS   đang xây — case file đầu tiên lên khi lab xong",
    "permission denied": "không có quyền",
    "flags, credentials and client data are sanitised before anything": "flag, credential và dữ liệu khách hàng được làm sạch trước khi",
    "gets published here. that is the whole rule.": "được công bố ở đây. đó là toàn bộ nguyên tắc.",

    /* ── engagement: Quỹ Nuôi Em (case 002 + experience) ────────────────── */
    /* experience entry (HTML) */
    "2026.10 — now": "2026.10 — nay",
    "engagement under way": "đang thực hiện",
    "Authorised Security Assessment — Engagement Design": "Đánh giá an ninh có cho phép — Thiết kế giao kèo",
    "Designed and launched the engagement: scope, rules of engagement, safety limits, and what I do the moment something goes wrong — now running phases 1–3 against the production site. Breakdown in case 002.": "Thiết kế và triển khai giao kèo: phạm vi, quy tắc giao chiến, giới hạn an toàn, và những việc tôi làm ngay khi có sự cố — hiện đang chạy các giai đoạn 1–3 trên site production. Chi tiết ở case 002.",
    "quynuoiem.com — a Next.js donation platform with live donors, real money, and children's profiles on it": "quynuoiem.com — nền tảng quyên góp Next.js có người quyên góp thật, tiền thật, và hồ sơ trẻ em bên trong",
    "Scope definition, rules of engagement, rate limits, data-handling obligations, stop conditions, reporting structure": "Định nghĩa phạm vi, quy tắc giao chiến, giới hạn tốc độ, nghĩa vụ xử lý dữ liệu, điều kiện dừng, cấu trúc báo cáo",
    "An 18-page statement of work and rules of engagement, plus a two-page plain-language test plan for the non-technical signer": "Một bản ghi nhớ công việc 18 trang và quy tắc giao chiến, cộng thêm kế hoạch test 2 trang viết bằng ngôn ngữ bình dân cho người ký không chuyên kỹ thuật",
    "The hard part of a pentest is not the exploit — it is writing down, before you start, exactly what you may touch and what you will do when something breaks.": "Phần khó của pentest không phải là khai thác — mà là ghi rõ trước khi bắt đầu chính xác những gì được phép chạm vào và sẽ làm gì khi có sự cố.",
    "Data protection": "Bảo vệ dữ liệu",
    "Scope & RoE": "Phạm vi & RoE",
    "Scoping": "Xác định phạm vi",
    "Rules of engagement": "Quy tắc giao chiến",
    "Safe harbour": "Bảo vệ an toàn",

    /* case 002 — shell (HTML) */
    "Engagement design for an authorised charity assessment": "Thiết kế giao kèo cho đánh giá từ thiện có cho phép",
    "Scope, rules of engagement and safety limits for testing a children's charity donation platform — NDA signed, phases 1–3 now running.": "Phạm vi, quy tắc giao chiến và giới hạn an toàn để test nền tảng quyên góp của một tổ chức từ thiện trẻ em — đã ký NDA, các giai đoạn 1–3 đang chạy.",
    "A COS40005 engagement — full role context in Experience.": "Một giao kèo COS40005 — bối cảnh đầy đủ ở mục Kinh nghiệm.",
    "Quỹ Nuôi Em runs a Next.js donation platform that holds donor records and children's profiles. I designed and wrote the document that governs the engagement: an 18-page statement of work and rules of engagement in two parts — the part a non-technical signer reads to decide, and the technical part that binds me — plus a two-page plain-language test plan so nobody signs something they cannot follow. The NDA is now signed and phases 1–3 are running against the production site.": "Quỹ Nuôi Em vận hành nền tảng quyên góp Next.js lưu hồ sơ người quyên góp và hồ sơ trẻ em. Tôi thiết kế và viết tài liệu quản lý giao kèo: một bản ghi nhớ công việc và quy tắc giao chiến 18 trang gồm hai phần — phần người ký không chuyên đọc để quyết định, và phần kỹ thuật ràng buộc tôi — cộng thêm kế hoạch test 2 trang viết bằng ngôn ngữ bình dân để không ai ký thứ họ không hiểu. NDA đã ký và các giai đoạn 1–3 đang chạy trên site production.",
    "The scope is deliberately narrow. Seven asset classes are listed with the reason each is in; thirteen exclusions are numbered with the reason each is out. Assets on a look-alike domain are out even if they carry the charity's name, because a signature for a domain the signer does not own is worth nothing. Public data sources holding donor information are excluded by default — they add risk to the people in them and no value to the charity.": "Phạm vi cố tình hẹp. Bảy lớp tài sản được liệt kê kèm lý do đưa vào; mười ba mục loại trừ được đánh số kèm lý do loại ra. Tài sản trên tên miền giống mạo danh bị loại dù có mang tên tổ chức, vì chữ ký cho tên miền người ký không sở hữu chẳng giá trị gì. Các nguồn dữ liệu công cộng chứa thông tin người quyên góp bị loại trừ mặc định — chúng chỉ thêm rủi ro cho những người trong đó mà không thêm giá trị cho tổ chức.",
    "Four gates control six phases, and no gate can be passed while its conditions are still blank. Two of the eleven prerequisites belong to me: declaring a single static source IP so the charity can tell my traffic from a real attack, and clearing the academic ethics review, which matters more than usual here because children's data is involved.": "Bốn cổng kiểm soát sáu giai đoạn, và không cổng nào được qua khi điều kiện còn trống. Hai trong mười một điều kiện tiên quyết thuộc về tôi: khai báo một IP nguồn tĩnh duy nhất để tổ chức phân biệt lưu lượng của tôi với một cuộc tấn công thật, và qua được duyệt đạo đức học thuật — điều quan trọng hơn bình thường ở đây vì có dữ liệu trẻ em.",
    "Gates are the control, not the phases. A gate cannot be passed while any of its conditions is still blank, and exploitation never reaches production — the ceiling is drawn in deliberately.": "Cổng là sự kiểm soát, không phải giai đoạn. Cổng không thể qua khi bất kỳ điều kiện nào còn trống, và khai thác không bao giờ chạm tới production — trần đó được vẽ có chủ ý.",
    "That I know a pentest is a contract before it is a technique. Scope discipline, rate limits, stop conditions and data handling are the parts that keep an authorised test from becoming an incident — and they are live now, not just on paper.": "Rằng tôi hiểu pentest là một hợp đồng trước khi là một kỹ thuật. Kỷ luật phạm vi, giới hạn tốc độ, điều kiện dừng và xử lý dữ liệu là những phần giữ cho một bài test có phép không biến thành sự cố — và chúng đang thực thi thật, không chỉ trên giấy.",

    /* case 002 — facts (HTML) */
    "Scope": "Phạm vi",
    "Model": "Mô hình",
    "Standards": "Tiêu chuẩn",
    "Data": "Dữ liệu",
    "Stops": "Điều dừng",
    "7 asset classes listed with the reason each is in; 13 numbered exclusions with the reason each is out": "7 lớp tài sản liệt kê kèm lý do đưa vào; 13 mục loại trừ đánh số kèm lý do loại ra",
    "Grey box — two lowest-privilege test accounts, no source access": "Hộp xám — hai tài khoản test đặc quyền thấp nhất, không truy cập mã nguồn",
    "PTES, OWASP WSTG v4.2, OWASP Top 10 (2021), CVSS v3.1, safe harbour modelled on the HackerOne Gold Standard": "PTES, OWASP WSTG v4.2, OWASP Top 10 (2021), CVSS v3.1, safe harbour theo chuẩn vàng HackerOne",
    "No copying child or donor records · redacted screenshots · 30-day deletion · notify within 1 h for user impact, 24 h for exposed personal data": "Không sao chép hồ sơ trẻ em hay người quyên góp · ảnh chụp màn hình đã tẩy · xóa sau 30 ngày · báo trong 1 h nếu ảnh hưởng người dùng, 24 h nếu lộ dữ liệu cá nhân",
    "Seven named conditions halt everything, including finding an unauthenticated internal resource": "Bảy điều kiện đặt tên dừng mọi thứ, gồm cả việc phát hiện một tài nguyên nội bộ không cần xác thực",
    "NDA signed, engagement under way — phases 1–3 active, no findings reported yet": "Đã ký NDA, giao kèo đang thực hiện — các giai đoạn 1–3 hoạt động, chưa báo cáo phát hiện nào",

    /* case 002 — diagram (HTML svg text) */
    "GATES — nothing starts while a condition is still blank": "CỔNG — không gì bắt đầu khi điều kiện còn trống",
    "NDA · signed · assets": "NDA · đã ký · tài sản",
    "+ contact · blackout · IP": "+ liên hệ · cửa sổ cấm · IP",
    "+ ethics · staging data": "+ đạo đức · dữ liệu staging",
    "remediation confirmed": "đã xác nhận khắc phục",
    "PHASES": "GIAI ĐOẠN",
    "Recon": "Trinh sát",
    "Scan · enumerate": "Quét · liệt kê",
    "Analyse": "Phân tích",
    "Exploit": "Khai thác",
    "staging only": "chỉ staging",
    "Retest": "Test lại",
    "Report": "Báo cáo",
    "production ceiling — phases 1–3 only": "trần production — chỉ giai đoạn 1–3",
    "A-05S, synthetic data": "A-05S, dữ liệu nhân tạo",
    "Hard limits": "Giới hạn cứng",
    "≤ 5,000 requests/day · ≤ 5 req/s · ≤ 3 h per session · one declared static IP · payload ≤ 10 KB": "≤ 5.000 request/ngày · ≤ 5 req/s · ≤ 3 h/phiên · một IP tĩnh khai báo · payload ≤ 10 KB",
    "no brute force · no load testing · no social engineering · no automated exploitation": "không brute force · không load testing · không social engineering · không khai thác tự động",

    /* case 002 — diagram accessible name (svg title) */
    "Four gates control six phases. Gate 1 needs an NDA, a signed document and a confirmed asset list. Gate 2 adds a named contact, a blackout window, staging identification and a declared source IP. Gate 3 adds the academic ethics review and staging data. Gate 4 opens only when the charity confirms remediation in writing. The phases run recon, scanning and enumeration, vulnerability analysis, controlled exploitation, retest and reporting. Controlled exploitation is confined to the staging copy; production stops after vulnerability analysis.": "Bốn cổng kiểm soát sáu giai đoạn. Cổng 1 cần NDA, tài liệu đã ký và danh sách tài sản xác nhận. Cổng 2 thêm một liên hệ đặt tên, cửa sổ cấm, định danh staging và một IP nguồn khai báo. Cổng 3 thêm duyệt đạo đức học thuật và dữ liệu staging. Cổng 4 chỉ mở khi tổ chức xác nhận khắc phục bằng văn bản. Các giai đoạn chạy trinh sát, quét và liệt kê, phân tích lỗ hổng, khai thác có kiểm soát, test lại và báo cáo. Khai thác có kiểm soát bị giới hạn ở bản staging; production dừng sau phân tích lỗ hổng.",

    /* ── engagement: VFS (terminal `cat`) ──────────────────────────────── */
    "# Engagement design for an authorised charity assessment": "# Thiết kế giao kèo cho đánh giá từ thiện có cho phép",
    "Quỹ Nuôi Em runs a Next.js donation platform holding donor records and": "Quỹ Nuôi Em vận hành nền tảng quyên góp Next.js lưu hồ sơ người quyên góp và",
    "children profiles. Before testing anything, I wrote the document that has": "hồ sơ trẻ em. Trước khi test bất cứ thứ gì, tôi viết tài liệu phải được ký:",
    "to be signed: an 18-page statement of work and rules of engagement in two": "một bản ghi nhớ công việc và quy tắc giao chiến 18 trang gồm hai",
    "parts — the part a non-technical signer reads to decide, and the technical": "phần — phần người ký không chuyên đọc để quyết định, và phần kỹ thuật",
    "part that binds me — plus a two-page plain-language test plan so nobody": "ràng buộc tôi — cộng thêm kế hoạch test 2 trang viết bằng ngôn ngữ bình dân",
    "signs something they cannot follow.": "để không ai ký thứ họ không hiểu.",
    "SCOPE 7 asset classes listed with the reason each is in; 13 numbered": "PHẠM VI 7 lớp tài sản liệt kê kèm lý do đưa vào; 13 mục",
    "exclusions with the reason each is out. Assets on a look-alike": "loại trừ đánh số kèm lý do loại ra. Tài sản trên tên miền",
    "domain are out even if they carry the charity name — a signature": "giống mạo danh bị loại dù mang tên tổ chức — chữ ký",
    "for a domain the signer does not own is worth nothing. Public": "cho tên miền người ký không sở hữu chẳng giá trị gì. Các",
    "sources holding donor data are excluded by default.": "nguồn chứa dữ liệu người quyên góp bị loại trừ mặc định.",
    "MODEL grey box — two lowest-privilege test accounts, no source access": "MÔ HÌNH hộp xám — hai tài khoản test đặc quyền thấp nhất, không truy cập mã nguồn",
    "GATES G1 NDA + signed + assets · G2 + contact, blackout, IP ·": "CỔNG G1 NDA + đã ký + tài sản · G2 + liên hệ, cửa sổ cấm, IP ·",
    "G3 + ethics review, staging data · G4 remediation confirmed": "G3 + duyệt đạo đức, dữ liệu staging · G4 đã xác nhận khắc phục",
    "PHASES 1 recon · 2 scan · 3 analyse · 4 exploit (staging only) ·": "GIAI ĐOẠN 1 trinh sát · 2 quét · 3 phân tích · 4 khai thác (chỉ staging) ·",
    "5 retest · 6 report. Production stops after phase 3.": "5 test lại · 6 báo cáo. Production dừng sau giai đoạn 3.",
    "LIMITS ≤ 5,000 req/day · ≤ 5 req/s · ≤ 3 h/session · one declared": "GIỚI HẠN ≤ 5.000 request/ngày · ≤ 5 req/s · ≤ 3 h/phiên · một",
    "static IP · payload ≤ 10 KB · no brute force, load testing,": "IP tĩnh khai báo · payload ≤ 10 KB · không brute force, load testing,",
    "social engineering or automated exploitation": "social engineering hay khai thác tự động",
    "STOPS seven named conditions halt everything, including finding an": "DỪNG bảy điều kiện đặt tên dừng mọi thứ, gồm cả phát hiện một",
    "unauthenticated internal resource": "tài nguyên nội bộ không cần xác thực",
    "DATA no copying child or donor records · redacted screenshots ·": "DỮ LIỆU không sao chép hồ sơ trẻ em hay người quyên góp · ảnh đã tẩy ·",
    "30-day deletion · 1 h notify on user impact, 24 h on exposure": "xóa sau 30 ngày · báo 1 h nếu ảnh hưởng người dùng, 24 h nếu lộ",
    "BASIS PTES · OWASP WSTG v4.2 · OWASP Top 10 2021 · CVSS v3.1 ·": "CƠ SỞ PTES · OWASP WSTG v4.2 · OWASP Top 10 2021 · CVSS v3.1 ·",
    "safe harbour modelled on the HackerOne Gold Standard ·": "safe harbour theo chuẩn vàng HackerOne ·",
    "STATUS NDA signed — engagement under way, phases 1–3 active,": "TRẠNG THÁI đã ký NDA — giao kèo đang thực hiện, giai đoạn 1–3 hoạt động,",
    "no findings reported yet": "chưa báo cáo phát hiện nào",

    /* ── engagement: experience.log (terminal) ─────────────────────────── */
    "2026.10 — now Quỹ Nuôi Em · COS40005": "2026.10 — nay   Quỹ Nuôi Em · COS40005",
    "Authorised Security Assessment — Engagement": "Thiết kế giao kèo cho đánh giá an ninh có cho phép",
    "Design. quynuoiem.com, a Next.js donation": "Thiết kế. quynuoiem.com, một nền tảng quyên góp Next.js",
    "platform holding donor records and children": "nền tảng lưu hồ sơ người quyên góp và hồ sơ trẻ em",
    "profiles. Wrote the 18-page statement of work": "trẻ em. Viết bản ghi nhớ công việc 18 trang",
    "and rules of engagement plus a plain-language": "và quy tắc giao chiến cộng thêm kế hoạch test",
    "test plan. NDA signed — engagement under way,": "bằng ngôn ngữ bình dân. Đã ký NDA — giao kèo đang thực hiện,",
    "phases 1–3 running. No findings reported yet.": "các giai đoạn 1–3 đang chạy. Chưa báo cáo phát hiện nào.",
    "See projects/quynuoiem-engagement.md.": "Xem projects/quynuoiem-engagement.md.",
    "takeaway The hard part of a pentest is not the exploit —": "bài học Phần khó của pentest không phải là khai thác —",
    "it is writing down, before you start, what you": "mà là ghi rõ trước khi bắt đầu, chính xác những gì",
    "may touch and what you do when it breaks.": "được phép chạm vào và sẽ làm gì khi có sự cố.",
  };

  function lookup(key) {
    if (current === 'en') return key;
    var hit = Object.prototype.hasOwnProperty.call(VI, key) ? VI[key] : null;
    return typeof hit === 'string' && hit ? hit : key;
  }

  /**
   * Translate a string.
   *
   * Leading and trailing whitespace is preserved (the filesystem under ~ uses
   * two-space indents, and the HTML has newlines from source formatting), and
   * runs of whitespace inside the string are collapsed before the lookup. The
   * browser collapses those same runs when it renders, so the visible result is
   * unchanged while the keys stay short enough to actually maintain.
   */
  function t(source) {
    var s = String(source == null ? '' : source);
    var lead = s.slice(0, s.length - s.replace(/^\s+/, '').length);
    var trail = s.slice(s.replace(/\s+$/, '').length);
    var key = s.trim().replace(/\s+/g, ' ');
    return key ? lead + lookup(key) + trail : s;
  }

  /* ── The walk ─────────────────────────────────────────────────────────── */
  function isSkipped(node) {
    var p = node.parentNode;
    while (p && p !== document.body) {
      if (SKIP[p.tagName]) return true;
      if (p.hasAttribute && p.hasAttribute('data-i18n-skip')) return true;
      p = p.parentNode;
    }
    return false;
  }

  function walkText(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return isSkipped(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var batch = [];
    var n;
    while ((n = walker.nextNode())) batch.push(n);
    batch.forEach(function (node) {
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      node.nodeValue = t(originals.get(node));
    });
  }

  function walkAttrs(root) {
    var nodes = root.querySelectorAll('[aria-label],[title],[placeholder]');
    Array.prototype.forEach.call(nodes, function (el) {
      if (SKIP[el.tagName] || el.hasAttribute('data-i18n-skip')) return;
      if (!attrOriginals.has(el)) {
        var store = {};
        ATTRS.forEach(function (a) {
          if (el.hasAttribute(a)) store[a] = el.getAttribute(a);
        });
        attrOriginals.set(el, store);
      }
      var stored = attrOriginals.get(el);
      ATTRS.forEach(function (a) {
        if (a in stored) el.setAttribute(a, t(stored[a]));
      });
    });
  }

  /* ── Applying a language ──────────────────────────────────────────────── */
  function apply() {
    if (document.body) {
      walkText(document.body);
      walkAttrs(document.body);
    }

    document.documentElement.setAttribute('lang', current);

    /* The browser tab. Crawlers and unfurlers keep the English <head> copy —
       only the live document changes. */
    if (!titleOriginal && document.title) titleOriginal = document.title;
    if (titleOriginal) document.title = t(titleOriginal);

    var code = document.getElementById('langCode');
    if (code) code.textContent = current === 'vi' ? 'VI' : 'EN';
  }
  var titleOriginal = '';

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
  }

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) { /* private mode */ }
    var nav = (navigator.language || navigator.languages && navigator.languages[0] || 'en').toLowerCase();
    return nav.indexOf('vi') === 0 ? 'vi' : 'en';
  }

  /* ── Public surface, used by app.js and the toggle button ─────────────── */
  var api = {
    t: t,
    lang: function () { return current; },
    languages: SUPPORTED.slice(),
    set: setLang,
    toggle: function () { setLang(current === 'vi' ? 'en' : 'vi'); },
  };
  window.t = t;
  window.i18n = api;

  var btn = document.getElementById('langToggle');
  if (btn) btn.addEventListener('click', api.toggle);

  setLang(detect());
})();
