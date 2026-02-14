import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getContinentTheme } from '@/components/client/continent-theme'
import { WelcomeBanner } from '@/components/client/dashboard/welcome-banner'
import type { WelcomeTexts } from '@/components/client/dashboard/welcome-banner'
import { InteractiveMap } from '@/components/client/dashboard/map'
import type { MapDestination } from '@/components/client/dashboard/map/MapboxGlobeMap'
import { DestinationCard, ExplorerBanner } from '@/components/client/dashboard/destination-card'
import { RepartirCard } from '@/components/client/dashboard/repartir-card'
import { AddWishCtaCard } from '@/components/client/dashboard/add-wish-cta-card'
// DeclareTripsCard removed — past trips are now declared from the map header
import { WishlistCard } from '@/components/client/dashboard/wishlist-card'
import { FidelityBar } from '@/components/client/dashboard/fidelity-bar'
import type { FidelityTierDef } from '@/components/client/dashboard/fidelity-bar'
import { resolveSnippetValues, resolveSnippetsByCategory } from '@/lib/cms/resolve-snippets'
import { HeartStraight } from '@phosphor-icons/react/dist/ssr'
import { getCountryCentroid } from '@/lib/constants/country-centroids'
import { getCountryDefaultPhoto } from '@/lib/constants/country-photos'

// Country code → flag emoji lookup
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

// Country code → display name
function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

export default async function ClientHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Recuperer le participant lie a cet email
  const { data: participantData } = await supabase
    .from('participants')
    .select('id, first_name, last_name')
    .eq('email', user.email)
    .single()

  const participant = participantData as { id: string; first_name: string; last_name: string } | null

  if (!participant) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <HeartStraight size={32} weight="duotone" className="text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Bienvenue sur Nomadays</h2>
          <p className="text-sm text-gray-500">
            Aucun voyage n&apos;est associe a votre compte pour le moment.
            Contactez-nous pour creer votre premier voyage sur mesure.
          </p>
        </div>
      </div>
    )
  }

  // Recuperer les dossiers du participant (dual strategy)
  const { data: dpData } = await supabase
    .from('dossier_participants')
    .select('dossier_id')
    .eq('participant_id', participant.id)
    .order('created_at', { ascending: false })
    .limit(10) as { data: any[] | null }

  const dpIds = (dpData || []).map((dp: any) => dp.dossier_id).filter(Boolean)

  const { data: emailDossiers } = await (supabase
    .from('dossiers') as any)
    .select('id')
    .eq('client_email', user.email)
    .not('status', 'eq', 'lost')
    .order('created_at', { ascending: false })
    .limit(10) as { data: any[] | null }

  const emailIds = (emailDossiers || []).map((d: any) => d.id).filter(Boolean)
  const allDossierIds = [...new Set([...dpIds, ...emailIds])]

  let dossiers: any[] = []
  if (allDossierIds.length > 0) {
    const { data: dossierData } = await (supabase
      .from('dossiers') as any)
      .select('*')
      .in('id', allDossierIds)
      .order('created_at', { ascending: false }) as { data: any[] | null }

    dossiers = (dossierData || []).map((d: any) => ({
      ...d,
      destination_country: d.destination_countries?.[0] || null,
      travel_date_start: d.departure_date_from || null,
      travel_date_end: d.departure_date_to || null,
      adults_count: d.pax_adults || d.adults_count || 0,
      children_count: d.pax_children || d.children_count || 0,
    }))
  }

  // Fetch tenant info
  const tenantIds = [...new Set(dossiers.map((d: any) => d.tenant_id).filter(Boolean))]
  let tenantMap: Record<string, any> = {}
  if (tenantIds.length > 0) {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, logo_url')
      .in('id', tenantIds)
    for (const t of ((tenants || []) as any[])) {
      tenantMap[t.id] = t
    }
  }
  dossiers = dossiers.map((d: any) => ({
    ...d,
    tenant: tenantMap[d.tenant_id] || null,
  }))

  // Fetch advisor names for host display
  const advisorIds = [...new Set(dossiers.map((d: any) => d.assigned_to_id).filter(Boolean))]
  let advisorMap: Record<string, any> = {}
  if (advisorIds.length > 0) {
    const { data: advisors } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', advisorIds)
    for (const a of ((advisors || []) as any[])) {
      advisorMap[a.id] = a
    }
  }

  // Dossiers actifs (non perdus)
  const activeDossiers = dossiers.filter((d: any) => d.status !== 'lost')

  // Fetch hero photos for each active dossier
  const dossiersWithPhotos = await Promise.all(
    activeDossiers.map(async (dossier: any) => {
      const { data: tripData } = await supabase
        .from('trips' as any)
        .select('id, name, status')
        .eq('dossier_id', dossier.id)
        .order('created_at', { ascending: false })
        .limit(1) as { data: any[] | null }

      const trip = tripData?.[0]
      let heroPhotoUrl: string | null = null

      if (trip) {
        const { data: photos } = await supabase
          .from('trip_photos' as any)
          .select('url_hero, url_medium, url_large, is_hero')
          .eq('trip_id', trip.id)
          .order('sort_order', { ascending: true })
          .limit(3) as { data: any[] | null }

        const heroPhoto = photos?.find((p: any) => p.is_hero) ?? photos?.[0]
        heroPhotoUrl = heroPhoto?.url_hero ?? heroPhoto?.url_large ?? heroPhoto?.url_medium ?? null
      }

      const advisor = advisorMap[dossier.assigned_to_id]
      const hostName = advisor ? `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim() : null
      const totalTravelers = (dossier.adults_count || 0) + (dossier.children_count || 0)

      // Fallback to default country photo if no trip photo available
      const finalHeroPhotoUrl = heroPhotoUrl || getCountryDefaultPhoto(dossier.destination_country)

      return { ...dossier, heroPhotoUrl: finalHeroPhotoUrl, totalTravelers, hostName }
    })
  )

  // Prochain voyage (date future)
  const now = new Date()
  const upcomingTrip = dossiersWithPhotos.find((d: any) =>
    d.travel_date_start && new Date(d.travel_date_start) > now
  )

  const continentTheme = getContinentTheme(upcomingTrip?.destination_country ?? activeDossiers[0]?.destination_country)

  // Count won dossiers for fidelity
  const totalWonTrips = dossiers.filter((d: any) => d.status === 'won' || d.status === 'confirmed').length

  // Fetch CMS snippets for welcome + fidelity
  let welcomeTexts: WelcomeTexts | undefined
  let fidelityTiers: FidelityTierDef[] | undefined
  try {
    const [welcomeValues, fidelitySnippets] = await Promise.all([
      resolveSnippetValues(['welcome.title_template', 'welcome.subtitle', 'welcome.proverb'], 'fr'),
      resolveSnippetsByCategory('fidelity', 'fr'),
    ])

    // Welcome texts
    if (Object.keys(welcomeValues).length > 0) {
      welcomeTexts = {
        title_template: welcomeValues['welcome.title_template'] || 'Bienvenue chez vous, {firstName} \u{1F3E0}',
        subtitle: welcomeValues['welcome.subtitle'] || 'Votre espace voyageur Nomadays',
        proverb: welcomeValues['welcome.proverb'] || 'Ici, nos h\u00f4tes locaux vous accueillent comme en famille',
      }
    }

    // Fidelity tiers
    if (fidelitySnippets.length > 0) {
      fidelityTiers = fidelitySnippets
        .filter(s => s.snippet_key.startsWith('fidelity.tier.'))
        .map(s => {
          const meta = (s.metadata_json || {}) as Record<string, unknown>
          return {
            label: s.content_json?.fr || '',
            emoji: (meta.emoji as string) || '\u{1F30D}',
            min_trips: (meta.min_trips as number) || 0,
          }
        })
        .filter(t => t.label && t.min_trips > 0)
        .sort((a, b) => a.min_trips - b.min_trips)
    }
  } catch (err) {
    console.error('[ClientHomePage] Error fetching CMS snippets:', err)
    // welcomeTexts and fidelityTiers stay undefined -> components use defaults
  }

  // Fetch traveler wishlists
  let wishlists: any[] = []
  try {
    const { data: wishData } = await (supabase
      .from('traveler_wishlists' as any))
      .select('*')
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false }) as { data: any[] | null }
    wishlists = wishData || []
  } catch {
    // Table may not exist yet if migration hasn't been applied
  }

  // Fetch declared past trips
  let pastTrips: any[] = []
  try {
    const { data: pastData } = await (supabase
      .from('traveler_past_trips' as any))
      .select('*')
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false }) as { data: any[] | null }
    pastTrips = pastData || []
  } catch {
    // Table may not exist yet
  }

  // Build map destinations from dossiers
  const dossierCountryCodes = new Set<string>()
  const dossierDestinations: MapDestination[] = dossiersWithPhotos
    .filter((d: any) => d.destination_country)
    .map((d: any) => {
      const isUpcoming = d.travel_date_start && new Date(d.travel_date_start) > now
      const isPast = d.travel_date_end && new Date(d.travel_date_end) < now
      let status: 'visited' | 'nomadays' | 'wishlist' = 'nomadays'
      if (isPast || d.status === 'won') status = 'visited'
      if (isUpcoming && (d.status === 'won' || d.status === 'confirmed')) status = 'nomadays'
      if (d.status === 'proposal_sent' || d.status === 'lead' || d.status === 'qualified') status = 'wishlist'

      dossierCountryCodes.add(d.destination_country.toUpperCase())

      return {
        id: d.id,
        country: countryName(d.destination_country),
        countryCode: d.destination_country,
        title: `${countryName(d.destination_country)}${isUpcoming ? ' - Confirmé' : isPast ? ` ${new Date(d.travel_date_start).getFullYear()}` : ''}`,
        status,
        heroPhotoUrl: d.heroPhotoUrl,
        year: isPast && d.travel_date_start ? `${new Date(d.travel_date_start).getFullYear()}` : undefined,
        type: 'dossier' as const,
        hostName: d.hostName || null,
        coordinates: getCountryCentroid(d.destination_country),
      }
    })

  // Add wishlists (avoid duplicates with dossier countries)
  const wishDestinations: MapDestination[] = wishlists
    .filter((w: any) => !dossierCountryCodes.has(w.country_code?.toUpperCase()))
    .map((w: any) => ({
      id: w.id,
      country: countryName(w.country_code),
      countryCode: w.country_code,
      title: countryName(w.country_code),
      status: 'wishlist' as const,
      heroPhotoUrl: null,
      type: 'wish' as const,
      note: w.note || null,
      coordinates: getCountryCentroid(w.country_code),
    }))

  // Add declared past trips (avoid duplicates with dossier + wish countries)
  const wishCountryCodes = new Set(wishlists.map((w: any) => w.country_code?.toUpperCase()))
  const pastTripDestinations: MapDestination[] = pastTrips
    .filter((pt: any) => {
      const code = pt.country_code?.toUpperCase()
      return code && !dossierCountryCodes.has(code) && !wishCountryCodes.has(code)
    })
    .map((pt: any) => ({
      id: pt.id,
      country: countryName(pt.country_code),
      countryCode: pt.country_code,
      title: `${countryName(pt.country_code)}${pt.is_nomadays ? ' (Nomadays)' : ''}`,
      status: 'visited' as const,
      heroPhotoUrl: getCountryDefaultPhoto(pt.country_code),
      type: 'dossier' as const,
      note: pt.note || null,
      coordinates: getCountryCentroid(pt.country_code),
    }))

  const allMapDestinations: MapDestination[] = [...dossierDestinations, ...wishDestinations, ...pastTripDestinations]

  return (
    <div className="flex flex-col">
      {/* Welcome Banner */}
      <WelcomeBanner
        firstName={participant.first_name}
        upcomingTrip={
          upcomingTrip
            ? {
                destination: countryName(upcomingTrip.destination_country),
                departureDate: upcomingTrip.travel_date_start,
                dossierId: upcomingTrip.id,
                countryFlag: upcomingTrip.destination_country ? countryFlag(upcomingTrip.destination_country) : undefined,
              }
            : null
        }
        continentTheme={continentTheme}
        texts={welcomeTexts}
      />

      {/* Fidelity Bar */}
      <FidelityBar totalTrips={(totalWonTrips || dossiersWithPhotos.length) + pastTrips.filter((pt: any) => !pt.is_nomadays || pt.is_verified).length} tiers={fidelityTiers} />

      {/* Interactive Map */}
      <InteractiveMap
        destinations={allMapDestinations}
        participantId={participant.id}
      />

      {/* Destinations Grid — Mes voyages */}
      <div className="px-8 lg:px-10 pb-6 bg-white">
        {dossiersWithPhotos.length > 0 ? (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {dossiersWithPhotos.slice(0, 5).map((dossier: any) => (
              <DestinationCard
                key={dossier.id}
                dossierId={dossier.id}
                title={dossier.title}
                destination={dossier.destination_country ? countryName(dossier.destination_country) : null}
                travelDateStart={dossier.travel_date_start}
                travelDateEnd={dossier.travel_date_end}
                status={dossier.status}
                heroPhotoUrl={dossier.heroPhotoUrl}
                tenantName={dossier.tenant?.name}
                totalTravelers={dossier.totalTravelers}
                destinationCountryCode={dossier.destination_country}
                hostName={dossier.hostName}
              />
            ))}
            <RepartirCard participantId={participant.id} />
            <ExplorerBanner />
          </div>
        ) : (
          <div className="text-center py-12">
            <HeartStraight size={40} weight="duotone" className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-500">
              Aucun voyage en cours pour le moment.
            </p>
          </div>
        )}
      </div>

      {/* Wishlist Grid — Mes envies */}
      <div className="px-8 lg:px-10 pb-8 bg-white">
        <div className="flex items-center gap-2.5 mb-4">
          <HeartStraight size={22} weight="duotone" className="text-[#DD9371]" />
          <h3 className="font-display font-bold text-lg text-gray-800">
            Mes envies de voyage
          </h3>
          {wishlists.length > 0 && (
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
              {wishlists.length}
            </span>
          )}
        </div>
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wish: any) => (
            <WishlistCard
              key={wish.id}
              wishId={wish.id}
              countryCode={wish.country_code}
              countryName={countryName(wish.country_code)}
              note={wish.note}
              desiredPeriod={wish.desired_period}
              countryFlag={countryFlag(wish.country_code)}
              heroPhotoUrl={getCountryDefaultPhoto(wish.country_code)}
            />
          ))}
          <AddWishCtaCard participantId={participant.id} />
        </div>
      </div>
    </div>
  )
}
