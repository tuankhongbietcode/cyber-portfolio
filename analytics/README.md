# Portfolio analytics — self-hosted

A single Cloudflare Worker that logs visits to the portfolio site into your own
D1 database, and serves a dashboard for reading them.

You own the code, the database and the data. No analytics vendor is involved,
and the visitor IP is stored — which is the whole point, and also the whole
risk. Read [Privacy](#privacy) before pointing real traffic at it.

## Why this needs a Worker at all

The portfolio is served by **GitHub Pages, which only serves static files**.
No code of yours runs on that server, so there is nowhere on GitHub Pages to
*receive* a visit. Something else has to accept the data. That something can be:

| | This Worker | Hosted analytics (Umami) | VPS |
| --- | --- | --- | --- |
| Code is yours | ✅ | ❌ | ✅ |
| Database is yours | ✅ | ❌ | ✅ |
| Raw visitor IP | ✅ stored | ❌ never stored | ✅ |
| Setup effort | ~10 minutes | paste one UUID | hours |
| Upkeep | occasional | none | you own it |
| Cost | free tier | free tier | ~$5/month |

There is no fourth option where nothing external is involved. A static host
cannot log anything.

## What it records

Everything below comes from the request itself. Geolocation is read from
`request.cf`, which **Cloudflare fills in at the edge** — so there is no
third-party geolocation API in the path.

| Field | Source |
| --- | --- |
| `ts` | Worker clock, ISO 8601 UTC |
| `ip` | `CF-Connecting-IP` header — the real client address |
| `country`, `region`, `city` | `request.cf` |
| `latitude`, `longitude` | `request.cf` |
| `timezone`, `asn`, `org` | `request.cf` — e.g. ASN 7552, "Viettel Group" |
| `ua` | `User-Agent` header |
| `device`, `browser` | Derived from the User-Agent |
| `screen`, `lang` | Sent by the page beacon |
| `path`, `referrer` | Sent by the page beacon |

Bots are filtered out at ingest and not stored. Requests with no `User-Agent`
count as bots.

## Deploy

You need a Cloudflare account (the free one is enough) and Node installed.

### The short way

```bash
cd analytics
bash setup.sh
```

That logs you in, creates the database, applies the schema, generates and stores
a dashboard token, deploys the Worker, and writes the endpoint into
`../dist/index.html` for you.

**Save the token it prints at the end.** It goes into a Worker secret and cannot
be read back afterwards — if you lose it, set a new one.

Re-running is safe: it reuses an existing `database_id` and leaves the token
alone. To force a fresh token, run `ROTATE_TOKEN=1 bash setup.sh`.

The first run installs wrangler into `~/.wrangler-cli` (about 170 MB, once). It
does **not** use `npx` — see [Why not npx](#why-not-npx) below.

### The manual way

If you would rather run each step yourself:

```bash
cd analytics

# 0. Install wrangler into its own directory, once. setup.sh does this for you;
#    this is the same thing by hand.
mkdir -p ~/.wrangler-cli && cd ~/.wrangler-cli
npm install wrangler@latest --ignore-scripts --omit=dev
cd - >/dev/null

WR=~/.wrangler-cli/node_modules/.bin/wrangler

# 1. Log in — opens a browser once.
"$WR" login

# 2. Create the database. This prints a database_id.
"$WR" d1 create portfolio-analytics

# 3. Paste that id into wrangler.toml, replacing PASTE_YOUR_DATABASE_ID_HERE.

# 4. Create the table.
"$WR" d1 execute portfolio-analytics --remote --file=./schema.sql

# 5. Set the dashboard password. Pick something long and random.
"$WR" secret put DASHBOARD_TOKEN

# 6. Ship it. This prints your workers.dev URL.
"$WR" deploy
```

The deploy output gives you a URL like
`https://portfolio-analytics.<your-subdomain>.workers.dev`.

**Then turn the site on:** open `dist/index.html`, find the analytics block near
the bottom, and set the endpoint to that URL plus `/collect`:

```js
var ENDPOINT = "https://portfolio-analytics.<your-subdomain>.workers.dev/collect";
```

Commit and push. The next deploy starts collecting.

## Reading the dashboard

Visit your Worker URL and append the token once:

```
https://portfolio-analytics.<your-subdomain>.workers.dev/?token=YOUR_TOKEN
```

The token is exchanged for an HttpOnly cookie and stripped from the URL, so you
do not need to keep it in the address bar. `?days=7` changes the range, and
`/api/stats?days=30` returns the same data as JSON.

If `DASHBOARD_TOKEN` is not set, the Worker refuses to serve the dashboard at
all rather than exposing it.

## Privacy

**This tool stores personal data, and that has consequences.** Recording an IP
address alongside a timestamp is processing personal data under the GDPR, and
under Vietnam's Decree 13/2023 on personal data protection. Concretely:

- Anyone can request access to, or deletion of, the data you hold about them.
  With D1 that is a `SELECT` or a `DELETE`.
- If you ever collect from EU visitors, you need a lawful basis and a privacy
  notice that mentions what you log and why.
- The IP is the sensitive part. City-level location and device class are not
  identifying on their own; an IP often is.

Practical mitigation, already implemented:

- **Retention sweep.** Rows older than `RETENTION_DAYS` (90 by default) are
  deleted automatically. Set it to `0` in `wrangler.toml` to disable, but a
  shorter window is the single most effective privacy control you have.
- **Bots are not stored**, so the database stays small and meaningful.

If you decide you would rather not hold IPs at all, the change is one line —
drop the `ip` column from the `INSERT` and from `schema.sql`. You keep country,
city, device and referrer, which is what hosted analytics would give you
anyway.

**A portfolio is read by recruiters.** Whatever you collect, they can infer that
you collect it. A short, honest note is a better look on a security portfolio
than silence.

## Cost

Cloudflare Workers free plan includes 100,000 requests per day. A portfolio will
not come close. D1 has its own free allowance and the retention sweep keeps the
table small. Check Cloudflare's current pricing page before relying on any
specific number — it changes.

## Maintenance

Every command below assumes the private install, which `setup.sh` creates:

```bash
WR=~/.wrangler-cli/node_modules/.bin/wrangler
```

| Task | Command |
| --- | --- |
| Tail live logs | `"$WR" tail` |
| Re-apply schema | `"$WR" d1 execute portfolio-analytics --remote --file=./schema.sql` |
| Query by hand | `"$WR" d1 execute portfolio-analytics --remote --command "SELECT * FROM visits ORDER BY ts DESC LIMIT 20"` |
| Rotate the token | `"$WR" secret put DASHBOARD_TOKEN` |
| Delete everything | `"$WR" d1 execute portfolio-analytics --remote --command "DELETE FROM visits"` |

## Why not npx

`setup.sh` installs wrangler into `~/.wrangler-cli` instead of running
`npx wrangler@latest`, and passes `--ignore-scripts`.

On Windows, npx caches each install under `%LOCALAPPDATA%\npm-cache\_npx\<hash>`.
If that install fails part-way through, the half-built entry stays on disk and
every later `npx wrangler` **reuses it instead of retrying**, so the same error
repeats forever:

```
Error: The package "@cloudflare/workerd-windows-64" could not be found,
and is needed by workerd.
```

The half-built tree happens when a postinstall script fails and npm rolls the
tree back but the rollback cannot complete — which leaves wrangler installed
with its platform binaries stripped out. `esbuild`'s postinstall is the usual
trigger.

Two properties make the private install immune:

- **Its own directory**, so no stale cache entry is ever reused.
- **`--ignore-scripts`**, so no postinstall runs, so nothing fails and nothing
  rolls back. This is safe because every platform binary (`workerd`, `esbuild`,
  `sharp`) ships as an optional *dependency* rather than being downloaded by a
  postinstall script.

If you ever need to start over:

```bash
rm -rf ~/.wrangler-cli
```

The stale npx entry is then just dead weight — safe to remove, and it will be
recreated if anything else uses npx:

```bash
rm -rf "$LOCALAPPDATA/npm-cache/_npx"
```

## Tests

The pure helpers are unit tested and run in plain Node — no Cloudflare account,
no network:

```bash
npm test
```

## Layout

| Path | What it is |
| --- | --- |
| `src/index.js` | The whole Worker: ingest, auth, queries, dashboard |
| `schema.sql` | D1 table and indexes |
| `wrangler.toml` | Worker name, D1 binding, allowed origin, retention |
| `setup.sh` | One-shot deploy: installs wrangler, login, database, schema, token, deploy, wire the site |
| `test/helpers.test.mjs` | Unit tests for the pure helpers |
| `test/worker.test.mjs` | Integration tests against a stubbed D1 binding |

## Design notes

- **The dashboard escapes everything.** `User-Agent` and `Referer` are
  attacker-controlled. Rendering them raw would make the dashboard itself a
  stored-XSS delivery mechanism, so every value goes through `escapeHtml()`
  first. There is a test for the payload that breaks out of an HTML attribute.
- **The token comparison is constant-time.** A byte-by-byte early return would
  leak the token's length and prefix through timing.
- **Bots get a `202`, not a `403`.** A filtered bot learns nothing about whether
  it was filtered.
- **No cookie is set for visitors.** The only cookie is the dashboard token,
  and only on the dashboard, and only after you supply it.
