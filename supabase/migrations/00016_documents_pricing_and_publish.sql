-- Add pricing and publication fields to documents table
-- For external offers (PDF uploads, external links) with pricing info

ALTER TABLE documents ADD COLUMN IF NOT EXISTS price_total NUMERIC(12,2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS price_per_person NUMERIC(12,2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);
