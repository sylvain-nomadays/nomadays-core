-- ============================================================================
-- Migration 00023 : Traveler Past Trips
-- Table déclarative : les voyageurs déclarent leurs voyages passés.
-- Deux cas :
--   is_nomadays = false → ajouté automatiquement à la carte (pas de validation)
--   is_nomadays = true  → nécessite validation admin (is_verified = true)
-- Les points fidélité comptent : tous les non-Nomadays + les Nomadays vérifiés.
-- ============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS traveler_past_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  is_nomadays BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK ajoutée séparément (la table participants peut être dans un search_path différent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_past_trips_participant'
      AND table_name = 'traveler_past_trips'
  ) THEN
    ALTER TABLE traveler_past_trips
      ADD CONSTRAINT fk_past_trips_participant
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK to participants skipped: %', SQLERRM;
END $$;

COMMENT ON TABLE traveler_past_trips IS 'Voyages passés déclarés par les voyageurs (enrichissement carte du monde)';
COMMENT ON COLUMN traveler_past_trips.country_code IS 'Code ISO 3166-1 alpha-2 du pays visité';
COMMENT ON COLUMN traveler_past_trips.is_nomadays IS 'true = voyage effectué avec Nomadays (nécessite validation admin)';
COMMENT ON COLUMN traveler_past_trips.is_verified IS 'true = validé par un admin Nomadays (seulement pertinent si is_nomadays = true)';
COMMENT ON COLUMN traveler_past_trips.note IS 'Note libre du voyageur';

-- ─── Index ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_traveler_past_trips_participant
  ON traveler_past_trips(participant_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_traveler_past_trips_participant_country
  ON traveler_past_trips(participant_id, country_code);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE traveler_past_trips ENABLE ROW LEVEL SECURITY;

-- Participants lisent leurs propres déclarations
CREATE POLICY past_trips_select_own ON traveler_past_trips
  FOR SELECT TO authenticated
  USING (
    participant_id IN (
      SELECT p.id FROM participants p WHERE p.user_id = auth.uid()
    )
  );

-- Participants insèrent leurs propres déclarations
CREATE POLICY past_trips_insert_own ON traveler_past_trips
  FOR INSERT TO authenticated
  WITH CHECK (
    participant_id IN (
      SELECT p.id FROM participants p WHERE p.user_id = auth.uid()
    )
  );

-- Participants suppriment leurs propres déclarations
CREATE POLICY past_trips_delete_own ON traveler_past_trips
  FOR DELETE TO authenticated
  USING (
    participant_id IN (
      SELECT p.id FROM participants p WHERE p.user_id = auth.uid()
    )
  );

-- Staff Nomadays + DMC ont accès total (pour vérification admin)
-- NOTE: ces fonctions doivent exister (migration 00009_rls_policies.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_nomadays_staff') THEN
    EXECUTE '
      CREATE POLICY past_trips_staff_all ON traveler_past_trips
        FOR ALL TO authenticated
        USING (is_nomadays_staff() OR is_dmc_staff())
        WITH CHECK (is_nomadays_staff() OR is_dmc_staff())
    ';
  END IF;
END $$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT ALL ON traveler_past_trips TO authenticated;
GRANT ALL ON traveler_past_trips TO service_role;
