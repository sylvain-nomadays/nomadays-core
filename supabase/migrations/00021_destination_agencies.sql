-- ============================================================================
-- Migration 00021 : Destination Agencies (catalogue B2C)
-- Table des agences partenaires Nomadays pour la page "Explorer les Destinations".
-- Séparée de tenants car c'est une vue B2C publique, pas un concept ERP interne.
-- ============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.destination_agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,

  -- Identité agence
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  tagline VARCHAR(255),

  -- Destination
  country_code CHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  continent VARCHAR(20) NOT NULL CHECK (continent IN ('asia', 'africa', 'latin-america', 'europe', 'oceania')),
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,

  -- Visuels
  cover_image_url TEXT,
  logo_url TEXT,

  -- Détails agence
  languages TEXT[] DEFAULT '{}',
  year_founded INTEGER,
  location VARCHAR(200),
  website VARCHAR(500),

  -- Stats (dénormalisées pour performance)
  trips_count INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  reviews_score DECIMAL(2, 1) DEFAULT 0.0,

  -- Hôte principal (dénormalisé — c'est une vue catalogue)
  host_name VARCHAR(255),
  host_avatar_url TEXT,
  host_role VARCHAR(100),
  host_experience_years INTEGER,

  -- Circuits populaires (JSONB array, max 3-5 items)
  -- Format: [{name, duration_days, theme, price_from, currency, image_url}]
  popular_trips JSONB DEFAULT '[]'::jsonb,

  -- Publication
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.destination_agencies IS 'Catalogue B2C des agences partenaires Nomadays pour la page Explorer';
COMMENT ON COLUMN public.destination_agencies.popular_trips IS 'Array JSONB [{name, duration_days, theme, price_from, currency, image_url}]';

-- ─── Index ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_dest_agencies_country ON public.destination_agencies(country_code);
CREATE INDEX idx_dest_agencies_continent ON public.destination_agencies(continent);
CREATE INDEX idx_dest_agencies_published ON public.destination_agencies(is_published) WHERE is_published = true;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.destination_agencies ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tous les utilisateurs authentifiés (catalogue)
CREATE POLICY dest_agencies_select_published ON public.destination_agencies
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Staff Nomadays a accès total (CRUD)
CREATE POLICY dest_agencies_staff_all ON public.destination_agencies
  FOR ALL TO authenticated
  USING (public.is_nomadays_staff())
  WITH CHECK (public.is_nomadays_staff());

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT SELECT ON public.destination_agencies TO authenticated;
GRANT ALL ON public.destination_agencies TO service_role;

-- ─── Trigger updated_at ──────────────────────────────────────────────────────

CREATE TRIGGER trg_dest_agencies_updated_at
  BEFORE UPDATE ON public.destination_agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
