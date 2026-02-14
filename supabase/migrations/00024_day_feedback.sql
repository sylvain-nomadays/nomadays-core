-- Day-by-day client feedback: reactions (love/modify) + pace preferences (slower/normal/faster)
-- These tables enable clients to interact with their trip program.
-- Pattern: same as trip_notes (00018) — no FK constraints, service_role only RLS.
-- All CRUD operations go through server actions using service_role client.

-- ─── Trip Day Reactions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_day_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_day_id BIGINT NOT NULL,           -- trip_days.id (backend Alembic)
  dossier_id UUID NOT NULL,              -- dossiers.id (no FK — table may not exist in this schema context)
  participant_id UUID NOT NULL,           -- participants.id (no FK — same reason)
  reaction VARCHAR(20) NOT NULL CHECK (reaction IN ('love', 'modify')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (trip_day_id, participant_id)
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_day_reactions_dossier') THEN
    CREATE INDEX idx_trip_day_reactions_dossier ON trip_day_reactions(dossier_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_day_reactions_participant') THEN
    CREATE INDEX idx_trip_day_reactions_participant ON trip_day_reactions(participant_id);
  END IF;
END $$;

-- RLS
ALTER TABLE trip_day_reactions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own reactions
CREATE POLICY reactions_authenticated_all ON trip_day_reactions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role bypass
CREATE POLICY reactions_service_all ON trip_day_reactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON trip_day_reactions TO authenticated;
GRANT ALL ON trip_day_reactions TO service_role;


-- ─── Trip Day Pace Preferences ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_day_pace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_day_id BIGINT NOT NULL,           -- trip_days.id (backend Alembic)
  dossier_id UUID NOT NULL,              -- dossiers.id (no FK)
  participant_id UUID NOT NULL,           -- participants.id (no FK)
  pace VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (pace IN ('slower', 'normal', 'faster')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (trip_day_id, participant_id)
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_day_pace_dossier') THEN
    CREATE INDEX idx_trip_day_pace_dossier ON trip_day_pace(dossier_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trip_day_pace_participant') THEN
    CREATE INDEX idx_trip_day_pace_participant ON trip_day_pace(participant_id);
  END IF;
END $$;

-- RLS
ALTER TABLE trip_day_pace ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own pace preferences
CREATE POLICY pace_authenticated_all ON trip_day_pace
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role bypass
CREATE POLICY pace_service_all ON trip_day_pace
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON trip_day_pace TO authenticated;
GRANT ALL ON trip_day_pace TO service_role;
