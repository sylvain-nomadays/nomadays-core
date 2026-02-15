import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/client/website-layout/site-header'
import { RightSidebar } from '@/components/client/website-layout/right-sidebar'
import type { SidebarContent, ProposalMiniCard } from '@/components/client/website-layout/right-sidebar'
import { getContinentTheme, getContinentCssVars } from '@/components/client/continent-theme'
import { resolveSnippetValues } from '@/lib/cms/resolve-snippets'
import { getCurrentTier, FIDELITY_STATUSES } from '@/lib/fidelity-tiers'

// ─── Country helpers ──────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  try {
    return code
      .toUpperCase()
      .split('')
      .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
      .join('')
  } catch {
    return ''
  }
}

function countryNameFromCode(code: string): string {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Recuperer les infos du participant
  const { data: participantData } = user.email
    ? await supabase
        .from('participants')
        .select('id, first_name, last_name, email')
        .eq('email', user.email)
        .single()
    : { data: null }

  const participant = participantData as {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null

  const displayName = participant
    ? `${participant.first_name} ${participant.last_name}`
    : user.email || ''

  // Fetch le dossier actif pour le theming continent
  let activeDossierCountry: string | null = null
  let activeDossierId: string | null = null
  let allDossierIds: string[] = []

  if (participant) {
    // Strategy 1: Try via dossier_participants join
    const { data: dpData } = await supabase
      .from('dossier_participants')
      .select('dossier_id')
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false })
      .limit(5) as { data: any[] | null }

    const dossierIds = (dpData || []).map((dp: any) => dp.dossier_id).filter(Boolean)

    // Strategy 2: Also find dossiers by client_email
    const { data: emailDossiers } = await (supabase
      .from('dossiers') as any)
      .select('id')
      .eq('client_email', participant.email)
      .not('status', 'eq', 'lost')
      .order('created_at', { ascending: false })
      .limit(5) as { data: any[] | null }

    const emailDossierIds = (emailDossiers || []).map((d: any) => d.id)
    const allIds = [...new Set([...dossierIds, ...emailDossierIds])]
    allDossierIds = allIds

    if (allIds.length > 0) {
      const { data: dossierData } = await (supabase
        .from('dossiers') as any)
        .select('id, status, destination_countries, departure_date_from')
        .in('id', allIds) as { data: any[] | null }

      const dossiers = (dossierData || [])
        .filter((d: any) => d.status !== 'lost')
        .map((d: any) => ({
          ...d,
          destination_country: d.destination_countries?.[0] || null,
          travel_date_start: d.departure_date_from || null,
        }))

      const now = new Date()
      const best = dossiers.find((d: any) =>
        d.travel_date_start && new Date(d.travel_date_start) > now
      ) ?? dossiers[0] ?? null

      if (best) {
        activeDossierCountry = best.destination_country
        activeDossierId = best.id
      }
    }
  }

  const continentTheme = getContinentTheme(activeDossierCountry)

  // ── Calculate fidelity tier ──
  let fidelityTrips = 0
  if (participant && allDossierIds.length > 0) {
    // Count dossiers with confirmed statuses (deposit_paid+)
    const { data: allDossiersForFidelity } = await (supabase
      .from('dossiers') as any)
      .select('status')
      .in('id', allDossierIds) as { data: any[] | null }

    fidelityTrips = (allDossiersForFidelity || [])
      .filter((d: any) => FIDELITY_STATUSES.has(d.status))
      .length

    // Add verified past Nomadays trips
    try {
      const { data: pastTrips } = await (supabase.rpc as any)('get_past_trips', {
        p_participant_id: participant.id,
      }) as { data: any[] | null }

      fidelityTrips += (pastTrips || [])
        .filter((pt: any) => pt.is_nomadays && pt.is_verified)
        .length
    } catch {
      // RPC may not exist yet
    }
  }
  const fidelityTier = getCurrentTier(fidelityTrips)

  // ── Fetch proposals (trips) for sidebar mini-cards ──
  let sidebarProposals: ProposalMiniCard[] = []

  if (allDossierIds.length > 0) {
    try {
      // Fetch trips linked to user's dossiers (non-cancelled, limit to recent)
      const { data: tripsData } = await (supabase
        .from('trips') as any)
        .select('id, name, dossier_id, status, duration_days, destination_country, default_currency, created_at')
        .in('dossier_id', allDossierIds)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(6) as { data: any[] | null }

      if (tripsData && tripsData.length > 0) {
        // Enrich each trip with hero photo + pricing (in parallel)
        const enriched = await Promise.all(
          tripsData.map(async (trip: any) => {
            // Fetch hero photo
            const { data: photos } = await (supabase
              .from('trip_photos') as any)
              .select('url_medium, url_hero, url_large, is_hero')
              .eq('trip_id', trip.id)
              .order('sort_order', { ascending: true })
              .limit(3) as { data: any[] | null }

            const heroPhoto = photos?.find((p: any) => p.is_hero) ?? photos?.[0] ?? null
            const heroPhotoUrl = heroPhoto?.url_hero ?? heroPhoto?.url_large ?? heroPhoto?.url_medium ?? null

            // Fetch primary pricing
            const { data: paxConfigs } = await (supabase
              .from('trip_pax_configs') as any)
              .select('price_per_person, is_primary')
              .eq('trip_id', trip.id)
              .order('sort_order', { ascending: true })
              .limit(3) as { data: any[] | null }

            const basePricing = paxConfigs?.find((p: any) => p.is_primary !== false) ?? paxConfigs?.[0] ?? null

            const destCode = trip.destination_country || null
            const tripTheme = getContinentTheme(destCode)

            return {
              dossierId: trip.dossier_id,
              tripName: trip.name || 'Circuit sur mesure',
              countryName: destCode ? countryNameFromCode(destCode) : 'Destination',
              countryFlag: destCode ? countryFlag(destCode) : '\uD83C\uDF0D',
              heroPhotoUrl,
              durationDays: trip.duration_days || null,
              pricePerPerson: basePricing?.price_per_person || null,
              currency: trip.default_currency || 'EUR',
              continentTheme: tripTheme,
            } satisfies ProposalMiniCard
          })
        )

        sidebarProposals = enriched
      }
    } catch (err) {
      // Don't break the layout if proposals fail to load
      console.warn('[ClientLayout] Error fetching sidebar proposals:', err)
    }
  }

  // Fetch sidebar CMS snippets
  // Determine tenant_id from the active dossier for CMS resolution
  let voyageurTenantId: string | null = null
  if (allDossierIds.length > 0) {
    const { data: firstDossier } = await (supabase
      .from('dossiers') as any)
      .select('tenant_id')
      .in('id', allDossierIds)
      .limit(1)
      .single() as { data: any | null }
    voyageurTenantId = firstDossier?.tenant_id || null
  }

  let sidebarContent: SidebarContent | undefined
  try {
    const sidebarKeys = [
      'sidebar.collectif.title', 'sidebar.collectif.tagline', 'sidebar.collectif.description',
      'sidebar.collectif.phone', 'sidebar.collectif.whatsapp', 'sidebar.collectif.email',
      'sidebar.insurance.title', 'sidebar.insurance.subtitle', 'sidebar.insurance.description',
      'sidebar.insurance.cta_text', 'sidebar.insurance.cta_link',
      'sidebar.ambassador.title', 'sidebar.ambassador.description', 'sidebar.ambassador.cta_text',
      'sidebar.social.instagram', 'sidebar.social.facebook', 'sidebar.social.youtube',
    ]
    const sv = await resolveSnippetValues(sidebarKeys, 'fr', voyageurTenantId)

    // Only build sidebarContent if we got some values
    if (Object.keys(sv).length > 0) {
      sidebarContent = {
        collectif: {
          title: sv['sidebar.collectif.title'] || 'Le collectif Nomadays',
          tagline: sv['sidebar.collectif.tagline'] || 'Vos agences locales s\'unissent et inventent',
          description: sv['sidebar.collectif.description'] || '',
          phone: sv['sidebar.collectif.phone'] || '',
          whatsapp: sv['sidebar.collectif.whatsapp'] || '',
          email: sv['sidebar.collectif.email'] || '',
        },
        insurance: {
          title: sv['sidebar.insurance.title'] || 'Assurance Chapka',
          subtitle: sv['sidebar.insurance.subtitle'] || 'Notre partenaire',
          description: sv['sidebar.insurance.description'] || '',
          cta_text: sv['sidebar.insurance.cta_text'] || 'D\u00e9couvrir les garanties',
          cta_link: sv['sidebar.insurance.cta_link'] || '#',
        },
        ambassador: {
          title: sv['sidebar.ambassador.title'] || 'Passeurs d\'Horizons',
          description: sv['sidebar.ambassador.description'] || '',
          cta_text: sv['sidebar.ambassador.cta_text'] || 'Passer le relais',
        },
        social: {
          instagram: sv['sidebar.social.instagram'] || '#',
          facebook: sv['sidebar.social.facebook'] || '#',
          youtube: sv['sidebar.social.youtube'] || '#',
        },
      }
    }
  } catch (err) {
    console.error('[ClientLayout] Error fetching sidebar snippets:', err)
    // sidebarContent stays undefined -> RightSidebar will use defaults
  }

  return (
    <div style={getContinentCssVars(continentTheme)} className="min-h-screen bg-[#F8F9FA]">
      {/* Header horizontal */}
      <SiteHeader
        displayName={displayName}
        continentTheme={continentTheme}
        fidelityTierLabel={fidelityTier.current.label}
        fidelityTierColor={fidelityTier.current.color}
        fidelityTierIconName={fidelityTier.current.iconName}
      />

      {/* Main layout: content + right sidebar */}
      <div className="voyageur-main-layout">
        <main className="min-h-0">{children}</main>
        <RightSidebar continentTheme={continentTheme} content={sidebarContent} proposals={sidebarProposals} currentDossierId={activeDossierId} />
      </div>
    </div>
  )
}
