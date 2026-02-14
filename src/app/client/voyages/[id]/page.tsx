import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import {
  FileText,
  Download,
  ScrollText,
  Receipt,
  Ticket,
  BookOpen,
  Map,
  ClipboardList,
  File,
} from 'lucide-react'
import { ClientMessagingSection } from '@/components/client/client-messaging-section'
import { SalonDeTheWrapper } from '@/components/client/voyage/salon-de-the-wrapper'
import { TripProposalCard } from '@/components/client/voyage/trip-proposal-card'
import { DayByDayProgram } from '@/components/client/voyage/day-by-day-program'
import { FlightsTimeline } from '@/components/client/voyage/flights-timeline'
import { TravelersSection } from '@/components/client/voyage/travelers-section'
import { TripInfoSection } from '@/components/client/voyage/trip-info-section'
import { VoyageTabs } from '@/components/client/voyage/voyage-tabs'
import { PricingSummary } from '@/components/client/voyage/pricing-summary'
import { getContinentTheme } from '@/components/client/continent-theme'
import { ProposalCards } from '@/components/client/website-layout/right-sidebar'
import type { ProposalMiniCard } from '@/components/client/website-layout/right-sidebar'
import { HeroDestination } from '@/components/client/voyage/hero-destination'
import { LocalInfoBar } from '@/components/client/voyage/local-info-bar'
import { DestinationSidebar } from '@/components/client/voyage/destination-sidebar'
import { getDayReactions, getDayPaces } from '@/lib/actions/day-feedback'

// ─── Country code helpers ────────────────────────────────────────────────────

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

// ─── Document type icons ─────────────────────────────────────────────────────

const DOC_TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string }> = {
  contract: { icon: ScrollText, label: 'Contrat' },
  invoice: { icon: Receipt, label: 'Facture' },
  voucher: { icon: Ticket, label: 'Voucher' },
  program: { icon: Map, label: 'Programme' },
  passport_copy: { icon: ClipboardList, label: 'Passeport' },
  proposal_pdf: { icon: FileText, label: 'Proposition' },
  travel_book: { icon: BookOpen, label: 'Carnet de voyage' },
}
const DEFAULT_DOC_CONFIG = { icon: File, label: 'Document' }

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ClientVoyageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Récupérer le participant
  const { data: participantData } = await supabase
    .from('participants')
    .select('id, first_name, last_name, email')
    .eq('email', user.email)
    .single()

  const participant = participantData as {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null

  if (!participant) {
    redirect('/client')
  }

  // Vérifier que le participant a accès à ce dossier (dual: dossier_participants OR client_email)
  const { data: dossierParticipant } = await supabase
    .from('dossier_participants')
    .select('is_lead')
    .eq('dossier_id', id)
    .eq('participant_id', participant.id)
    .single()

  if (!dossierParticipant) {
    // Fallback: check via client_email on the dossier itself (Alembic dossiers may not have dossier_participants)
    const { data: dossierByEmail } = await (supabase
      .from('dossiers') as any)
      .select('id')
      .eq('id', id)
      .eq('client_email', participant.email)
      .single() as { data: any | null }

    if (!dossierByEmail) {
      notFound()
    }
  }

  // Récupérer le dossier (Alembic schema)
  const { data: dossierRaw } = await (supabase
    .from('dossiers') as any)
    .select('*')
    .eq('id', id)
    .single() as { data: any | null }

  if (!dossierRaw) {
    notFound()
  }

  // Normalize Alembic field names
  const dossierTyped = {
    ...dossierRaw,
    destination_country: dossierRaw.destination_countries?.[0] || null,
    travel_date_start: dossierRaw.departure_date_from || null,
    travel_date_end: dossierRaw.departure_date_to || null,
    adults_count: dossierRaw.pax_adults || dossierRaw.adults_count || 0,
    children_count: dossierRaw.pax_children || dossierRaw.children_count || 0,
  } as any

  // Fetch tenant
  if (dossierTyped.tenant_id) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, name, logo_url')
      .eq('id', dossierTyped.tenant_id)
      .single()
    dossierTyped.tenant = tenantData || null
  } else {
    dossierTyped.tenant = null
  }

  // Fetch advisor via assigned_to_id
  if (dossierTyped.assigned_to_id) {
    const { data: advisorData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .eq('id', dossierTyped.assigned_to_id)
      .single()
    dossierTyped.advisor = advisorData || null
  } else {
    dossierTyped.advisor = null
  }

  // Fetch participants for this dossier
  const { data: dossierParticipantsData } = await supabase
    .from('dossier_participants')
    .select(`
      is_lead,
      participant:participants!dossier_participants_participant_id_fkey(id, first_name, last_name, email, phone)
    `)
    .eq('dossier_id', id)

  dossierTyped.participants = dossierParticipantsData || []

  const continentTheme = getContinentTheme(dossierTyped.destination_country)

  // ── Country display info ──
  const destCountryCode = dossierTyped.destination_country
  const destCountryName = destCountryCode ? countryNameFromCode(destCountryCode) : 'Destination'
  const destCountryFlag = destCountryCode ? countryFlag(destCountryCode) : '\uD83C\uDF0D'

  // ── Récupérer les propositions de circuit depuis la table trips ──
  const { data: tripProposals } = await supabase
    .from('trips' as any)
    .select(`
      id, name, type, status, duration_days, destination_country,
      start_date, end_date, version, description_short,
      default_currency, created_at, highlights,
      info_general_html, info_formalities_html,
      info_booking_conditions_html, info_cancellation_policy_html,
      info_additional_html, inclusions, exclusions,
      comfort_level, difficulty_level
    `)
    .eq('dossier_id', id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false }) as { data: any[] | null }

  // Enrichir avec photos hero + stops (étapes)
  const proposalsWithPhotos = await Promise.all(
    (tripProposals || []).map(async (trip: any) => {
      // Fetch hero photo
      const { data: photos } = await supabase
        .from('trip_photos' as any)
        .select('url_medium, url_hero, url_large, is_hero, day_number, alt_text')
        .eq('trip_id', trip.id)
        .order('sort_order', { ascending: true })
        .limit(5) as { data: any[] | null }

      const heroPhoto = photos?.find((p: any) => p.is_hero) ?? photos?.[0] ?? null

      // Fetch trip_days for stops (étapes)
      const { data: daysForStops } = await supabase
        .from('trip_days' as any)
        .select('day_number, location_from, location_to')
        .eq('trip_id', trip.id)
        .order('day_number', { ascending: true }) as { data: any[] | null }

      // Extract unique stops in order
      const stops: string[] = []
      const seenStops = new Set<string>()
      for (const day of (daysForStops || [])) {
        for (const loc of [day.location_from, day.location_to]) {
          if (loc && !seenStops.has(loc)) {
            seenStops.add(loc)
            stops.push(loc)
          }
        }
      }

      // Fetch trip_pax_configs for pricing (all options)
      const { data: paxConfigs } = await supabase
        .from('trip_pax_configs' as any)
        .select('label, total_pax, total_price, price_per_person, args_json, valid_until, is_primary, option_type, description, supplement_price, supplement_per_person, sort_order')
        .eq('trip_id', trip.id)
        .order('sort_order', { ascending: true }) as { data: any[] | null }

      // Separate base pricing from options/supplements
      const allPricingOptions = paxConfigs ?? []
      const basePricing = allPricingOptions.find((p: any) => p.is_primary !== false && p.option_type !== 'supplement') ?? allPricingOptions[0] ?? null
      const pricingOptions = allPricingOptions.filter((p: any) =>
        p.option_type === 'supplement' || p.option_type === 'alternative' || (p !== basePricing && allPricingOptions.length > 1)
      )

      return {
        ...trip,
        heroPhotoUrl: heroPhoto?.url_hero ?? heroPhoto?.url_large ?? heroPhoto?.url_medium ?? null,
        stops,
        pricing: basePricing,
        pricingOptions,
      }
    })
  )

  // Déterminer le trip confirmé ou le trip principal
  const confirmedTrip = proposalsWithPhotos.find((t: any) =>
    t.status === 'confirmed' || t.status === 'operating' || t.status === 'completed'
  )
  const primaryTrip = confirmedTrip ?? proposalsWithPhotos[0] ?? null
  const heroPhotoUrl = primaryTrip?.heroPhotoUrl ?? null

  // ── Fetch programme jour par jour pour le trip principal ──
  let tripDays: any[] = []
  let tripPhotos: any[] = []

  if (primaryTrip) {
    const { data: daysData } = await supabase
      .from('trip_days' as any)
      .select('id, day_number, day_number_end, title, description, location_from, location_to, breakfast_included, lunch_included, dinner_included, sort_order')
      .eq('trip_id', primaryTrip.id)
      .order('day_number', { ascending: true }) as { data: any[] | null }

    tripDays = daysData || []

    if (tripDays.length > 0) {
      const dayIds = tripDays.map((d: any) => d.id)
      const { data: formulasData } = await supabase
        .from('formulas' as any)
        .select('id, trip_day_id, name, block_type, description_html, sort_order, condition_id, parent_block_id')
        .in('trip_day_id', dayIds)
        .eq('is_transversal', false)
        .order('sort_order', { ascending: true }) as { data: any[] | null }

      const formulasByDay: Record<string, any[]> = {}
      for (const formula of (formulasData || [])) {
        const dayId = formula.trip_day_id
        if (!formulasByDay[dayId]) formulasByDay[dayId] = []
        formulasByDay[dayId].push(formula)
      }

      tripDays = tripDays.map((day: any) => ({
        ...day,
        formulas: formulasByDay[day.id] ?? [],
      }))
    }

    const { data: photosData } = await supabase
      .from('trip_photos' as any)
      .select('day_number, url_medium, url_large, alt_text, lqip_data_url, is_hero')
      .eq('trip_id', primaryTrip.id)
      .order('sort_order', { ascending: true }) as { data: any[] | null }

    tripPhotos = photosData || []
  }

  // ── Fetch accommodation data for enriched day cards ──
  let accommodationsMap: Record<number, any> = {}
  let roomCategoriesMap: Record<number, any[]> = {}
  let accommodationPhotosMap: Record<number, any[]> = {}
  let conditionData: { tripConditions: any[]; conditions: any[]; conditionOptions: any[]; itemConditionMap: Record<number, number | null> } = {
    tripConditions: [], conditions: [], conditionOptions: [], itemConditionMap: {},
  }

  try {
    // Collect all formulas across all days
    const allFormulas = tripDays.flatMap((d: any) => d.formulas || [])
    const accommodationFormulas = allFormulas.filter((f: any) => f.block_type === 'accommodation')

    // Extract unique accommodation_ids from metadata
    const accommodationIds: number[] = []
    for (const formula of accommodationFormulas) {
      try {
        const meta = JSON.parse(formula.description_html || '{}')
        if (meta.accommodation_id && !accommodationIds.includes(meta.accommodation_id)) {
          accommodationIds.push(meta.accommodation_id)
        }
      } catch { /* not JSON */ }
    }

    // Extract condition_ids for variant tabs
    const conditionIds = [...new Set(
      accommodationFormulas
        .filter((f: any) => f.condition_id)
        .map((f: any) => f.condition_id as number)
    )]

    // Formula IDs with conditions (need items for condition_option_id matching)
    const formulaIdsWithCondition = accommodationFormulas
      .filter((f: any) => f.condition_id)
      .map((f: any) => f.id as number)

    // Use admin client to bypass RLS (read-only, same pattern as documents)
    const adminClient = createAdminClient()

    if (accommodationIds.length > 0) {
      const [accomResult, roomResult, photoResult] = await Promise.all([
        adminClient
          .from('accommodations')
          .select('id, name, star_rating')
          .in('id', accommodationIds) as unknown as Promise<{ data: any[] | null }>,
        adminClient
          .from('room_categories')
          .select('id, accommodation_id, name, available_bed_types, size_sqm, max_occupancy')
          .in('accommodation_id', accommodationIds)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }) as unknown as Promise<{ data: any[] | null }>,
        adminClient
          .from('accommodation_photos')
          .select('id, accommodation_id, room_category_id, url, url_medium, url_large, lqip_data_url, caption, alt_text, is_main, sort_order')
          .in('accommodation_id', accommodationIds)
          .order('sort_order', { ascending: true }) as unknown as Promise<{ data: any[] | null }>,
      ])

      // Build maps
      for (const a of (accomResult.data || [])) {
        accommodationsMap[a.id] = a
      }
      for (const rc of (roomResult.data || [])) {
        if (!roomCategoriesMap[rc.accommodation_id]) roomCategoriesMap[rc.accommodation_id] = []
        roomCategoriesMap[rc.accommodation_id]!.push(rc)
      }
      for (const p of (photoResult.data || [])) {
        if (!accommodationPhotosMap[p.accommodation_id]) accommodationPhotosMap[p.accommodation_id] = []
        accommodationPhotosMap[p.accommodation_id]!.push(p)
      }
    }

    // Fetch condition data for variant tabs
    if (conditionIds.length > 0 && primaryTrip) {
      const [tcResult, condResult, optResult, itemResult] = await Promise.all([
        adminClient
          .from('trip_conditions')
          .select('id, condition_id, selected_option_id, is_active')
          .eq('trip_id', primaryTrip.id)
          .in('condition_id', conditionIds) as unknown as Promise<{ data: any[] | null }>,
        adminClient
          .from('conditions')
          .select('id, name')
          .in('id', conditionIds) as unknown as Promise<{ data: any[] | null }>,
        adminClient
          .from('condition_options')
          .select('id, condition_id, label, sort_order')
          .in('condition_id', conditionIds)
          .order('sort_order', { ascending: true }) as unknown as Promise<{ data: any[] | null }>,
        formulaIdsWithCondition.length > 0
          ? adminClient
              .from('items')
              .select('id, formula_id, condition_option_id')
              .in('formula_id', formulaIdsWithCondition) as unknown as Promise<{ data: any[] | null }>
          : Promise.resolve({ data: [] as any[] }),
      ])

      conditionData = {
        tripConditions: tcResult.data || [],
        conditions: condResult.data || [],
        conditionOptions: optResult.data || [],
        itemConditionMap: {},
      }

      // Build formula_id → condition_option_id map (using first item per formula)
      for (const item of (itemResult.data || [])) {
        if (item.condition_option_id && !conditionData.itemConditionMap[item.formula_id]) {
          conditionData.itemConditionMap[item.formula_id] = item.condition_option_id
        }
      }
    }
  } catch (err) {
    console.error('[ClientVoyage] Error fetching accommodation/condition data:', err)
  }

  // ── Fetch day feedback (reactions + pace) for feedback panel ──
  let feedbackReactions: Record<number, 'love' | 'modify'> = {}
  let feedbackPaces: Record<number, 'slower' | 'normal' | 'faster'> = {}

  if (participant && tripDays.length > 0) {
    try {
      const tripDayIds = tripDays.map((d: any) => d.id)
      const [reactions, paces] = await Promise.all([
        getDayReactions(tripDayIds, participant.id),
        getDayPaces(tripDayIds, participant.id),
      ])
      feedbackReactions = reactions
      feedbackPaces = paces
    } catch (err) {
      console.error('[ClientVoyage] Error fetching day feedback:', err)
    }
  }

  // Récupérer les vols
  const { data: logistics } = await supabase
    .from('dossier_travel_logistics')
    .select('*')
    .eq('dossier_id', id)
    .order('date', { ascending: true })

  // Récupérer les documents visibles par le client
  let documents: Array<{
    id: string
    filename: string
    type: string
    description: string | null
    mime_type: string | null
    size_bytes: number | null
    storage_path: string
    storage_bucket: string | null
    created_at: string
    download_url: string | null
  }> = []
  try {
    const adminClient = createAdminClient()
    const { data: docs } = await adminClient
      .from('documents')
      .select('id, filename, type, description, mime_type, size_bytes, storage_path, storage_bucket, created_at')
      .eq('dossier_id', id)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false })

    if (docs && docs.length > 0) {
      documents = await Promise.all(
        docs.map(async (doc: any) => {
          let downloadUrl: string | null = null
          const bucket = doc.storage_bucket || 'documents'
          if (doc.storage_path) {
            const { data: signedData } = await adminClient.storage
              .from(bucket)
              .createSignedUrl(doc.storage_path, 3600)
            downloadUrl = signedData?.signedUrl || null
          }
          return { ...doc, download_url: downloadUrl }
        })
      )
    }
  } catch (err) {
    console.error('[ClientVoyage] Error fetching documents:', err)
  }

  // ── Fetch pricing data (proposals + pricing_snapshots) ──
  let pricingData: {
    totalSell: number | null
    currency: string
    pricePerAdult: number | null
    pricePerChild: number | null
  } = { totalSell: null, currency: 'EUR', pricePerAdult: null, pricePerChild: null }

  try {
    const { data: proposals } = await supabase
      .from('proposals' as any)
      .select('id, version_number, name, status')
      .eq('dossier_id', id)
      .in('status', ['sent', 'viewed', 'accepted'])
      .order('version_number', { ascending: false })
      .limit(1) as { data: any[] | null }

    const latestProposal = proposals?.[0]
    if (latestProposal) {
      const { data: snapshot } = await supabase
        .from('pricing_snapshots' as any)
        .select('total_sell, total_sell_currency, price_per_adult, price_per_child')
        .eq('proposal_id', latestProposal.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: any | null }

      if (snapshot) {
        pricingData = {
          totalSell: snapshot.total_sell,
          currency: snapshot.total_sell_currency || 'EUR',
          pricePerAdult: snapshot.price_per_adult,
          pricePerChild: snapshot.price_per_child,
        }
      }
    }
  } catch (err) {
    console.error('[ClientVoyage] Error fetching pricing data:', err)
  }

  // ── Fetch payments ──
  let payments: Array<{
    id: string
    type: string
    amount: number
    currency: string
    status: string
    due_date: string | null
    paid_at: string | null
    paid_amount: number | null
  }> = []

  try {
    const { data: paymentsData } = await supabase
      .from('payments' as any)
      .select('id, type, amount, currency, status, due_date, paid_at, paid_amount')
      .eq('dossier_id', id)
      .order('due_date', { ascending: true }) as { data: any[] | null }

    payments = paymentsData || []
  } catch (err) {
    console.error('[ClientVoyage] Error fetching payments:', err)
  }

  const advisorName = dossierTyped.advisor
    ? `${dossierTyped.advisor.first_name || ''} ${dossierTyped.advisor.last_name || ''}`.trim()
    : null

  const arrivals = (logistics || []).filter((l: any) => l.type === 'arrival')
  const departures = (logistics || []).filter((l: any) => l.type === 'departure')

  // ── Subtitle for hero ──
  const proposalCount = proposalsWithPhotos.length
  const heroSubtitle = proposalCount > 1
    ? `${proposalCount} propositions de voyage personnalis\u00E9es`
    : dossierTyped.title || 'Votre voyage sur mesure'

  // ── Host info ──
  const hostTitle = destCountryCode
    ? `Votre h\u00F4te ${destCountryName.startsWith('A') || destCountryName.startsWith('E') || destCountryName.startsWith('I') || destCountryName.startsWith('O') || destCountryName.startsWith('U') ? 'en' : 'au'} ${destCountryName}`
    : 'Votre h\u00F4te local'

  const hostMessage = advisorName
    ? `"${participant.first_name}, je suis \u00E0 votre disposition pour personnaliser votre voyage. N'h\u00E9sitez pas !"`
    : null

  // ── Proposal mini-cards for inline display in Salon de Thé ──
  const proposalMiniCards: ProposalMiniCard[] = proposalsWithPhotos.slice(0, 2).map((trip: any) => ({
    dossierId: id,
    tripName: trip.name,
    countryName: destCountryName,
    countryFlag: destCountryFlag,
    heroPhotoUrl: trip.heroPhotoUrl,
    durationDays: trip.duration_days,
    pricePerPerson: trip.pricing?.price_per_person ?? null,
    currency: trip.default_currency || 'EUR',
    continentTheme,
  }))

  // ── Tab config ──
  const tabConfig = [
    { value: 'proposals', label: 'Propositions', badge: proposalCount > 1 ? proposalCount : undefined },
    { value: 'infos', label: 'Infos' },
    { value: 'flights', label: 'Vols' },
    { value: 'travelers', label: 'Voyageurs' },
    { value: 'messages', label: 'Salon de Th\u00E9' },
    { value: 'documents', label: 'Documents', badge: documents.length > 0 ? documents.length : undefined },
  ]

  return (
    <div className="space-y-0">
      {/* Hide "Vos propositions" from right sidebar on this page (already shown in main content) */}
      <style dangerouslySetInnerHTML={{ __html: '.right-sidebar-proposals { display: none !important; }' }} />

      {/* Hero Destination — hidden when tab=messages via CSS */}
      <div className="voyage-hero-section">
        <HeroDestination
          countryCode={destCountryCode}
          countryName={destCountryName}
          countryFlag={destCountryFlag}
          heroPhotoUrl={heroPhotoUrl}
          subtitle={heroSubtitle}
          hostName={advisorName}
          hostTitle={hostTitle}
          continentTheme={continentTheme}
        />
      </div>

      {/* Local Info Bar — hidden when tab=messages via CSS */}
      <div className="voyage-info-bar">
        <LocalInfoBar countryCode={destCountryCode} />
      </div>

      {/* Destination Layout — Sidebar + Content */}
      <div className="destination-layout">
        {/* Left Sidebar */}
        <DestinationSidebar
          hostName={advisorName}
          hostTitle={hostTitle}
          hostMessage={hostMessage}
          dossierId={id}
          continentTheme={continentTheme}
          proposalCount={proposalCount}
          countryName={destCountryName}
        />

        {/* Main Content */}
        <div className="p-8 lg:px-10 bg-[#F8F9FA] min-w-0">
          {/* Tabs — URL-synced via VoyageTabs client component */}
          <VoyageTabs tabs={tabConfig}>
            {/* Onglet Propositions */}
            <TabsContent value="proposals" className="mt-0">
              {proposalsWithPhotos.length > 0 ? (
                <div>
                  <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
                    {proposalsWithPhotos.length > 1
                      ? 'Vos propositions de voyage'
                      : 'Votre proposition de voyage'}
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    {proposalsWithPhotos.length > 1
                      ? `Comparez les circuits propos\u00E9s${advisorName ? ` par ${advisorName.split(' ')[0]}` : ''} et choisissez celui qui vous correspond`
                      : advisorName
                        ? `${advisorName.split(' ')[0]} a pr\u00E9par\u00E9 cet itin\u00E9raire sur-mesure pour vous`
                        : 'Votre itin\u00E9raire personnalis\u00E9'}
                  </p>
                  <div className="flex flex-col gap-8">
                    {proposalsWithPhotos.map((trip: any) => (
                      <TripProposalCard
                        key={trip.id}
                        trip={trip}
                        isConfirmed={confirmedTrip?.id === trip.id}
                        continentTheme={continentTheme}
                        stops={trip.stops}
                        travelersCount={(dossierTyped.adults_count || 0) + (dossierTyped.children_count || 0)}
                        advisorFirstName={advisorName?.split(' ')[0]}
                        dossierId={id}
                        pricing={trip.pricing}
                        pricingOptions={trip.pricingOptions}
                        currency={trip.default_currency || 'EUR'}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">
                    {advisorName
                      ? `${advisorName.split(' ')[0]} pr\u00E9pare actuellement vos propositions de voyage.`
                      : 'Vos propositions de voyage seront bient\u00F4t disponibles ici.'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Onglet Programme */}
            <TabsContent value="program" className="mt-0">
              <DayByDayProgram
                tripDays={tripDays}
                photos={tripPhotos}
                continentTheme={continentTheme}
                tripName={primaryTrip?.name}
                durationDays={primaryTrip?.duration_days}
                accommodationsMap={accommodationsMap}
                roomCategoriesMap={roomCategoriesMap}
                accommodationPhotosMap={accommodationPhotosMap}
                conditionData={conditionData}
                feedbackContext={participant && dossierTyped.advisor ? {
                  dossierId: id,
                  participantId: participant.id,
                  participantEmail: participant.email,
                  participantName: `${participant.first_name} ${participant.last_name}`.trim(),
                  advisorEmail: (dossierTyped.advisor as any).email || '',
                  advisorName: advisorName || '',
                  reactions: feedbackReactions,
                  paces: feedbackPaces,
                } : undefined}
              />
            </TabsContent>

            {/* Onglet Infos */}
            <TabsContent value="infos" className="mt-0">
              {/* Résumé financier (auto-hides if no data) */}
              <PricingSummary
                totalSell={pricingData.totalSell}
                currency={pricingData.currency}
                pricePerAdult={pricingData.pricePerAdult}
                pricePerChild={pricingData.pricePerChild}
                adultsCount={dossierTyped.adults_count || 0}
                childrenCount={dossierTyped.children_count || 0}
                payments={payments}
                continentTheme={continentTheme}
              />

              <TripInfoSection
                infoGeneralHtml={primaryTrip?.info_general_html}
                infoFormalitiesHtml={primaryTrip?.info_formalities_html}
                infoBookingConditionsHtml={primaryTrip?.info_booking_conditions_html}
                infoCancellationPolicyHtml={primaryTrip?.info_cancellation_policy_html}
                infoAdditionalHtml={primaryTrip?.info_additional_html}
                inclusions={primaryTrip?.inclusions ? (Array.isArray(primaryTrip.inclusions) ? primaryTrip.inclusions : []) : null}
                exclusions={primaryTrip?.exclusions ? (Array.isArray(primaryTrip.exclusions) ? primaryTrip.exclusions : []) : null}
                comfortLevel={primaryTrip?.comfort_level}
                difficultyLevel={primaryTrip?.difficulty_level}
                continentTheme={continentTheme}
              />
            </TabsContent>

            {/* Onglet Vols */}
            <TabsContent value="flights" className="mt-0">
              <FlightsTimeline
                arrivals={arrivals}
                departures={departures}
                continentTheme={continentTheme}
              />
            </TabsContent>

            {/* Onglet Voyageurs */}
            <TabsContent value="travelers" className="mt-0">
              <TravelersSection
                participants={dossierTyped.participants as any[]}
                continentTheme={continentTheme}
              />
            </TabsContent>

            {/* Onglet Messages (Salon de Thé) */}
            <TabsContent value="messages" className="mt-0">
              <SalonDeTheWrapper
                advisorName={advisorName || 'Votre hôte'}
                continentTheme={continentTheme}
                countryCode={destCountryCode}
                advisorPhone={(dossierTyped.advisor as any)?.phone || null}
                advisorId={dossierTyped.assigned_to_id || undefined}
                dossierId={id}
                participantId={participant.id}
                participantEmail={participant.email}
                participantName={`${participant.first_name} ${participant.last_name}`}
              >
                <ClientMessagingSection
                  dossierId={dossierTyped.id}
                  participantId={participant.id}
                  participantEmail={participant.email}
                  participantName={`${participant.first_name} ${participant.last_name}`}
                  advisorEmail={(dossierTyped.advisor as any)?.email || ''}
                  advisorName={advisorName || 'Votre hôte'}
                  continentTheme={continentTheme}
                />

                {/* Proposals below messaging — horizontal layout */}
                {proposalMiniCards.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <ProposalCards
                      proposals={proposalMiniCards}
                      continentTheme={continentTheme}
                      maxCards={2}
                      layout="horizontal"
                    />
                  </div>
                )}
              </SalonDeTheWrapper>
            </TabsContent>

            {/* Onglet Documents */}
            <TabsContent value="documents" className="mt-0">
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const config = DOC_TYPE_CONFIG[doc.type] ?? DEFAULT_DOC_CONFIG
                    const Icon = config.icon
                    const sizeStr = doc.size_bytes
                      ? doc.size_bytes > 1024 * 1024
                        ? `${(doc.size_bytes / (1024 * 1024)).toFixed(1)} Mo`
                        : `${Math.round(doc.size_bytes / 1024)} Ko`
                      : null

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${continentTheme.primary}10` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: continentTheme.primary }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate text-gray-900">
                              {doc.description || doc.filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <Badge variant="outline" className="text-xs px-1.5 py-0 border-gray-200">
                                {config.label}
                              </Badge>
                              {sizeStr && <span>{sizeStr}</span>}
                              <span>
                                {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {doc.download_url && (
                          <a
                            href={doc.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 ml-3"
                          >
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Télécharger</span>
                            </Button>
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Vos documents seront disponibles ici une fois votre voyage confirmé.
                  </p>
                </div>
              )}
            </TabsContent>
          </VoyageTabs>
        </div>
      </div>
    </div>
  )
}
