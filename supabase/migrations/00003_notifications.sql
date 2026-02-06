-- ============================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================

-- Types de notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'new_request',        -- Nouvelle demande client
      'follow_up_reminder', -- Dossier à relancer (J+5 après devis envoyé)
      'payment_received',   -- Paiement reçu (acompte ou solde)
      'proposal_accepted',  -- Proposition acceptée par le client
      'proposal_rejected',  -- Proposition refusée
      'trip_starting_soon', -- Voyage commence dans X jours
      'document_uploaded',  -- Document uploadé par le client
      'mention',            -- Mentionné dans une note (@user)
      'assignment'          -- Assigné à un nouveau dossier
    );
  END IF;
END $$;

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinataire
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type et contenu
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Lien vers l'objet concerné
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  dossier_reference VARCHAR(50),
  participant_name VARCHAR(255),

  -- Données supplémentaires (montant paiement, etc.)
  metadata JSONB DEFAULT '{}',

  -- Statut
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Email
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_unread') THEN
    CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_created') THEN
    CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_dossier') THEN
    CREATE INDEX idx_notifications_dossier ON notifications(dossier_id) WHERE dossier_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- FONCTION: Créer une notification
-- ============================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_dossier_id UUID DEFAULT NULL,
  p_dossier_reference VARCHAR(50) DEFAULT NULL,
  p_participant_name VARCHAR(255) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message,
    dossier_id, dossier_reference, participant_name, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_message,
    p_dossier_id, p_dossier_reference, p_participant_name, p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FONCTION: Notifier lors d'une nouvelle demande
-- ============================================================

CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_name VARCHAR(255);
  v_advisor_id UUID;
BEGIN
  -- Récupérer le nom du participant principal si disponible
  SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_participant_name
  FROM dossier_participants dp
  JOIN participants p ON dp.participant_id = p.id
  WHERE dp.dossier_id = NEW.id AND dp.is_lead = TRUE
  LIMIT 1;

  -- Déterminer qui notifier (le conseiller assigné ou tous les admins/support)
  IF NEW.advisor_id IS NOT NULL THEN
    -- Notifier le conseiller assigné
    PERFORM create_notification(
      NEW.advisor_id,
      'new_request',
      'Nouvelle demande',
      CONCAT('Dossier ', NEW.reference, ' - ', COALESCE(v_participant_name, NEW.title)),
      NEW.id,
      NEW.reference,
      v_participant_name
    );
  ELSE
    -- Notifier tous les admins et support Nomadays
    FOR v_advisor_id IN
      SELECT id FROM users
      WHERE role IN ('admin_nomadays', 'support_nomadays')
      AND is_active = TRUE
    LOOP
      PERFORM create_notification(
        v_advisor_id,
        'new_request',
        'Nouvelle demande',
        CONCAT('Dossier ', NEW.reference, ' - ', COALESCE(v_participant_name, NEW.title)),
        NEW.id,
        NEW.reference,
        v_participant_name
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour nouvelle demande
DROP TRIGGER IF EXISTS trg_notify_new_request ON dossiers;
CREATE TRIGGER trg_notify_new_request
  AFTER INSERT ON dossiers
  FOR EACH ROW
  WHEN (NEW.status = 'lead')
  EXECUTE FUNCTION notify_new_request();

-- ============================================================
-- FONCTION: Notifier lors d'un paiement
-- ============================================================

CREATE OR REPLACE FUNCTION notify_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_name VARCHAR(255);
  v_dossier RECORD;
  v_payment_type VARCHAR(50);
BEGIN
  -- Vérifier que c'est un changement de statut vers deposit_paid ou fully_paid
  IF NEW.status IN ('deposit_paid', 'fully_paid')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('deposit_paid', 'fully_paid')) THEN

    -- Récupérer les infos du dossier
    SELECT reference, title, advisor_id INTO v_dossier
    FROM dossiers WHERE id = NEW.id;

    -- Récupérer le nom du participant principal
    SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_participant_name
    FROM dossier_participants dp
    JOIN participants p ON dp.participant_id = p.id
    WHERE dp.dossier_id = NEW.id AND dp.is_lead = TRUE
    LIMIT 1;

    -- Type de paiement
    v_payment_type := CASE
      WHEN NEW.status = 'deposit_paid' THEN 'Acompte'
      WHEN NEW.status = 'fully_paid' THEN 'Solde'
      ELSE 'Paiement'
    END;

    -- Notifier le conseiller assigné
    IF v_dossier.advisor_id IS NOT NULL THEN
      PERFORM create_notification(
        v_dossier.advisor_id,
        'payment_received',
        CONCAT(v_payment_type, ' reçu'),
        CONCAT('Dossier ', v_dossier.reference, ' - ', COALESCE(v_participant_name, v_dossier.title)),
        NEW.id,
        v_dossier.reference,
        v_participant_name,
        jsonb_build_object('payment_type', v_payment_type)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour paiement
DROP TRIGGER IF EXISTS trg_notify_payment ON dossiers;
CREATE TRIGGER trg_notify_payment
  AFTER UPDATE OF status ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_received();

-- ============================================================
-- FONCTION: Vérifier les dossiers à relancer (CRON job)
-- Cette fonction doit être appelée quotidiennement
-- ============================================================

CREATE OR REPLACE FUNCTION check_follow_up_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_dossier RECORD;
  v_participant_name VARCHAR(255);
  v_count INTEGER := 0;
BEGIN
  -- Trouver tous les dossiers dont follow_up_date est aujourd'hui ou passé
  -- et qui n'ont pas encore eu de notification de relance aujourd'hui
  FOR v_dossier IN
    SELECT d.id, d.reference, d.title, d.advisor_id, d.follow_up_date
    FROM dossiers d
    WHERE d.status = 'quote_sent'
      AND d.follow_up_date IS NOT NULL
      AND d.follow_up_date::date <= CURRENT_DATE
      AND d.advisor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.dossier_id = d.id
          AND n.type = 'follow_up_reminder'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    -- Récupérer le nom du participant principal
    SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_participant_name
    FROM dossier_participants dp
    JOIN participants p ON dp.participant_id = p.id
    WHERE dp.dossier_id = v_dossier.id AND dp.is_lead = TRUE
    LIMIT 1;

    -- Créer la notification
    PERFORM create_notification(
      v_dossier.advisor_id,
      'follow_up_reminder',
      'Dossier à relancer',
      CONCAT('Dossier ', v_dossier.reference, ' - ', COALESCE(v_participant_name, v_dossier.title), ' - Devis envoyé il y a 5 jours'),
      v_dossier.id,
      v_dossier.reference,
      v_participant_name,
      jsonb_build_object('days_since_quote', 5)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FONCTION: Notifier lors d'une mention dans une note
-- ============================================================

CREATE OR REPLACE FUNCTION notify_mention_in_note()
RETURNS TRIGGER AS $$
DECLARE
  v_mention TEXT;
  v_mentioned_user RECORD;
  v_dossier RECORD;
  v_author_name VARCHAR(255);
BEGIN
  -- Si la note a des mentions
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN

    -- Récupérer les infos du dossier
    SELECT reference, title INTO v_dossier
    FROM dossiers WHERE id = NEW.dossier_id;

    -- Récupérer le nom de l'auteur
    SELECT CONCAT(first_name, ' ', last_name) INTO v_author_name
    FROM users WHERE id = NEW.author_id;

    -- Pour chaque mention
    FOREACH v_mention IN ARRAY NEW.mentions
    LOOP
      -- Trouver l'utilisateur mentionné (par prénom ou 'manager')
      FOR v_mentioned_user IN
        SELECT id, first_name FROM users
        WHERE (LOWER(first_name) = LOWER(v_mention) OR
               (v_mention = 'manager' AND role IN ('dmc_manager', 'admin_nomadays')))
        AND is_active = TRUE
        AND id != NEW.author_id  -- Ne pas notifier l'auteur
      LOOP
        PERFORM create_notification(
          v_mentioned_user.id,
          'mention',
          'Vous êtes mentionné',
          CONCAT(v_author_name, ' vous a mentionné dans le dossier ', v_dossier.reference),
          NEW.dossier_id,
          v_dossier.reference,
          NULL,
          jsonb_build_object('note_id', NEW.id, 'author_name', v_author_name)
        );
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mentions
DROP TRIGGER IF EXISTS trg_notify_mention ON dossier_notes;
CREATE TRIGGER trg_notify_mention
  AFTER INSERT ON dossier_notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_mention_in_note();

-- ============================================================
-- TABLE: Email queue pour l'envoi asynchrone
-- ============================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinataire
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),

  -- Contenu
  subject VARCHAR(500) NOT NULL,
  template VARCHAR(100) NOT NULL,  -- 'new_request', 'follow_up_reminder', 'payment_received'
  template_data JSONB DEFAULT '{}',

  -- Lien vers notification
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_queue_pending') THEN
    CREATE INDEX idx_email_queue_pending ON email_queue(status, next_retry_at) WHERE status = 'pending';
  END IF;
END $$;

-- ============================================================
-- FONCTION: Ajouter email à la queue après notification
-- ============================================================

CREATE OR REPLACE FUNCTION queue_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_template VARCHAR(100);
  v_subject VARCHAR(500);
BEGIN
  -- Récupérer les infos de l'utilisateur
  SELECT email, first_name, last_name,
         COALESCE((preferences->>'notifications_email')::boolean, true) as wants_email
  INTO v_user
  FROM users WHERE id = NEW.user_id;

  -- Si l'utilisateur ne veut pas d'emails, ne rien faire
  IF NOT v_user.wants_email THEN
    RETURN NEW;
  END IF;

  -- Déterminer le template et sujet en fonction du type
  CASE NEW.type
    WHEN 'new_request' THEN
      v_template := 'new_request';
      v_subject := CONCAT('[Nomadays] Nouvelle demande - ', NEW.dossier_reference);
    WHEN 'follow_up_reminder' THEN
      v_template := 'follow_up_reminder';
      v_subject := CONCAT('[Nomadays] À relancer - ', NEW.dossier_reference);
    WHEN 'payment_received' THEN
      v_template := 'payment_received';
      v_subject := CONCAT('[Nomadays] Paiement reçu - ', NEW.dossier_reference);
    WHEN 'mention' THEN
      v_template := 'mention';
      v_subject := CONCAT('[Nomadays] Vous êtes mentionné - ', NEW.dossier_reference);
    ELSE
      -- Pour les autres types, pas d'email automatique
      RETURN NEW;
  END CASE;

  -- Ajouter à la queue
  INSERT INTO email_queue (
    to_email, to_name, subject, template, template_data, notification_id
  ) VALUES (
    v_user.email,
    CONCAT(v_user.first_name, ' ', v_user.last_name),
    v_subject,
    v_template,
    jsonb_build_object(
      'notification_id', NEW.id,
      'title', NEW.title,
      'message', NEW.message,
      'dossier_reference', NEW.dossier_reference,
      'participant_name', NEW.participant_name,
      'metadata', NEW.metadata
    ),
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour email queue
DROP TRIGGER IF EXISTS trg_queue_notification_email ON notifications;
CREATE TRIGGER trg_queue_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION queue_notification_email();

-- ============================================================
-- PERMISSIONS
-- ============================================================

GRANT ALL ON notifications TO authenticated;
GRANT ALL ON email_queue TO authenticated;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Email queue accessible uniquement par les fonctions serveur
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
