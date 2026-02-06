-- ============================================================
-- NOMADAYS CORE - Migration 008: Events Timeline
-- ============================================================

-- Table des événements (timeline immuable)
-- APPEND-ONLY : pas de UPDATE ni DELETE
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,

  -- Événement
  event_type event_type NOT NULL,

  -- Données de l'événement (flexible selon le type)
  payload JSONB NOT NULL DEFAULT '{}',

  -- Acteur
  actor_id UUID REFERENCES users(id),         -- NULL = système
  actor_type VARCHAR(20) DEFAULT 'user',      -- 'user', 'system', 'webhook', 'ai', 'cron'

  -- Horodatage
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Pour les événements email
  email_id VARCHAR(255),                      -- Référence Resend
  email_to TEXT[],

  -- Idempotence (éviter les doublons)
  idempotency_key VARCHAR(255) UNIQUE,

  -- Métadonnées
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_events_dossier ON events(dossier_id, occurred_at DESC)
  WHERE dossier_id IS NOT NULL;
CREATE INDEX idx_events_type ON events(event_type, occurred_at DESC);
CREATE INDEX idx_events_actor ON events(actor_id, occurred_at DESC)
  WHERE actor_id IS NOT NULL;
CREATE INDEX idx_events_occurred ON events(occurred_at DESC);
CREATE INDEX idx_events_tenant ON events(tenant_id, occurred_at DESC);

-- Contrainte : cette table est APPEND-ONLY
-- On empêche les UPDATE et DELETE via trigger

CREATE OR REPLACE FUNCTION prevent_event_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Events table is immutable. UPDATE and DELETE are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_immutable
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_modification();

-- Tâches / Rappels
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,

  -- Assignation
  assignee_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),

  -- Contenu
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type
  task_type VARCHAR(50) DEFAULT 'manual',     -- 'manual', 'follow_up', 'reminder', 'payment', 'document'

  -- Dates
  due_date DATE,
  due_time TIME,
  reminder_at TIMESTAMPTZ,

  -- Statut
  status VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority SMALLINT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),

  -- Complétion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id, status, due_date)
  WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_tasks_dossier ON tasks(dossier_id, status);
CREATE INDEX idx_tasks_due ON tasks(due_date, status)
  WHERE status = 'pending';

-- Trigger updated_at
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Suggestions IA (read-only, jamais source de vérité)
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),          -- Pour qui est la suggestion

  -- Type de suggestion
  type VARCHAR(50) NOT NULL,                  -- 'daily_summary', 'email_draft', 'priority_score', 'action_suggestion', 'circuit_suggestion'

  -- Contenu
  content JSONB NOT NULL,

  -- Scoring
  confidence_score DECIMAL(3,2),              -- 0.00 à 1.00

  -- Statut
  status VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'viewed', 'accepted', 'rejected', 'expired'

  -- Feedback utilisateur
  feedback VARCHAR(20),                       -- 'helpful', 'not_helpful', 'incorrect'
  feedback_notes TEXT,

  -- Validité
  expires_at TIMESTAMPTZ,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ
);

-- Index
CREATE INDEX idx_ai_suggestions_user ON ai_suggestions(user_id, status, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX idx_ai_suggestions_dossier ON ai_suggestions(dossier_id, type);
CREATE INDEX idx_ai_suggestions_expires ON ai_suggestions(expires_at)
  WHERE status = 'pending';

-- Templates d'email
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propriétaire (NULL = template global)
  tenant_id UUID REFERENCES tenants(id),

  -- Identification
  code VARCHAR(100) NOT NULL,                 -- 'proposal_sent', 'payment_reminder'
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Contenu
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,                -- HTML ou react-email JSX

  -- Variables disponibles
  available_variables TEXT[],

  -- Paramètres d'envoi
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),

  -- Statut
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

-- Trigger updated_at
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Historique des envois d'email
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID REFERENCES dossiers(id),
  template_id UUID REFERENCES email_templates(id),
  triggered_by_event_id UUID REFERENCES events(id),

  -- Destinataire
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),
  cc_emails TEXT[],
  bcc_emails TEXT[],

  -- Contenu envoyé
  subject VARCHAR(500) NOT NULL,
  body_preview TEXT,                          -- Premiers 500 caractères

  -- Provider
  resend_id VARCHAR(255),

  -- Statut
  status VARCHAR(30) DEFAULT 'pending',       -- 'pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Erreurs
  error_code VARCHAR(50),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_email_sends_dossier ON email_sends(dossier_id, created_at DESC);
CREATE INDEX idx_email_sends_status ON email_sends(status, created_at DESC);
CREATE INDEX idx_email_sends_resend ON email_sends(resend_id) WHERE resend_id IS NOT NULL;

-- Fonction helper pour émettre un événement
CREATE OR REPLACE FUNCTION emit_event(
  p_tenant_id UUID,
  p_event_type event_type,
  p_payload JSONB DEFAULT '{}',
  p_dossier_id UUID DEFAULT NULL,
  p_proposal_id UUID DEFAULT NULL,
  p_participant_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type VARCHAR(20) DEFAULT 'system',
  p_idempotency_key VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO events (
    tenant_id,
    event_type,
    payload,
    dossier_id,
    proposal_id,
    participant_id,
    actor_id,
    actor_type,
    idempotency_key
  ) VALUES (
    p_tenant_id,
    p_event_type,
    p_payload,
    p_dossier_id,
    p_proposal_id,
    p_participant_id,
    p_actor_id,
    p_actor_type,
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_event_id;

  -- Mettre à jour last_activity_at du dossier si applicable
  IF p_dossier_id IS NOT NULL AND v_event_id IS NOT NULL THEN
    UPDATE dossiers
    SET last_activity_at = NOW()
    WHERE id = p_dossier_id;
  END IF;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE events IS 'Timeline événementielle immuable - APPEND ONLY';
COMMENT ON TABLE tasks IS 'Tâches et rappels pour les utilisateurs';
COMMENT ON TABLE ai_suggestions IS 'Suggestions IA - jamais source de vérité';
COMMENT ON TABLE email_templates IS 'Templates d''emails';
COMMENT ON TABLE email_sends IS 'Historique des envois d''emails';
COMMENT ON FUNCTION emit_event IS 'Helper pour émettre un événement dans la timeline';
