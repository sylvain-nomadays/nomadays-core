'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { TransportType } from '@/lib/supabase/database.types'

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

// ============================================================
// TRAVEL LOGISTICS (Arrivals / Departures)
// ============================================================

export interface CreateTravelLogisticInput {
  dossierId: string
  type: 'arrival' | 'departure'
  transportType: TransportType
  transportInfo?: string
  scheduledDatetime?: string
  location?: string
  allParticipants?: boolean
  participantIds?: string[]
  notes?: string
}

export async function createTravelLogistic(input: CreateTravelLogisticInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('travel_logistics')
    .insert({
      dossier_id: input.dossierId,
      type: input.type,
      transport_type: input.transportType,
      transport_info: input.transportInfo || null,
      scheduled_datetime: input.scheduledDatetime || null,
      location: input.location || null,
      all_participants: input.allParticipants !== false,
      participant_ids: input.allParticipants === false ? input.participantIds : null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating travel logistic:', error)
    throw new Error('Failed to create travel logistic')
  }

  // Update dossier last_activity_at
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  revalidatePath('/admin/calendar')
  return data
}

export async function updateTravelLogistic(
  id: string,
  dossierId: string,
  updates: Partial<Omit<CreateTravelLogisticInput, 'dossierId'>>
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.type) updateData.type = updates.type
  if (updates.transportType) updateData.transport_type = updates.transportType
  if (updates.transportInfo !== undefined) updateData.transport_info = updates.transportInfo || null
  if (updates.scheduledDatetime !== undefined) updateData.scheduled_datetime = updates.scheduledDatetime || null
  if (updates.location !== undefined) updateData.location = updates.location || null
  if (updates.allParticipants !== undefined) updateData.all_participants = updates.allParticipants
  if (updates.participantIds !== undefined) updateData.participant_ids = updates.participantIds
  if (updates.notes !== undefined) updateData.notes = updates.notes || null

  const { data, error } = await supabase
    .from('travel_logistics')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating travel logistic:', error)
    throw new Error('Failed to update travel logistic')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  revalidatePath('/admin/calendar')
  return data
}

export async function deleteTravelLogistic(id: string, dossierId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('travel_logistics')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting travel logistic:', error)
    throw new Error('Failed to delete travel logistic')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  revalidatePath('/admin/calendar')
}

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

  const arrivals = data?.filter(item => item.type === 'arrival') || []
  const departures = data?.filter(item => item.type === 'departure') || []

  return { arrivals, departures }
}
