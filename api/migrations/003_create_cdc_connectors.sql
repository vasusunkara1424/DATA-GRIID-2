-- Migration: Create connectors table for Postgres CDC
-- Fixed: workspace_id is INTEGER (not UUID) in this database

CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('postgres_cdc', 'mysql_cdc', 'mongodb_cdc')),
  
  config JSONB NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
  is_cdc_enabled BOOLEAN DEFAULT false,
  replication_slot_name VARCHAR(63),
  last_lsn TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  source_table_count INTEGER DEFAULT 0,
  events_captured BIGINT DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(workspace_id, name),
  CONSTRAINT valid_postgres_cdc CHECK (
    (type != 'postgres_cdc') OR (config->>'host' IS NOT NULL AND config->>'database' IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_connectors_workspace_id ON connectors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_connectors_type_status ON connectors(type, status);
CREATE INDEX IF NOT EXISTS idx_connectors_created_at ON connectors(created_at DESC);

CREATE TABLE IF NOT EXISTS cdc_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(255) NOT NULL,
  schema_name VARCHAR(255) DEFAULT 'public',
  
  before_data JSONB,
  after_data JSONB,
  
  lsn BIGINT NOT NULL,
  txn_id BIGINT,
  
  event_timestamp TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT check_operation_data CHECK (
    (operation = 'INSERT' AND after_data IS NOT NULL) OR
    (operation = 'UPDATE' AND before_data IS NOT NULL AND after_data IS NOT NULL) OR
    (operation = 'DELETE' AND before_data IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_cdc_events_connector_id ON cdc_events(connector_id);
CREATE INDEX IF NOT EXISTS idx_cdc_events_table_name ON cdc_events(table_name, connector_id);
CREATE INDEX IF NOT EXISTS idx_cdc_events_lsn ON cdc_events(lsn DESC);
CREATE INDEX IF NOT EXISTS idx_cdc_events_captured_at ON cdc_events(captured_at DESC);

CREATE OR REPLACE FUNCTION update_connectors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS connectors_update_timestamp ON connectors;
CREATE TRIGGER connectors_update_timestamp
  BEFORE UPDATE ON connectors
  FOR EACH ROW
  EXECUTE FUNCTION update_connectors_timestamp();
