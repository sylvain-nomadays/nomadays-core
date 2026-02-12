-- Migration: Add extended participant fields
-- Civility, address, WhatsApp for CRM integration

-- Civility (Mme, M., Mx, etc.)
DO $$ BEGIN
  CREATE TYPE public.civility AS ENUM ('mr', 'mrs', 'mx', 'dr', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS civility public.civility;

-- Address fields
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS country char(2); -- ISO 3166-1 alpha-2

-- WhatsApp number (separate from phone, for WhatsApp Business integration)
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS whatsapp text;
