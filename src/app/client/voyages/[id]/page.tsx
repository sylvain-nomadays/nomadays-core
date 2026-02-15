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
import { ProposalsSection } from '@/components/client/voyage/proposals-section'
import { FlightsTimeline } from '@/components/client/voyage/flights-timeline'
import { TravelersSection } from '@/components/client/voyage/travelers-section'
import { TripSummaryBanner } from '@/components/client/voyage/trip-summary-banner'
import { VoyageTabs } from '@/components/client/voyage/voyage-tabs'
import { getContinentTheme } from '@/components/client/continent-theme'
import type { ProposalMiniCard } from '@/components/client/website-layout/right-sidebar'
import { MapPin, ArrowRight, CalendarDots } from '@phosphor-icons/react/dist/ssr'
import { HeroDestination } from '@/components/client/voyage/hero-destination'
import { LocalInfoBar } from '@/components/client/voyage/local-info-bar'
import { DestinationSidebar } from '@/components/client/voyage/destination-sidebar'
import { getDayReactions, getDayPaces } from '@/lib/actions/day-feedback'
import { getMergedTravelInfo, getParticipantChecklist } from '@/lib/actions/travel-info'
import { PassportUploadSection } from '@/components/client/voyage/passport-upload-section'
import { CarnetsPratiques } from '@/components/client/voyage/carnets-pratiques'
import { getCmsImageUrls } from '@/lib/actions/cms-images'

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

/**
 * Dérive la préposition française ("en", "au", "aux", "à") à partir du nom du
 * pays avec son article (stocké dans tenants.country_name_fr).
 *
 * Convention de saisie dans le champ country_name_fr du tenant :
 *  - "la Thaïlande"    → article féminin  → "en Thaïlande"
 *  - "le Vietnam"       → article masculin → "au Vietnam"
 *  - "l'Inde"           → élision          → "en Inde"
 *  - "les Philippines"  → pluriel          → "aux Philippines"
 *  - "Madagascar"       → sans article     → "à Madagascar"
 *
 * Si country_name_fr est null (pas configuré), heuristique automatique.
 */
function countryPreposition(countryNameFr: string | null, countryNameFallback: string): string {
  if (!countryNameFr) {
    // Heuristique simple si pas de configuration tenant
    const name = countryNameFallback
    const firstChar = name.charAt(0).toLowerCase()
    const vowels = ['a', 'e', 'i', 'o', 'u', 'é', 'è', 'ê', 'î', 'ô', 'û']
    if (vowels.includes(firstChar)) return `en ${name}`
    // Pays féminins (terminaison en "e"), sauf exceptions masculines
    const masculineExceptions = ['cambodge', 'mexique', 'mozambique', 'zimbabwe', 'belize', 'suriname']
    if (name.endsWith('e') && !masculineExceptions.includes(name.toLowerCase())) {
      return `en ${name}`
    }
    return `au ${name}`
  }

  const lower = countryNameFr.toLowerCase().trimStart()

  if (lower.startsWith('les ')) {
    // les Philippines → aux Philippines
    return `aux ${countryNameFr.substring(4)}`
  }
  if (lower.startsWith('le ')) {
    // le Vietnam → au Vietnam
    return `au ${countryNameFr.substring(3)}`
  }
  if (lower.startsWith('la ')) {
    // la Thaïlande → en Thaïlande
    return `en ${countryNameFr.substring(3)}`
  }
  if (lower.startsWith("l'") || lower.startsWith('l\u2019')) {
    // l'Inde → en Inde
    const nameWithoutArticle = countryNameFr.substring(2)
    return `en ${nameWithoutArticle}`
  }

  // Pas d'article (Madagascar, Cuba, Singapour…) → "à"
  return `à ${countryNameFr}`
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
    .single() as { data: { is_lead: boolean } | null }

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
      .select('id, name, logo_url, office_city, office_lat, office_lng, country_name_fr')
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

  // Fetch participants for this dossier (all fields for profile editing)
  const { data: dossierParticipantsData } = await supabase
    .from('dossier_participants')
    .select(`
      is_lead,
      room_share_with,
      participant:participants!dossier_participants_participant_id_fkey(
        id, first_name, last_name, email, phone, whatsapp,
        civility, birth_date, nationality,
        address, city, postal_code, country,
        passport_number, passport_expiry,
        dietary_requirements, medical_notes
      )
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
    .order('created_at', { ascending: false }) as { data: any[] | null }

  const adminClient = createAdminClient()

  // ── Helper: fetch full detail data for a single trip ──
  async function fetchTripDetailData(tripId: number) {
    // 1. Trip days + formulas
    const { data: daysData } = await supabase
      .from('trip_days' as any)
      .select('id, day_number, day_number_end, title, description, location_from, location_to, breakfast_included, lunch_included, dinner_included, sort_order')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true }) as { data: any[] | null }

    let days = daysData || []

    if (days.length > 0) {
      const dayIds = days.map((d: any) => d.id)
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

      days = days.map((day: any) => ({
        ...day,
        formulas: formulasByDay[day.id] ?? [],
      }))
    }

    // 2. Trip photos (full set for programme)
    const { data: photosData } = await supabase
      .from('trip_photos' as any)
      .select('day_number, url_medium, url_large, url_hero, alt_text, lqip_data_url, is_hero')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true }) as { data: any[] | null }

    const photos = photosData || []

    // 3. Accommodation data
    let accomMap: Record<number, any> = {}
    let roomMap: Record<number, any[]> = {}
    let accomPhotoMap: Record<number, any[]> = {}
    let condData: { tripConditions: any[]; conditions: any[]; conditionOptions: any[]; itemConditionMap: Record<number, number | null> } = {
      tripConditions: [], conditions: [], conditionOptions: [], itemConditionMap: {},
    }

    try {
      const allFormulas = days.flatMap((d: any) => d.formulas || [])
      const accommodationFormulas = allFormulas.filter((f: any) => f.block_type === 'accommodation')

      const accommodationIds: number[] = []
      for (const formula of accommodationFormulas) {
        try {
          const meta = JSON.parse(formula.description_html || '{}')
          if (meta.accommodation_id && !accommodationIds.includes(meta.accommodation_id)) {
            accommodationIds.push(meta.accommodation_id)
          }
        } catch { /* not JSON */ }
      }

      const conditionIds = [...new Set(
        accommodationFormulas
          .filter((f: any) => f.condition_id)
          .map((f: any) => f.condition_id as number)
      )]

      const formulaIdsWithCondition = accommodationFormulas
        .filter((f: any) => f.condition_id)
        .map((f: any) => f.id as number)

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

        for (const a of (accomResult.data || [])) accomMap[a.id] = a
        for (const rc of (roomResult.data || [])) {
          if (!roomMap[rc.accommodation_id]) roomMap[rc.accommodation_id] = []
          roomMap[rc.accommodation_id]!.push(rc)
        }
        for (const p of (photoResult.data || [])) {
          if (!accomPhotoMap[p.accommodation_id]) accomPhotoMap[p.accommodation_id] = []
          accomPhotoMap[p.accommodation_id]!.push(p)
        }
      }

      if (conditionIds.length > 0) {
        const [tcResult, condResult, optResult, itemResult] = await Promise.all([
          adminClient
            .from('trip_conditions')
            .select('id, condition_id, selected_option_id, is_active')
            .eq('trip_id', tripId)
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

        condData = {
          tripConditions: tcResult.data || [],
          conditions: condResult.data || [],
          conditionOptions: optResult.data || [],
          itemConditionMap: {},
        }

        for (const item of (itemResult.data || [])) {
          if (item.condition_option_id && !condData.itemConditionMap[item.formula_id]) {
            condData.itemConditionMap[item.formula_id] = item.condition_option_id
          }
        }
      }
    } catch (err) {
      console.error(`[ClientVoyage] Error fetching accommodation data for trip ${tripId}:`, err)
    }

    // 4. Feedback (reactions + pace)
    let feedbackReactions: Record<number, 'love' | 'modify'> = {}
    let feedbackPaces: Record<number, 'slower' | 'normal' | 'faster'> = {}

    if (participant && days.length > 0) {
      try {
        const dayIds = days.map((d: any) => d.id)
        const [reactions, paces] = await Promise.all([
          getDayReactions(dayIds, participant.id),
          getDayPaces(dayIds, participant.id),
        ])
        feedbackReactions = reactions
        feedbackPaces = paces
      } catch (err) {
        console.error(`[ClientVoyage] Error fetching feedback for trip ${tripId}:`, err)
      }
    }

    return {
      tripDays: days,
      tripPhotos: photos,
      accommodationsMap: accomMap,
      roomCategoriesMap: roomMap,
      accommodationPhotosMap: accomPhotoMap,
      conditionData: condData,
      feedbackReactions,
      feedbackPaces,
    }
  }

  // Enrichir chaque proposition avec photos hero, stops, pricing ET programme détaillé
  const proposalsWithDetails = await Promise.all(
    (tripProposals || []).map(async (trip: any) => {
      // Fetch hero photos (light query for card)
      const { data: heroPhotos } = await supabase
        .from('trip_photos' as any)
        .select('url_medium, url_hero, url_large, is_hero')
        .eq('trip_id', trip.id)
        .order('sort_order', { ascending: true })
        .limit(5) as { data: any[] | null }

      const heroPhoto = heroPhotos?.find((p: any) => p.is_hero) ?? heroPhotos?.[0] ?? null

      // Fetch trip_days for stops (étapes — light query)
      const { data: daysForStops } = await supabase
        .from('trip_days' as any)
        .select('day_number, location_from, location_to')
        .eq('trip_id', trip.id)
        .order('day_number', { ascending: true }) as { data: any[] | null }

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

      // Fetch pricing — first from trip_pax_configs, fallback to cotation tarification
      const { data: paxConfigs } = await supabase
        .from('trip_pax_configs' as any)
        .select('label, total_pax, total_price, price_per_person, args_json, valid_until, is_primary, option_type, description, supplement_price, supplement_per_person, sort_order')
        .eq('trip_id', trip.id)
        .order('sort_order', { ascending: true }) as { data: any[] | null }

      let allPricingOptions = paxConfigs ?? []
      let basePricing = allPricingOptions.find((p: any) => p.is_primary !== false && p.option_type !== 'supplement') ?? allPricingOptions[0] ?? null

      // If trip_pax_configs has no price data, try reading from cotation tarification
      const hasPriceFromPaxConfigs = basePricing && (basePricing.total_price ?? 0) > 0
      if (!hasPriceFromPaxConfigs) {
        try {
          const adminCl = createAdminClient()

          // Helper: extract pricing from a cotation's tarification_json
          const extractPricingFromCotation = (cot: any): { totalPrice: number; pricePerPerson: number; totalPax: number } => {
            const tarif = cot?.tarification_json
            const results = cot?.results_json
            if (!tarif?.entries?.length) return { totalPrice: 0, pricePerPerson: 0, totalPax: 0 }
            const mode = tarif.mode
            const entry = tarif.entries[0]
            let totalPrice = 0, pricePerPerson = 0, totalPax = 0
            if (mode === 'per_person') {
              pricePerPerson = entry.price_per_person || 0
              totalPax = entry.total_pax || results?.pax_configs?.[0]?.args?.adult || 2
              totalPrice = pricePerPerson * totalPax
            } else if (mode === 'per_group') {
              totalPrice = entry.total_price || entry.group_price || 0
              totalPax = entry.total_pax || results?.pax_configs?.[0]?.args?.adult || 2
              pricePerPerson = totalPax > 0 ? totalPrice / totalPax : 0
            } else if (mode === 'range_web') {
              totalPrice = entry.selling_price || entry.total_price || 0
              totalPax = entry.pax || entry.total_pax || 2
              pricePerPerson = totalPax > 0 ? totalPrice / totalPax : 0
            } else if (mode === 'service_list' || mode === 'enumeration') {
              totalPrice = tarif.entries.reduce((sum: number, e: any) => sum + (e.selling_price || e.total_price || 0), 0)
              totalPax = entry.total_pax || results?.pax_configs?.[0]?.args?.adult || 2
              pricePerPerson = totalPax > 0 ? totalPrice / totalPax : 0
            }
            return { totalPrice, pricePerPerson, totalPax }
          }

          // 1. First try: published cotations (explicitly selected by agent)
          const { data: publishedCotations } = await adminCl
            .from('trip_cotations')
            .select('id, name, tarification_json, results_json, status, mode, pax_configs_json, is_published_client, client_label, client_description, supplements_json')
            .eq('trip_id', trip.id)
            .eq('is_published_client', true)
            .order('sort_order', { ascending: true })
            .limit(3) as { data: any[] | null }

          if (publishedCotations && publishedCotations.length > 0) {
            // Multi-option mode: build pricing from each published cotation
            const builtOptions: any[] = []
            for (let i = 0; i < publishedCotations.length; i++) {
              const cot = publishedCotations[i]
              const { totalPrice, pricePerPerson, totalPax } = extractPricingFromCotation(cot)
              if (totalPrice <= 0) continue
              const validUntil = cot.tarification_json?.validity_date || null
              const optionPricing = {
                cotation_id: cot.id,
                label: cot.client_label || cot.name || null,
                total_pax: totalPax,
                total_price: totalPrice,
                price_per_person: pricePerPerson,
                args_json: basePricing?.args_json || { adult: totalPax },
                valid_until: validUntil,
                is_primary: i === 0,
                option_type: i === 0 ? null : 'alternative',
                description: cot.client_description || null,
                supplement_price: null,
                supplement_per_person: null,
                sort_order: i,
                supplements: cot.supplements_json || null,
              }
              builtOptions.push(optionPricing)
            }
            if (builtOptions.length > 0) {
              basePricing = builtOptions[0]
              allPricingOptions = builtOptions
            }
          } else {
            // 2. Fallback: use first calculated cotation with tarification (single option, legacy)
            const { data: cotations } = await adminCl
              .from('trip_cotations')
              .select('name, tarification_json, results_json, status, mode, pax_configs_json')
              .eq('trip_id', trip.id)
              .eq('status', 'calculated')
              .order('sort_order', { ascending: true }) as { data: any[] | null }

            if (cotations && cotations.length > 0) {
              const cotationWithTarif = cotations.find((c: any) => c.tarification_json?.entries?.length > 0) ?? cotations[0]
              const { totalPrice, pricePerPerson, totalPax } = extractPricingFromCotation(cotationWithTarif)
              const validUntil = cotationWithTarif?.tarification_json?.validity_date || null

              if (totalPrice > 0) {
                basePricing = {
                  label: cotationWithTarif.name || basePricing?.label || null,
                  total_pax: totalPax,
                  total_price: totalPrice,
                  price_per_person: pricePerPerson,
                  args_json: basePricing?.args_json || { adult: totalPax },
                  valid_until: validUntil,
                  is_primary: true,
                  option_type: null,
                  description: null,
                  supplement_price: null,
                  supplement_per_person: null,
                  sort_order: 0,
                }
                allPricingOptions = [basePricing]
              }
            }
          }
        } catch (err) {
          console.error('[ClientVoyage] Error fetching cotation tarification:', err)
        }
      }

      const pricingOptions = allPricingOptions.filter((p: any) =>
        p.option_type === 'supplement' || p.option_type === 'alternative' || (p !== basePricing && allPricingOptions.length > 1)
      )

      // Fetch full detail data (programme, accommodations, feedback)
      // Only for non-cancelled proposals
      let detailData = null
      if (trip.status !== 'cancelled') {
        detailData = await fetchTripDetailData(trip.id)
      }

      return {
        ...trip,
        heroPhotoUrl: heroPhoto?.url_hero ?? heroPhoto?.url_large ?? heroPhoto?.url_medium ?? null,
        stops,
        pricing: basePricing,
        pricingOptions,
        // Detail data (null for archived proposals)
        detailData,
      }
    })
  )

  // Séparer propositions actives et archivées (cancelled)
  const activeProposals = proposalsWithDetails.filter((t: any) => t.status !== 'cancelled')
  const archivedProposals = proposalsWithDetails.filter((t: any) => t.status === 'cancelled')

  // Déterminer le trip confirmé ou le trip principal
  const confirmedTrip = activeProposals.find((t: any) =>
    t.status === 'option' || t.status === 'confirmed' || t.status === 'operating' || t.status === 'completed'
  )
  const primaryTrip = confirmedTrip ?? activeProposals[0] ?? null

  // Récupérer les vols
  const { data: logistics } = await supabase
    .from('travel_logistics')
    .select('*')
    .eq('dossier_id', id)
    .order('scheduled_datetime', { ascending: true })

  // Récupérer les documents visibles par le client
  let documents: Array<{
    id: string
    name: string
    type: string
    mime_type: string | null
    file_size: number | null
    file_url: string
    created_at: string
    download_url: string | null
    participant_id: string | null
  }> = []
  try {
    const adminClient = createAdminClient()
    const { data: docs } = await adminClient
      .from('documents')
      .select('id, name, type, mime_type, file_size, file_url, created_at, participant_id')
      .eq('dossier_id', id)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false })

    if (docs && docs.length > 0) {
      documents = await Promise.all(
        docs.map(async (doc: any) => {
          let downloadUrl: string | null = null
          if (doc.file_url && doc.file_url.startsWith('/')) {
            // Internal link (e.g. /invoices/{share_token}) — use as-is
            downloadUrl = doc.file_url
          } else if (doc.file_url && !doc.file_url.startsWith('http')) {
            // Storage path within the 'documents' bucket
            const { data: signedData } = await adminClient.storage
              .from('documents')
              .createSignedUrl(doc.file_url, 3600)
            downloadUrl = signedData?.signedUrl || null
          } else if (doc.file_url) {
            // Legacy: file_url is already a full URL (e.g. external link)
            downloadUrl = doc.file_url
          }
          return { ...doc, download_url: downloadUrl }
        })
      )
    }
  } catch (err) {
    console.error('[ClientVoyage] Error fetching documents:', err)
  }

  // Separate passport copies from other documents
  const passportDocs = documents.filter(d => d.type === 'passport_copy')
  const otherDocuments = documents.filter(d => d.type !== 'passport_copy')

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

  // ── Fetch travel info (carnets pratiques) + CMS images ──
  let travelInfoCategories: any[] = []
  let travelInfoChecklist: any[] = []
  let cmsImages: Record<string, string> = {}

  if (destCountryCode && dossierTyped.tenant_id) {
    try {
      const [mergedInfo, checklistData, cmsImageUrls] = await Promise.all([
        getMergedTravelInfo({
          dossierId: id,
          countryCode: destCountryCode,
          tenantId: dossierTyped.tenant_id,
        }),
        getParticipantChecklist(id, participant.id),
        getCmsImageUrls(dossierTyped.tenant_id),
      ])
      travelInfoCategories = mergedInfo || []
      travelInfoChecklist = checklistData || []
      cmsImages = cmsImageUrls || {}
    } catch (err) {
      console.error('[ClientVoyage] Error fetching travel info:', err)
    }
  }

  // Hero photo: CMS admin image (explicit override) → trip photo → null (gradient fallback)
  const heroPhotoUrl = cmsImages['images.hero_destination'] || primaryTrip?.heroPhotoUrl || null

  const advisorName = dossierTyped.advisor
    ? `${dossierTyped.advisor.first_name || ''} ${dossierTyped.advisor.last_name || ''}`.trim()
    : null

  // ── Subtitle for hero ──
  const proposalCount = activeProposals.length
  const heroSubtitle = proposalCount > 1 && !confirmedTrip
    ? `${proposalCount} propositions de voyage personnalisées`
    : dossierTyped.title || 'Votre voyage sur mesure'

  // ── Host info ──
  const tenantCountryNameFr = dossierTyped.tenant?.country_name_fr as string | null
  const countryWithPrep = destCountryCode
    ? countryPreposition(tenantCountryNameFr, destCountryName)
    : null
  // "faire découvrir" utilise le nom avec article directement : "la Thaïlande", "le Vietnam"
  const countryWithArticle = tenantCountryNameFr || destCountryName

  const hostTitle = countryWithPrep
    ? `Votre hôte ${countryWithPrep}`
    : 'Votre hôte local'

  const hostMessage = advisorName
    ? `"Bienvenue ${participant.first_name} ! J'ai hâte de vous faire découvrir ${countryWithArticle}. N'hésitez pas à me contacter pour toute question et personnaliser votre voyage."`
    : null

  // ── Proposal mini-cards for inline display in Salon de Thé ──
  // When a trip is selected, only show that one; otherwise show up to 2 active proposals
  const miniCardSource = confirmedTrip ? [confirmedTrip] : activeProposals.slice(0, 2)
  const proposalMiniCards: ProposalMiniCard[] = miniCardSource.map((trip: any) => ({
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
    { value: 'proposals', label: 'Propositions', badge: !confirmedTrip && proposalCount > 1 ? proposalCount : undefined },
    { value: 'flights', label: 'Vols' },
    { value: 'travelers', label: 'Voyageurs' },
    { value: 'messages', label: 'Salon de Th\u00E9' },
    { value: 'documents', label: 'Documents', badge: documents.length > 0 ? documents.length : undefined },
  ]

  return (
    <div className="space-y-0">
      {/* Hide "Vos propositions" from right sidebar on this page (already shown in main content) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .right-sidebar-proposals { display: none !important; }
        body[data-active-tab="messages"] .trip-summary-banner-wrapper { display: none !important; }
      ` }} />

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
        <LocalInfoBar
          countryCode={destCountryCode}
          officeCity={dossierTyped.tenant?.office_city || null}
          officeLat={dossierTyped.tenant?.office_lat != null ? Number(dossierTyped.tenant.office_lat) : null}
          officeLng={dossierTyped.tenant?.office_lng != null ? Number(dossierTyped.tenant.office_lng) : null}
        />
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
            {/* Bandeau dates + composition — masqué sur l'onglet Salon de Thé */}
            <div className="trip-summary-banner-wrapper mb-6">
              <TripSummaryBanner
                dossierId={id}
                participantId={participant.id}
                participantName={`${participant.first_name} ${participant.last_name}`.trim()}
                isLead={!!dossierParticipant?.is_lead}
                departureDateFrom={dossierTyped.departure_date_from || null}
                departureDateTo={dossierTyped.departure_date_to || null}
                durationDays={dossierTyped.duration_days || null}
                paxAdults={dossierTyped.pax_adults || 0}
                paxTeens={dossierTyped.pax_teens || 0}
                paxChildren={dossierTyped.pax_children || 0}
                paxInfants={dossierTyped.pax_infants || 0}
                continentTheme={continentTheme}
              />
            </div>

            {/* Onglet Propositions (avec sous-onglets intégrés par proposition) */}
            <TabsContent value="proposals" className="mt-0">
              <ProposalsSection
                proposals={activeProposals}
                archivedProposals={archivedProposals}
                confirmedTripId={confirmedTrip?.id ?? null}
                continentTheme={continentTheme}
                advisorName={advisorName}
                dossierId={id}
                adultsCount={dossierTyped.adults_count || 0}
                childrenCount={dossierTyped.children_count || 0}
                departureDateFrom={dossierTyped.departure_date_from || null}
                departureDateTo={dossierTyped.departure_date_to || null}
                isLead={!!dossierParticipant?.is_lead}
                participantId={participant.id}
                participantName={`${participant.first_name} ${participant.last_name}`.trim()}
                dossierStatus={dossierTyped.status || 'quote_sent'}
                selectedCotationId={dossierRaw?.selected_cotation_id ?? null}
                pricingData={pricingData}
                payments={payments}
                feedbackBaseContext={participant && dossierTyped.advisor ? {
                  dossierId: id,
                  participantId: participant.id,
                  participantEmail: participant.email,
                  participantName: `${participant.first_name} ${participant.last_name}`.trim(),
                  advisorEmail: (dossierTyped.advisor as any)?.email || '',
                  advisorName: advisorName || '',
                } : undefined}
              />
            </TabsContent>

            {/* Onglet Carnets pratiques */}
            <TabsContent value="infos" className="mt-0">
              <CarnetsPratiques
                dossierId={id}
                participantId={participant.id}
                continentTheme={continentTheme}
                countryName={destCountryName}
                initialCategories={travelInfoCategories}
                initialChecklist={travelInfoChecklist}
              />
            </TabsContent>

            {/* Onglet Vols */}
            <TabsContent value="flights" className="mt-0">
              <FlightsTimeline
                logistics={logistics || []}
                continentTheme={continentTheme}
                dossierId={id}
                participantId={participant.id}
                participantName={`${participant.first_name} ${participant.last_name}`.trim()}
                isLead={!!dossierParticipant?.is_lead}
                departureDateFrom={dossierTyped.departure_date_from || null}
                departureDateTo={dossierTyped.departure_date_to || null}
                destinationCountryCode={destCountryCode}
              />
            </TabsContent>

            {/* Onglet Voyageurs */}
            <TabsContent value="travelers" className="mt-0">
              <TravelersSection
                participants={dossierTyped.participants as any[]}
                continentTheme={continentTheme}
                dossierId={id}
                currentParticipantId={participant.id}
                currentParticipantName={`${participant.first_name} ${participant.last_name}`.trim()}
                isLead={!!dossierParticipant?.is_lead}
                departureDateFrom={dossierTyped.departure_date_from || null}
                departureDateTo={dossierTyped.departure_date_to || null}
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
                officeCity={dossierTyped.tenant?.office_city || null}
                officeLat={dossierTyped.tenant?.office_lat != null ? Number(dossierTyped.tenant.office_lat) : null}
                officeLng={dossierTyped.tenant?.office_lng != null ? Number(dossierTyped.tenant.office_lng) : null}
                aquarelleUrl={cmsImages['images.salon_de_the_aquarelle'] || null}
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

                {/* Proposal links below messaging — clean, inline on desktop */}
                {proposalMiniCards.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {proposalMiniCards.map((proposal, idx) => (
                      <a
                        key={`${proposal.dossierId}-${idx}`}
                        href={`/client/voyages/${proposal.dossierId}?tab=program`}
                        className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl text-sm transition-colors hover:opacity-90"
                        style={{ backgroundColor: `${continentTheme.primary}08`, color: continentTheme.primary }}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <MapPin size={15} weight="duotone" className="shrink-0" />
                          <span className="font-medium truncate">{proposal.tripName}</span>
                          {proposal.durationDays && (
                            <span className="flex items-center gap-1 text-xs opacity-60 shrink-0">
                              <CalendarDots size={12} weight="duotone" />
                              {proposal.durationDays}j
                            </span>
                          )}
                        </span>
                        <ArrowRight size={14} weight="bold" className="shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </SalonDeTheWrapper>
            </TabsContent>

            {/* Onglet Documents */}
            <TabsContent value="documents" className="mt-0">
              <div className="space-y-6">
                {/* Passport upload section */}
                <PassportUploadSection
                  participants={(dossierTyped.participants as any[]).map((dp: any) => ({
                    is_lead: dp.is_lead,
                    participant: {
                      id: dp.participant?.id || '',
                      first_name: dp.participant?.first_name || '',
                      last_name: dp.participant?.last_name || '',
                    },
                  }))}
                  dossierId={id}
                  currentParticipantId={participant.id}
                  currentParticipantName={`${participant.first_name} ${participant.last_name}`.trim()}
                  isLead={!!dossierParticipant?.is_lead}
                  existingPassportDocs={passportDocs.map(d => ({
                    id: d.id,
                    participant_id: d.participant_id,
                    created_at: d.created_at,
                    download_url: d.download_url,
                  }))}
                  continentTheme={continentTheme}
                />

                {/* Other documents */}
                {otherDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {otherDocuments.map((doc) => {
                      const config = DOC_TYPE_CONFIG[doc.type] ?? DEFAULT_DOC_CONFIG
                      const Icon = config.icon
                      const sizeStr = doc.file_size
                        ? doc.file_size > 1024 * 1024
                          ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} Mo`
                          : `${Math.round(doc.file_size / 1024)} Ko`
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
                                {doc.name}
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
                              target={doc.file_url?.startsWith('/') ? '_self' : '_blank'}
                              rel="noopener noreferrer"
                              className="flex-shrink-0 ml-3"
                            >
                              <Button variant="outline" size="sm" className="gap-1.5">
                                {doc.file_url?.startsWith('/') ? (
                                  <>
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Voir</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Télécharger</span>
                                  </>
                                )}
                              </Button>
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Vos documents seront disponibles ici une fois votre voyage confirmé.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </VoyageTabs>
        </div>
      </div>
    </div>
  )
}
