-- Portfolio analytics — D1 schema.
-- Apply with:  npx wrangler d1 execute portfolio-analytics --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS visits (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TEXT NOT NULL,   -- ISO 8601, UTC
  path      TEXT,
  referrer  TEXT,
  ip        TEXT,            -- raw visitor IP; see the Privacy section of README.md
  country   TEXT,            -- ISO 3166-1 alpha-2, e.g. "VN"
  region    TEXT,
  city      TEXT,
  latitude  TEXT,
  longitude TEXT,
  timezone  TEXT,
  asn       INTEGER,
  org       TEXT,            -- AS organisation, e.g. "Viettel Group"
  ua        TEXT,
  screen    TEXT,            -- e.g. "1920x1080"
  lang      TEXT,            -- e.g. "en-US"
  device    TEXT,            -- Desktop | Mobile | Tablet
  browser   TEXT
);

-- Every dashboard query filters or orders on ts.
CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits (ts DESC);

-- Used by the retention sweep.
CREATE INDEX IF NOT EXISTS idx_visits_ts_asc ON visits (ts ASC);
