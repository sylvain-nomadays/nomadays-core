'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  return userData
}

// ============================================================
// TYPES
// ============================================================

export interface TripNote {
  id: string
  trip_id: number
  tenant_id: string
  content: string
  is_pinned: boolean
  mentions: string[]
  created_at: string
  updated_at: string
  author: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    role: string
  }
}

export interface CreateTripNoteInput {
  tripId: number
  tenantId: string
  content: string
  mentions?: string[]
}

// ============================================================
// CRUD
// ============================================================

export async function createTripNote(input: CreateTripNoteInput): Promise<TripNote> {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  const { data, error } = await supabase
    .from('trip_notes')
    .insert({
      trip_id: input.tripId,
      tenant_id: input.tenantId,
      author_id: currentUser.id,
      content: input.content,
      mentions: input.mentions || [],
    })
    .select(`
      *,
      author:users!trip_notes_author_id_fkey(id, first_name, last_name, avatar_url, role)
    `)
    .single()

  if (error) {
    console.error('Error creating trip note:', error)
    throw new Error('Failed to create trip note')
  }

  revalidatePath(`/admin/circuits/${input.tripId}`)
  return data as TripNote
}

export async function getTripNotes(tripId: number, tenantId: string): Promise<TripNote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trip_notes')
    .select(`
      *,
      author:users!trip_notes_author_id_fkey(id, first_name, last_name, avatar_url, role)
    `)
    .eq('trip_id', tripId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching trip notes:', error)
    return []
  }

  return (data || []) as TripNote[]
}

export async function deleteTripNote(noteId: string, tripId: number): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('trip_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting trip note:', error)
    throw new Error('Failed to delete trip note')
  }

  revalidatePath(`/admin/circuits/${tripId}`)
}

export async function toggleTripNotePin(noteId: string, isPinned: boolean, tripId: number): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('trip_notes')
    .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
    .eq('id', noteId)

  if (error) {
    console.error('Error toggling trip note pin:', error)
    throw new Error('Failed to toggle pin')
  }

  revalidatePath(`/admin/circuits/${tripId}`)
}
