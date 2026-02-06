-- ============================================================
-- SYSTÈME DE MESSAGERIE DOSSIER
-- Fil de discussion bidirectionnel client ↔ conseiller
-- ============================================================

-- ============================================================
-- TABLE: Messages (fil de discussion)
-- ============================================================

CREATE TABLE IF NOT EXISTS dossier_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,

  -- Thread / Conversation
  thread_id UUID NOT NULL,  -- Groupe les messages d'une même conversation
  parent_message_id UUID REFERENCES dossier_messages(id),  -- Pour les réponses

  -- Expéditeur
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  -- inbound = client vers conseiller
  -- outbound = conseiller vers client

  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'advisor', 'system')),
  sender_id UUID,  -- user_id si advisor, participant_id si client
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),

  -- Destinataire
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),

  -- Contenu
  subject VARCHAR(500),
  body_text TEXT NOT NULL,  -- Version texte brut
  body_html TEXT,           -- Version HTML

  -- Pièces jointes
  attachments JSONB DEFAULT '[]',  -- [{filename, url, size, mime_type}]

  -- Email externe (pour tracking)
  external_message_id VARCHAR(255),  -- Message-ID de l'email
  in_reply_to VARCHAR(255),          -- In-Reply-To header

  -- Statut
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'read', 'failed')),
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Template utilisé (si applicable)
  template_id UUID,

  -- IA - Suggestion utilisée
  ai_suggestion_id UUID,
  ai_assisted BOOLEAN DEFAULT FALSE,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_messages_dossier ON dossier_messages(dossier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON dossier_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON dossier_messages(external_message_id) WHERE external_message_id IS NOT NULL;

-- ============================================================
-- TABLE: Templates d'emails
-- ============================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organisation
  tenant_id UUID REFERENCES tenants(id),  -- NULL = template global Nomadays

  -- Identification
  code VARCHAR(100) NOT NULL,  -- 'welcome', 'quote_sent', 'payment_reminder'
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Catégorie
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'welcome',           -- Bienvenue, premier contact
    'quote',             -- Devis, proposition
    'confirmation',      -- Confirmation de réservation
    'payment',           -- Paiement, facture
    'pre_departure',     -- Avant le départ
    'during_trip',       -- Pendant le voyage
    'post_trip',         -- Après le voyage
    'follow_up',         -- Relance
    'general'            -- Général
  )),

  -- Contenu
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,  -- Version texte générée automatiquement si NULL

  -- Variables disponibles
  -- {{client_name}}, {{advisor_name}}, {{dossier_reference}}, {{trip_title}},
  -- {{departure_date}}, {{return_date}}, {{destination}}, {{total_price}}, etc.
  available_variables TEXT[] DEFAULT '{}',

  -- Langue
  language CHAR(2) DEFAULT 'FR',

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,  -- Template par défaut pour cette catégorie

  -- Statistiques
  times_used INTEGER DEFAULT 0,

  -- Métadonnées
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON email_templates(category, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON email_templates(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_code_tenant ON email_templates(code, tenant_id, language);

-- ============================================================
-- TABLE: Suggestions IA pour les emails
-- ============================================================

CREATE TABLE IF NOT EXISTS email_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,

  -- Contexte de la suggestion
  context_type VARCHAR(50) NOT NULL CHECK (context_type IN (
    'reply_to_client',     -- Répondre à un message client
    'follow_up',           -- Relance automatique
    'proactive',           -- Suggestion proactive
    'question_answer'      -- Réponse à une question fréquente
  )),

  -- Message déclencheur (si reply)
  trigger_message_id UUID REFERENCES dossier_messages(id),

  -- Suggestion générée
  suggested_subject VARCHAR(500),
  suggested_body TEXT NOT NULL,

  -- Confiance / Qualité
  confidence_score DECIMAL(3,2),  -- 0.00 à 1.00

  -- Utilisation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'modified', 'rejected', 'expired')),
  accepted_at TIMESTAMPTZ,

  -- Si modifié, stocker les changements pour apprentissage
  final_body TEXT,  -- Version finale après modification utilisateur
  modification_ratio DECIMAL(3,2),  -- % de modification (0 = accepté tel quel)

  -- Feedback
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comment TEXT,

  -- Métadonnées IA
  model_used VARCHAR(100),  -- 'claude-3-sonnet', etc.
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_dossier ON email_ai_suggestions(dossier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_pending ON email_ai_suggestions(status, expires_at) WHERE status = 'pending';

-- ============================================================
-- TABLE: Base de connaissances pour l'IA (FAQ, réponses types)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organisation
  tenant_id UUID REFERENCES tenants(id),  -- NULL = global

  -- Catégorie
  category VARCHAR(100) NOT NULL,  -- 'visa', 'weather', 'luggage', 'health', 'payment', etc.

  -- Question / Intention détectée
  question_pattern TEXT NOT NULL,  -- Pattern ou mots-clés
  question_examples TEXT[],        -- Exemples de formulations

  -- Réponse type
  answer_template TEXT NOT NULL,

  -- Contexte d'utilisation
  applicable_destinations TEXT[],  -- ['TH', 'VN', 'KH'] ou NULL pour tous
  applicable_seasons TEXT[],       -- ['high', 'low', 'monsoon'] ou NULL

  -- Statistiques
  times_matched INTEGER DEFAULT 0,
  times_helpful INTEGER DEFAULT 0,  -- Feedback positif

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON email_knowledge_base(category, is_active) WHERE is_active = TRUE;

-- ============================================================
-- TABLE: Historique d'apprentissage IA
-- ============================================================

CREATE TABLE IF NOT EXISTS email_ai_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source_message_id UUID REFERENCES dossier_messages(id),

  -- Contexte
  dossier_destination VARCHAR(100),  -- Pays de destination
  dossier_status VARCHAR(50),
  message_category VARCHAR(100),  -- Catégorie détectée

  -- Contenu analysé (anonymisé)
  client_intent TEXT,        -- Intention du client détectée
  advisor_response_style TEXT,  -- Style de réponse (formel, amical, etc.)
  key_information TEXT[],    -- Points clés couverts

  -- Qualité de l'échange
  response_time_hours INTEGER,  -- Temps de réponse
  exchange_resolved BOOLEAN,    -- Échange résolu en 1 message?

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FONCTION: Créer un nouveau thread de conversation
-- ============================================================

CREATE OR REPLACE FUNCTION create_message_thread(
  p_dossier_id UUID
) RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  v_thread_id := gen_random_uuid();
  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FONCTION: Récupérer le dernier thread actif d'un dossier
-- ============================================================

CREATE OR REPLACE FUNCTION get_active_thread(
  p_dossier_id UUID
) RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  SELECT thread_id INTO v_thread_id
  FROM dossier_messages
  WHERE dossier_id = p_dossier_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_thread_id IS NULL THEN
    v_thread_id := create_message_thread(p_dossier_id);
  END IF;

  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Notifier lors d'un nouveau message client
-- ============================================================

CREATE OR REPLACE FUNCTION notify_new_client_message()
RETURNS TRIGGER AS $$
DECLARE
  v_dossier RECORD;
BEGIN
  -- Seulement pour les messages entrants (client)
  IF NEW.direction = 'inbound' AND NEW.sender_type = 'client' THEN

    -- Récupérer les infos du dossier
    SELECT reference, title, advisor_id INTO v_dossier
    FROM dossiers WHERE id = NEW.dossier_id;

    -- Notifier le conseiller
    IF v_dossier.advisor_id IS NOT NULL THEN
      PERFORM create_notification(
        v_dossier.advisor_id,
        'new_request'::notification_type,  -- Réutiliser le type existant ou créer 'new_message'
        'Nouveau message client',
        CONCAT('Message de ', NEW.sender_name, ' sur le dossier ', v_dossier.reference),
        NEW.dossier_id,
        v_dossier.reference,
        NEW.sender_name,
        jsonb_build_object('message_id', NEW.id, 'subject', NEW.subject)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_client_message ON dossier_messages;
CREATE TRIGGER trg_notify_new_client_message
  AFTER INSERT ON dossier_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_client_message();

-- ============================================================
-- TEMPLATES PAR DÉFAUT
-- ============================================================

INSERT INTO email_templates (code, name, description, category, subject, body_html, available_variables, language, is_default)
VALUES
  -- Bienvenue
  ('welcome_new_request', 'Bienvenue - Nouvelle demande', 'Email de bienvenue après réception d''une demande', 'welcome',
   'Bienvenue {{client_name}} ! Votre demande de voyage a bien été reçue',
   '<p>Bonjour {{client_name}},</p>
<p>Nous avons bien reçu votre demande de voyage pour <strong>{{destination}}</strong> et nous vous en remercions !</p>
<p>Je suis {{advisor_name}}, votre conseiller voyage dédié. Je vais étudier attentivement votre projet et vous recontacter très prochainement avec une proposition personnalisée.</p>
<p>En attendant, n''hésitez pas à me faire part de toute question ou précision.</p>
<p>À très bientôt,<br>{{advisor_name}}<br>{{advisor_phone}}</p>',
   ARRAY['client_name', 'destination', 'advisor_name', 'advisor_phone', 'dossier_reference'],
   'FR', TRUE),

  -- Envoi de devis
  ('quote_sent', 'Devis envoyé', 'Email accompagnant l''envoi d''un devis', 'quote',
   '{{client_name}}, votre proposition de voyage pour {{destination}} est prête !',
   '<p>Bonjour {{client_name}},</p>
<p>J''ai le plaisir de vous transmettre votre <strong>proposition de voyage sur mesure</strong> pour {{destination}}.</p>
<p><strong>Dates :</strong> Du {{departure_date}} au {{return_date}}<br>
<strong>Voyageurs :</strong> {{pax_count}} personnes<br>
<strong>Budget :</strong> {{total_price}}</p>
<p>Vous trouverez en pièce jointe le détail complet de votre itinéraire.</p>
<p>Je reste à votre disposition pour en discuter et ajuster cette proposition selon vos souhaits.</p>
<p>Cordialement,<br>{{advisor_name}}</p>',
   ARRAY['client_name', 'destination', 'departure_date', 'return_date', 'pax_count', 'total_price', 'advisor_name'],
   'FR', TRUE),

  -- Relance après devis
  ('follow_up_quote', 'Relance après devis', 'Email de relance 5 jours après envoi du devis', 'follow_up',
   '{{client_name}}, avez-vous des questions sur votre voyage à {{destination}} ?',
   '<p>Bonjour {{client_name}},</p>
<p>Je me permets de revenir vers vous suite à la proposition de voyage que je vous ai envoyée il y a quelques jours.</p>
<p>Avez-vous eu le temps de la consulter ? N''hésitez pas à me faire part de vos questions ou des ajustements que vous souhaiteriez apporter.</p>
<p>Je suis à votre disposition pour en discuter par téléphone si vous le préférez.</p>
<p>Au plaisir de vous lire,<br>{{advisor_name}}<br>{{advisor_phone}}</p>',
   ARRAY['client_name', 'destination', 'advisor_name', 'advisor_phone'],
   'FR', TRUE),

  -- Confirmation de réservation
  ('booking_confirmed', 'Confirmation de réservation', 'Email de confirmation après paiement de l''acompte', 'confirmation',
   '{{client_name}}, votre voyage à {{destination}} est confirmé !',
   '<p>Bonjour {{client_name}},</p>
<p>Excellente nouvelle ! Votre voyage à <strong>{{destination}}</strong> est désormais <strong>confirmé</strong>.</p>
<p><strong>Récapitulatif :</strong><br>
Référence : {{dossier_reference}}<br>
Dates : Du {{departure_date}} au {{return_date}}<br>
Voyageurs : {{pax_count}} personnes</p>
<p>Je vais maintenant procéder aux réservations définitives. Vous recevrez prochainement votre carnet de voyage complet.</p>
<p>Merci pour votre confiance !<br>{{advisor_name}}</p>',
   ARRAY['client_name', 'destination', 'dossier_reference', 'departure_date', 'return_date', 'pax_count', 'advisor_name'],
   'FR', TRUE),

  -- Rappel solde
  ('payment_reminder', 'Rappel de paiement', 'Rappel pour le solde du voyage', 'payment',
   '{{client_name}}, rappel : solde de votre voyage à régler avant le {{payment_due_date}}',
   '<p>Bonjour {{client_name}},</p>
<p>Je me permets de vous rappeler que le solde de votre voyage à {{destination}} ({{remaining_amount}}) est à régler avant le <strong>{{payment_due_date}}</strong>.</p>
<p>Vous pouvez effectuer le règlement par virement bancaire ou carte bancaire depuis votre espace client.</p>
<p>N''hésitez pas à me contacter si vous avez la moindre question.</p>
<p>Cordialement,<br>{{advisor_name}}</p>',
   ARRAY['client_name', 'destination', 'remaining_amount', 'payment_due_date', 'advisor_name'],
   'FR', TRUE),

  -- Bon voyage
  ('pre_departure', 'Bon voyage', 'Email envoyé quelques jours avant le départ', 'pre_departure',
   '{{client_name}}, J-{{days_until_departure}} avant votre départ pour {{destination}} !',
   '<p>Bonjour {{client_name}},</p>
<p>Votre départ pour <strong>{{destination}}</strong> approche à grands pas !</p>
<p>Votre vol : {{flight_info}}<br>
Date de départ : {{departure_date}}</p>
<p>N''oubliez pas :<br>
✅ Votre passeport (validité > 6 mois)<br>
✅ Vos documents de voyage<br>
✅ Votre assurance voyage</p>
<p>Sur place, notre équipe locale sera joignable 24h/24 : {{local_contact}}</p>
<p>Excellent voyage !<br>{{advisor_name}}</p>',
   ARRAY['client_name', 'destination', 'days_until_departure', 'flight_info', 'departure_date', 'local_contact', 'advisor_name'],
   'FR', TRUE)

ON CONFLICT (code, tenant_id, language) DO NOTHING;

-- ============================================================
-- BASE DE CONNAISSANCES INITIALE
-- ============================================================

INSERT INTO email_knowledge_base (category, question_pattern, question_examples, answer_template, applicable_destinations)
VALUES
  ('visa', 'visa|exemption|faut-il un visa',
   ARRAY['Ai-je besoin d''un visa ?', 'Faut-il un visa pour la Thaïlande ?', 'Comment obtenir le visa ?'],
   'Pour les ressortissants français, l''entrée en {{destination}} est possible sans visa pour un séjour touristique de moins de {{visa_free_days}} jours. Votre passeport doit être valide au moins 6 mois après la date de retour. Pour un séjour plus long, un visa est nécessaire et peut être obtenu auprès de l''ambassade ou en ligne (e-visa).',
   ARRAY['TH', 'VN', 'KH', 'LA', 'ID', 'MY']),

  ('weather', 'météo|climat|saison|mousson|pluie|quand partir',
   ARRAY['Quel temps fait-il en août ?', 'C''est la mousson ?', 'Quelle est la meilleure saison ?'],
   'La meilleure période pour visiter {{destination}} est généralement de {{best_months}}. Durant cette période, le temps est {{weather_description}}. Si vous voyagez pendant la mousson ({{monsoon_months}}), prévoyez des vêtements de pluie, mais sachez que les averses sont généralement courtes.',
   NULL),

  ('luggage', 'valise|bagages|emporter|vêtements|quoi prendre',
   ARRAY['Que mettre dans ma valise ?', 'Quels vêtements emporter ?', 'Bagages recommandés ?'],
   'Pour votre voyage à {{destination}}, nous vous conseillons d''emporter : vêtements légers en coton, un imperméable ou k-way, des chaussures de marche confortables, de la crème solaire, un anti-moustiques, et des vêtements couvrant épaules et genoux pour les visites de temples. Pensez à laisser de la place pour les souvenirs !',
   NULL),

  ('health', 'vaccin|santé|médicaments|paludisme|moustiques',
   ARRAY['Quels vaccins sont nécessaires ?', 'Y a-t-il le paludisme ?', 'Dois-je voir un médecin avant ?'],
   'Nous vous recommandons de consulter votre médecin ou un centre de vaccinations internationales au moins 6 semaines avant le départ. Les vaccins couramment conseillés sont : hépatite A et B, typhoïde, et mise à jour diphtérie-tétanos-polio. Un traitement antipaludéen peut être recommandé selon les régions visitées.',
   NULL),

  ('payment', 'paiement|règlement|acompte|solde|virement|carte',
   ARRAY['Comment payer ?', 'Quel est le montant de l''acompte ?', 'Quand régler le solde ?'],
   'Pour confirmer votre réservation, un acompte de 30% est demandé. Le solde est à régler au plus tard 30 jours avant le départ. Vous pouvez payer par virement bancaire (coordonnées sur votre facture) ou par carte bancaire depuis votre espace client. Des facilités de paiement sont possibles, n''hésitez pas à nous en parler.',
   NULL),

  ('insurance', 'assurance|annulation|rapatriement|couverture',
   ARRAY['L''assurance est-elle incluse ?', 'Dois-je prendre une assurance ?', 'Que couvre l''assurance ?'],
   'Une assurance voyage est vivement recommandée et souvent obligatoire. Notre offre inclut une assurance de base couvrant l''assistance rapatriement et les frais médicaux. Nous proposons également une assurance annulation optionnelle. N''hésitez pas à vérifier si votre carte bancaire offre déjà certaines garanties.',
   NULL)

ON CONFLICT DO NOTHING;

-- ============================================================
-- PERMISSIONS
-- ============================================================

GRANT ALL ON dossier_messages TO authenticated;
GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_ai_suggestions TO authenticated;
GRANT ALL ON email_knowledge_base TO authenticated;
GRANT ALL ON email_ai_learning TO authenticated;

-- RLS
ALTER TABLE dossier_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies pour les messages (via le dossier)
CREATE POLICY "Users can view messages of accessible dossiers" ON dossier_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dossiers d
      WHERE d.id = dossier_id
      -- Ajouter les conditions d'accès selon le rôle
    )
  );

-- Templates visibles par tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view active templates" ON email_templates
  FOR SELECT USING (is_active = TRUE);
