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

The site ships with **no analytics and no third-party requests**. Nothing loads
until you opt in by pasting a website ID into `dist/index.html`.

### Turning it on

1. Sign up at <https://cloud.umami.is/signup>. The **Hobby** plan is free —
   100k events per month, one website, six months of history.
2. **Add website** → any name, domain `tuankhongbietcode.github.io`.
3. Copy the **website ID** (a UUID).
4. Paste it into the analytics block near the bottom of `dist/index.html`:

   ```js
   var WEBSITE_ID = ""; // ← paste the Umami website ID here to switch it on
   ```

5. Commit and push. The next deploy starts collecting.

### What it records

| Question | Answer |
| --- | --- |
| When | Every pageview, timestamped — live view plus daily and monthly trends |
| Where | Country → region → city, derived from the request IP and then discarded |
| Device | Browser, operating system, device class, screen size, language |
| Source | Referrer — which site, search engine or profile sent the visit |

### What it cannot record

**It cannot tell you who visited.** A website has no way to identify a person.
You get an IP-derived city — not a name, not an email, not an address. Everyone
on a shared network (an office, a university, a VPN) looks like one visitor, and
Umami does not store the IP at all, so it cannot be looked up afterwards either.
Identifying a visitor requires a login, and this site deliberately has none.

### Why Umami

- No cookies, no fingerprinting, no personal data — GDPR and CCPA compliant, and
  no cookie banner is required.
- `data-domains` keeps localhost and forks out of the statistics.
- `data-do-not-track` honours the browser setting for visitors who opt out.
- `data-exclude-hash` matters here specifically: the site navigates by
  `#work`-style anchors, which would otherwise be logged as separate pages.

**GoatCounter** is the lighter alternative if you would rather not use Umami —
one script tag, free under 10k pageviews per month, but country-level location
only. Replace the analytics block with:

```html
<script data-goatcounter="https://MYCODE.goatcounter.com/count"
        async src="https://gc.zgo.at/count.js"></script>
```

## Notes

- `dist/portrait-data.js` is a generated artifact. Regenerating it requires the
  original portrait source; the checked-in file is the source of truth for the
  deployed site.
- Both themes are selectable and the choice is not persisted — a reload returns
  to the system preference.
