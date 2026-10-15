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
    "Cybersecurity student at Swinburne and IT intern at Got It. I started in IT support, moved through networks and SIEM, and now train toward offensive security — which means I read an attack path from both sides. Method first, evidence always, no inflated claims.": "Sinh viên an ninh mạng tại Swinburne và thực tập sinh IT tại Got It. Tôi bắt đầu từ hỗ trợ IT, đi qua mạng và SIEM, rồi chuyển sang luyện an ninh mạng tấn công — nên tôi đọc được đường tấn công từ cả hai phía. Phương pháp đi trước, bằng chứng luôn có, không thổi phồng.",
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
    "Information Technology Intern": "Thực tập sinh Công nghệ Thông tin",
    "Day-to-day IT support inside a live Microsoft 365 environment — accounts, devices and the tickets that sit between them. Where the theory meets an actual user at 9am.": "Hỗ trợ IT hằng ngày trong môi trường Microsoft 365 đang chạy thật — tài khoản, thiết bị và các ticket nằm giữa chúng. Nơi lý thuyết gặp người dùng thật lúc 9 giờ sáng.",
    "Environment": "Môi trường",
    "Microsoft 365 tenant · live users, no sandbox": "Tenant Microsoft 365 · người dùng thật, không sandbox",
    "Owned": "Phụ trách",
    "Account lifecycle, endpoint support, ticket triage": "Vòng đời tài khoản, hỗ trợ thiết bị đầu cuối, phân loại ticket",
    "Output": "Kết quả",
    "Resolved tickets, working accounts and devices": "Ticket đã xử lý, tài khoản và thiết bị hoạt động",
    "Takeaway": "Bài học",
    "Endpoint support": "Hỗ trợ thiết bị đầu cuối",
    "Ticket triage": "Phân loại ticket",
    "IT operations": "Vận hành IT",
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
    "Add a redacted screenshot here": "Thêm ảnh chụp đã che thông tin ở đây",
    "Redacted Splunk dashboard — replace with a real capture before publishing.": "Dashboard Splunk đã che thông tin — thay bằng ảnh chụp thật trước khi công bố.",
    "Redacted web application finding — replace with a real capture before publishing.": "Phát hiện trên ứng dụng web đã che thông tin — thay bằng ảnh chụp thật trước khi công bố.",
    "Lab screenshot — add a capture from an authorised engagement.": "Ảnh chụp lab — thêm ảnh từ một engagement có cho phép.",

    /* case 001 — splunk */
    "Distributed Splunk & multi-source log onboarding": "Onboarding log đa nguồn trên Splunk phân tán",
    "One deployment, five log families, validated end to end — then dashboards and alerts someone would actually act on.": "Một bộ triển khai, năm họ log, kiểm chứng từ đầu đến cuối — rồi dashboard và cảnh báo mà người ta thật sự sẽ hành động.",
    "Stood up Splunk Enterprise as a distributed deployment — a Deployment Server pushing config to universal forwarders across mixed hosts — then brought several log families into one searchable surface: Windows Event Log, Sysmon, Linux syslog, web application logs and firewall/syslog feeds.": "Dựng Splunk Enterprise dưới dạng triển khai phân tán — Deployment Server đẩy cấu hình xuống universal forwarder trên nhiều hệ điều hành — rồi gộp nhiều họ log về một bề mặt tìm kiếm: Windows Event Log, Sysmon, Linux syslog, log ứng dụng web và firewall/syslog.",
    "The work that mattered was after ingestion: confirming events actually arrived, fixing field extraction where sourcetypes mis-parsed, and normalising time before anything was trusted.": "Phần quan trọng nằm sau khi thu thập: xác nhận sự kiện thật sự đến, sửa trích xuất trường ở chỗ sourcetype parse sai, và chuẩn hóa thời gian trước khi tin vào bất cứ thứ gì.",
    "Five log sources feed universal forwarders across mixed hosts. The forwarders send events to a distributed Splunk Enterprise deployment — indexer and search head — which produces dashboards, alerts, reports and POC documentation. A deployment server pushes app and configuration to the forwarders.": "Năm nguồn log đổ vào universal forwarder trên nhiều hệ điều hành. Các forwarder gửi sự kiện tới bộ triển khai Splunk Enterprise phân tán — indexer và search head — tạo ra dashboard, cảnh báo, báo cáo và tài liệu POC. Deployment Server đẩy app và cấu hình xuống các forwarder.",
    "SOURCES": "NGUỒN",
    "FORWARDING": "CHUYỂN TIẾP",
    "OUTPUT": "ĐẦU RA",
    "app + config push": "đẩy app + cấu hình",
    "Web application": "Ứng dụng web",
    "mixed OS hosts": "nhiều hệ điều hành",
    "parse · index · normalise time": "parse · index · chuẩn hóa thời gian",
    "SPL · correlate across sources": "SPL · tương quan giữa các nguồn",
    "Dashboards": "Dashboard",
    "Alerts": "Cảnh báo",
    "Reports": "Báo cáo",
    "POC docs": "Tài liệu POC",
    "Scroll the diagram sideways to see all of it.": "Cuộn ngang sơ đồ để xem toàn bộ.",
    "Five log families, one searchable surface. The Deployment Server is the control plane: pushing app and config from one place is what keeps parsing consistent across hosts nobody configured by hand.": "Năm họ log, một bề mặt tìm kiếm. Deployment Server là control plane: đẩy app và cấu hình từ một chỗ duy nhất là thứ giữ cho việc parse nhất quán trên những host không ai cấu hình tay.",
    "Collect": "Thu thập",
    "Parse": "Parse",
    "Normalise": "Chuẩn hóa",
    "Validate": "Kiểm chứng",
    "Stack": "Stack",
    "Sources": "Nguồn",
    "Dashboards, reports, alerts, POC documentation": "Dashboard, báo cáo, cảnh báo, tài liệu POC",
    "Detection is downstream of data quality. The onboarding work — sourcetypes, extraction, time — is what decides whether the alert fires on the right thing.": "Phát hiện nằm phía sau chất lượng dữ liệu. Công việc onboarding — sourcetype, trích xuất, thời gian — mới quyết định cảnh báo có bắn đúng mục tiêu hay không.",

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
    "Microsoft 365 environment support — accounts, devices, the lifecycle between them": "Hỗ trợ môi trường Microsoft 365 — tài khoản, thiết bị, vòng đời giữa chúng",
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
    "cybersecurity student · IT intern · Ho Chi Minh City": "sinh viên an ninh mạng · thực tập sinh IT · TP. Hồ Chí Minh",
    "Information Technology Intern @ Got It": "Thực tập sinh Công nghệ Thông tin @ Got It",
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
    "Cybersecurity student · IT intern": "Sinh viên an ninh mạng  ·  thực tập sinh IT",
    "EDUCATION": "HỌC VẤN",
    "CURRENT": "HIỆN TẠI",
    "HOW I GOT HERE": "TÔI ĐẾN ĐÂY BẰNG CÁCH NÀO",
    "I came up through the infrastructure side — VLANs, firewalls,": "Tôi đi lên từ mảng hạ tầng — VLAN, firewall,",
    "virtual labs — then moved into Splunk and log pipelines, and from": "lab ảo — rồi chuyển sang Splunk và pipeline log, và từ",
    "there toward offensive security. Reading an attack path from both": "đó tiến tới an ninh mạng tấn công. Đọc đường tấn công từ cả",
    "sides is the entire point.": "hai phía là toàn bộ ý nghĩa.",
    "No certification is claimed here that I do not hold.": "Không chứng chỉ nào được tuyên bố ở đây mà tôi chưa có.",
    "2026.09 — now Got It Information Technology Intern": "2026.09 — nay      Got It    Thực tập sinh CNTT",
    "Microsoft 365 tenant, live users, no sandbox.": "Tenant Microsoft 365 · người dùng thật, không sandbox.",
    "Account lifecycle, endpoint support, ticket": "Vòng đời tài khoản, hỗ trợ thiết bị đầu cuối,",
    "triage. Production — no rollback button.": "phân loại ticket. Production — không có nút rollback.",
    "takeaway The fastest way to understand an organisation is": "bài học                  Cách nhanh nhất để hiểu một tổ chức là",
    "to sit where its users hit friction.": "ngồi đúng chỗ người dùng của họ gặp vướng mắc.",
    "2026.05 — 2026.08 VNCS Security Consultant Intern": "2026.05 — 2026.08  VNCS      Thực tập sinh Tư vấn An ninh mạng",
    "Distributed Splunk Enterprise — Deployment": "Splunk Enterprise phân tán — Deployment",
    "Server pushing config to universal forwarders.": "Server đẩy cấu hình xuống universal forwarder.",
    "Onboarded Windows Event, Sysmon, Linux, web app": "Đưa vào log Windows Event, Sysmon, Linux, web app",
    "and firewall logs. Field extraction, time": "và firewall. Trích xuất trường, chuẩn hóa",
    "normalisation, dashboards, alerting, POC docs.": "thời gian, dashboard, cảnh báo, tài liệu POC.",
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
    "Log, Sysmon, Linux syslog, web application logs and firewall feeds.": "Windows Event Log, Sysmon, Linux syslog, log ứng dụng web và firewall.",
    "The work that mattered was after ingestion: confirming events actually": "Phần quan trọng nằm sau khi thu thập: xác nhận sự kiện thật sự",
    "arrived, fixing field extraction where sourcetypes mis-parsed, normalising": "đến, sửa trích xuất trường ở chỗ sourcetype parse sai, chuẩn hóa",
    "time, and turning the result into dashboards and alerts someone would act on.": "thời gian, và biến kết quả thành dashboard và cảnh báo mà người ta sẽ hành động.",
    "FLOW collect → parse → normalise → validate": "FLOW     thu thập → parse → chuẩn hóa → kiểm chứng",
    "OUTPUT dashboards, reports, alerts, POC documentation": "OUTPUT   dashboard, báo cáo, cảnh báo, tài liệu POC",
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
