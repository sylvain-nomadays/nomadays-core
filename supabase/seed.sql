-- ============================================================
-- NOMADAYS CORE - Seed Data for Development
-- ============================================================

-- 1. Create Nomadays HQ tenant
INSERT INTO tenants (id, type, name, legal_name, slug, country_code, currency, timezone, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'nomadays_hq',
  'Nomadays',
  'Nomadays SAS',
  'nomadays',
  'FR',
  'EUR',
  'Europe/Paris',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Create a sample DMC (Mongolia)
INSERT INTO tenants (id, type, name, legal_name, slug, country_code, currency, timezone, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'dmc',
  'Mongolie Authentique',
  'Mongolie Authentique LLC',
  'mongolie-authentique',
  'MN',
  'EUR',
  'Asia/Ulaanbaatar',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Create a sample DMC (Peru)
INSERT INTO tenants (id, type, name, legal_name, slug, country_code, currency, timezone, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'dmc',
  'Peru Explorer',
  'Peru Explorer SAC',
  'peru-explorer',
  'PE',
  'USD',
  'America/Lima',
  true
) ON CONFLICT (id) DO NOTHING;

-- 4. Create a B2B agency
INSERT INTO tenants (id, type, name, legal_name, slug, country_code, currency, timezone, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'agency_b2b',
  'Voyages Excellence',
  'Voyages Excellence SARL',
  'voyages-excellence',
  'FR',
  'EUR',
  'Europe/Paris',
  true
) ON CONFLICT (id) DO NOTHING;

-- Note: Users are created through Supabase Auth
-- After creating a user via auth, insert their profile:
--
-- INSERT INTO users (id, tenant_id, email, role, first_name, last_name)
-- VALUES (
--   'AUTH_USER_UUID_HERE',
--   '00000000-0000-0000-0000-000000000001',
--   'admin@nomadays.com',
--   'admin_nomadays',
--   'Admin',
--   'Nomadays'
-- );

-- 5. Create sample participants
INSERT INTO participants (id, email, first_name, last_name, phone, nationality)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'jean.dupont@email.com', 'Jean', 'Dupont', '+33612345678', 'FR'),
  ('00000000-0000-0000-0001-000000000002', 'marie.dupont@email.com', 'Marie', 'Dupont', '+33612345679', 'FR'),
  ('00000000-0000-0000-0001-000000000003', 'pierre.martin@email.com', 'Pierre', 'Martin', '+33698765432', 'FR'),
  ('00000000-0000-0000-0001-000000000004', 'sophie.bernard@email.com', 'Sophie', 'Bernard', '+33654321098', 'FR')
ON CONFLICT (id) DO NOTHING;

-- 6. Create sample dossiers
INSERT INTO dossiers (
  id, reference, tenant_id, dmc_id, status, origin, trip_type, title,
  destination_countries, departure_date_from, departure_date_to, duration_days,
  pax_adults, pax_children, budget_min, budget_max, client_notes, tags
) VALUES
(
  '00000000-0000-0000-0002-000000000001',
  'NMD-2026-001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'lead',
  'website_b2c',
  'fit',
  'Aventure en Mongolie - Famille Dupont',
  ARRAY['MN'],
  '2026-07-15',
  '2026-07-30',
  15,
  2, 2, 8000, 12000,
  'Nous aimerions découvrir la vie nomade avec nos enfants. Pas trop de kilomètres par jour.',
  ARRAY['famille', 'été', 'nomade']
),
(
  '00000000-0000-0000-0002-000000000002',
  'NMD-2026-002',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'quote_in_progress',
  'website_b2c',
  'fit',
  'Trek Altaï - Pierre Martin',
  ARRAY['MN'],
  '2026-08-01',
  '2026-08-20',
  20,
  1, 0, 5000, 7000,
  'Voyage solo, je suis sportif et souhaite un trek engagé dans les montagnes de l''Altaï.',
  ARRAY['solo', 'trek', 'aventure']
),
(
  '00000000-0000-0000-0002-000000000003',
  'NMD-2026-003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'quote_sent',
  'website_b2c',
  'fit',
  'Pérou Classique - Sophie Bernard',
  ARRAY['PE'],
  '2026-09-10',
  '2026-09-25',
  15,
  2, 0, 6000, 9000,
  'Premier voyage au Pérou, nous souhaitons voir le Machu Picchu et le lac Titicaca.',
  ARRAY['culture', 'couple', 'premiers pas']
),
(
  '00000000-0000-0000-0002-000000000004',
  'NMD-2026-004',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'confirmed',
  'referral',
  'fit',
  'Naadam Festival - Groupe Leclerc',
  ARRAY['MN'],
  '2026-07-10',
  '2026-07-22',
  12,
  4, 0, 15000, 20000,
  'Nous venons sur recommandation de la famille Dupont. Très intéressés par le festival Naadam.',
  ARRAY['groupe', 'naadam', 'culture']
),
(
  '00000000-0000-0000-0002-000000000005',
  'NMD-2026-005',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'deposit_paid',
  'agency_b2b',
  'fit',
  'Amazonie & Andes - Via Voyages Excellence',
  ARRAY['PE'],
  '2026-10-05',
  '2026-10-22',
  17,
  2, 1, 10000, 14000,
  'Clients de l''agence Voyages Excellence, souhaitent combiner Amazonie et hauts plateaux.',
  ARRAY['b2b', 'nature', 'famille']
),
(
  '00000000-0000-0000-0002-000000000006',
  'NMD-2026-006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'negotiation',
  'website_b2c',
  'gir',
  'GIR Gobi Septembre - Départ groupé',
  ARRAY['MN'],
  '2026-09-01',
  '2026-09-14',
  14,
  2, 0, 4000, 5500,
  'Intéressé par le départ groupé dans le Gobi. Budget serré.',
  ARRAY['gir', 'gobi', 'budget']
),
(
  '00000000-0000-0000-0002-000000000007',
  'NMD-2026-007',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'fully_paid',
  'repeat_client',
  'fit',
  'Retour en Mongolie - Famille Moreau',
  ARRAY['MN'],
  '2026-06-20',
  '2026-07-05',
  15,
  2, 2, 11000, 15000,
  'Clients fidèles, 3ème voyage avec nous. Cette fois direction le nord et le lac Khövsgöl.',
  ARRAY['fidèle', 'khövsgöl', 'été']
)
ON CONFLICT (id) DO NOTHING;

-- 7. Link participants to dossiers
INSERT INTO dossier_participants (dossier_id, participant_id, is_lead, room_preference)
VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', true, 'double'),
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000002', false, 'double'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000003', true, 'single'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000004', true, 'double')
ON CONFLICT DO NOTHING;

-- 8. Create a sample circuit template
INSERT INTO circuits (
  id, tenant_id, name, slug, description, duration_days, countries,
  highlights, included, excluded, is_template, is_published
) VALUES (
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Mongolie Essentielle',
  'mongolie-essentielle',
  'Un voyage complet pour découvrir les incontournables de la Mongolie : steppes infinies, désert de Gobi, vie nomade authentique.',
  14,
  ARRAY['MN'],
  ARRAY[
    'Rencontre avec des familles nomades',
    'Nuit en yourte traditionnelle',
    'Balade à cheval ou chameau',
    'Dunes de Khongoriin Els',
    'Monastère de Erdene Zuu'
  ],
  ARRAY[
    'Hébergement en yourte et hôtel',
    'Tous les repas',
    'Guide francophone',
    'Transport en 4x4 privatif',
    'Activités mentionnées au programme'
  ],
  ARRAY[
    'Vols internationaux',
    'Assurance voyage',
    'Visa (si nécessaire)',
    'Pourboires',
    'Dépenses personnelles'
  ],
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- 9. Create circuit elements (days)
INSERT INTO circuit_elements (id, circuit_id, day_number, position, title, location, description, overnight_location, meals_included)
VALUES
(
  '00000000-0000-0000-0004-000000000001',
  '00000000-0000-0000-0003-000000000001',
  1, 1,
  'Arrivée à Oulan-Bator',
  'Oulan-Bator',
  'Accueil à l''aéroport et transfert à l''hôtel. Visite du monastère de Gandantegchinlen si le temps le permet. Briefing sur le voyage.',
  'Oulan-Bator',
  ARRAY['dîner']
),
(
  '00000000-0000-0000-0004-000000000002',
  '00000000-0000-0000-0003-000000000001',
  2, 1,
  'Oulan-Bator - Parc de Terelj',
  'Parc National de Terelj',
  'Route vers le parc national de Terelj. Installation chez une famille nomade. Découverte du mode de vie traditionnel. Balade à cheval possible.',
  'Yourte famille nomade',
  ARRAY['petit-déjeuner', 'déjeuner', 'dîner']
),
(
  '00000000-0000-0000-0004-000000000003',
  '00000000-0000-0000-0003-000000000001',
  3, 1,
  'Terelj - Karakorum',
  'Karakorum',
  'Longue route vers l''ancienne capitale de l''Empire Mongol. Visite du monastère d''Erdene Zuu, premier monastère bouddhiste de Mongolie.',
  'Camp de yourtes',
  ARRAY['petit-déjeuner', 'déjeuner', 'dîner']
),
(
  '00000000-0000-0000-0004-000000000004',
  '00000000-0000-0000-0003-000000000001',
  4, 1,
  'Vallée de l''Orkhon',
  'Vallée de l''Orkhon',
  'Exploration de la vallée de l''Orkhon, classée au patrimoine mondial. Chutes d''Orkhon et rencontre avec des éleveurs.',
  'Yourte famille nomade',
  ARRAY['petit-déjeuner', 'déjeuner', 'dîner']
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Seed data inserted successfully!' as message;
