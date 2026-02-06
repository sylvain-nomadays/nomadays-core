-- Migration: Ajout des champs pour l'envoi d'emails réels
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes pour le tracking d'envoi
ALTER TABLE dossier_messages
ADD COLUMN IF NOT EXISTS external_message_id TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Index pour rechercher par message ID externe (pour les webhooks)
CREATE INDEX IF NOT EXISTS idx_dossier_messages_external_id
ON dossier_messages(external_message_id)
WHERE external_message_id IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN dossier_messages.external_message_id IS 'ID du message chez le fournisseur email (Resend, SendGrid, etc.)';
COMMENT ON COLUMN dossier_messages.error_message IS 'Message d''erreur si l''envoi a échoué';
