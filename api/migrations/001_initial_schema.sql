-- Migration: 001_initial_schema
-- Creates the core tables for DataGrid.
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────────
-- pipelines
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipelines (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  status      VARCHAR(20)  DEFAULT 'scheduled',
  records     VARCHAR(50),
  latency     VARCHAR(20),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- sources
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(50),
  status      VARCHAR(20)  DEFAULT 'idle',
  records     VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- alerts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           SERIAL PRIMARY KEY,
  pipeline_id  INTEGER REFERENCES pipelines(id),
  type         VARCHAR(50) NOT NULL,
  message      TEXT NOT NULL,
  severity     VARCHAR(20) DEFAULT 'warning',
  resolved     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_pipeline ON alerts(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created  ON alerts(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- workspaces
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- workspace_members
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id            SERIAL PRIMARY KEY,
  workspace_id  INTEGER REFERENCES workspaces(id),
  user_id       VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'member',
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user      ON workspace_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- usage_events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(255) NOT NULL,
  event_type  VARCHAR(50) NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user  ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_type  ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at DESC);
