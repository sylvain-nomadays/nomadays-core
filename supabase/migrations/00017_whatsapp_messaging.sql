-- ============================================================
-- NOMADAYS CORE — Migration 017: WhatsApp Messaging Support
-- Multi-channel messaging (email + WhatsApp via Twilio)
-- ============================================================

-- ============================================================
-- 1. Ajouter colonne `channel` à dossier_messages
-- ============================================================

ALTER TABLE dossier_messages
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'email'
  CHECK (channel IN ('email', 'whatsapp'));

-- ============================================================
-- 2. Ajouter colonnes WhatsApp-specifiques
-- ============================================================

ALTER TABLE dossier_messages
ADD COLUMN IF NOT EXISTS whatsapp_message_sid VARCHAR(255);

ALTER TABLE dossier_messages
ADD COLUMN IF NOT EXISTS whatsapp_media_urls JSONB DEFAULT '[]';

-- ============================================================
-- 3. Index pour requêtes multi-canal
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_channel
  ON dossier_messages(dossier_id, channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_sid
  ON dossier_messages(whatsapp_message_sid)
  WHERE whatsapp_message_sid IS NOT NULL;

-- ============================================================
-- 4. Configuration WhatsApp par tenant (credentials Twilio)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Twilio credentials
  twilio_account_sid VARCHAR(255) NOT NULL,
  twilio_auth_token VARCHAR(255) NOT NULL,

  -- WhatsApp Business number (format E.164 : +33612345678)
  whatsapp_number VARCHAR(20) NOT NULL,
  whatsapp_number_display VARCHAR(50),  -- Nom lisible : "Nomadays Thaïlande"

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  default_greeting_template VARCHAR(255),  -- Nom du template Twilio approuvé
  business_hours JSONB DEFAULT '{}',       -- {"mon": {"start": "09:00", "end": "18:00"}, ...}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_number
  ON tenant_whatsapp_config(whatsapp_number)
  WHERE is_active = TRUE;

-- Trigger updated_at
CREATE TRIGGER trg_whatsapp_config_updated_at
  BEFORE UPDATE ON tenant_whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. Cache de routage téléphone → dossier
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_phone_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,      -- Format E.164
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un seul mapping actif par téléphone+tenant
  UNIQUE(phone_number, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_phone_mapping_lookup
  ON whatsapp_phone_mapping(phone_number, tenant_id)
  WHERE is_active = TRUE;

-- ============================================================
-- 6. Fonction: Trouver le dossier par numéro WhatsApp
-- ============================================================

CREATE OR REPLACE FUNCTION find_dossier_by_whatsapp(
  p_phone VARCHAR(20),
  p_tenant_id UUID
) RETURNS TABLE(
  dossier_id UUID,
  participant_id UUID,
  participant_name TEXT,
  dossier_reference VARCHAR(50)
) AS $$
BEGIN
  -- D'abord chercher dans le cache mapping
  RETURN QUERY
  SELECT wpm.dossier_id, wpm.participant_id,
    (p.first_name || ' ' || p.last_name)::TEXT AS participant_name,
    d.reference AS dossier_reference
  FROM whatsapp_phone_mapping wpm
  JOIN participants p ON wpm.participant_id = p.id
  JOIN dossiers d ON wpm.dossier_id = d.id
  WHERE wpm.phone_number = p_phone
    AND wpm.tenant_id = p_tenant_id
    AND wpm.is_active = TRUE
  LIMIT 1;

  -- Si pas trouvé dans le cache, chercher via la table participants
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT dp.dossier_id, p.id AS participant_id,
      (p.first_name || ' ' || p.last_name)::TEXT AS participant_name,
      d.reference AS dossier_reference
    FROM participants p
    JOIN dossier_participants dp ON p.id = dp.participant_id
    JOIN dossiers d ON dp.dossier_id = d.id
    WHERE (p.whatsapp = p_phone OR p.phone = p_phone)
      AND d.tenant_id = p_tenant_id
      AND d.status NOT IN ('archived', 'cancelled', 'lost')
    ORDER BY d.updated_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 7. Fonction: Mettre à jour le cache mapping après un message
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_whatsapp_mapping(
  p_phone VARCHAR(20),
  p_participant_id UUID,
  p_dossier_id UUID,
  p_tenant_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO whatsapp_phone_mapping (phone_number, participant_id, dossier_id, tenant_id, last_message_at)
  VALUES (p_phone, p_participant_id, p_dossier_id, p_tenant_id, NOW())
  ON CONFLICT (phone_number, tenant_id)
  DO UPDATE SET
    dossier_id = EXCLUDED.dossier_id,
    participant_id = EXCLUDED.participant_id,
    last_message_at = NOW(),
    is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Permissions & RLS
-- ============================================================

GRANT ALL ON tenant_whatsapp_config TO authenticated;
GRANT ALL ON whatsapp_phone_mapping TO authenticated;
GRANT ALL ON tenant_whatsapp_config TO service_role;
GRANT ALL ON whatsapp_phone_mapping TO service_role;

ALTER TABLE tenant_whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_phone_mapping ENABLE ROW LEVEL SECURITY;

-- Config visible par les membres du tenant
CREATE POLICY "Tenant members can view their WhatsApp config" ON tenant_whatsapp_config
  FOR SELECT USING (public.belongs_to_tenant(tenant_id));

-- Admins Nomadays peuvent tout gérer
CREATE POLICY "Nomadays admin can manage WhatsApp config" ON tenant_whatsapp_config
  FOR ALL USING (public.is_nomadays_admin())
  WITH CHECK (public.is_nomadays_admin());

-- Phone mappings suivent l'accès dossier
CREATE POLICY "Phone mappings follow dossier access" ON whatsapp_phone_mapping
  FOR SELECT USING (public.can_access_dossier(dossier_id));

CREATE POLICY "Staff can manage phone mappings" ON whatsapp_phone_mapping
  FOR ALL USING (public.is_nomadays_staff() OR public.is_dmc_staff())
  WITH CHECK (public.is_nomadays_staff() OR public.is_dmc_staff());

-- Service role bypass (pour les webhooks)
CREATE POLICY "Service role full access whatsapp config" ON tenant_whatsapp_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access phone mapping" ON whatsapp_phone_mapping
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 9. Commentaires
-- ============================================================

COMMENT ON TABLE tenant_whatsapp_config IS 'Configuration Twilio WhatsApp Business par tenant/DMC';
COMMENT ON TABLE whatsapp_phone_mapping IS 'Cache de routage : numéro WhatsApp → dossier pour messages entrants';
COMMENT ON COLUMN dossier_messages.channel IS 'Canal de communication : email ou whatsapp';
COMMENT ON COLUMN dossier_messages.whatsapp_message_sid IS 'Twilio Message SID pour les messages WhatsApp';
COMMENT ON COLUMN dossier_messages.whatsapp_media_urls IS 'URLs des médias WhatsApp (images, PDF, audio)';

-- ============================================================
-- 10. Configuration initiale — Nomadays Thaïlande
-- ============================================================
-- Numéro Twilio : +33159169708
-- Exécuter après avoir récupéré le tenant_id et les credentials Twilio :
--
-- INSERT INTO tenant_whatsapp_config (
--   tenant_id,
--   twilio_account_sid,
--   twilio_auth_token,
--   whatsapp_number,
--   whatsapp_number_display,
--   is_active
-- ) VALUES (
--   '<TENANT_ID_THAILANDE>',        -- remplacer par le UUID du tenant
--   '<TWILIO_ACCOUNT_SID>',          -- remplacer par le Account SID Twilio
--   '<TWILIO_AUTH_TOKEN>',            -- remplacer par le Auth Token Twilio
--   '+33159169708',                   -- Numéro Twilio Nomadays
--   'Nomadays Thaïlande',
--   TRUE
-- );
