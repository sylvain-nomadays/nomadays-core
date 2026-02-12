'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create client for server actions
async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component
          }
        },
      },
    }
  )
}

export interface TravelLogisticWithDossier {
  id: string
  dossier_id: string
  type: 'arrival' | 'departure'
  transport_type: string
  transport_info: string | null
  scheduled_datetime: string
  location: string | null
  all_participants: boolean
  dossier: {
    id: string
    reference: string
    title: string
    status: string
    pax_adults: number
    pax_children: number
  }
}

const EXCLUDED_STATUSES = ['cancelled', 'archived', 'lost', 'ignored']

export async function getArrivalsAndDepartures(
  dateFrom: string,
  dateTo: string
): Promise<TravelLogisticWithDossier[]> {
  const supabase = await createClient()

  // Step 1: Fetch travel logistics in the date range
  // Using separate queries to avoid PostgREST join issues with embedded relations
  const { data: logisticsData, error: logError } = await supabase
    .from('travel_logistics')
    .select('*')
    .gte('scheduled_datetime', `${dateFrom}T00:00:00`)
    .lte('scheduled_datetime', `${dateTo}T23:59:59`)
    .order('scheduled_datetime', { ascending: true })

  if (logError) {
    console.error('[Calendar] Error fetching logistics:', logError)
    return []
  }

  if (!logisticsData || logisticsData.length === 0) {
    console.log('[Calendar] No logistics found for range:', dateFrom, 'to', dateTo)
    return []
  }

  console.log('[Calendar] Found', logisticsData.length, 'logistics for range', dateFrom, 'to', dateTo)

  // Step 2: Fetch corresponding dossiers
  const dossierIds = [...new Set(logisticsData.map(l => l.dossier_id))]
  const { data: dossiersData, error: dosError } = await supabase
    .from('dossiers')
    .select('id, reference, title, status, pax_adults, pax_children')
    .in('id', dossierIds)

  if (dosError) {
    console.error('[Calendar] Error fetching dossiers:', dosError)
    return []
  }

  // Step 3: Join in JS and filter by dossier status
  const dossierMap = new Map(
    (dossiersData || []).map(d => [d.id, d])
  )

  return logisticsData
    .map(item => {
      const dossier = dossierMap.get(item.dossier_id)
      if (!dossier) return null
      if (EXCLUDED_STATUSES.includes(dossier.status)) return null
      return {
        id: item.id,
        dossier_id: item.dossier_id,
        type: item.type as 'arrival' | 'departure',
        transport_type: item.transport_type,
        transport_info: item.transport_info,
        scheduled_datetime: item.scheduled_datetime,
        location: item.location,
        all_participants: item.all_participants,
        dossier: {
          id: dossier.id,
          reference: dossier.reference || '',
          title: dossier.title || '',
          status: dossier.status || '',
          pax_adults: dossier.pax_adults || 0,
          pax_children: dossier.pax_children || 0,
        }
      }
    })
    .filter((item): item is TravelLogisticWithDossier => item !== null)
}

// Get arrivals/departures for a specific dossier
export async function getDossierTravelLogistics(dossierId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('travel_logistics')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('scheduled_datetime', { ascending: true })

  if (error) {
    console.error('Error fetching travel logistics:', error)
    return { arrivals: [], departures: [] }
  }

  const arrivals = (data || []).filter(item => item.type === 'arrival')
  const departures = (data || []).filter(item => item.type === 'departure')

  return { arrivals, departures }
}
