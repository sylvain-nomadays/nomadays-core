-- Migration: Add office location fields to tenants
-- Used for weather display (Open-Meteo) and local info in the client Espace Voyageur.
-- Example: DMC Thailand office is in Chiang Mai, not Bangkok.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS office_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS office_lat DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS office_lng DECIMAL(9, 6);

COMMENT ON COLUMN tenants.office_city IS 'City where the DMC office is located (e.g. Chiang Mai)';
COMMENT ON COLUMN tenants.office_lat IS 'Latitude of the DMC office (for weather API)';
COMMENT ON COLUMN tenants.office_lng IS 'Longitude of the DMC office (for weather API)';
