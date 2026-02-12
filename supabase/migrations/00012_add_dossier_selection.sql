-- Add trip selection fields to dossiers table
-- These fields track which trip proposal was selected/confirmed by the client

ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS selected_trip_id BIGINT,
  ADD COLUMN IF NOT EXISTS selected_cotation_id BIGINT,
  ADD COLUMN IF NOT EXISTS selected_cotation_name TEXT,
  ADD COLUMN IF NOT EXISTS final_pax_count SMALLINT,
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dossiers_selected_trip ON dossiers(selected_trip_id);
