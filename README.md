# vlat273 — portfolio

Terminal-first portfolio for **Võ Lê Anh Tuấn**. One page, no framework, no build
step: everything in `dist/` is exactly what ships.

## Layout

| Path | What it is |
| --- | --- |
| `dist/index.html` | The page — markup, structured data, theme bootstrap |
| `dist/styles.css` | All styling: both themes, the diagram type scale, print rules |
| `dist/app.js` | Page chrome, the virtual filesystem, the terminal |
| `dist/portrait.js` | The halftone portrait canvas |
| `dist/portrait-data.js` | Generated glyph grid, base64 |
| `dist/fonts/` | Self-hosted JetBrains Mono and Inter subsets |
| `writeups/` | CTF writeup plan and template |
| `analytics/` | Self-hosted Cloudflare Worker that logs visits — never published, only `dist/` ships |
| `.github/workflows/pages.yml` | Publishes `dist/` to GitHub Pages |

## Running it locally

Any static server works. There is nothing to compile.

```bash
cd dist
python -m http.server 8000
```

Then open <http://localhost:8000>.

Use a server rather than opening `dist/index.html` directly: over `file://` the
font preloads and the manifest fetch fail, and the portrait will not render
correctly.

## The terminal

The prompt at the top is real — it has a virtual filesystem and a couple of
dozen commands.

```
help              list every command
ls / cd / cat     walk the virtual filesystem
tree / pwd        listing and working directory
open              open a case file or section
goto              jump to a section
whoami            who is behind this
neofetch          summary card
theme light       switch theme
```

`Tab` completes and cycles through matches, `↑` / `↓` walk history, and `Ctrl+K`
opens the terminal fullscreen.

## Editing content

Content lives in the HTML — there is no CMS and no template step. Experience
entries, case files and toolkit rows are plain markup in `dist/index.html`.

The virtual filesystem in `app.js` mirrors that same content, so when you change
one, change the other, or the terminal will start contradicting the page.

## Deploying

Push to `main`. `.github/workflows/pages.yml` publishes `dist/` to GitHub Pages.

To use a custom domain, add it under **Settings → Pages → Custom domain** and
point the DNS at GitHub. Then update the absolute `canonical`, `og:url` and
`og:image` values in `dist/index.html`. They are baked in rather than relative
because LinkedIn and Slack do not run JavaScript, so a relative URL never
resolves for them. The inline script re-derives the same values from `location`,
so the page stays correct for browsers either way.

## Visitor analytics

The site ships with **no analytics and no third-party requests**. Nothing is sent
anywhere until you opt in by setting an endpoint in `dist/index.html`.

There are two ways to switch it on. Pick one.

### Option A — self-hosted (own your data)

A Cloudflare Worker in [`analytics/`](analytics/) receives the beacon and writes
it into your own D1 database. You own the code, the database and the data, and
the **raw visitor IP is stored**. Free tier, no analytics vendor in the path.

Full instructions live in [`analytics/README.md`](analytics/README.md). The
short version:

```bash
cd analytics
bash setup.sh
```

`setup.sh` installs its own copy of wrangler under `~/.wrangler-cli` rather than
going through `npx` — see [why](analytics/README.md#why-not-npx).

Then point the page at it, in `dist/index.html`:

```js
var ENDPOINT = "https://portfolio-analytics.<your-subdomain>.workers.dev/collect";
```

### Option B — Umami (nothing to run)

If you would rather not operate anything yourself, hosted Umami needs one line.
The **Hobby** plan is free — 100k events per month, one website. Sign up at
<https://cloud.umami.is/signup>, add `tuankhongbietcode.github.io` as a website,
then replace the beacon block with:

```html
<script defer src="https://cloud.umami.is/script.js"
        data-website-id="YOUR-WEBSITE-ID"
        data-domains="tuankhongbietcode.github.io"
        data-do-not-track="true"
        data-exclude-hash="true"></script>
```

Umami sets no cookies and never stores the IP, so it needs no privacy notice —
but you do not get the raw IP either, and the dashboard is theirs, not yours.

### What you get either way

| Question | Answer |
| --- | --- |
| When | Every pageview, timestamped — live view plus daily and monthly trends |
| Where | Country → region → city, derived from the IP at the edge |
| Device | Browser, operating system, device class, screen size, language |
| Source | Referrer — which site, search engine or profile sent the visit |
| Network | ASN and organisation — self-hosted only |
| Raw IP | Self-hosted only |

### What neither can record

**You cannot find out who visited.** A website has no way to identify a person.
You get an IP-derived city — not a name, not an email, not an address. Everyone
on a shared network (an office, a university, a VPN) looks like a single
visitor. Identifying a visitor requires a login, and this site deliberately has
none.

The self-hosted option *does* store the IP, which is personal data under the
GDPR and under Vietnam's Decree 13. See the Privacy section of
[`analytics/README.md`](analytics/README.md): retention is configurable and
defaults to 90 days, and dropping the IP column is a one-line change if you
change your mind.

### Notes

- Both options respect Do Not Track — the beacon checks `navigator.doNotTrack`
  before sending.
- The site navigates by `#work`-style anchors. Umami needs `data-exclude-hash`
  or a section jump is counted as a new page; the self-hosted beacon sends
  `location.pathname` only, so it is unaffected.
- The beacon uses `text/plain` so it stays a CORS *simple request* — one
  request, no preflight.
- Ad blockers stop roughly a third of real visitors from being counted at all.
  That is normal and applies to every analytics tool, including this one.

## Notes

- `dist/portrait-data.js` is a generated artifact. Regenerating it requires the
  original portrait source; the checked-in file is the source of truth for the
  deployed site.
- Both themes are selectable and the choice is not persisted — a reload returns
  to the system preference.
