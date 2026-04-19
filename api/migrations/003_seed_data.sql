-- Migration: 003_seed_data
-- Inserts sample pipelines and sources so a fresh install isn't empty.
-- Uses ON CONFLICT DO NOTHING so it's safe to re-run.

-- ─── Pipelines ────────────────────────────────────────────────
INSERT INTO pipelines (name, status, records, latency) VALUES
  ('ecommerce_analytics_v3',  'Running',   '4.2M/hr',  '89'),
  ('user_events_stream',      'Running',   '1.1M/hr',  '44'),
  ('inventory_sync_daily',    'Scheduled', '82K/hr',   NULL),
  ('postgres_to_warehouse',   'Error',     NULL,       NULL),
  ('marketing_attribution',   'Scheduled', NULL,       NULL)
ON CONFLICT DO NOTHING;

-- ─── Sources ──────────────────────────────────────────────────
INSERT INTO sources (name, type, status, records) VALUES
  ('PostgreSQL Production',  'database',  'idle', '2.1M'),
  ('Stripe Payments',        'api',       'idle', '450K'),
  ('AWS S3 Bucket',          'storage',   'idle', '8.4M'),
  ('Kafka Events',           'stream',    'idle', '12M'),
  ('HubSpot CRM',            'api',       'idle', '38K'),
  ('Snowflake Warehouse',    'database',  'idle', '1.8M')
ON CONFLICT DO NOTHING;
