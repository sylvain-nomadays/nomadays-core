-- ============================================================
-- NOMADAYS CORE - Migration 002: Tenants et Users
-- ============================================================

-- Table des organisations (Nomadays HQ, DMCs, Agences B2B)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  code VARCHAR(50) UNIQUE NOT NULL,           -- 'nomadays', 'dmc_vietnam', 'dmc_thailand'
  name VARCHAR(255) NOT NULL,
  type tenant_type NOT NULL,

  -- Localisation
  country_code CHAR(2),                       -- ISO 3166-1 alpha-2
  timezone VARCHAR(50) DEFAULT 'Europe/Paris',

  -- Paramètres
  default_currency currency DEFAULT 'EUR',
  default_margin_b2c DECIMAL(5,2) DEFAULT 30.00,
  default_margin_b2b DECIMAL(5,2) DEFAULT 20.00,

  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,

  -- Configuration
  settings JSONB DEFAULT '{}',

  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_tenants_type ON tenants(type) WHERE is_active = true;
CREATE INDEX idx_tenants_country ON tenants(country_code);

-- Table des utilisateurs (étend auth.users de Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Organisation
  tenant_id UUID REFERENCES tenants(id),

  -- Identité
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(50),

  -- Rôle et permissions
  role user_role NOT NULL DEFAULT 'client_direct',

  -- Statut
  is_active BOOLEAN DEFAULT true,

  -- Préférences
  preferences JSONB DEFAULT '{
    "language": "fr",
    "notifications_email": true,
    "notifications_push": false
  }',

  -- Métadonnées
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE is_active = true;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Table pour les utilisateurs multi-tenant (ex: support Nomadays accède à plusieurs DMCs)
CREATE TABLE user_tenant_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Rôle spécifique pour ce tenant (peut différer du rôle principal)
  role user_role NOT NULL,

  -- Permissions spécifiques
  can_view_costs BOOLEAN DEFAULT false,       -- Peut voir les coûts d'achat
  can_edit_pricing BOOLEAN DEFAULT false,     -- Peut modifier les tarifs

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger pour créer automatiquement un user quand un auth.user est créé
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client_direct'  -- Rôle par défaut
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insérer le tenant Nomadays HQ par défaut
INSERT INTO tenants (code, name, type, country_code, email)
VALUES ('nomadays', 'Nomadays', 'hq', 'FR', 'contact@nomadays.com');

COMMENT ON TABLE tenants IS 'Organisations: Nomadays HQ, DMCs locales, Agences B2B';
COMMENT ON TABLE users IS 'Utilisateurs du système, étend auth.users de Supabase';
COMMENT ON TABLE user_tenant_access IS 'Accès multi-tenant pour les utilisateurs';
