-- ============================================================
-- DOSSIER NOTES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS dossier_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal_nomadays BOOLEAN DEFAULT FALSE,
  is_personal BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dossier_notes_dossier') THEN
    CREATE INDEX idx_dossier_notes_dossier ON dossier_notes(dossier_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dossier_notes_author') THEN
    CREATE INDEX idx_dossier_notes_author ON dossier_notes(author_id);
  END IF;
END $$;

-- ============================================================
-- TRAVEL LOGISTICS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS travel_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('arrival', 'departure')),
  transport_type VARCHAR(20) NOT NULL CHECK (transport_type IN ('flight', 'train', 'bus', 'car', 'boat', 'other')),
  transport_info VARCHAR(100),
  scheduled_datetime TIMESTAMPTZ,
  location VARCHAR(255),
  all_participants BOOLEAN DEFAULT TRUE,
  participant_ids UUID[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_travel_logistics_dossier') THEN
    CREATE INDEX idx_travel_logistics_dossier ON travel_logistics(dossier_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_travel_logistics_datetime') THEN
    CREATE INDEX idx_travel_logistics_datetime ON travel_logistics(scheduled_datetime);
  END IF;
END $$;

-- ============================================================
-- ADD MISSING COLUMNS TO DOSSIERS
-- ============================================================

ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS rooming_preferences JSONB DEFAULT '[]';
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pax_teens INTEGER DEFAULT 0;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pax_infants INTEGER DEFAULT 0;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS total_sell NUMERIC(12,2);

-- ============================================================
-- ADD MISSING COLUMNS TO DOSSIER_PARTICIPANTS
-- ============================================================

ALTER TABLE dossier_participants ADD COLUMN IF NOT EXISTS is_traveling BOOLEAN DEFAULT TRUE;

-- Add age_category with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dossier_participants' AND column_name = 'age_category'
  ) THEN
    ALTER TABLE dossier_participants ADD COLUMN age_category VARCHAR(20) DEFAULT 'adult';
    ALTER TABLE dossier_participants ADD CONSTRAINT chk_age_category
      CHECK (age_category IN ('adult', 'teen', 'child', 'infant'));
  END IF;
END $$;

-- ============================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dossiers_follow_up') THEN
    CREATE INDEX idx_dossiers_follow_up ON dossiers(follow_up_date) WHERE follow_up_date IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dossiers_departure_dates') THEN
    CREATE INDEX idx_dossiers_departure_dates ON dossiers(departure_date_from, departure_date_to);
  END IF;
END $$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON dossier_notes TO authenticated;
GRANT ALL ON dossier_notes TO anon;
GRANT ALL ON travel_logistics TO authenticated;
GRANT ALL ON travel_logistics TO anon;
