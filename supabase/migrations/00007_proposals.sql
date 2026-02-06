-- ============================================================
-- NOMADAYS CORE - Migration 007: Propositions
-- ============================================================

-- Propositions (devis envoyés aux clients)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,

  -- Versioning
  version_number SMALLINT NOT NULL DEFAULT 1,
  name VARCHAR(255),                          -- "Vietnam Essentiel - Option Luxe"

  -- Circuit lié (snapshot)
  circuit_id UUID REFERENCES circuits(id),
  circuit_version_id UUID REFERENCES circuit_versions(id),

  -- Ou circuit personnalisé (inline, sans référence)
  custom_circuit JSONB,

  -- Dates du voyage proposé
  departure_date DATE,
  return_date DATE,
  duration_days SMALLINT,

  -- Configuration pax
  pax_config JSONB DEFAULT '{}',              -- { adults: 2, teens: 0, children: 0 }

  -- Statut
  status proposal_status DEFAULT 'draft',

  -- Tracking client
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,

  -- Validité
  valid_until DATE,

  -- Messages
  internal_notes TEXT,
  client_message TEXT,                        -- Message accompagnant l'envoi

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(dossier_id, version_number)
);

-- Index
CREATE INDEX idx_proposals_dossier ON proposals(dossier_id, version_number DESC);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_circuit ON proposals(circuit_id);

-- Trigger updated_at
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Lignes de proposition (prestations chiffrées)
CREATE TABLE proposal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  -- Référence optionnelle
  service_id UUID REFERENCES services(id),
  circuit_item_id UUID REFERENCES circuit_items(id),

  -- Détails
  day_number SMALLINT,
  description VARCHAR(500) NOT NULL,
  category service_type,

  -- Quantités
  quantity DECIMAL(8,2) DEFAULT 1,
  unit VARCHAR(30) DEFAULT 'unit',
  pax_count SMALLINT,

  -- Prix snapshot (figé à la création)
  cost_amount DECIMAL(12,2) NOT NULL,
  cost_currency currency NOT NULL,

  sell_amount DECIMAL(12,2) NOT NULL,
  sell_currency currency NOT NULL DEFAULT 'EUR',

  -- Taux de change utilisé
  fx_rate DECIMAL(12,6),
  fx_rate_date DATE,

  -- Options
  is_optional BOOLEAN DEFAULT false,
  is_included BOOLEAN DEFAULT true,

  -- Ordre d'affichage
  sort_order INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_proposal_lines_proposal ON proposal_lines(proposal_id, sort_order);

-- Snapshot de prix (résultat figé du calcul)
CREATE TABLE pricing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  -- Totaux
  total_cost DECIMAL(12,2) NOT NULL,
  total_cost_currency currency NOT NULL,

  total_sell DECIMAL(12,2) NOT NULL,
  total_sell_currency currency NOT NULL DEFAULT 'EUR',

  -- Décomposition
  subtotal_accommodation DECIMAL(12,2),
  subtotal_transport DECIMAL(12,2),
  subtotal_activities DECIMAL(12,2),
  subtotal_guides DECIMAL(12,2),
  subtotal_meals DECIMAL(12,2),
  subtotal_flights DECIMAL(12,2),
  subtotal_insurance DECIMAL(12,2),
  subtotal_fees DECIMAL(12,2),
  subtotal_misc DECIMAL(12,2),

  -- Marges
  margin_amount DECIMAL(12,2),
  margin_percent DECIMAL(5,2),

  -- Commission Nomadays (si applicable)
  nomadays_commission_amount DECIMAL(12,2),
  nomadays_commission_percent DECIMAL(5,2),

  -- Prix par personne
  price_per_adult DECIMAL(12,2),
  price_per_teen DECIMAL(12,2),
  price_per_child DECIMAL(12,2),

  -- Taux de change utilisés
  fx_rates JSONB,                             -- { "THB": 0.0276, "VND": 0.000038 }
  fx_rates_date DATE,

  -- Règles de pricing appliquées
  pricing_rules_version VARCHAR(50),
  applied_discounts JSONB,

  -- Métadonnées
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES users(id),

  UNIQUE(proposal_id)
);

-- Paiements (v1 simplifié, v2 avec Monetico)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id),
  proposal_id UUID REFERENCES proposals(id),

  -- Type
  type VARCHAR(30) NOT NULL,                  -- 'deposit', 'balance', 'extra', 'refund'

  -- Montant
  amount DECIMAL(12,2) NOT NULL,
  currency currency NOT NULL DEFAULT 'EUR',

  -- Statut
  status VARCHAR(30) DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'

  -- Échéance
  due_date DATE,
  reminder_sent_at TIMESTAMPTZ,

  -- Paiement effectif
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(12,2),

  -- Provider (v2)
  provider VARCHAR(50),                       -- 'monetico', 'bank_transfer', 'manual'
  provider_reference VARCHAR(255),
  provider_data JSONB,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_payments_dossier ON payments(dossier_id);
CREATE INDEX idx_payments_status ON payments(status, due_date);

-- Trigger updated_at
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte (au moins un doit être renseigné)
  tenant_id UUID REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id),
  proposal_id UUID REFERENCES proposals(id),
  participant_id UUID REFERENCES participants(id),

  -- Fichier
  storage_path TEXT NOT NULL,                 -- Chemin Supabase Storage
  storage_bucket VARCHAR(100) DEFAULT 'documents',
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes INTEGER,

  -- Classification
  type VARCHAR(50) NOT NULL,                  -- 'passport', 'invoice', 'voucher', 'program', 'contract', 'photo'
  category VARCHAR(50),

  -- Métadonnées
  description TEXT,
  is_client_visible BOOLEAN DEFAULT false,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES documents(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index
CREATE INDEX idx_documents_dossier ON documents(dossier_id) WHERE dossier_id IS NOT NULL;
CREATE INDEX idx_documents_participant ON documents(participant_id) WHERE participant_id IS NOT NULL;
CREATE INDEX idx_documents_type ON documents(type);

COMMENT ON TABLE proposals IS 'Propositions / Devis envoyés aux clients';
COMMENT ON TABLE proposal_lines IS 'Lignes de prestation d''une proposition (prix figés)';
COMMENT ON TABLE pricing_snapshots IS 'Snapshot du calcul de prix d''une proposition';
COMMENT ON TABLE payments IS 'Paiements liés aux dossiers';
COMMENT ON TABLE documents IS 'Documents attachés (passeports, factures, vouchers, etc.)';
