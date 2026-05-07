-- Migration 005: Destinations (Clickhouse, Snowflake, etc.)
BEGIN;

CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'clickhouse', 'snowflake', 'bigquery'
  config JSONB NOT NULL, -- {host, port, database, username, password}
  status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'syncing', 'error'
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX destinations_workspace_idx ON destinations(workspace_id);

-- RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations FORCE ROW LEVEL SECURITY;
CREATE POLICY destinations_tenant_isolation ON destinations
  USING (workspace_id = current_workspace_id());

COMMIT;
