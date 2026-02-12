'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/database.types'

// Tenant settings type — stored in tenants.settings JSONB
export interface TenantSettings {
  allow_client_email_access?: boolean
  [key: string]: unknown
}

interface UserRoleData {
  role: UserRole | null
  tenantId: string | null
  tenantType: string | null
  tenantSettings: TenantSettings | null
  isNomadays: boolean
  isDmc: boolean
  isAdmin: boolean
  loading: boolean
}

export function useUserRole(): UserRoleData {
  const [data, setData] = useState<UserRoleData>({
    role: null,
    tenantId: null,
    tenantType: null,
    tenantSettings: null,
    isNomadays: false,
    isDmc: false,
    isAdmin: false,
    loading: true,
  })

  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setData(prev => ({ ...prev, loading: false }))
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role, tenant_id, tenant:tenants(type, settings)')
        .eq('id', user.id)
        .single()

      if (userData) {
        const userRecord = userData as { role: string; tenant_id: string | null; tenant: { type: string; settings: TenantSettings | null } | null }
        const role = userRecord.role as UserRole
        const tenantType = userRecord.tenant?.type || null
        const tenantSettings = (userRecord.tenant?.settings as TenantSettings) || null

        const isNomadays = ['admin_nomadays', 'support_nomadays'].includes(role)
        const isDmc = ['dmc_manager', 'dmc_seller', 'dmc_accountant'].includes(role)
        const isAdmin = role === 'admin_nomadays'

        setData({
          role,
          tenantId: userRecord.tenant_id,
          tenantType,
          tenantSettings,
          isNomadays,
          isDmc,
          isAdmin,
          loading: false,
        })
      } else {
        setData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchUserRole()
  }, [])

  return data
}

// Permissions helper
export const permissions = {
  // Can see marketing source (Meta, Adwords, etc.)
  canSeeMarketingSource: (role: UserRole | null): boolean =>
    !!role && ['admin_nomadays', 'support_nomadays'].includes(role),

  // Can see client email — tenant-aware
  // Nomadays staff always see emails. DMC only if their tenant has allow_client_email_access.
  canSeeClientEmail: (role: UserRole | null, tenantSettings?: TenantSettings | null): boolean => {
    if (!role) return false
    // Nomadays staff: always
    if (['admin_nomadays', 'support_nomadays'].includes(role)) return true
    // DMC: check tenant setting
    if (['dmc_manager', 'dmc_seller', 'dmc_accountant'].includes(role)) {
      return tenantSettings?.allow_client_email_access === true
    }
    return false
  },

  // Can release dossier to DMC
  canReleaseToDmc: (role: UserRole | null): boolean =>
    !!role && ['admin_nomadays', 'support_nomadays'].includes(role),

  // Can see internal Nomadays notes
  canSeeInternalNotes: (role: UserRole | null): boolean =>
    !!role && ['admin_nomadays', 'support_nomadays'].includes(role),

  // Can invite participants to portal
  canInviteToPortal: (role: UserRole | null): boolean =>
    !!role && ['admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'].includes(role),

  // Can edit dossier
  canEditDossier: (role: UserRole | null): boolean =>
    !!role && ['admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'].includes(role),

  // Can add trip offers
  canAddTripOffers: (role: UserRole | null): boolean =>
    !!role && ['admin_nomadays', 'support_nomadays', 'dmc_manager', 'dmc_seller'].includes(role),
}
