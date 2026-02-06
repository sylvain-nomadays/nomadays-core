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

// ============================================================
// TYPES
// ============================================================

export type NotificationType =
  | 'new_request'
  | 'follow_up_reminder'
  | 'payment_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'trip_starting_soon'
  | 'document_uploaded'
  | 'mention'
  | 'assignment'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  dossier_id: string | null
  dossier_reference: string | null
  participant_name: string | null
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ============================================================
// GET NOTIFICATIONS
// ============================================================

export async function getUserNotifications(options?: {
  limit?: number
  unreadOnly?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { notifications: [], unreadCount: 0 }
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (options?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], unreadCount: 0 }
  }

  // Count unread
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return {
    notifications: (data || []) as Notification[],
    unreadCount: count || 0
  }
}

// ============================================================
// MARK AS READ
// ============================================================

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    throw new Error('Failed to mark notification as read')
  }

  revalidatePath('/admin')
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw new Error('Failed to mark all notifications as read')
  }

  revalidatePath('/admin')
}

// ============================================================
// CREATE NOTIFICATION (pour usage manuel/test)
// ============================================================

export async function createNotification(input: {
  userId: string
  type: NotificationType
  title: string
  message?: string
  dossierId?: string
  dossierReference?: string
  participantName?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message || null,
      dossier_id: input.dossierId || null,
      dossier_reference: input.dossierReference || null,
      participant_name: input.participantName || null,
      metadata: input.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    throw new Error('Failed to create notification')
  }

  return data
}

// ============================================================
// DELETE OLD NOTIFICATIONS (cleanup)
// ============================================================

export async function deleteOldNotifications(daysOld: number = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('is_read', true)
    .lt('created_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error deleting old notifications:', error)
    throw new Error('Failed to delete old notifications')
  }
}

// ============================================================
// RUN FOLLOW-UP CHECK (à appeler via CRON)
// ============================================================

export async function runFollowUpCheck() {
  const supabase = await createClient()

  // Appeler la fonction PostgreSQL
  const { data, error } = await supabase.rpc('check_follow_up_reminders')

  if (error) {
    console.error('Error running follow-up check:', error)
    throw new Error('Failed to run follow-up check')
  }

  return { notificationsCreated: data }
}
