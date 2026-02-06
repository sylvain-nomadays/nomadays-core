-- ============================================================
-- NOMADAYS CORE - Migration 009: Row Level Security (RLS)
-- ============================================================

-- ============================================================
-- FONCTIONS HELPER (dans le schema public)
-- ============================================================

-- Récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Récupérer le tenant de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifier si l'utilisateur est admin Nomadays
CREATE OR REPLACE FUNCTION public.is_nomadays_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() = 'admin_nomadays', false)
$$ LANGUAGE SQL STABLE;

-- Vérifier si l'utilisateur est staff Nomadays (admin ou support)
CREATE OR REPLACE FUNCTION public.is_nomadays_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() IN ('admin_nomadays', 'support_nomadays'), false)
$$ LANGUAGE SQL STABLE;

-- Vérifier si l'utilisateur est staff DMC
CREATE OR REPLACE FUNCTION public.is_dmc_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() IN ('dmc_manager', 'dmc_seller', 'dmc_accountant'), false)
$$ LANGUAGE SQL STABLE;

-- Vérifier si l'utilisateur appartient à un tenant
CREATE OR REPLACE FUNCTION public.belongs_to_tenant(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (
      tenant_id = check_tenant_id
      OR public.is_nomadays_admin()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.user_tenant_access
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifier si l'utilisateur peut voir les coûts d'un tenant
CREATE OR REPLACE FUNCTION public.can_see_costs(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND tenant_id = check_tenant_id
    AND role IN ('dmc_manager', 'dmc_seller', 'dmc_accountant')
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifier l'accès à un dossier
CREATE OR REPLACE FUNCTION public.can_access_dossier(check_dossier_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_tenant_id UUID;
  v_dossier RECORD;
BEGIN
  v_role := public.get_user_role();
  v_tenant_id := public.get_user_tenant_id();

  -- Pas de rôle = pas d'accès
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin Nomadays voit tout
  IF v_role = 'admin_nomadays' THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO v_dossier FROM public.dossiers WHERE id = check_dossier_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Support Nomadays : accès aux dossiers de son tenant
  IF v_role = 'support_nomadays' THEN
    RETURN v_dossier.tenant_id = v_tenant_id OR v_dossier.advisor_id = auth.uid();
  END IF;

  -- DMC staff : accès aux dossiers où ils sont DMC assignée
  IF v_role IN ('dmc_manager', 'dmc_seller') THEN
    RETURN v_dossier.dmc_id = v_tenant_id;
  END IF;

  -- Client : accès à ses propres dossiers
  IF v_role IN ('client_direct', 'agency_b2b') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.dossier_participants dp
      JOIN public.participants p ON dp.participant_id = p.id
      WHERE dp.dossier_id = check_dossier_id
      AND p.user_id = auth.uid()
    )
    OR v_dossier.tenant_id = v_tenant_id;  -- Agence B2B voit ses dossiers
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- RLS: TENANTS
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés voient les tenants actifs
CREATE POLICY tenants_select ON tenants FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_nomadays_admin());

-- Modification : admin Nomadays uniquement
CREATE POLICY tenants_admin ON tenants FOR ALL
  TO authenticated
  USING (public.is_nomadays_admin())
  WITH CHECK (public.is_nomadays_admin());

-- ============================================================
-- RLS: USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Lecture : voir soi-même + utilisateurs de son tenant + Nomadays staff
CREATE POLICY users_select ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.belongs_to_tenant(tenant_id)
    OR public.is_nomadays_staff()
  );

-- Modification de son propre profil
CREATE POLICY users_update_self ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin peut tout modifier
CREATE POLICY users_admin ON users FOR ALL
  TO authenticated
  USING (public.is_nomadays_admin())
  WITH CHECK (public.is_nomadays_admin());

-- ============================================================
-- RLS: PARTICIPANTS
-- ============================================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Lecture : ses propres données ou via accès dossier
CREATE POLICY participants_select ON participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_nomadays_staff()
    OR public.is_dmc_staff()
    OR EXISTS (
      SELECT 1 FROM dossier_participants dp
      JOIN dossiers d ON dp.dossier_id = d.id
      WHERE dp.participant_id = participants.id
      AND public.can_access_dossier(d.id)
    )
  );

-- Création/modification par staff
CREATE POLICY participants_staff ON participants FOR ALL
  TO authenticated
  USING (public.is_nomadays_staff() OR public.is_dmc_staff())
  WITH CHECK (public.is_nomadays_staff() OR public.is_dmc_staff());

-- Client peut modifier ses propres infos
CREATE POLICY participants_update_self ON participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLS: DOSSIERS
-- ============================================================
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

-- Lecture : selon fonction can_access_dossier
CREATE POLICY dossiers_select ON dossiers FOR SELECT
  TO authenticated
  USING (public.can_access_dossier(id));

-- Création : staff Nomadays ou agence B2B pour leur tenant
CREATE POLICY dossiers_insert ON dossiers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_nomadays_staff()
    OR (public.get_user_role() = 'agency_b2b' AND tenant_id = public.get_user_tenant_id())
  );

-- Modification : qui a accès + droits suffisants
CREATE POLICY dossiers_update ON dossiers FOR UPDATE
  TO authenticated
  USING (
    public.can_access_dossier(id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
  )
  WITH CHECK (
    public.can_access_dossier(id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
  );

-- Suppression : admin uniquement
CREATE POLICY dossiers_delete ON dossiers FOR DELETE
  TO authenticated
  USING (public.is_nomadays_admin());

-- ============================================================
-- RLS: DOSSIER_PARTICIPANTS
-- ============================================================
ALTER TABLE dossier_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY dossier_participants_select ON dossier_participants FOR SELECT
  TO authenticated
  USING (public.can_access_dossier(dossier_id));

CREATE POLICY dossier_participants_modify ON dossier_participants FOR ALL
  TO authenticated
  USING (
    public.can_access_dossier(dossier_id)
    AND (public.is_nomadays_staff() OR public.is_dmc_staff())
  )
  WITH CHECK (
    public.can_access_dossier(dossier_id)
    AND (public.is_nomadays_staff() OR public.is_dmc_staff())
  );

-- ============================================================
-- RLS: CIRCUITS
-- ============================================================
ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;

-- Lecture : publiés pour tous, tous pour staff tenant
CREATE POLICY circuits_select ON circuits FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR public.belongs_to_tenant(tenant_id)
    OR public.is_nomadays_staff()
  );

-- Modification : propriétaire ou Nomadays
CREATE POLICY circuits_modify ON circuits FOR ALL
  TO authenticated
  USING (
    public.belongs_to_tenant(tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
  )
  WITH CHECK (
    public.belongs_to_tenant(tenant_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
  );

-- ============================================================
-- RLS: CIRCUIT_ELEMENTS
-- ============================================================
ALTER TABLE circuit_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY circuit_elements_select ON circuit_elements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuits c
      WHERE c.id = circuit_elements.circuit_id
      AND (c.is_published = true OR public.belongs_to_tenant(c.tenant_id) OR public.is_nomadays_staff())
    )
  );

CREATE POLICY circuit_elements_modify ON circuit_elements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuits c
      WHERE c.id = circuit_elements.circuit_id
      AND public.belongs_to_tenant(c.tenant_id)
      AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circuits c
      WHERE c.id = circuit_elements.circuit_id
      AND public.belongs_to_tenant(c.tenant_id)
      AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
    )
  );

-- ============================================================
-- RLS: CIRCUIT_ITEMS
-- ============================================================
ALTER TABLE circuit_items ENABLE ROW LEVEL SECURITY;

-- Même logique que circuit_elements
CREATE POLICY circuit_items_select ON circuit_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuits c
      WHERE c.id = circuit_items.circuit_id
      AND (c.is_published = true OR public.belongs_to_tenant(c.tenant_id) OR public.is_nomadays_staff())
    )
  );

CREATE POLICY circuit_items_modify ON circuit_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuits c
      WHERE c.id = circuit_items.circuit_id
      AND public.belongs_to_tenant(c.tenant_id)
      AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circuits c
      WHERE c.id = circuit_items.circuit_id
      AND public.belongs_to_tenant(c.tenant_id)
      AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
    )
  );

-- ============================================================
-- RLS: CIRCUIT_ITEM_SEASONS (COÛTS CONFIDENTIELS)
-- ============================================================
ALTER TABLE circuit_item_seasons ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Seule la DMC propriétaire voit ses coûts
CREATE POLICY circuit_item_seasons_dmc_only ON circuit_item_seasons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuit_items ci
      JOIN circuits c ON ci.circuit_id = c.id
      WHERE ci.id = circuit_item_seasons.item_id
      AND public.can_see_costs(c.tenant_id)
    )
  );

CREATE POLICY circuit_item_seasons_modify ON circuit_item_seasons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuit_items ci
      JOIN circuits c ON ci.circuit_id = c.id
      WHERE ci.id = circuit_item_seasons.item_id
      AND public.can_see_costs(c.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circuit_items ci
      JOIN circuits c ON ci.circuit_id = c.id
      WHERE ci.id = circuit_item_seasons.item_id
      AND public.can_see_costs(c.tenant_id)
    )
  );

-- ============================================================
-- RLS: SERVICE_TARIFFS (COÛTS CONFIDENTIELS)
-- ============================================================
ALTER TABLE service_tariffs ENABLE ROW LEVEL SECURITY;

-- Seule la DMC propriétaire voit ses tarifs d'achat
CREATE POLICY service_tariffs_dmc_only ON service_tariffs FOR ALL
  TO authenticated
  USING (public.can_see_costs(tenant_id))
  WITH CHECK (public.can_see_costs(tenant_id));

-- ============================================================
-- RLS: PROPOSALS
-- ============================================================
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_select ON proposals FOR SELECT
  TO authenticated
  USING (public.can_access_dossier(dossier_id));

CREATE POLICY proposals_modify ON proposals FOR ALL
  TO authenticated
  USING (
    public.can_access_dossier(dossier_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
  )
  WITH CHECK (
    public.can_access_dossier(dossier_id)
    AND public.get_user_role() IN ('admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller')
  );

-- ============================================================
-- RLS: EVENTS
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Lecture : lié au dossier ou tenant
CREATE POLICY events_select ON events FOR SELECT
  TO authenticated
  USING (
    public.is_nomadays_admin()
    OR public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id))
  );

-- Insert : via fonction emit_event ou staff
CREATE POLICY events_insert ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id))
  );

-- PAS de policy UPDATE/DELETE (table immuable, géré par trigger)

-- ============================================================
-- RLS: TASKS
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON tasks FOR SELECT
  TO authenticated
  USING (
    assignee_id = auth.uid()
    OR public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id))
  );

CREATE POLICY tasks_modify ON tasks FOR ALL
  TO authenticated
  USING (
    public.belongs_to_tenant(tenant_id)
    OR assignee_id = auth.uid()
  )
  WITH CHECK (
    public.belongs_to_tenant(tenant_id)
  );

-- ============================================================
-- RLS: AI_SUGGESTIONS
-- ============================================================
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_suggestions_select ON ai_suggestions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.belongs_to_tenant(tenant_id)
    OR (dossier_id IS NOT NULL AND public.can_access_dossier(dossier_id))
  );

-- Update uniquement pour feedback (par l'utilisateur concerné)
CREATE POLICY ai_suggestions_update ON ai_suggestions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert réservé au système (via service role)

COMMENT ON FUNCTION public.can_access_dossier IS 'Vérifie si l''utilisateur peut accéder à un dossier selon son rôle';
COMMENT ON FUNCTION public.can_see_costs IS 'Vérifie si l''utilisateur peut voir les coûts d''achat d''un tenant';
