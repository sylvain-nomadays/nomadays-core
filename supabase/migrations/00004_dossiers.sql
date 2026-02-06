-- ============================================================
-- NOMADAYS CORE - Migration 004: Dossiers
-- ============================================================

-- Table principale des dossiers (demandes clients)
CREATE TABLE dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence unique lisible
  reference VARCHAR(20) UNIQUE NOT NULL,      -- 'ND-2024-001234'

  -- Relations organisationnelles
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  advisor_id UUID REFERENCES users(id),       -- Conseiller assigné (Nomadays)
  dmc_id UUID REFERENCES tenants(id),         -- DMC responsable

  -- Contact principal
  primary_contact_id UUID REFERENCES participants(id),

  -- Statut et priorité
  status dossier_status DEFAULT 'lead',
  priority SMALLINT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),

  -- Acquisition
  channel acquisition_channel NOT NULL,
  source_detail VARCHAR(255),                 -- Ex: 'google_ads_vietnam_2024'
  source_url TEXT,                            -- URL du formulaire / page source

  -- Voyage souhaité
  destination_countries CHAR(2)[],            -- ['VN', 'KH', 'LA']
  departure_date_from DATE,
  departure_date_to DATE,
  duration_days SMALLINT,
  flexibility_days SMALLINT DEFAULT 0,

  -- Participants
  adult_count SMALLINT DEFAULT 2,
  teen_count SMALLINT DEFAULT 0,              -- 12-17 ans
  child_count SMALLINT DEFAULT 0,             -- 2-11 ans
  infant_count SMALLINT DEFAULT 0,            -- 0-2 ans

  -- Budget
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  budget_currency currency DEFAULT 'EUR',
  budget_flexibility BOOLEAN DEFAULT false,

  -- Contenu
  client_brief TEXT,                          -- Demande initiale du client
  internal_notes TEXT,                        -- Notes internes équipe

  -- Tags et champs personnalisés
  tags VARCHAR(50)[],
  custom_fields JSONB DEFAULT '{}',

  -- Dates importantes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  travel_start_at TIMESTAMPTZ,
  travel_end_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Index pour le pipeline et les requêtes fréquentes
CREATE INDEX idx_dossiers_status ON dossiers(status)
  WHERE status NOT IN ('completed', 'cancelled', 'archived');
CREATE INDEX idx_dossiers_advisor ON dossiers(advisor_id, status);
CREATE INDEX idx_dossiers_tenant ON dossiers(tenant_id, status);
CREATE INDEX idx_dossiers_dmc ON dossiers(dmc_id, status);
CREATE INDEX idx_dossiers_last_activity ON dossiers(last_activity_at DESC);
CREATE INDEX idx_dossiers_departure ON dossiers(departure_date_from)
  WHERE departure_date_from IS NOT NULL;
CREATE INDEX idx_dossiers_reference ON dossiers(reference);

-- Trigger updated_at
CREATE TRIGGER trg_dossiers_updated_at
  BEFORE UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Génération automatique de la référence dossier
CREATE OR REPLACE FUNCTION generate_dossier_reference()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Trouver le prochain numéro séquentiel pour l'année
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference FROM 'ND-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM dossiers
  WHERE reference LIKE 'ND-' || year_part || '-%';

  NEW.reference := 'ND-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dossier_reference
  BEFORE INSERT ON dossiers
  FOR EACH ROW
  WHEN (NEW.reference IS NULL)
  EXECUTE FUNCTION generate_dossier_reference();

-- Table de liaison dossier <-> participants
CREATE TABLE dossier_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

  -- Rôle dans le dossier
  is_primary BOOLEAN DEFAULT false,
  participant_type VARCHAR(20) DEFAULT 'adult',  -- 'adult', 'teen', 'child', 'infant'

  -- Préférences pour ce voyage
  room_preference VARCHAR(50),                -- 'single', 'double', 'twin', 'triple'

  -- Notes spécifiques à ce voyage
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dossier_id, participant_id)
);

CREATE INDEX idx_dossier_participants_dossier ON dossier_participants(dossier_id);
CREATE INDEX idx_dossier_participants_participant ON dossier_participants(participant_id);

-- Vue pipeline pour l'affichage des dossiers
CREATE OR REPLACE VIEW v_pipeline AS
SELECT
  d.id,
  d.reference,
  d.status,
  d.priority,
  d.channel,
  d.last_activity_at,
  d.departure_date_from,
  d.departure_date_to,
  d.destination_countries,
  d.adult_count + d.teen_count + d.child_count + d.infant_count AS total_pax,
  d.budget_max,
  d.budget_currency,
  d.tenant_id,
  d.advisor_id,
  d.dmc_id,

  -- Contact principal
  p.first_name AS client_first_name,
  p.last_name AS client_last_name,
  p.email AS client_email,

  -- Conseiller
  u.full_name AS advisor_name,

  -- DMC
  t.name AS dmc_name,

  -- Calculs
  EXTRACT(DAY FROM NOW() - d.last_activity_at)::INTEGER AS days_inactive,
  CASE
    WHEN d.departure_date_from IS NOT NULL
    THEN (d.departure_date_from - CURRENT_DATE)
    ELSE NULL
  END AS days_to_departure,
  d.created_at

FROM dossiers d
LEFT JOIN participants p ON d.primary_contact_id = p.id
LEFT JOIN users u ON d.advisor_id = u.id
LEFT JOIN tenants t ON d.dmc_id = t.id
WHERE d.status NOT IN ('completed', 'cancelled', 'archived');

COMMENT ON TABLE dossiers IS 'Dossiers clients - représente une demande de voyage';
COMMENT ON TABLE dossier_participants IS 'Liaison entre dossiers et participants';
COMMENT ON VIEW v_pipeline IS 'Vue optimisée pour l''affichage du pipeline commercial';
