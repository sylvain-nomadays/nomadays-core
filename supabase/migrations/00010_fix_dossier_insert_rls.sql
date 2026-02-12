-- ============================================================
-- Migration 010: Fix dossier INSERT RLS policy
-- Allow DMC staff (dmc_manager, dmc_seller, dmc_accountant)
-- to create dossiers for their own tenant.
-- ============================================================

-- Drop the old policy
DROP POLICY IF EXISTS dossiers_insert ON dossiers;

-- Recreate with DMC staff included
CREATE POLICY dossiers_insert ON dossiers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_nomadays_staff()
    OR (public.is_dmc_staff() AND tenant_id = public.get_user_tenant_id())
    OR (public.get_user_role() = 'agency_b2b' AND tenant_id = public.get_user_tenant_id())
  );
