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

  // Get user details - users.id IS auth.users.id (same UUID)
  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('id', user.id)
    .single()

  return userData
}

// ============================================================
// DOSSIER NOTES
// ============================================================

export interface CreateNoteInput {
  dossierId: string
  content: string
  isInternalNomadays?: boolean
  isPersonal?: boolean
  mentions?: string[]
}

export async function createDossierNote(input: CreateNoteInput) {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  const { data, error } = await supabase
    .from('dossier_notes')
    .insert({
      dossier_id: input.dossierId,
      author_id: currentUser.id,
      content: input.content,
      is_internal_nomadays: input.isInternalNomadays || false,
      is_personal: input.isPersonal || false,
      mentions: input.mentions || [],
    })
    .select(`
      *,
      author:users!dossier_notes_author_id_fkey(id, first_name, last_name, avatar_url, role)
    `)
    .single()

  if (error) {
    console.error('Error creating note:', error)
    throw new Error('Failed to create note')
  }

  // Update dossier last_activity_at
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  // TODO: Send notification if mentions contain @manager
  if (input.mentions && input.mentions.length > 0) {
    // Handle notifications
    console.log('Should notify:', input.mentions)
  }

  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  return data
}

export async function getDossierNotes(dossierId: string) {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  let query = supabase
    .from('dossier_notes')
    .select(`
      *,
      author:users!dossier_notes_author_id_fkey(id, first_name, last_name, avatar_url, role)
    `)
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching notes:', error)
    return { teamNotes: [], personalNotes: [] }
  }

  // Split into team notes and personal notes
  const teamNotes = data?.filter(n => !n.is_personal) || []
  const personalNotes = data?.filter(n =>
    n.is_personal && n.author_id === currentUser?.id
  ) || []

  return { teamNotes, personalNotes }
}

export async function updateDossierNote(
  noteId: string,
  updates: { content?: string; is_pinned?: boolean }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dossier_notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating note:', error)
    throw new Error('Failed to update note')
  }

  revalidatePath(`/admin/dossiers/${data.dossier_id}`)
  return data
}

export async function deleteDossierNote(noteId: string, dossierId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dossier_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting note:', error)
    throw new Error('Failed to delete note')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
}

export async function toggleNotePin(noteId: string, isPinned: boolean) {
  return updateDossierNote(noteId, { is_pinned: isPinned })
}
