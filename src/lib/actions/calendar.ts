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

export async function getArrivalsAndDepartures(
  dateFrom: string,
  dateTo: string
): Promise<TravelLogisticWithDossier[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('travel_logistics')
    .select(`
      id,
      dossier_id,
      type,
      transport_type,
      transport_info,
      scheduled_datetime,
      location,
      all_participants,
      dossier:dossiers!travel_logistics_dossier_id_fkey(
        id,
        reference,
        title,
        status,
        pax_adults,
        pax_children
      )
    `)
    .gte('scheduled_datetime', `${dateFrom}T00:00:00`)
    .lte('scheduled_datetime', `${dateTo}T23:59:59`)
    .not('dossier.status', 'in', '(cancelled,archived,lost,ignored)')
    .order('scheduled_datetime', { ascending: true })

  if (error) {
    console.error('Error fetching arrivals/departures:', error)
    // Return empty array if table doesn't exist yet
    return []
  }

  // Filter out any entries where dossier is null (due to RLS or deleted)
  // and transform the data to match our interface
  return (data || [])
    .filter(item => item.dossier !== null && item.dossier !== undefined)
    .map(item => {
      const dossier = Array.isArray(item.dossier) ? item.dossier[0] : item.dossier
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
          id: dossier?.id || '',
          reference: dossier?.reference || '',
          title: dossier?.title || '',
          status: dossier?.status || '',
          pax_adults: dossier?.pax_adults || 0,
          pax_children: dossier?.pax_children || 0,
        }
      }
    })
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
