-- ============================================================
-- NOMADAYS CORE - Full Schema (Consolidated Migration)
-- Execute this single file to set up the complete database
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

-- User roles
CREATE TYPE user_role AS ENUM (
  'admin_nomadays',
  'support_nomadays',
  'dmc_manager',
  'dmc_seller',
  'dmc_accountant',
  'client_direct',
  'agency_b2b'
);

-- Tenant types
CREATE TYPE tenant_type AS ENUM (
  'nomadays_hq',
  'dmc',
  'agency_b2b'
);

-- Dossier statuses
CREATE TYPE dossier_status AS ENUM (
  'lead',
  'quote_in_progress',
  'quote_sent',
  'negotiation',
  'confirmed',
  'deposit_paid',
  'fully_paid',
  'in_trip',
  'completed',
  'cancelled',
  'archived'
);

-- Dossier origins
CREATE TYPE dossier_origin AS ENUM (
  'website_b2c',
  'agency_b2b',
  'referral',
  'repeat_client',
  'other'
);

-- Trip types
CREATE TYPE trip_type AS ENUM (
  'fit',
  'gir',
  'group'
);

-- Service types
CREATE TYPE service_type AS ENUM (
  'accommodation',
  'transport',
  'activity',
  'guide',
  'meal',
  'transfer',
  'flight',
  'insurance',
  'visa',
  'other'
);

-- Pricing units
CREATE TYPE pricing_unit AS ENUM (
  'per_person',
  'per_group',
  'per_room',
  'per_vehicle',
  'per_day',
  'fixed'
);

-- Proposal statuses
CREATE TYPE proposal_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired'
);

-- Payment statuses
CREATE TYPE payment_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'refunded',
  'failed'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'credit_card',
  'cash',
  'check',
  'other'
);

-- Document types
CREATE TYPE document_type AS ENUM (
  'proposal_pdf',
  'invoice',
  'voucher',
  'travel_book',
  'contract',
  'passport_copy',
  'other'
);

-- Event types
CREATE TYPE event_type AS ENUM (
  'dossier_created',
  'dossier_status_changed',
  'proposal_sent',
  'proposal_accepted',
  'proposal_rejected',
  'payment_received',
  'document_uploaded',
  'email_sent',
  'note_added',
  'task_created',
  'task_completed',
  'participant_added',
  'participant_removed',
  'circuit_modified',
  'price_updated',
  'dmc_assigned',
  'advisor_assigned',
  'custom'
);

-- Task priorities
CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Task statuses
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

-- AI suggestion types
CREATE TYPE ai_suggestion_type AS ENUM (
  'circuit_optimization',
  'pricing_adjustment',
  'upsell',
  'schedule_conflict',
  'followup_reminder',
  'other'
);

-- Email statuses
CREATE TYPE email_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed'
);

-- ============================================================
-- 2. TENANTS & USERS
-- ============================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type tenant_type NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  country_code CHAR(2),
  currency CHAR(3) DEFAULT 'EUR',
  timezone TEXT DEFAULT 'Europe/Paris',
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_tenant_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. PARTICIPANTS
-- ============================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  nationality CHAR(2),
  passport_number TEXT,
  passport_expiry DATE,
  dietary_requirements TEXT,
  medical_notes TEXT,
  emergency_contact JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_user ON participants(user_id);

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. DOSSIERS
-- ============================================================

-- Generate reference function
CREATE OR REPLACE FUNCTION generate_dossier_reference()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  new_ref TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference FROM 'NMD-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM dossiers
  WHERE reference LIKE 'NMD-' || year_part || '-%';
  new_ref := 'NMD-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL DEFAULT generate_dossier_reference(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dmc_id UUID REFERENCES tenants(id),
  advisor_id UUID REFERENCES users(id),
  status dossier_status DEFAULT 'lead',
  origin dossier_origin DEFAULT 'website_b2c',
  trip_type trip_type DEFAULT 'fit',
  title TEXT NOT NULL,
  destination_countries TEXT[] DEFAULT '{}',
  departure_date_from DATE,
  departure_date_to DATE,
  duration_days INTEGER,
  flexibility_days INTEGER DEFAULT 0,
  pax_adults INTEGER DEFAULT 2,
  pax_children INTEGER DEFAULT 0,
  pax_infants INTEGER DEFAULT 0,
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  budget_currency CHAR(3) DEFAULT 'EUR',
  client_notes TEXT,
  internal_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  gir_parent_id UUID REFERENCES dossiers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dossier_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id),
  is_lead BOOLEAN DEFAULT false,
  room_preference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dossier_id, participant_id)
);

-- Indexes
CREATE INDEX idx_dossiers_tenant ON dossiers(tenant_id);
CREATE INDEX idx_dossiers_dmc ON dossiers(dmc_id);
CREATE INDEX idx_dossiers_status ON dossiers(status);
CREATE INDEX idx_dossiers_departure ON dossiers(departure_date_from);
CREATE INDEX idx_dossiers_reference ON dossiers(reference);
CREATE INDEX idx_dossiers_gir_parent ON dossiers(gir_parent_id) WHERE gir_parent_id IS NOT NULL;
CREATE INDEX idx_dossier_participants_dossier ON dossier_participants(dossier_id);

CREATE TRIGGER update_dossiers_updated_at
  BEFORE UPDATE ON dossiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. CIRCUITS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  description_html TEXT,
  duration_days INTEGER NOT NULL,
  countries TEXT[] DEFAULT '{}',
  highlights TEXT[] DEFAULT '{}',
  included TEXT[] DEFAULT '{}',
  excluded TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  base_price_from DECIMAL(12,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE circuit_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  description_html TEXT,
  coordinates POINT,
  overnight_location TEXT,
  meals_included TEXT[] DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE circuit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  element_id UUID REFERENCES circuit_elements(id) ON DELETE SET NULL,
  service_type service_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  supplier_name TEXT,
  supplier_ref TEXT,
  quantity INTEGER DEFAULT 1,
  pricing_unit pricing_unit DEFAULT 'per_person',
  is_optional BOOLEAN DEFAULT false,
  is_visible_to_client BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  notes_internal TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE circuit_item_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES circuit_items(id) ON DELETE CASCADE,
  season_name TEXT DEFAULT 'default',
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  pax_min INTEGER DEFAULT 1,
  pax_max INTEGER DEFAULT 99,
  cost_unit DECIMAL(12,2) NOT NULL,
  cost_currency CHAR(3) DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (valid_from <= valid_to),
  CONSTRAINT valid_pax_range CHECK (pax_min <= pax_max)
);

CREATE TABLE circuit_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(circuit_id, version_number)
);

-- Indexes
CREATE INDEX idx_circuits_tenant ON circuits(tenant_id);
CREATE INDEX idx_circuits_slug ON circuits(slug);
CREATE INDEX idx_circuits_published ON circuits(is_published) WHERE is_published = true;
CREATE INDEX idx_circuit_elements_circuit ON circuit_elements(circuit_id);
CREATE INDEX idx_circuit_elements_day ON circuit_elements(circuit_id, day_number);
CREATE INDEX idx_circuit_items_circuit ON circuit_items(circuit_id);
CREATE INDEX idx_circuit_items_element ON circuit_items(element_id);
CREATE INDEX idx_circuit_item_seasons_item ON circuit_item_seasons(item_id);
CREATE INDEX idx_circuit_item_seasons_dates ON circuit_item_seasons(valid_from, valid_to);

CREATE TRIGGER update_circuits_updated_at BEFORE UPDATE ON circuits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_circuit_elements_updated_at BEFORE UPDATE ON circuit_elements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_circuit_items_updated_at BEFORE UPDATE ON circuit_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. SERVICES & TARIFFS
-- ============================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_type service_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  supplier_name TEXT,
  location TEXT,
  country_code CHAR(2),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  season_name TEXT DEFAULT 'default',
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  pax_min INTEGER DEFAULT 1,
  pax_max INTEGER DEFAULT 99,
  pricing_unit pricing_unit DEFAULT 'per_person',
  cost_amount DECIMAL(12,2) NOT NULL,
  cost_currency CHAR(3) DEFAULT 'EUR',
  sell_amount DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_tariff_dates CHECK (valid_from <= valid_to),
  CONSTRAINT valid_tariff_pax CHECK (pax_min <= pax_max)
);

CREATE TABLE quotation_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',
  margin_b2c_percent DECIMAL(5,2) DEFAULT 30.00,
  margin_b2b_percent DECIMAL(5,2) DEFAULT 20.00,
  commission_nomadays_percent DECIMAL(5,2) DEFAULT 11.50,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quotation_grid_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES quotation_grids(id) ON DELETE CASCADE,
  pax_count INTEGER NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  total_sell_b2c DECIMAL(12,2) NOT NULL,
  total_sell_b2b DECIMAL(12,2) NOT NULL,
  price_per_person_b2c DECIMAL(12,2) NOT NULL,
  price_per_person_b2b DECIMAL(12,2) NOT NULL,
  breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grid_id, pax_count)
);

-- Indexes
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_type ON services(service_type);
CREATE INDEX idx_service_tariffs_service ON service_tariffs(service_id);
CREATE INDEX idx_service_tariffs_dates ON service_tariffs(valid_from, valid_to);
CREATE INDEX idx_quotation_grids_circuit ON quotation_grids(circuit_id);

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_service_tariffs_updated_at BEFORE UPDATE ON service_tariffs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quotation_grids_updated_at BEFORE UPDATE ON quotation_grids FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. PROPOSALS & PAYMENTS
-- ============================================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  circuit_id UUID REFERENCES circuits(id),
  version INTEGER DEFAULT 1,
  status proposal_status DEFAULT 'draft',
  title TEXT NOT NULL,
  introduction_html TEXT,
  conclusion_html TEXT,
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_sell DECIMAL(12,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'EUR',
  pax_count INTEGER DEFAULT 2,
  price_per_person DECIMAL(12,2) DEFAULT 0,
  validity_date DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  pdf_url TEXT,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE proposal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  circuit_item_id UUID REFERENCES circuit_items(id),
  day_number INTEGER,
  service_type service_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  is_included BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pricing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id),
  status payment_status DEFAULT 'pending',
  method payment_method,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  reference TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  type document_type NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_client_visible BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_proposals_dossier ON proposals(dossier_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_public_token ON proposals(public_token);
CREATE INDEX idx_proposal_lines_proposal ON proposal_lines(proposal_id);
CREATE INDEX idx_payments_dossier ON payments(dossier_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_documents_dossier ON documents(dossier_id);

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. EVENTS, TASKS & AI
-- ============================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_email TEXT,
  target_type TEXT,
  target_id UUID,
  payload JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent modifications to events (immutable)
CREATE OR REPLACE FUNCTION prevent_event_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Events are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_event_update
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION prevent_event_modification();

CREATE TRIGGER prevent_event_delete
  BEFORE DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION prevent_event_modification();

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  suggestion_type ai_suggestion_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  context JSONB DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT false,
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status email_status DEFAULT 'pending',
  resend_id TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_dossier ON events(dossier_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_dossier ON tasks(dossier_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_ai_suggestions_dossier ON ai_suggestions(dossier_id);
CREATE INDEX idx_email_sends_dossier ON email_sends(dossier_id);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Emit event function
CREATE OR REPLACE FUNCTION emit_event(
  p_tenant_id UUID,
  p_event_type event_type,
  p_dossier_id UUID DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_actor_id UUID;
  v_actor_email TEXT;
BEGIN
  SELECT id, email INTO v_actor_id, v_actor_email
  FROM users WHERE id = auth.uid();

  INSERT INTO events (tenant_id, dossier_id, event_type, actor_id, actor_email, target_type, target_id, payload)
  VALUES (p_tenant_id, p_dossier_id, p_event_type, v_actor_id, v_actor_email, p_target_type, p_target_id, p_payload)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_nomadays_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() = 'admin_nomadays', false)
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_nomadays_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() IN ('admin_nomadays', 'support_nomadays'), false)
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_dmc_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() IN ('dmc_manager', 'dmc_seller', 'dmc_accountant'), false)
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.belongs_to_tenant(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (tenant_id = check_tenant_id OR public.is_nomadays_admin())
  )
  OR EXISTS (
    SELECT 1 FROM public.user_tenant_access
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_see_costs(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND tenant_id = check_tenant_id
    AND role IN ('dmc_manager', 'dmc_seller', 'dmc_accountant')
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_dossier(check_dossier_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_tenant_id UUID;
  v_dossier RECORD;
BEGIN
  v_role := public.get_user_role();
  v_tenant_id := public.get_user_tenant_id();

  IF v_role IS NULL THEN RETURN FALSE; END IF;
  IF v_role = 'admin_nomadays' THEN RETURN TRUE; END IF;

  SELECT * INTO v_dossier FROM public.dossiers WHERE id = check_dossier_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF v_role = 'support_nomadays' THEN
    RETURN v_dossier.tenant_id = v_tenant_id OR v_dossier.advisor_id = auth.uid();
  END IF;

  IF v_role IN ('dmc_manager', 'dmc_seller') THEN
    RETURN v_dossier.dmc_id = v_tenant_id;
  END IF;

  IF v_role IN ('client_direct', 'agency_b2b') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.dossier_participants dp
      JOIN public.participants p ON dp.participant_id = p.id
      WHERE dp.dossier_id = check_dossier_id AND p.user_id = auth.uid()
    ) OR v_dossier.tenant_id = v_tenant_id;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_item_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Tenants policies
CREATE POLICY tenants_select ON tenants FOR SELECT TO authenticated
  USING (is_active = true OR public.is_nomadays_admin());
CREATE POLICY tenants_admin ON tenants FOR ALL TO authenticated
  USING (public.is_nomadays_admin()) WITH CHECK (public.is_nomadays_admin());

-- Users policies
CREATE POLICY users_select ON users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.belongs_to_tenant(tenant_id) OR public.is_nomadays_staff());
CREATE POLICY users_update_self ON users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY users_admin ON users FOR ALL TO authenticated
  USING (public.is_nomadays_admin()) WITH CHECK (public.is_nomadays_admin());

-- Participants policies
CREATE POLICY participants_select ON participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_nomadays_staff() OR public.is_dmc_staff()
    OR EXISTS (SELECT 1 FROM dossier_participants dp JOIN dossiers d ON dp.dossier_id = d.id
      WHERE dp.participant_id = participants.id AND public.can_access_dossier(d.id)));
CREATE POLICY participants_staff ON participants FOR ALL TO authenticated
  USING (public.is_nomadays_staff() OR public.is_dmc_staff())
  WITH CHECK (public.is_nomadays_staff() OR public.is_dmc_staff());
CREATE POLICY participants_update_self ON participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Dossiers policies
CREATE POLICY dossiers_select ON dossiers FOR SELECT TO authenticated
  USING (public.can_access_dossier(id));
CREATE POLICY dossiers_insert ON dossiers FOR INSERT TO authenticated
  WITH CHECK (public.is_nomadays_staff()
    OR (public.get_user_role() = 'agency_b2b' AND tenant_id = public.get_user_tenant_id()));
CREATE POLICY dossiers_update ON dossiers FOR UPDATE TO authenticated
  USING (public.can_access_dossier(id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'))
  WITH CHECK (public.can_access_dossier(id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'));
CREATE POLICY dossiers_delete ON dossiers FOR DELETE TO authenticated
  USING (public.is_nomadays_admin());

-- Dossier participants policies
CREATE POLICY dossier_participants_select ON dossier_participants FOR SELECT TO authenticated
  USING (public.can_access_dossier(dossier_id));
CREATE POLICY dossier_participants_modify ON dossier_participants FOR ALL TO authenticated
  USING (public.can_access_dossier(dossier_id) AND (public.is_nomadays_staff() OR public.is_dmc_staff()))
  WITH CHECK (public.can_access_dossier(dossier_id) AND (public.is_nomadays_staff() OR public.is_dmc_staff()));

-- Circuits policies
CREATE POLICY circuits_select ON circuits FOR SELECT TO authenticated
  USING (is_published = true OR public.belongs_to_tenant(tenant_id) OR public.is_nomadays_staff());
CREATE POLICY circuits_modify ON circuits FOR ALL TO authenticated
  USING (public.belongs_to_tenant(tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'))
  WITH CHECK (public.belongs_to_tenant(tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'));

-- Circuit elements policies
CREATE POLICY circuit_elements_select ON circuit_elements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_elements.circuit_id
    AND (c.is_published = true OR public.belongs_to_tenant(c.tenant_id) OR public.is_nomadays_staff())));
CREATE POLICY circuit_elements_modify ON circuit_elements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_elements.circuit_id
    AND public.belongs_to_tenant(c.tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')))
  WITH CHECK (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_elements.circuit_id
    AND public.belongs_to_tenant(c.tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')));

-- Circuit items policies
CREATE POLICY circuit_items_select ON circuit_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_items.circuit_id
    AND (c.is_published = true OR public.belongs_to_tenant(c.tenant_id) OR public.is_nomadays_staff())));
CREATE POLICY circuit_items_modify ON circuit_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_items.circuit_id
    AND public.belongs_to_tenant(c.tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')))
  WITH CHECK (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_items.circuit_id
    AND public.belongs_to_tenant(c.tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')));

-- Circuit item seasons (costs - DMC only)
CREATE POLICY circuit_item_seasons_dmc_only ON circuit_item_seasons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM circuit_items ci JOIN circuits c ON ci.circuit_id = c.id
    WHERE ci.id = circuit_item_seasons.item_id AND public.can_see_costs(c.tenant_id)));
CREATE POLICY circuit_item_seasons_modify ON circuit_item_seasons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM circuit_items ci JOIN circuits c ON ci.circuit_id = c.id
    WHERE ci.id = circuit_item_seasons.item_id AND public.can_see_costs(c.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM circuit_items ci JOIN circuits c ON ci.circuit_id = c.id
    WHERE ci.id = circuit_item_seasons.item_id AND public.can_see_costs(c.tenant_id)));

-- Service tariffs (costs - DMC only)
CREATE POLICY service_tariffs_dmc_only ON service_tariffs FOR ALL TO authenticated
  USING (public.can_see_costs(tenant_id)) WITH CHECK (public.can_see_costs(tenant_id));

-- Proposals policies
CREATE POLICY proposals_select ON proposals FOR SELECT TO authenticated
  USING (public.can_access_dossier(dossier_id));
CREATE POLICY proposals_modify ON proposals FOR ALL TO authenticated
  USING (public.can_access_dossier(dossier_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'))
  WITH CHECK (public.can_access_dossier(dossier_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'));

-- Events policies
CREATE POLICY events_select ON events FOR SELECT TO authenticated
  USING (public.is_nomadays_admin() OR public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id)));
CREATE POLICY events_insert ON events FOR INSERT TO authenticated
  WITH CHECK (public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id)));

-- Tasks policies
CREATE POLICY tasks_select ON tasks FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id)));
CREATE POLICY tasks_modify ON tasks FOR ALL TO authenticated
  USING (public.belongs_to_tenant(tenant_id) OR assignee_id = auth.uid())
  WITH CHECK (public.belongs_to_tenant(tenant_id));

-- AI suggestions policies
CREATE POLICY ai_suggestions_select ON ai_suggestions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id)));
CREATE POLICY ai_suggestions_update ON ai_suggestions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Comments
COMMENT ON FUNCTION public.can_access_dossier IS 'Vérifie si l''utilisateur peut accéder à un dossier selon son rôle';
COMMENT ON FUNCTION public.can_see_costs IS 'Vérifie si l''utilisateur peut voir les coûts d''achat d''un tenant';

SELECT 'Schema created successfully!' as message;
