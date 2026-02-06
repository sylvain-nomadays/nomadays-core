-- ============================================================
-- NOMADAYS CORE - Migration 001: Enums
-- ============================================================

-- Rôles utilisateur
CREATE TYPE user_role AS ENUM (
  'admin_nomadays',      -- Admin Nomadays HQ - accès total
  'support_nomadays',    -- Support commercial Nomadays - co-vente, pas de cotation
  'dmc_manager',         -- Responsable DMC - tarifs, marges, tout sur son périmètre
  'dmc_seller',          -- Vendeur DMC - dossiers, circuits, cotations
  'dmc_accountant',      -- Comptable DMC - flux financiers uniquement (v2)
  'client_direct',       -- Client final B2C
  'agency_b2b'           -- Agence partenaire B2B
);

-- Types de tenant (organisation)
CREATE TYPE tenant_type AS ENUM (
  'hq',          -- Nomadays HQ
  'dmc',         -- DMC locale
  'agency'       -- Agence B2B partenaire
);

-- Statuts dossier
CREATE TYPE dossier_status AS ENUM (
  'lead',              -- Premier contact
  'qualifying',        -- En qualification
  'proposal_sent',     -- Proposition envoyée
  'negotiating',       -- En négociation
  'confirmed',         -- Confirmé (acompte reçu)
  'preparing',         -- En préparation opérationnelle
  'traveling',         -- En cours de voyage
  'completed',         -- Voyage terminé
  'cancelled',         -- Annulé
  'archived'           -- Archivé
);

-- Statuts proposition
CREATE TYPE proposal_status AS ENUM (
  'draft',             -- Brouillon
  'sent',              -- Envoyée au client
  'viewed',            -- Vue par le client
  'accepted',          -- Acceptée
  'rejected',          -- Refusée
  'expired',           -- Expirée
  'superseded'         -- Remplacée par une autre
);

-- Types de service
CREATE TYPE service_type AS ENUM (
  'accommodation',     -- Hébergement
  'transport',         -- Transport (hors vol)
  'flight',            -- Vol
  'guide',             -- Guide
  'meal',              -- Repas
  'activity',          -- Activité / excursion
  'entrance',          -- Entrée / ticket
  'insurance',         -- Assurance
  'visa',              -- Visa
  'misc'               -- Divers
);

-- Canaux d'acquisition
CREATE TYPE acquisition_channel AS ENUM (
  'website_form',      -- Formulaire site web
  'website_trip',      -- Demande sur circuit
  'email_inbound',     -- Email entrant
  'phone',             -- Téléphone
  'partner',           -- Partenaire / affilié
  'b2b_agency',        -- Agence B2B
  'repeat_client',     -- Client fidèle
  'referral'           -- Recommandation
);

-- Types d'événements timeline
CREATE TYPE event_type AS ENUM (
  -- Dossier lifecycle
  'dossier_created',
  'dossier_assigned',
  'dossier_status_changed',
  'dossier_priority_changed',
  'dossier_dmc_assigned',

  -- Proposition lifecycle
  'proposal_created',
  'proposal_updated',
  'proposal_sent',
  'proposal_viewed',
  'proposal_accepted',
  'proposal_rejected',

  -- Communication
  'email_sent',
  'email_received',
  'email_opened',
  'email_bounced',
  'note_added',
  'call_logged',

  -- Paiement
  'payment_requested',
  'payment_received',
  'payment_failed',
  'refund_issued',

  -- Documents
  'document_uploaded',
  'document_sent',

  -- Participant
  'participant_added',
  'participant_updated',
  'participant_removed',

  -- Opérationnel
  'booking_confirmed',
  'booking_modified',
  'booking_cancelled',

  -- Système
  'reminder_triggered',
  'ai_suggestion_generated'
);

-- Devises supportées
CREATE TYPE currency AS ENUM (
  'EUR', 'USD', 'THB', 'VND', 'IDR', 'PHP',
  'MYR', 'SGD', 'JPY', 'KRW', 'INR', 'LKR',
  'KHR', 'LAK', 'MMK', 'BND', 'CNY', 'TWD'
);

-- Types d'éléments de circuit
CREATE TYPE circuit_element_type AS ENUM (
  'day',               -- Jour
  'location',          -- Lieu / destination
  'visit',             -- Visite
  'transfer',          -- Transfert
  'accommodation',     -- Hébergement
  'activity',          -- Activité
  'meal',              -- Repas
  'info',              -- Information
  'free_time'          -- Temps libre
);

-- Types de quantité pour les items de cotation
CREATE TYPE amount_type AS ENUM (
  'fixed',             -- Quantité fixe
  'per_pax',           -- Par personne
  'ratio'              -- Ratio (ex: 1 guide pour 4 pax)
);

-- Types de multiplicateur temporel
CREATE TYPE times_type AS ENUM (
  'once',              -- Une fois
  'per_day',           -- Par jour
  'per_night',         -- Par nuit
  'service_days'       -- Jours de service spécifiques
);

COMMENT ON TYPE user_role IS 'Rôles utilisateur dans le système Nomadays';
COMMENT ON TYPE dossier_status IS 'Cycle de vie d''un dossier client';
COMMENT ON TYPE event_type IS 'Types d''événements pour la timeline immuable';
