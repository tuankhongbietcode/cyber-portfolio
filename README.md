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
point the DNS at GitHub. The canonical URL, `og:url` and `og:image` are rewritten
at runtime from `location.origin`, so the site works on any domain without
editing the HTML.

## Notes

- `dist/portrait-data.js` is a generated artifact. Regenerating it requires the
  original portrait source; the checked-in file is the source of truth for the
  deployed site.
- Both themes are selectable and the choice is not persisted — a reload returns
  to the system preference.
