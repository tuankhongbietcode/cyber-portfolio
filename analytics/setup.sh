#!/usr/bin/env bash
#
# One-shot setup for the portfolio analytics Worker.
#
# From PowerShell, call it with the full path to bash:
#
#   & "$env:USERPROFILE\.workbuddy-ai\binaries\PortableGit\versions\1.2.0\bin\bash.exe" setup.sh
#
# From any shell that already has bash on its PATH:
#
#   bash setup.sh
#
# It logs you in, creates the D1 database, applies the schema, sets a dashboard
# token, deploys the Worker, and wires the resulting URL into ../dist/index.html.
#
# Safe to re-run: it reuses an existing database_id and never rotates the token
# unless you delete it first.
#
# This script installs its own copy of wrangler under ~/.wrangler-cli and does
# NOT use `npx`. Step 0 explains why — short version: the npx cache on Windows
# can get stuck half-installed, and once it is, every retry reuses it.

set -euo pipefail

DB_NAME="portfolio-analytics"
TOML="wrangler.toml"
SITE_HTML="../dist/index.html"
PLACEHOLDER="PASTE_YOUR_DATABASE_ID_HERE"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m    %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m    %s\033[0m\n' "$1"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

[ -f "$TOML" ]      || die "Run this from inside the analytics/ directory."
[ -f "schema.sql" ] || die "schema.sql is missing."

# ------------------------------------------------------------------ 0. tools
#
# Two things are needed: a `node` binary, and a working `wrangler`.
#
# We deliberately do NOT use `npx wrangler@latest`.
#
# On Windows, npx installs into a cache keyed by the package spec
# (%LOCALAPPDATA%\npm-cache\_npx\<hash>). If that install fails part-way
# through, the entry is left half-built, and every later `npx wrangler` reuses
# it instead of retrying — so the same error repeats forever:
#
#   Error: The package "@cloudflare/workerd-windows-64" could not be found
#
# The half-built tree comes from a rollback that did not finish. esbuild's
# postinstall script exits 1, so npm rolls the whole tree back; on Windows that
# rollback can be blocked by a bulk-delete guard, which leaves wrangler
# installed but with every platform-specific binary stripped back out.
#
# So instead: install wrangler once into its own directory, with
# --ignore-scripts. All of the platform binaries (workerd, esbuild, sharp) are
# optional *dependencies* rather than postinstall downloads, so they still
# arrive — and with no postinstall script there is nothing to fail and nothing
# to roll back.

say "0/6  Finding node, then installing wrangler"

NODE="$(command -v node 2>/dev/null || true)"

if [ -z "$NODE" ]; then
  # Git Bash sets HOME itself, but do not depend on it being set.
  for hd in "${HOME:-}" "${USERPROFILE:-}"; do
    [ -n "$hd" ] || continue
    hd="${hd//\\//}"                                          # C:\Users\Tuna -> C:/Users/Tuna
    case "$hd" in
      [A-Za-z]:/*)
        _dl="${hd:0:1}"
        hd="/${_dl,,}${hd:2}"                                 # C:/Users -> /c/Users
        ;;
    esac
    for cand in "$hd"/.workbuddy-ai/binaries/node/versions/*/node; do
      if [ -x "$cand" ]; then NODE="$cand"; break 2; fi
    done
  done
fi

[ -n "$NODE" ] || die "Could not find node. Install Node 18+ from https://nodejs.org and re-run."

NPM_CLI="$(dirname "$NODE")/node_modules/npm/bin/npm-cli.js"
[ -f "$NPM_CLI" ] || die "Could not find npm next to $NODE."

# npm and wrangler spawn child processes that look for `node` on PATH. When
# node was only found by the fallback above it is not on PATH yet, and the
# launch dies with
#   '"node"' is not recognized as an internal or external command
# Putting the resolved directory first fixes it for every child process.
export PATH="$(dirname "$NODE"):$PATH"

# node.exe cannot resolve /c/... paths, so convert one when we hand it over.
winpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi
}

# Same binary, Windows spelling — used in the copy-paste commands we print,
# since those get pasted into a normal terminal rather than into this script.
NODE_WIN="$(winpath "$NODE")"

HOME_DIR="${HOME:-${USERPROFILE:-}}"
[ -n "$HOME_DIR" ] || die "Could not work out your home directory."
HOME_DIR="${HOME_DIR//\\//}"
case "$HOME_DIR" in
  [A-Za-z]:/*)
    _dl="${HOME_DIR:0:1}"
    HOME_DIR="/${_dl,,}${HOME_DIR:2}"
    ;;
esac

WRANGLER_HOME="${WRANGLER_HOME:-$HOME_DIR/.wrangler-cli}"
WRANGLER_JS="$WRANGLER_HOME/node_modules/wrangler/bin/wrangler.js"
WRANGLER_WIN="$(winpath "$WRANGLER_JS")"

# Every wrangler call runs through the private copy installed above.
wr()       { "$NODE" "$WRANGLER_WIN" "$@"; }
wr_ready() { [ -f "$WRANGLER_JS" ] && "$NODE" "$WRANGLER_WIN" --version >/dev/null 2>&1; }
wr_ver()   { wr --version 2>/dev/null | tr -d '\r' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1; }

# try_install [cache-dir] — "" uses npm's default cache.
try_install() {
  mkdir -p "$WRANGLER_HOME"
  [ -f "$WRANGLER_HOME/package.json" ] || \
    printf '{"name":"wrangler-cli","private":true}\n' > "$WRANGLER_HOME/package.json"
  (
    cd "$WRANGLER_HOME"
    if [ -n "$1" ]; then
      "$NODE" "$NPM_CLI" install wrangler@latest --ignore-scripts \
        --no-audit --no-fund --omit=dev --cache "$1" --loglevel=error
    else
      "$NODE" "$NPM_CLI" install wrangler@latest --ignore-scripts \
        --no-audit --no-fund --omit=dev --loglevel=error
    fi
  )
}

if wr_ready; then
  ok "node     : $NODE"
  ok "wrangler : $(wr_ver)  (already installed in $WRANGLER_HOME)"
else
  ok "node     : $NODE"
  echo "    Installing wrangler into $WRANGLER_HOME (first run only, ~1 min)..."

  if ! try_install "" || ! wr_ready; then
    warn "That install did not produce a working wrangler. Retrying from scratch"
    warn "with an isolated cache..."
    rm -rf "$WRANGLER_HOME/node_modules" "$WRANGLER_HOME/package-lock.json" 2>/dev/null || true
    try_install "$WRANGLER_HOME/.npm-cache" || true
  fi

  wr_ready || die "wrangler still will not start. Run these by hand and send me the output:
       cd \"$WRANGLER_HOME\"
       \"$NODE\" \"$NPM_CLI\" install wrangler@latest --ignore-scripts --omit=dev"

  ok "wrangler : $(wr_ver)  (installed in $WRANGLER_HOME)"
fi

# ------------------------------------------------------------------ 1. login

say "1/6  Cloudflare login"

# `wrangler whoami` exits 0 even when you are not logged in — it just prints
# "You are not authenticated." So the exit code alone is not enough to tell
# whether we already have credentials; we have to read the output too.
if WHOAMI="$(wr whoami 2>&1)"; then
  if printf '%s' "$WHOAMI" | grep -qi "not authenticated"; then
    AUTHED=0
  else
    AUTHED=1
  fi
else
  AUTHED=0
fi

if [ "$AUTHED" = 1 ]; then
  ok "Already logged in."
else
  echo "    A browser window will open. Click Allow, then come back here."
  echo "    If no browser opens, copy the URL printed below into one."
  wr login
fi

# --------------------------------------------------------------- 2. database

say "2/6  D1 database"

CURRENT_ID="$(grep -oE "database_id *= *\"[^\"]*\"" "$TOML" | head -1 | sed 's/.*"\(.*\)"/\1/' || true)"

if [ -n "$CURRENT_ID" ] && [ "$CURRENT_ID" != "$PLACEHOLDER" ]; then
  DB_ID="$CURRENT_ID"
  ok "wrangler.toml already points at $DB_ID — reusing it."
else
  OUT="$(wr d1 create "$DB_NAME" 2>&1 || true)"
  printf '%s\n' "$OUT"

  DB_ID="$(printf '%s' "$OUT" | grep -oE "database_id *= *\"[^\"]+\"" | head -1 | sed 's/.*"\(.*\)"/\1/' || true)"

  if [ -z "$DB_ID" ]; then
    warn "Could not read a database_id from that output."
    warn "If the database already exists, find its id with:"
    warn "  \"$NODE\" \"$WRANGLER_WIN\" d1 list"
    printf '    Paste the database_id here: '
    read -r DB_ID
  fi

  [ -n "$DB_ID" ] || die "No database_id, stopping."

  "$NODE" -e '
    const fs = require("fs");
    const p = process.argv[1], id = process.argv[2];
    let s = fs.readFileSync(p, "utf8");
    s = s.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${id}"`);
    fs.writeFileSync(p, s);
  ' "$TOML" "$DB_ID"

  ok "Wrote database_id into $TOML."
fi

# ------------------------------------------------------------------ 3. schema

say "3/6  Applying schema"
wr d1 execute "$DB_NAME" --remote --file=./schema.sql
ok "Table and indexes are in place."

# ------------------------------------------------------------------- 4. token

say "4/6  Dashboard token"

if [ -n "${ROTATE_TOKEN:-}" ] || ! wr secret list 2>/dev/null | grep -q "DASHBOARD_TOKEN"; then
  [ -n "${ROTATE_TOKEN:-}" ] && warn "ROTATE_TOKEN is set — generating a new token."
  TOKEN="$("$NODE" -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  printf '%s' "$TOKEN" | wr secret put DASHBOARD_TOKEN >/dev/null
  ok "Generated and stored a new token."

  # Print it here, not only in the summary at the end. A later step can still
  # fail — a missing workers.dev subdomain, a network blip — and a Worker
  # secret is write-only, so if the token were only printed on success you
  # would lose it and have to rotate.
  printf '\n  \033[1;33mYour dashboard token — save it now:\033[0m\n\n    %s\n' "$TOKEN"
else
  TOKEN=""
  ok "DASHBOARD_TOKEN already exists — left untouched."
  warn "Its value cannot be read back. If you no longer have it, re-run with:"
  warn "  ROTATE_TOKEN=1 bash setup.sh"
fi

# ------------------------------------------------------------------- 5. deploy

say "5/6  Deploying"
OUT="$(wr deploy 2>&1 || true)"
printf '%s\n' "$OUT"

# One-time account setup. A brand-new Cloudflare account has no workers.dev
# subdomain, so there is nowhere to publish the Worker. wrangler has no command
# for registering one — the only hook is an interactive prompt during `deploy`,
# and it only appears when wrangler has a real terminal. Here its output is
# captured, so it saw a pipe, silently answered "no" and errored out.
if printf '%s' "$OUT" | grep -q "register a workers.dev subdomain"; then
  printf '\n\033[1;33m%s\033[0m\n' "================================================================"
  printf '\033[1;33m  One-time step: choose your workers.dev subdomain\033[0m\n'
  printf '\033[1;33m%s\033[0m\n' "================================================================"
  printf '\n  Your Cloudflare account has no workers.dev subdomain yet, so there is\n'
  printf '  nowhere to publish the Worker. This is a one-time setting per account.\n\n'

  printf '  \033[1mOption 1 — let wrangler ask you.\033[0m Run this in a normal terminal\n'
  printf '  (not through this script, so it gets a real console and can prompt):\n\n'
  printf '    & "%s" "%s" deploy\n\n' "$NODE_WIN" "$WRANGLER_WIN"
  printf '  Answer \033[1my\033[0m, then type the name you want. Lowercase, and it becomes\n'
  printf '  part of your public URL:\n\n'
  printf '    https://portfolio-analytics.<the-name-you-pick>.workers.dev\n\n'

  printf '  \033[1mOption 2 — do it in the dashboard.\033[0m\n\n'
  printf '    Compute  ->  Workers & Pages  ->  Set up a subdomain\n\n'
  printf '  (The onboarding link wrangler prints above 404s on some accounts.\n'
  printf '  Ignore it and use one of these instead.)\n\n'

  printf '  Then run this script once more to finish — it skips everything that is\n'
  printf '  already done and only deploys:\n\n'
  printf '    ROTATE_TOKEN=1 bash setup.sh\n\n'
  printf '  Keep the dashboard token printed above; you will need it.\n\n'
  exit 1
fi

WORKER_URL="$(printf '%s' "$OUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.workers\.dev' | head -1 || true)"
[ -n "$WORKER_URL" ] || die "Could not read the Worker URL from the deploy output. Re-run this script, or deploy by hand:
       \"$NODE\" \"$WRANGLER_WIN\" deploy"

ok "Worker is live at $WORKER_URL"

# --------------------------------------------------------------- 6. wire site

say "6/6  Pointing the site at it"

if [ ! -f "$SITE_HTML" ]; then
  warn "$SITE_HTML not found — set ENDPOINT by hand:"
  warn "  $WORKER_URL/collect"
else
  "$NODE" -e '
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

# -------------------------------------------------------------------- summary

printf '\n\033[1;32m%s\033[0m\n' "================================================"
printf '\033[1;32m  Done.\033[0m\n'
printf '\033[1;32m%s\033[0m\n' "================================================"

printf '\n  Dashboard : %s/?token=%s\n' "$WORKER_URL" "${TOKEN:-<your-existing-token>}"
printf '  Endpoint  : %s/collect\n' "$WORKER_URL"

if [ -n "$TOKEN" ]; then
  printf '\n  \033[1;33mYour dashboard token (save it now):\033[0m\n\n    %s\n' "$TOKEN"
  printf '\n  The dashboard URL above exchanges it for a cookie and strips it from\n'
  printf '  the address bar. To change it later:\n'
  printf '    "%s" "%s" secret put DASHBOARD_TOKEN\n' "$NODE" "$WRANGLER_WIN"
fi

printf '\n  wrangler lives in %s\n' "$WRANGLER_HOME"
printf '  (re-run this script any time; it reuses that install)\n'

printf '\n  Next:\n'
printf '    1. Open the dashboard URL and confirm you can see it.\n'
printf '    2. Commit the changed files and push:\n\n'
printf '         cd .. && git add -A && git commit -m "chore: enable analytics endpoint" && git push\n\n'
printf '    3. Load your portfolio and watch a row appear.\n\n'
