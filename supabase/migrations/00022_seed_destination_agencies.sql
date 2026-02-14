-- ============================================================================
-- Migration 00022 : Seed data — 22 agences partenaires Nomadays
-- Données de démonstration pour la page "Explorer les Destinations"
-- ============================================================================

INSERT INTO public.destination_agencies (
  name, slug, description, tagline,
  country_code, country_name, continent, latitude, longitude,
  cover_image_url, languages, year_founded, location, website,
  trips_count, reviews_count, reviews_score,
  host_name, host_role, host_experience_years,
  popular_trips, sort_order
) VALUES

-- ─── ASIE ────────────────────────────────────────────────────────────────────

(
  'Siam Authentique', 'siam-authentique',
  'Sawadee ! Notre équipe franco-thaïlandaise vous fait découvrir la Thaïlande autrement. Des temples dorés de Bangkok aux plages secrètes du Sud, en passant par les montagnes du Nord, nous créons des voyages sur-mesure qui révèlent l''âme du Pays du Sourire.',
  'Le Pays du Sourire, autrement',
  'TH', 'Thaïlande', 'asia', 13.7563, 100.5018,
  'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
  ARRAY['FR', 'EN', 'TH'], 2015, 'Bangkok', NULL,
  842, 127, 4.9,
  'Niran', 'Fondateur', 12,
  '[{"name":"Trésors du Siam","duration_days":12,"theme":"Culture & Temples","price_from":2890,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=200&q=80"},{"name":"Nord Authentique","duration_days":10,"theme":"Trek & Ethnies","price_from":2450,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=200&q=80"}]'::jsonb,
  1
),
(
  'Vietnam Évasion', 'vietnam-evasion',
  'Du delta du Mékong aux rizières en terrasses de Sapa, notre équipe locale vous emmène au cœur du Vietnam authentique. Navigations en jonque, rencontres dans les villages, gastronomie de rue — chaque voyage est une immersion totale.',
  'L''authenticité au fil de l''eau',
  'VN', 'Viêt Nam', 'asia', 21.0285, 105.8542,
  'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=800&q=80',
  ARRAY['FR', 'EN', 'VI'], 2016, 'Hanoï', NULL,
  623, 89, 4.8,
  'Linh', 'Directrice', 10,
  '[{"name":"Du Nord au Sud","duration_days":15,"theme":"Découverte complète","price_from":2650,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=200&q=80"},{"name":"Baie d''Ha Long & Sapa","duration_days":8,"theme":"Nature & Croisière","price_from":1890,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200&q=80"}]'::jsonb,
  2
),
(
  'Bluesheep Journeys', 'bluesheep-journeys',
  'Au pied de l''Himalaya, notre équipe népalaise et française vous guide à travers les sentiers mythiques et les cultures millénaires du Népal. Treks, safaris dans le Teraï, rencontres avec les Sherpas — vivez l''aventure à l''état pur.',
  'L''aventure au sommet du monde',
  'NP', 'Népal', 'asia', 27.7172, 85.3240,
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80',
  ARRAY['FR', 'EN', 'NE'], 2013, 'Katmandou', NULL,
  456, 156, 4.9,
  'Sudarshan', 'Co-fondateur', 15,
  '[{"name":"Camp de base Everest","duration_days":16,"theme":"Trek mythique","price_from":3200,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200&q=80"},{"name":"Annapurna Circuit","duration_days":14,"theme":"Trek & Culture","price_from":2800,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200&q=80"}]'::jsonb,
  3
),
(
  'Nomad Mongolia', 'nomad-mongolia',
  'Parcourez les steppes infinies de Mongolie avec nos guides nomades. Nuits en yourte sous les étoiles, chevauchées à travers la vallée de l''Orkhon, rencontres avec les éleveurs — un voyage hors du temps.',
  'Les steppes infinies vous appellent',
  'MN', 'Mongolie', 'asia', 47.9184, 106.9177,
  'https://images.unsplash.com/photo-1596395463872-2e8f5d3c4c7b?w=800&q=80',
  ARRAY['FR', 'EN', 'MN'], 2017, 'Oulan-Bator', NULL,
  234, 64, 4.7,
  'Batbayar', 'Guide & Fondateur', 8,
  '[{"name":"Steppes & Nomades","duration_days":12,"theme":"Aventure nomade","price_from":3100,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1596395463872-2e8f5d3c4c7b?w=200&q=80"}]'::jsonb,
  4
),
(
  'Bali Autrement', 'bali-autrement',
  'Bien au-delà des plages touristiques, notre équipe franco-balinaise vous révèle une Indonésie secrète. Temples cachés, rizières émeraude, volcans au lever du soleil et cérémonies traditionnelles.',
  'L''île des dieux, en toute intimité',
  'ID', 'Indonésie', 'asia', -8.4095, 115.1889,
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  ARRAY['FR', 'EN', 'ID'], 2014, 'Ubud, Bali', NULL,
  789, 203, 4.8,
  'Made', 'Directeur local', 11,
  '[{"name":"Bali Essentiel","duration_days":10,"theme":"Culture & Plages","price_from":2200,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=200&q=80"},{"name":"Java & Bali","duration_days":14,"theme":"Volcans & Temples","price_from":2950,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=200&q=80"}]'::jsonb,
  5
),
(
  'Japan Experience', 'japan-experience',
  'Entre modernité et traditions millénaires, notre équipe franco-japonaise vous guide à travers un Japon que vous n''imaginiez pas. Temples zen, marchés de Kyoto, onsen secrets et nuits en ryokan.',
  'Tradition et modernité en harmonie',
  'JP', 'Japon', 'asia', 35.6895, 139.6917,
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  ARRAY['FR', 'EN', 'JA'], 2012, 'Tokyo', NULL,
  567, 178, 4.9,
  'Yuki', 'Fondatrice', 14,
  '[{"name":"Tokyo à Kyoto","duration_days":12,"theme":"Culture & Gastronomie","price_from":3500,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&q=80"},{"name":"Japon Rural","duration_days":14,"theme":"Nature & Traditions","price_from":3800,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&q=80"}]'::jsonb,
  6
),
(
  'Sri Lanka Voyages', 'sri-lanka-voyages',
  'Perle de l''océan Indien, le Sri Lanka concentre une diversité incroyable sur une petite île. Temples bouddhistes, plantations de thé, plages dorées et safaris — notre équipe locale vous fait tout découvrir.',
  'La perle de l''océan Indien',
  'LK', 'Sri Lanka', 'asia', 6.9271, 79.8612,
  'https://images.unsplash.com/photo-1586523969233-be0ea0a82654?w=800&q=80',
  ARRAY['FR', 'EN', 'SI'], 2018, 'Colombo', NULL,
  312, 52, 4.6,
  'Chaminda', 'Directeur', 7,
  '[{"name":"Tour de Ceylan","duration_days":12,"theme":"Culture & Nature","price_from":2100,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1586523969233-be0ea0a82654?w=200&q=80"}]'::jsonb,
  7
),
(
  'Inde Authentique', 'inde-authentique',
  'Du Rajasthan coloré au Kerala verdoyant, notre équipe franco-indienne crée des voyages qui révèlent les mille facettes de l''Inde. Palais de maharajas, backwaters en houseboat, spiritualité à Varanasi.',
  'Mille couleurs, une seule émotion',
  'IN', 'Inde', 'asia', 28.6139, 77.2090,
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80',
  ARRAY['FR', 'EN', 'HI'], 2011, 'New Delhi', NULL,
  678, 143, 4.7,
  'Rajesh', 'Fondateur', 16,
  '[{"name":"Rajasthan Royal","duration_days":14,"theme":"Palais & Désert","price_from":2700,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=200&q=80"},{"name":"Kerala & Backwaters","duration_days":10,"theme":"Nature & Ayurveda","price_from":2300,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=200&q=80"}]'::jsonb,
  8
),

-- ─── AFRIQUE ─────────────────────────────────────────────────────────────────

(
  'Safari Dreams', 'safari-dreams',
  'La Tanzanie est le berceau du safari. Notre équipe locale, passionnée de nature et de faune sauvage, vous emmène au cœur du Serengeti, du Ngorongoro et du Kilimandjaro pour des moments inoubliables.',
  'Le berceau du safari',
  'TZ', 'Tanzanie', 'africa', -6.3690, 39.2083,
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
  ARRAY['FR', 'EN', 'SW'], 2010, 'Arusha', NULL,
  1023, 234, 4.9,
  'Joseph', 'Guide & Fondateur', 18,
  '[{"name":"Grande Migration","duration_days":10,"theme":"Safari & Nature","price_from":4200,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&q=80"},{"name":"Kilimandjaro Trek","duration_days":8,"theme":"Trek mythique","price_from":3500,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&q=80"}]'::jsonb,
  10
),
(
  'Maroc Émotions', 'maroc-emotions',
  'Des ruelles parfumées de Marrakech aux dunes dorées du Sahara, notre équipe marocaine vous invite à vivre le Maroc autrement. Riads, souks, Atlas, oasis — chaque étape est une émotion.',
  'Émotions entre Atlas et Sahara',
  'MA', 'Maroc', 'africa', 33.5731, -7.5898,
  'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80',
  ARRAY['FR', 'AR', 'EN'], 2009, 'Marrakech', NULL,
  934, 187, 4.8,
  'Hassan', 'Directeur', 17,
  '[{"name":"Imperial & Sahara","duration_days":10,"theme":"Culture & Désert","price_from":1890,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=200&q=80"},{"name":"Atlas & Vallées","duration_days":8,"theme":"Trek & Villages","price_from":1650,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=200&q=80"}]'::jsonb,
  11
),
(
  'Madagascar Aventure', 'madagascar-aventure',
  'Île-continent aux paysages uniques, Madagascar vous surprendra par sa biodiversité exceptionnelle. Lémuriens, baobabs, tsingy, plages paradisiaques — notre équipe malgache vous guide hors des sentiers battus.',
  'L''île-continent aux mille trésors',
  'MG', 'Madagascar', 'africa', -18.9137, 46.8691,
  'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=800&q=80',
  ARRAY['FR', 'MG'], 2016, 'Antananarivo', NULL,
  345, 76, 4.6,
  'Faly', 'Fondateur', 9,
  '[{"name":"Route du Sud","duration_days":14,"theme":"Nature & Faune","price_from":2800,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=200&q=80"}]'::jsonb,
  12
),
(
  'Kenya Wild', 'kenya-wild',
  'Le Kenya, terre de safaris légendaires. Des plaines du Masai Mara aux plages de Diani, notre équipe kenyane vous fait vivre des rencontres uniques avec la faune sauvage et les communautés Masaï.',
  'Safaris légendaires, rencontres uniques',
  'KE', 'Kenya', 'africa', -1.2921, 36.8219,
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
  ARRAY['FR', 'EN', 'SW'], 2012, 'Nairobi', NULL,
  756, 165, 4.8,
  'James', 'Guide senior', 14,
  '[{"name":"Masai Mara & Amboseli","duration_days":8,"theme":"Safari Big Five","price_from":3200,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=200&q=80"},{"name":"Kenya Complet","duration_days":12,"theme":"Safari & Plage","price_from":3900,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=200&q=80"}]'::jsonb,
  13
),
(
  'Namibie Exclusive', 'namibie-exclusive',
  'Terre de contrastes saisissants, la Namibie offre des paysages à couper le souffle. Dunes rouges de Sossusvlei, désert du Namib, Etosha et côte des Squelettes — une aventure photographique unique.',
  'Des paysages à couper le souffle',
  'NA', 'Namibie', 'africa', -22.5609, 17.0658,
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  ARRAY['FR', 'EN', 'DE'], 2014, 'Windhoek', NULL,
  412, 98, 4.9,
  'Hans', 'Directeur', 12,
  '[{"name":"Namibie Essentielle","duration_days":12,"theme":"Paysages & Safari","price_from":3800,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80"}]'::jsonb,
  14
),
(
  'Cap Découverte', 'cap-decouverte',
  'L''Afrique du Sud, nation arc-en-ciel, vous offre une diversité incroyable. Du Cap à Johannesburg, vignobles, safaris au Kruger, route des Jardins — notre équipe sud-africaine vous révèle ce pays fascinant.',
  'La nation arc-en-ciel',
  'ZA', 'Afrique du Sud', 'africa', -26.2041, 28.0473,
  'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
  ARRAY['FR', 'EN', 'AF'], 2011, 'Le Cap', NULL,
  645, 142, 4.7,
  'Thabo', 'Co-fondateur', 13,
  '[{"name":"Route des Jardins","duration_days":10,"theme":"Nature & Vignobles","price_from":2900,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=200&q=80"},{"name":"Safari & Cap","duration_days":14,"theme":"Safari & Ville","price_from":3600,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=200&q=80"}]'::jsonb,
  15
),

-- ─── AMÉRIQUES ───────────────────────────────────────────────────────────────

(
  'Pérou Découverte', 'perou-decouverte',
  'Des mystères du Machu Picchu aux profondeurs de l''Amazonie, notre équipe péruvienne vous emmène à la rencontre d''un pays d''une richesse culturelle et naturelle exceptionnelle. Andes, Titicaca, Cusco — chaque étape est magique.',
  'Sur les traces des Incas',
  'PE', 'Pérou', 'latin-america', -12.0464, -77.0428,
  'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80',
  ARRAY['FR', 'ES', 'EN'], 2013, 'Lima', NULL,
  567, 198, 4.8,
  'Carlos', 'Fondateur', 14,
  '[{"name":"Pérou Classique","duration_days":12,"theme":"Culture & Andes","price_from":2800,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1526392060635-9d6019884377?w=200&q=80"},{"name":"Amazonie & Andes","duration_days":16,"theme":"Aventure complète","price_from":3400,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1526392060635-9d6019884377?w=200&q=80"}]'::jsonb,
  20
),
(
  'Costa Rica Pura Vida', 'costa-rica-pura-vida',
  'Pura Vida ! Le Costa Rica est un paradis de biodiversité. Volcans, forêts tropicales, plages des deux océans, paresseux et quetzals — notre équipe costaricienne vous fait vivre la vie pure.',
  'Pura Vida dans la jungle',
  'CR', 'Costa Rica', 'latin-america', 9.9281, -84.0907,
  'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=800&q=80',
  ARRAY['FR', 'ES', 'EN'], 2015, 'San José', NULL,
  489, 167, 4.9,
  'Diego', 'Directeur', 10,
  '[{"name":"Nature & Volcans","duration_days":10,"theme":"Écotourisme","price_from":2500,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=200&q=80"},{"name":"Caraïbes & Pacifique","duration_days":14,"theme":"Plages & Jungle","price_from":2900,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=200&q=80"}]'::jsonb,
  21
),
(
  'Mexique Ancestral', 'mexique-ancestral',
  'Le Mexique est une terre de contrastes fascinants. Sites mayas, cenotes turquoise, cuisine de renommée mondiale, plages paradisiaques — notre équipe mexicaine vous guide entre histoire et modernité.',
  'Entre civilisations et cenotes',
  'MX', 'Mexique', 'latin-america', 19.4326, -99.1332,
  'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80',
  ARRAY['FR', 'ES', 'EN'], 2014, 'Mexico', NULL,
  534, 134, 4.7,
  'Luis', 'Fondateur', 12,
  '[{"name":"Yucatán & Chiapas","duration_days":12,"theme":"Mayas & Nature","price_from":2400,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1518638150340-f706e86654de?w=200&q=80"}]'::jsonb,
  22
),
(
  'Argentine Passion', 'argentine-passion',
  'De Buenos Aires à la Patagonie, l''Argentine est un pays de passions. Tango, glaciers, vignobles de Mendoza, chutes d''Iguazú — notre équipe argentine vous fait vibrer au rythme de cette terre immense.',
  'Tango, glaciers et passions',
  'AR', 'Argentine', 'latin-america', -34.6037, -58.3816,
  'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80',
  ARRAY['FR', 'ES', 'EN'], 2012, 'Buenos Aires', NULL,
  423, 112, 4.8,
  'Martin', 'Directeur', 13,
  '[{"name":"Patagonie Express","duration_days":12,"theme":"Glaciers & Nature","price_from":3200,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=200&q=80"},{"name":"Buenos Aires & Iguazú","duration_days":8,"theme":"Ville & Nature","price_from":2100,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=200&q=80"}]'::jsonb,
  23
),
(
  'Colombie Colorée', 'colombie-coloree',
  'La Colombie renaît et surprend tous ceux qui la visitent. Cartagena colorée, zone caféière verdoyante, côte caribéenne, Amazonie — notre équipe colombienne vous révèle un pays en pleine effervescence.',
  'Un pays en pleine renaissance',
  'CO', 'Colombie', 'latin-america', 4.7110, -74.0721,
  'https://images.unsplash.com/photo-1533050487297-09b450131914?w=800&q=80',
  ARRAY['FR', 'ES', 'EN'], 2017, 'Bogotá', NULL,
  287, 87, 4.6,
  'Andrés', 'Fondateur', 8,
  '[{"name":"Colombie Essentielle","duration_days":12,"theme":"Culture & Nature","price_from":2300,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1533050487297-09b450131914?w=200&q=80"}]'::jsonb,
  24
),
(
  'Chili Extrême', 'chili-extreme',
  'Du désert d''Atacama aux fjords de Patagonie, le Chili est le pays des extrêmes. Notre équipe chilienne vous emmène à travers les paysages les plus spectaculaires d''Amérique du Sud.',
  'Le pays des extrêmes',
  'CL', 'Chili', 'latin-america', -33.4489, -70.6693,
  'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&q=80',
  ARRAY['FR', 'ES', 'EN'], 2015, 'Santiago', NULL,
  356, 93, 4.7,
  'Pablo', 'Directeur', 10,
  '[{"name":"Atacama & Torres del Paine","duration_days":14,"theme":"Paysages extrêmes","price_from":3600,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=200&q=80"}]'::jsonb,
  25
),

-- ─── OCÉANIE ─────────────────────────────────────────────────────────────────

(
  'New Zealand Pure', 'new-zealand-pure',
  'La Nouvelle-Zélande est un rêve de voyageur. Fjords majestueux, volcans actifs, lacs turquoise, culture Maori — notre équipe néo-zélandaise vous fait découvrir le pays du long nuage blanc.',
  'Le pays du long nuage blanc',
  'NZ', 'Nouvelle-Zélande', 'oceania', -36.8485, 174.7633,
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
  ARRAY['FR', 'EN'], 2013, 'Auckland', NULL,
  398, 145, 4.9,
  'Matt', 'Fondateur', 14,
  '[{"name":"Île du Sud Intégrale","duration_days":14,"theme":"Nature & Aventure","price_from":3800,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80"},{"name":"Nord & Sud Express","duration_days":18,"theme":"Découverte complète","price_from":4500,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80"}]'::jsonb,
  30
),
(
  'Polynésie Rêvée', 'polynesie-revee',
  'Bora Bora, Moorea, Tahiti, Rangiroa — les noms seuls font rêver. Notre équipe polynésienne vous invite à découvrir ces îles paradisiaques, entre lagon turquoise, culture Ma''ohi et douceur de vivre.',
  'Le paradis sur Terre existe',
  'PF', 'Polynésie française', 'oceania', -17.6797, -149.5585,
  'https://images.unsplash.com/photo-1589179899083-fa6b3cfd4f95?w=800&q=80',
  ARRAY['FR', 'EN'], 2016, 'Papeete, Tahiti', NULL,
  267, 78, 4.8,
  'Teiki', 'Directeur', 9,
  '[{"name":"Bora Bora & Moorea","duration_days":10,"theme":"Lagon & Détente","price_from":4200,"currency":"EUR","image_url":"https://images.unsplash.com/photo-1589179899083-fa6b3cfd4f95?w=200&q=80"}]'::jsonb,
  31
)

ON CONFLICT DO NOTHING;
