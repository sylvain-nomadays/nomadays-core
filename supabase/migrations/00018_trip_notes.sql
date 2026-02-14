-- ============================================================
-- TRIP NOTES TABLE
-- Collaborative notes between sales and logistics teams
-- on circuit (trip) pages.
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id BIGINT NOT NULL,              -- trips.id (BigInteger in Alembic)
  tenant_id UUID NOT NULL,              -- multi-tenant isolation
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_notes_trip') THEN
    CREATE INDEX idx_trip_notes_trip ON trip_notes(trip_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_notes_tenant') THEN
    CREATE INDEX idx_trip_notes_tenant ON trip_notes(tenant_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_notes_author') THEN
    CREATE INDEX idx_trip_notes_author ON trip_notes(author_id);
  END IF;
END $$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON trip_notes TO authenticated;
GRANT ALL ON trip_notes TO service_role;
