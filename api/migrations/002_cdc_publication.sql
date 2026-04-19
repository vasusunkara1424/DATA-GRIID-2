-- Migration: 002_cdc_publication
-- Sets up Postgres logical replication for Change Data Capture (CDC).
-- Required for real-time updates via WebSocket.
--
-- IMPORTANT: Before running this, ensure postgresql.conf has:
--   wal_level = logical
-- Restart Postgres after changing that setting.

-- Enable full row capture on tables we stream changes from.
-- Without REPLICA IDENTITY FULL, UPDATE events only capture the primary key.
ALTER TABLE pipelines REPLICA IDENTITY FULL;
ALTER TABLE sources   REPLICA IDENTITY FULL;

-- Create (or replace) the publication that streams change events.
-- Only run if the publication doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'datagrid_pub'
  ) THEN
    EXECUTE 'CREATE PUBLICATION datagrid_pub FOR TABLE pipelines, sources';
  END IF;
END $$;
