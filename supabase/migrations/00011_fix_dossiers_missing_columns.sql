-- ============================================================
-- Migration 011: Ensure dossiers table has all required columns
-- Adds columns that may be missing depending on which schema
-- was applied (00000_full_schema vs 00004_dossiers).
-- All operations are idempotent (ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- Duration (may exist as SMALLINT from 00004 or not at all)
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- Pax columns (00000 uses pax_adults, 00004 uses adult_count)
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pax_adults INTEGER DEFAULT 2;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pax_children INTEGER DEFAULT 0;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pax_infants INTEGER DEFAULT 0;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pax_teens INTEGER DEFAULT 0;

-- Travel type & origin
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS origin dossier_origin DEFAULT 'website_b2c';
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS trip_type trip_type DEFAULT 'fit';
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS title TEXT;

-- Marketing / hot / language
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS is_hot BOOLEAN DEFAULT false;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'FR';
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS marketing_source marketing_source DEFAULT 'organic';
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS affiliate_name TEXT;

-- Lost tracking
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS lost_reason lost_reason;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS lost_notes TEXT;

-- Source / GIR
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS source_circuit_id UUID;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS source_gir_departure_date DATE;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS gir_parent_id UUID REFERENCES dossiers(id);

-- Client notes (00000 uses client_notes, 00004 uses client_brief)
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- Rooming preferences (from 00002_add_notes_and_logistics)
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS rooming_preferences JSONB DEFAULT '[]';

-- Follow-up
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;

-- Metadata
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Total sell
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS total_sell NUMERIC(12,2);

-- Flexibility
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS flexibility_days INTEGER DEFAULT 0;

-- ============================================================
-- If table was created from 00004_dossiers.sql, migrate old
-- column values to new column names (one-time data migration)
-- ============================================================

-- Copy adult_count → pax_adults if adult_count exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'adult_count'
  ) THEN
    UPDATE dossiers SET pax_adults = adult_count WHERE pax_adults = 2 AND adult_count IS NOT NULL AND adult_count != 2;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'child_count'
  ) THEN
    UPDATE dossiers SET pax_children = child_count WHERE pax_children = 0 AND child_count IS NOT NULL AND child_count != 0;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'infant_count'
  ) THEN
    UPDATE dossiers SET pax_infants = infant_count WHERE pax_infants = 0 AND infant_count IS NOT NULL AND infant_count != 0;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'teen_count'
  ) THEN
    UPDATE dossiers SET pax_teens = teen_count WHERE pax_teens = 0 AND teen_count IS NOT NULL AND teen_count != 0;
  END IF;
END $$;

-- Copy client_brief → client_notes if client_brief exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossiers' AND column_name = 'client_brief'
  ) THEN
    UPDATE dossiers SET client_notes = client_brief WHERE client_notes IS NULL AND client_brief IS NOT NULL;
  END IF;
END $$;

-- Ensure title is not null (set default from reference if missing)
UPDATE dossiers SET title = reference WHERE title IS NULL;
-- Now make it NOT NULL with a default
ALTER TABLE dossiers ALTER COLUMN title SET DEFAULT '';

-- ============================================================
-- Ensure service_role has full access (bypasses RLS)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON dossiers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON dossier_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON participants TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================
-- Notify PostgREST to reload schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
