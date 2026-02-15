-- ============================================================
-- Migration 00027: Client-side modifications support
-- Extends notification types + adds invitation token to dossier_participants
-- ============================================================

-- 1. Étendre notification_type pour les modifications client
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dates_modified' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'dates_modified';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pax_modified' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'pax_modified';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'participant_added_by_client' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'participant_added_by_client';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lead_transferred' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'lead_transferred';
  END IF;
END $$;

-- 2. Colonnes invitation sur dossier_participants
ALTER TABLE dossier_participants
  ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invited_by UUID DEFAULT NULL;

-- 3. Index pour lookup rapide par token
CREATE INDEX IF NOT EXISTS idx_dp_invitation_token
  ON dossier_participants(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- 4. Colonne link sur notifications (si pas déjà présente)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS link TEXT;
