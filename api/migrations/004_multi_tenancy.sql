-- Migration 004: Multi-tenancy lockdown
-- Adds workspace_id to all user-data tables and enforces isolation via RLS.
--
-- Strategy:
-- 1. Add workspace_id column (nullable at first, for backfill)
-- 2. Backfill existing rows to the first (default) workspace
-- 3. Make workspace_id NOT NULL
-- 4. Add foreign key constraints
-- 5. Enable Row Level Security (including FORCE for table-owner enforcement)
-- 6. Create policies that scope by current_setting('app.current_workspace')

BEGIN;

-- ─── Ensure at least one workspace exists (for backfill) ────────────────
INSERT INTO workspaces (name, slug)
SELECT 'Default Workspace', 'default-' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE NOT EXISTS (SELECT 1 FROM workspaces);

-- ─── Pipelines ──────────────────────────────────────────────────────────
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE pipelines SET workspace_id = (SELECT MIN(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE pipelines ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE pipelines ADD CONSTRAINT pipelines_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS pipelines_workspace_idx ON pipelines(workspace_id);

-- ─── Sources ────────────────────────────────────────────────────────────
ALTER TABLE sources ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE sources SET workspace_id = (SELECT MIN(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE sources ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE sources ADD CONSTRAINT sources_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS sources_workspace_idx ON sources(workspace_id);

-- ─── Alerts ─────────────────────────────────────────────────────────────
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE alerts SET workspace_id = (
    SELECT p.workspace_id FROM pipelines p WHERE p.id = alerts.pipeline_id
) WHERE workspace_id IS NULL;
UPDATE alerts SET workspace_id = (SELECT MIN(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE alerts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE alerts ADD CONSTRAINT alerts_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS alerts_workspace_idx ON alerts(workspace_id);

-- ─── Usage events ───────────────────────────────────────────────────────
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE usage_events SET workspace_id = (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = usage_events.user_id LIMIT 1
) WHERE workspace_id IS NULL;
UPDATE usage_events SET workspace_id = (SELECT MIN(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE usage_events ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE usage_events ADD CONSTRAINT usage_events_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS usage_events_workspace_idx ON usage_events(workspace_id);

-- ─── Row Level Security helper function ─────────────────────────────────
-- Reads session variable set by API middleware. Returns NULL when unset
-- so policies deny-by-default (safe failure mode).
CREATE OR REPLACE FUNCTION current_workspace_id() RETURNS INTEGER AS $$
    SELECT NULLIF(current_setting('app.current_workspace', TRUE), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

-- ─── Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ─── Force RLS even for table owners ────────────────────────────────────
-- Without FORCE, Postgres exempts table owners from their own policies.
ALTER TABLE pipelines FORCE ROW LEVEL SECURITY;
ALTER TABLE sources FORCE ROW LEVEL SECURITY;
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_members FORCE ROW LEVEL SECURITY;

-- ─── Policies: scope every query by current workspace ──────────────────
CREATE POLICY pipelines_tenant_isolation ON pipelines
    USING (workspace_id = current_workspace_id());

CREATE POLICY sources_tenant_isolation ON sources
    USING (workspace_id = current_workspace_id());

CREATE POLICY alerts_tenant_isolation ON alerts
    USING (workspace_id = current_workspace_id());

CREATE POLICY usage_events_tenant_isolation ON usage_events
    USING (workspace_id = current_workspace_id());

CREATE POLICY workspace_members_tenant_isolation ON workspace_members
    USING (workspace_id = current_workspace_id());

-- Note: workspaces table itself is NOT RLS-enabled — users must list
-- workspaces they belong to via JOIN on workspace_members.

COMMIT;
