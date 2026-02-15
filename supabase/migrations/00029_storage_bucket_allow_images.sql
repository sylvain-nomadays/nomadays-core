-- ============================================================
-- NOMADAYS CORE - Migration 029: Autoriser les images dans le bucket documents
-- ============================================================
-- Le bucket "documents" n'acceptait que les PDF.
-- On ajoute les types images (JPEG, PNG, WebP) pour permettre
-- l'upload des copies de passeport filigranées.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]
WHERE id = 'documents';
