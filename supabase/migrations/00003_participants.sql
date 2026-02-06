-- ============================================================
-- NOMADAYS CORE - Migration 003: Participants (voyageurs)
-- ============================================================

-- Table des participants (voyageurs)
-- Un participant est transverse : il peut être lié à plusieurs dossiers
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien optionnel vers un compte utilisateur
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Identité
  civility VARCHAR(10),                       -- 'M.', 'Mme', 'Mlle'
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  place_of_birth VARCHAR(255),
  nationality CHAR(2),                        -- ISO 3166-1 alpha-2

  -- Documents d'identité
  passport_number VARCHAR(50),
  passport_expiry DATE,
  passport_country CHAR(2),

  -- Infos voyage
  dietary_requirements TEXT,
  medical_conditions TEXT,
  allergies TEXT,

  -- Contact d'urgence
  emergency_contact JSONB,                    -- { name, phone, relationship }

  -- Notes internes
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_participants_email ON participants(email) WHERE email IS NOT NULL;
CREATE INDEX idx_participants_name ON participants(last_name, first_name);
CREATE INDEX idx_participants_passport ON participants(passport_number) WHERE passport_number IS NOT NULL;
CREATE INDEX idx_participants_user ON participants(user_id) WHERE user_id IS NOT NULL;

-- Trigger updated_at
CREATE TRIGGER trg_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Vue pour recherche full-text
CREATE OR REPLACE VIEW v_participants_search AS
SELECT
  id,
  first_name,
  last_name,
  email,
  phone,
  date_of_birth,
  nationality,
  first_name || ' ' || last_name AS full_name,
  to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '')) AS search_vector
FROM participants;

COMMENT ON TABLE participants IS 'Voyageurs - transverses, peuvent être liés à plusieurs dossiers';
