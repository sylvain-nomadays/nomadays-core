-- ============================================================
-- NOMADAYS CORE - Migration 030: Carnets Pratiques (Travel Info)
-- ============================================================
-- Architecture hybride :
--   1) country_travel_info     → contenu stable par pays, validé par le DMC
--   2) dossier_travel_info_overlay → météo/saisonnalité liée aux dates du dossier
--   3) travel_info_checklist   → checklist client (cocher items + notes perso)
--
-- Pattern : same as 00024_day_feedback.sql — no FK constraints against Alembic
-- tables, service_role + authenticated RLS.

-- ─── Country Travel Info (base partagée) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS country_travel_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,                    -- Multi-tenant isolation
  country_code CHAR(2) NOT NULL,              -- ISO 3166-1 alpha-2 (TH, VN, KH...)

  -- Contenu structuré (catégories + items)
  -- Format JSONB: [{
  --   key: "formalities", label: "Formalités", icon: "Stamp",
  --   items: [{ key: "visa", label: "Visa", emoji: "🛂", content: "..." }]
  -- }]
  categories JSONB NOT NULL DEFAULT '[]',

  -- Génération IA & workflow
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'needs_review', 'approved', 'published')),
  job_id UUID,                                -- Future Celery job reference
  prompt_version VARCHAR(20) DEFAULT '1.0',
  model VARCHAR(50),                          -- ex: 'claude-sonnet-4-20250514'
  sources_used TEXT[] DEFAULT '{}',           -- ex: '{human_notes, ai_generated}'
  generated_at TIMESTAMPTZ,
  reviewed_by UUID,                           -- users.id who approved
  reviewed_at TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, country_code)
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_country_travel_info_tenant') THEN
    CREATE INDEX idx_country_travel_info_tenant ON country_travel_info(tenant_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_country_travel_info_country') THEN
    CREATE INDEX idx_country_travel_info_country ON country_travel_info(country_code);
  END IF;
END $$;

COMMENT ON TABLE country_travel_info IS 'Informations pratiques par pays — contenu stable validé par le DMC, partagé entre dossiers';


-- ─── Dossier Travel Info Overlay (saisonnier) ───────────────────────────────

CREATE TABLE IF NOT EXISTS dossier_travel_info_overlay (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL,                   -- dossiers.id (no FK — Alembic schema)
  country_code CHAR(2) NOT NULL,

  -- Dates du dossier (pour invalider si dates changent)
  start_date DATE,
  end_date DATE,

  -- Contenu saisonnier (même format JSONB que categories)
  -- Contient la catégorie "weather" avec items: climat, saison, températures, bagages
  categories JSONB NOT NULL DEFAULT '[]',

  -- Génération IA
  prompt_version VARCHAR(20) DEFAULT '1.0',
  model VARCHAR(50),
  generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (dossier_id, country_code)
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dossier_travel_overlay_dossier') THEN
    CREATE INDEX idx_dossier_travel_overlay_dossier ON dossier_travel_info_overlay(dossier_id);
  END IF;
END $$;

COMMENT ON TABLE dossier_travel_info_overlay IS 'Overlay saisonnier par dossier — météo et bagages adaptés aux dates de voyage';


-- ─── Travel Info Checklist (client-side) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS travel_info_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL,                   -- dossiers.id (no FK)
  participant_id UUID NOT NULL,               -- participants.id (no FK)

  -- Référence à l'item (category_key + item_key identifient un item unique)
  category_key VARCHAR(50) NOT NULL,          -- ex: "formalities"
  item_key VARCHAR(50) NOT NULL,              -- ex: "visa"

  -- Statut client
  is_checked BOOLEAN DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (dossier_id, participant_id, category_key, item_key)
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_travel_checklist_dossier') THEN
    CREATE INDEX idx_travel_checklist_dossier ON travel_info_checklist(dossier_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_travel_checklist_participant') THEN
    CREATE INDEX idx_travel_checklist_participant ON travel_info_checklist(participant_id);
  END IF;
END $$;

COMMENT ON TABLE travel_info_checklist IS 'Checklist voyage par participant — le client coche les items et ajoute des notes perso';


-- ─── RLS Policies ───────────────────────────────────────────────────────────

-- country_travel_info
ALTER TABLE country_travel_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY country_travel_info_authenticated_select ON country_travel_info
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY country_travel_info_service_all ON country_travel_info
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON country_travel_info TO authenticated;
GRANT ALL ON country_travel_info TO service_role;

-- dossier_travel_info_overlay
ALTER TABLE dossier_travel_info_overlay ENABLE ROW LEVEL SECURITY;

CREATE POLICY dossier_travel_overlay_authenticated_all ON dossier_travel_info_overlay
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY dossier_travel_overlay_service_all ON dossier_travel_info_overlay
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON dossier_travel_info_overlay TO authenticated;
GRANT ALL ON dossier_travel_info_overlay TO service_role;

-- travel_info_checklist
ALTER TABLE travel_info_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY travel_checklist_authenticated_all ON travel_info_checklist
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY travel_checklist_service_all ON travel_info_checklist
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON travel_info_checklist TO authenticated;
GRANT ALL ON travel_info_checklist TO service_role;
