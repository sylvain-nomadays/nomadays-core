-- ============================================================
-- NOMADAYS CORE - Migration 005: Circuits et éléments
-- ============================================================

-- Extension nécessaire pour les contraintes EXCLUDE avec UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Table des circuits (roadbooks)
CREATE TABLE circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propriétaire
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Identification
  code VARCHAR(50) NOT NULL,                  -- 'vietnam-essentiel-14j'
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),

  -- Classification
  destination_countries CHAR(2)[] NOT NULL,
  duration_days SMALLINT NOT NULL,
  difficulty_level SMALLINT CHECK (difficulty_level BETWEEN 1 AND 5),
  themes VARCHAR(50)[],                       -- ['culture', 'nature', 'adventure']

  -- Contenu éditorial résumé
  summary TEXT,
  highlights TEXT[],

  -- SEO & Marketing
  meta_title VARCHAR(255),
  meta_description TEXT,
  hero_image_url TEXT,

  -- Statut
  is_template BOOLEAN DEFAULT false,          -- Template bibliothèque
  is_published BOOLEAN DEFAULT false,
  is_bookable_online BOOLEAN DEFAULT false,

  -- Versioning
  current_version INTEGER DEFAULT 1,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, code)
);

-- Index
CREATE INDEX idx_circuits_tenant ON circuits(tenant_id);
CREATE INDEX idx_circuits_destination ON circuits USING GIN(destination_countries);
CREATE INDEX idx_circuits_themes ON circuits USING GIN(themes);
CREATE INDEX idx_circuits_published ON circuits(is_published, is_bookable_online)
  WHERE is_published = true;

-- Trigger updated_at
CREATE TRIGGER trg_circuits_updated_at
  BEFORE UPDATE ON circuits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Éléments du circuit (structure arborescente)
CREATE TABLE circuit_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES circuit_elements(id) ON DELETE CASCADE,

  -- Position dans l'arbre
  sort_order INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,           -- 0 = jour, 1 = visite, 2 = sous-élément

  -- Type d'élément
  element_type circuit_element_type NOT NULL,

  -- Contenu
  title VARCHAR(255) NOT NULL,
  description TEXT,                           -- Contenu TipTap JSON ou HTML

  -- Données spécifiques selon le type (JSONB flexible)
  metadata JSONB DEFAULT '{}',
  -- Pour 'day': { day_number: 1, date: '2024-06-15', overnight_location: 'Hanoi' }
  -- Pour 'visit': { duration_hours: 2, location: {lat, lng}, opening_hours: '...' }
  -- Pour 'accommodation': { hotel_name: '...', room_type: 'deluxe', stars: 4 }
  -- Pour 'transfer': { from: '...', to: '...', vehicle_type: 'private_car', duration_hours: 2 }

  -- Médias
  image_url TEXT,
  gallery_urls TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_circuit_elements_circuit ON circuit_elements(circuit_id, sort_order);
CREATE INDEX idx_circuit_elements_parent ON circuit_elements(parent_id);
CREATE INDEX idx_circuit_elements_type ON circuit_elements(element_type);

-- Trigger updated_at
CREATE TRIGGER trg_circuit_elements_updated_at
  BEFORE UPDATE ON circuit_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Items de cotation (attachés aux éléments)
CREATE TABLE circuit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  element_id UUID REFERENCES circuit_elements(id) ON DELETE SET NULL,

  -- Identification
  name VARCHAR(255) NOT NULL,                 -- "Entrance fee - adult"
  description TEXT,

  -- Lien optionnel au catalogue de services
  service_id UUID,                            -- FK ajoutée après création table services

  -- Règles de quantité
  amount_type amount_type NOT NULL DEFAULT 'fixed',
  amount_value DECIMAL(8,2) NOT NULL DEFAULT 1,

  -- Configuration ratio (si amount_type = 'ratio')
  ratio_applies_to VARCHAR(50)[] DEFAULT ARRAY['adult'],  -- ['adult', 'teen', 'child']
  ratio_divisor INTEGER DEFAULT 1,            -- Ex: 1 guide pour 4 pax → divisor = 4

  -- Multiplicateur temporel
  times_type times_type DEFAULT 'once',
  times_value INTEGER DEFAULT 1,

  -- Devise et coût par défaut
  cost_currency currency NOT NULL DEFAULT 'THB',
  default_cost DECIMAL(12,2),

  -- Options
  is_optional BOOLEAN DEFAULT false,
  is_included BOOLEAN DEFAULT true,

  -- Ordre d'affichage
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_circuit_items_circuit ON circuit_items(circuit_id);
CREATE INDEX idx_circuit_items_element ON circuit_items(element_id);

-- Trigger updated_at
CREATE TRIGGER trg_circuit_items_updated_at
  BEFORE UPDATE ON circuit_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Tarifs saisonniers des items
CREATE TABLE circuit_item_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES circuit_items(id) ON DELETE CASCADE,

  -- Période
  season_name VARCHAR(100),                   -- "Haute saison", "Basse saison"
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,

  -- Coût pour cette saison
  cost_amount DECIMAL(12,2) NOT NULL,

  -- Conditions optionnelles
  min_pax SMALLINT,
  max_pax SMALLINT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: pas de chevauchement de dates pour même item
  CONSTRAINT no_season_overlap EXCLUDE USING GIST (
    item_id WITH =,
    DATERANGE(valid_from, valid_to, '[]') WITH &&
  )
);

CREATE INDEX idx_circuit_item_seasons_item ON circuit_item_seasons(item_id);
CREATE INDEX idx_circuit_item_seasons_dates ON circuit_item_seasons(valid_from, valid_to);

-- Versions de circuit (snapshots)
CREATE TABLE circuit_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Snapshot complet du circuit
  snapshot JSONB NOT NULL,                    -- Structure complète: elements + items + seasons

  -- Métadonnées
  change_summary TEXT,
  is_major_version BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(circuit_id, version_number)
);

CREATE INDEX idx_circuit_versions_circuit ON circuit_versions(circuit_id, version_number DESC);

COMMENT ON TABLE circuits IS 'Circuits / Roadbooks - structure éditoriale des voyages';
COMMENT ON TABLE circuit_elements IS 'Éléments du circuit (jours, visites, transferts, etc.) - arbre';
COMMENT ON TABLE circuit_items IS 'Items de cotation attachés aux éléments';
COMMENT ON TABLE circuit_item_seasons IS 'Tarifs saisonniers des items';
COMMENT ON TABLE circuit_versions IS 'Versions snapshots des circuits pour les propositions';
