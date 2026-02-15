-- ============================================================
-- NOMADAYS CORE - Migration 028: Nom du pays avec article FR
-- ============================================================
-- Ajoute un champ configurable par tenant pour le nom du pays
-- avec son article en français (ex: "la Thaïlande", "le Vietnam",
-- "l'Inde", "les Philippines").
-- Utilisé dans l'espace voyageur pour les messages personnalisés.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS country_name_fr VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN tenants.country_name_fr IS 'Nom du pays avec article en français (ex: "la Thaïlande", "le Vietnam", "l''Inde"). Configurable par le DMC.';
