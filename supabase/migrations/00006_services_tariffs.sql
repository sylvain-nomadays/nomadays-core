-- ============================================================
-- NOMADAYS CORE - Migration 006: Services et Tarifs
-- ============================================================

-- Catalogue de services (global ou par DMC)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propriétaire (NULL = service global Nomadays)
  tenant_id UUID REFERENCES tenants(id),

  -- Identification
  code VARCHAR(50) NOT NULL,                  -- 'HTL-HAN-SOFITEL-DBL'
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  type service_type NOT NULL,
  category VARCHAR(100),                      -- 'hotel_5star', 'private_car', 'group_tour'

  -- Localisation
  country_code CHAR(2),
  city VARCHAR(100),
  address TEXT,
  coordinates JSONB,                          -- { lat: 21.0285, lng: 105.8542 }

  -- Fournisseur
  supplier_name VARCHAR(255),
  supplier_code VARCHAR(50),
  supplier_contact JSONB,                     -- { email, phone, contact_name }

  -- Caractéristiques (flexible selon le type)
  attributes JSONB DEFAULT '{}',
  -- Pour hotel: { stars: 5, room_types: ['deluxe', 'suite'], amenities: [...] }
  -- Pour transport: { vehicle_type: 'minivan', capacity: 7, air_conditioned: true }
  -- Pour guide: { languages: ['fr', 'en'], specialties: ['history', 'nature'] }

  -- Médias
  image_url TEXT,
  gallery_urls TEXT[],

  -- Statut
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

-- Index
CREATE INDEX idx_services_tenant ON services(tenant_id) WHERE is_active = true;
CREATE INDEX idx_services_type ON services(type, is_active);
CREATE INDEX idx_services_country ON services(country_code, type);
CREATE INDEX idx_services_code ON services(code);

-- Trigger updated_at
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Ajouter la FK sur circuit_items maintenant que services existe
ALTER TABLE circuit_items
  ADD CONSTRAINT fk_circuit_items_service
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

-- Tarifs des services (par DMC, par saison)
-- C'est ici que chaque DMC définit SES prix d'achat
CREATE TABLE service_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),  -- DMC qui propose ce tarif

  -- Période de validité
  season_name VARCHAR(100),
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,

  -- Prix d'achat (CONFIDENTIEL - visible uniquement par la DMC)
  cost_amount DECIMAL(12,2) NOT NULL,
  cost_currency currency NOT NULL,

  -- Prix de vente suggéré (visible par Nomadays)
  sell_amount DECIMAL(12,2),
  sell_currency currency DEFAULT 'EUR',

  -- Unité de tarification
  unit VARCHAR(30) DEFAULT 'per_unit',        -- 'per_unit', 'per_person', 'per_night', 'per_hour'

  -- Conditions
  min_pax SMALLINT,
  max_pax SMALLINT,
  min_nights SMALLINT,

  -- Notes
  conditions TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Pas de chevauchement de dates pour même service/tenant
  CONSTRAINT no_tariff_overlap EXCLUDE USING GIST (
    service_id WITH =,
    tenant_id WITH =,
    DATERANGE(valid_from, valid_to, '[]') WITH &&
  )
);

-- Index
CREATE INDEX idx_service_tariffs_service ON service_tariffs(service_id);
CREATE INDEX idx_service_tariffs_tenant ON service_tariffs(tenant_id);
CREATE INDEX idx_service_tariffs_dates ON service_tariffs(valid_from, valid_to);

-- Trigger updated_at
CREATE TRIGGER trg_service_tariffs_updated_at
  BEFORE UPDATE ON service_tariffs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grilles de cotation (configuration prix par nombre de pax)
CREATE TABLE quotation_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,

  -- Identification
  name VARCHAR(255) NOT NULL,                 -- "Cotation 2024"

  -- Période de validité
  start_date DATE NOT NULL,

  -- Devise de vente
  currency currency NOT NULL DEFAULT 'EUR',

  -- Taux de change snapshot
  fx_rates JSONB NOT NULL DEFAULT '{}',       -- { "THB": 0.0276, "VND": 0.000038 }
  fx_rates_date DATE,

  -- Marges par défaut
  default_margin_b2c DECIMAL(5,2) DEFAULT 30.00,
  default_margin_b2b DECIMAL(5,2) DEFAULT 20.00,

  -- Commission Nomadays (sur ventes B2C)
  nomadays_commission DECIMAL(5,2) DEFAULT 11.50,

  -- TVA / Taxes
  vat_rate DECIMAL(5,2) DEFAULT 0,
  operator_commission DECIMAL(5,2) DEFAULT 0,

  -- Langue guide par défaut
  guide_language VARCHAR(50) DEFAULT 'Français',

  -- Statut
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_quotation_grids_circuit ON quotation_grids(circuit_id);

-- Trigger updated_at
CREATE TRIGGER trg_quotation_grids_updated_at
  BEFORE UPDATE ON quotation_grids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Lignes de la grille (une ligne par configuration pax)
CREATE TABLE quotation_grid_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES quotation_grids(id) ON DELETE CASCADE,

  -- Configuration pax
  pax_count INTEGER NOT NULL,                 -- 2, 3, 4, 5...
  pax_config JSONB NOT NULL DEFAULT '{}',     -- { adults: 2, teens: 0, children: 0, guides: 1, drivers: 1 }
  pax_args VARCHAR(255),                      -- "adult-2, guide-1, driver-1, dbl-1" (affichage)

  -- Configuration chambres
  room_config JSONB DEFAULT '{}',             -- { single: 0, double: 1, twin: 0, triple: 0 }

  -- Marge spécifique (override du défaut)
  custom_margin DECIMAL(5,2),

  -- Résultats calculés (snapshot)
  total_cost DECIMAL(12,2),                   -- Coût total
  total_cost_currency currency,
  total_price DECIMAL(12,2),                  -- Prix de vente
  margin_amount DECIMAL(12,2),
  margin_percent DECIMAL(5,2),
  price_per_person DECIMAL(12,2),

  -- Détails du calcul
  calculation_details JSONB,                  -- Détail ligne par ligne

  calculated_at TIMESTAMPTZ,

  UNIQUE(grid_id, pax_count)
);

CREATE INDEX idx_quotation_grid_lines_grid ON quotation_grid_lines(grid_id);

COMMENT ON TABLE services IS 'Catalogue de services (hôtels, transports, guides, etc.)';
COMMENT ON TABLE service_tariffs IS 'Tarifs des services par DMC et par saison - COÛTS CONFIDENTIELS';
COMMENT ON TABLE quotation_grids IS 'Grilles de cotation pour les circuits';
COMMENT ON TABLE quotation_grid_lines IS 'Lignes de cotation par nombre de pax';
