-- Migration: Extend sender_type to support 'support' for Nomadays support team messages
-- This allows differentiating messages from local DMC advisors vs Nomadays HQ support staff

ALTER TABLE dossier_messages
  DROP CONSTRAINT IF EXISTS dossier_messages_sender_type_check;

ALTER TABLE dossier_messages
  ADD CONSTRAINT dossier_messages_sender_type_check
  CHECK (sender_type IN ('client', 'advisor', 'support', 'system'));

-- Existing 'advisor' messages remain untouched (backward compatible)
-- New messages from admin_nomadays / support_nomadays users will use 'support'
