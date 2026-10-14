#!/usr/bin/env bash
#
# One-shot setup for the portfolio analytics Worker.
#
#   cd analytics
#   bash setup.sh
#
# It logs you in, creates the D1 database, applies the schema, sets a dashboard
# token, deploys the Worker, and wires the resulting URL into ../dist/index.html.
#
# Safe to re-run: it reuses an existing database_id and never rotates the token
# unless you delete it first.

set -euo pipefail

WR="npx --yes wrangler@latest"
DB_NAME="portfolio-analytics"
TOML="wrangler.toml"
SITE_HTML="../dist/index.html"
PLACEHOLDER="PASTE_YOUR_DATABASE_ID_HERE"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m    %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m    %s\033[0m\n' "$1"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "Node is required. Install Node 18+ first."
[ -f "$TOML" ]      || die "Run this from inside the analytics/ directory."
[ -f "schema.sql" ] || die "schema.sql is missing."

# ---------------------------------------------------------------- 1. login

say "1/6  Cloudflare login"
if $WR whoami >/dev/null 2>&1; then
  ok "Already logged in."
else
  echo "    A browser window will open. Click Allow, then come back here."
  $WR login
fi

# ------------------------------------------------------- 2. D1 database

say "2/6  D1 database"

CURRENT_ID="$(grep -oE "database_id *= *\"[^\"]*\"" "$TOML" | head -1 | sed 's/.*"\(.*\)"/\1/' || true)"

if [ -n "$CURRENT_ID" ] && [ "$CURRENT_ID" != "$PLACEHOLDER" ]; then
  DB_ID="$CURRENT_ID"
  ok "wrangler.toml already points at $DB_ID — reusing it."
else
  OUT="$($WR d1 create "$DB_NAME" 2>&1 || true)"
  printf '%s\n' "$OUT"

  DB_ID="$(printf '%s' "$OUT" | grep -oE "database_id *= *\"[^\"]+\"" | head -1 | sed 's/.*"\(.*\)"/\1/' || true)"

  if [ -z "$DB_ID" ]; then
    warn "Could not read a database_id from that output."
    warn "If the database already exists, find its id with:"
    warn "  npx wrangler@latest d1 list"
    printf '    Paste the database_id here: '
    read -r DB_ID
  fi

  [ -n "$DB_ID" ] || die "No database_id, stopping."

  node -e '
    const fs = require("fs");
    const p = process.argv[1], id = process.argv[2];
    let s = fs.readFileSync(p, "utf8");
    s = s.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${id}"`);
    fs.writeFileSync(p, s);
  ' "$TOML" "$DB_ID"

  ok "Wrote database_id into $TOML."
fi

# -------------------------------------------------------------- 3. schema

say "3/6  Applying schema"
$WR d1 execute "$DB_NAME" --remote --file=./schema.sql
ok "Table and indexes are in place."

# -------------------------------------------------------------- 4. token

say "4/6  Dashboard token"
if [ -n "${ROTATE_TOKEN:-}" ]; then
  warn "ROTATE_TOKEN is set — generating a new token."
fi

if [ -n "${ROTATE_TOKEN:-}" ] || ! $WR secret list 2>/dev/null | grep -q "DASHBOARD_TOKEN"; then
  TOKEN="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  printf '%s' "$TOKEN" | $WR secret put DASHBOARD_TOKEN >/dev/null
  ok "Generated and stored a new token."
else
  TOKEN=""
  ok "DASHBOARD_TOKEN already exists — left untouched."
fi

# -------------------------------------------------------------- 5. deploy

say "5/6  Deploying"
OUT="$($WR deploy 2>&1 || true)"
printf '%s\n' "$OUT"

WORKER_URL="$(printf '%s' "$OUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.workers\.dev' | head -1 || true)"
[ -n "$WORKER_URL" ] || die "Could not read the Worker URL from the deploy output. Run 'npx wrangler@latest deploy' by hand."

ok "Worker is live at $WORKER_URL"

# ------------------------------------------------------- 6. wire the site

say "6/6  Pointing the site at it"

if [ ! -f "$SITE_HTML" ]; then
  warn "$SITE_HTML not found — set ENDPOINT by hand:"
  warn "  $WORKER_URL/collect"
else
  node -e '
    const fs = require("fs");
    const p = process.argv[1], endpoint = process.argv[2];
    let s = fs.readFileSync(p, "utf8");
    if (!/var ENDPOINT = "[^"]*"/.test(s)) {
      console.error("ENDPOINT line not found in " + p);
      process.exit(1);
    }
    s = s.replace(/var ENDPOINT = "[^"]*"/, `var ENDPOINT = "${endpoint}"`);
    fs.writeFileSync(p, s);
  ' "$SITE_HTML" "$WORKER_URL/collect"

  ok "Set ENDPOINT in $SITE_HTML"
fi

# ------------------------------------------------------------- summary

printf '\n\033[1;32m%s\033[0m\n' "================================================"
printf '\033[1;32m  Done.\033[0m\n'
printf '\033[1;32m%s\033[0m\n' "================================================"

printf '\n  Dashboard : %s/?token=%s\n' "$WORKER_URL" "${TOKEN:-<your-existing-token>}"
printf '  Endpoint  : %s/collect\n' "$WORKER_URL"

if [ -n "$TOKEN" ]; then
  printf '\n  \033[1;33mYour dashboard token (save it now):\033[0m\n\n    %s\n' "$TOKEN"
  printf '\n  The dashboard URL above exchanges it for a cookie and strips it from\n'
  printf '  the address bar. To change it later:\n'
  printf '    npx wrangler@latest secret put DASHBOARD_TOKEN\n'
fi

printf '\n  Next:\n'
printf '    1. Open the dashboard URL and confirm you can see it.\n'
printf '    2. Commit the changed files and push:\n\n'
printf '         cd .. && git add -A && git commit -m "chore: enable analytics endpoint" && git push\n\n'
printf '    3. Load your portfolio and watch a row appear.\n\n'
