-- ============================================================================
-- Migration 00020 : Ajout colonne desired_period + GRANT sur traveler_wishlists
-- ============================================================================

-- Ajouter la colonne desired_period si elle n'existe pas
ALTER TABLE public.traveler_wishlists
  ADD COLUMN IF NOT EXISTS desired_period VARCHAR(20) DEFAULT 'no_idea';

COMMENT ON COLUMN public.traveler_wishlists.desired_period
  IS 'Période souhaitée : imminent, next_year, in_2_years, no_idea';

-- GRANT (au cas où la 00019 a été exécutée sans)
GRANT ALL ON public.traveler_wishlists TO authenticated;
GRANT ALL ON public.traveler_wishlists TO service_role;
