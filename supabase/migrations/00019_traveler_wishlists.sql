-- ============================================================================
-- Migration 00019 : Traveler Wishlists
-- Table légère pour les envies de voyage des participants du portail client.
-- Séparée des dossiers car les clients (RLS) ne peuvent pas INSERT dans dossiers.
-- La conversion envie → dossier se fait via server action (service_role).
-- ============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.traveler_wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  desired_period VARCHAR(20) DEFAULT 'no_idea',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.traveler_wishlists IS 'Envies de voyage des participants (portail client)';
COMMENT ON COLUMN public.traveler_wishlists.country_code IS 'Code ISO 3166-1 alpha-2 du pays souhaité';
COMMENT ON COLUMN public.traveler_wishlists.desired_period IS 'Période souhaitée : imminent, next_year, in_2_years, no_idea';
COMMENT ON COLUMN public.traveler_wishlists.note IS 'Note libre du voyageur sur son envie';

-- ─── Index ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_traveler_wishlists_participant
  ON public.traveler_wishlists(participant_id);

CREATE UNIQUE INDEX uk_traveler_wishlists_participant_country
  ON public.traveler_wishlists(participant_id, country_code);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.traveler_wishlists ENABLE ROW LEVEL SECURITY;

-- Participants lisent leurs propres envies
CREATE POLICY wishlists_select_own ON public.traveler_wishlists
  FOR SELECT TO authenticated
  USING (
    participant_id IN (
      SELECT p.id FROM public.participants p WHERE p.user_id = auth.uid()
    )
  );

-- Participants insèrent leurs propres envies
CREATE POLICY wishlists_insert_own ON public.traveler_wishlists
  FOR INSERT TO authenticated
  WITH CHECK (
    participant_id IN (
      SELECT p.id FROM public.participants p WHERE p.user_id = auth.uid()
    )
  );

-- Participants suppriment leurs propres envies
CREATE POLICY wishlists_delete_own ON public.traveler_wishlists
  FOR DELETE TO authenticated
  USING (
    participant_id IN (
      SELECT p.id FROM public.participants p WHERE p.user_id = auth.uid()
    )
  );

-- Staff Nomadays + DMC ont accès total
CREATE POLICY wishlists_staff_all ON public.traveler_wishlists
  FOR ALL TO authenticated
  USING (
    public.is_nomadays_staff()
    OR public.is_dmc_staff()
  )
  WITH CHECK (
    public.is_nomadays_staff()
    OR public.is_dmc_staff()
  );

-- ─── Grants ────────────────────────────────────────────────────────────────

GRANT ALL ON public.traveler_wishlists TO authenticated;
GRANT ALL ON public.traveler_wishlists TO service_role;

-- ─── Trigger updated_at ─────────────────────────────────────────────────────

CREATE TRIGGER trg_traveler_wishlists_updated_at
  BEFORE UPDATE ON public.traveler_wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
