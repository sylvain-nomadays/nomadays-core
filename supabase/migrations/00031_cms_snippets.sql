-- Migration 00031: Create cms_snippets table
-- Lightweight key-value content store for editable UI texts (FAQ, sidebar, welcome, images, etc.)

CREATE TABLE IF NOT EXISTS cms_snippets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  snippet_key VARCHAR(100) NOT NULL,
  category    VARCHAR(30)  NOT NULL,
  content_json JSONB       NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT uq_cms_snippets_tenant_key UNIQUE (tenant_id, snippet_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cms_snippets_tenant_category ON cms_snippets (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_cms_snippets_key             ON cms_snippets (snippet_key);
CREATE INDEX IF NOT EXISTS idx_cms_snippets_tenant_id       ON cms_snippets (tenant_id);

-- Grant service_role full access (needed for server actions using service_role key)
GRANT ALL ON cms_snippets TO service_role;

-- RLS: enable but allow service_role to bypass
ALTER TABLE cms_snippets ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read snippets for their tenant + global (tenant_id IS NULL)
CREATE POLICY "Users can read own tenant snippets and globals"
  ON cms_snippets FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id IN (
      SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- Policy: service_role can do everything (used by server actions)
CREATE POLICY "Service role full access"
  ON cms_snippets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed: Global FAQ snippets (tenant_id = NULL) ────────────────────────────

INSERT INTO cms_snippets (tenant_id, snippet_key, category, content_json, metadata_json, sort_order) VALUES
(NULL, 'faq.programme', 'faq',
 '{"fr": "Rendez-vous dans la section \"Mes Voyages\" pour retrouver tous vos projets."}'::jsonb,
 '{"question": {"fr": "Comment consulter mon programme de voyage ?"}, "icon": "Map"}'::jsonb,
 0),
(NULL, 'faq.contact', 'faq',
 '{"fr": "Vous pouvez envoyer un message à votre hôte directement depuis le Salon de Thé."}'::jsonb,
 '{"question": {"fr": "Comment contacter mon hôte local ?"}, "icon": "MessageSquare"}'::jsonb,
 1),
(NULL, 'faq.documents', 'faq',
 '{"fr": "Vos documents sont accessibles dans l''onglet Documents de votre voyage."}'::jsonb,
 '{"question": {"fr": "Comment télécharger mes documents de voyage ?"}, "icon": "FileText"}'::jsonb,
 2),
(NULL, 'faq.urgence', 'faq',
 '{"fr": "En cas d''urgence, contactez immédiatement votre agence locale dont les coordonnées figurent dans vos documents."}'::jsonb,
 '{"question": {"fr": "Que faire en cas d''urgence ?"}, "icon": "Phone"}'::jsonb,
 3),
(NULL, 'faq.paiement', 'faq',
 '{"fr": "Le paiement s''effectue généralement en deux fois : un acompte à la confirmation puis le solde avant le départ."}'::jsonb,
 '{"question": {"fr": "Comment fonctionne le paiement ?"}, "icon": "CreditCard"}'::jsonb,
 4);

-- ── Seed: Global sidebar snippets ───────────────────────────────────────────

INSERT INTO cms_snippets (tenant_id, snippet_key, category, content_json, sort_order) VALUES
(NULL, 'sidebar.collectif.title', 'sidebar', '{"fr": "Le collectif Nomadays"}'::jsonb, 0),
(NULL, 'sidebar.collectif.tagline', 'sidebar', '{"fr": "Vos agences locales s''unissent et inventent"}'::jsonb, 1),
(NULL, 'sidebar.collectif.description', 'sidebar', '{"fr": "Nos hôtes locaux vous accueillent comme en famille."}'::jsonb, 2),
(NULL, 'sidebar.collectif.phone', 'sidebar', '{"fr": "01 23 45 67 89"}'::jsonb, 3),
(NULL, 'sidebar.collectif.whatsapp', 'sidebar', '{"fr": ""}'::jsonb, 4),
(NULL, 'sidebar.collectif.email', 'sidebar', '{"fr": "contact@nomadays.fr"}'::jsonb, 5),
(NULL, 'sidebar.insurance.title', 'sidebar', '{"fr": "Assurance Chapka"}'::jsonb, 10),
(NULL, 'sidebar.insurance.subtitle', 'sidebar', '{"fr": "Notre partenaire"}'::jsonb, 11),
(NULL, 'sidebar.insurance.description', 'sidebar', '{"fr": "Voyagez l''esprit tranquille."}'::jsonb, 12),
(NULL, 'sidebar.insurance.cta_text', 'sidebar', '{"fr": "Découvrir les garanties"}'::jsonb, 13),
(NULL, 'sidebar.insurance.cta_link', 'sidebar', '{"fr": "#"}'::jsonb, 14),
(NULL, 'sidebar.ambassador.title', 'sidebar', '{"fr": "Programme Ambassadeur"}'::jsonb, 20),
(NULL, 'sidebar.ambassador.description', 'sidebar', '{"fr": "Parrainez vos proches et cumulez des réductions !"}'::jsonb, 21),
(NULL, 'sidebar.ambassador.cta_text', 'sidebar', '{"fr": "Inviter un proche"}'::jsonb, 22),
(NULL, 'sidebar.social.instagram', 'sidebar', '{"fr": "#"}'::jsonb, 30),
(NULL, 'sidebar.social.facebook', 'sidebar', '{"fr": "#"}'::jsonb, 31),
(NULL, 'sidebar.social.youtube', 'sidebar', '{"fr": "#"}'::jsonb, 32);

-- ── Seed: Global welcome snippets ───────────────────────────────────────────

INSERT INTO cms_snippets (tenant_id, snippet_key, category, content_json, sort_order) VALUES
(NULL, 'welcome.title_template', 'welcome', '{"fr": "Bienvenue chez vous, {firstName}"}'::jsonb, 0),
(NULL, 'welcome.subtitle', 'welcome', '{"fr": "Votre espace voyageur Nomadays"}'::jsonb, 1),
(NULL, 'welcome.proverb', 'welcome', '{"fr": "Ici, nos hôtes locaux vous accueillent comme en famille"}'::jsonb, 2);

-- ── Seed: Global fidelity snippets ──────────────────────────────────────────

INSERT INTO cms_snippets (tenant_id, snippet_key, category, content_json, metadata_json, sort_order) VALUES
(NULL, 'fidelity.tier.1', 'fidelity', '{"fr": "Explorateur"}'::jsonb, '{"emoji": "🌍", "min_trips": 1}'::jsonb, 0),
(NULL, 'fidelity.tier.2', 'fidelity', '{"fr": "Grand Voyageur"}'::jsonb, '{"emoji": "⭐", "min_trips": 4}'::jsonb, 1),
(NULL, 'fidelity.tier.3', 'fidelity', '{"fr": "Explorateur du Monde"}'::jsonb, '{"emoji": "🏆", "min_trips": 6}'::jsonb, 2);
