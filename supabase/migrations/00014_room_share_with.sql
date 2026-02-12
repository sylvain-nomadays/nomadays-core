-- Migration: Add room_share_with column to dossier_participants
-- Allows linking two travelers who share a room (DBL/Twin)

ALTER TABLE public.dossier_participants
  ADD COLUMN IF NOT EXISTS room_share_with uuid REFERENCES public.participants(id);
