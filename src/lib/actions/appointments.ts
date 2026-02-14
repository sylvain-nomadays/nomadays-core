'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/resend'
import { generateEmailHtml } from '@/lib/email/templates'

// ============================================================
// SUPABASE CLIENTS
// ============================================================

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

function createWriteClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ============================================================
// TYPES
// ============================================================

export interface TimeSlot {
  start: string   // "09:00"
  end: string     // "10:00"
  available: boolean
}

export interface AvailableDate {
  date: string    // "2026-02-16"
  dayOfWeek: string  // "Lun", "Mar", etc.
  dayNumber: number  // 16
  available: boolean
}

export interface AdvisorSchedule {
  timezone: string
  slotDurationMinutes: number
  days: {
    day: string       // "monday", "tuesday", etc.
    label: string     // "Lundi", "Mardi", etc.
    enabled: boolean
    start: string | null  // "09:00"
    end: string | null    // "18:00"
  }[]
}

export interface BlockedDateRange {
  id: string
  dateFrom: string
  dateTo: string
  reason: string | null
}

export interface AppointmentInfo {
  id: string
  appointmentDate: string
  startTime: string
  endTime: string
  timezone: string
  participantName: string | null
  participantEmail: string | null
  advisorName: string | null
  dossierId: string
  note: string | null
  status: string
  createdAt: string
}

// ============================================================
// DAY HELPERS
// ============================================================

const DAY_COLUMNS: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

const FR_DAY_SHORT: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
}

const FR_DAY_LONG: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

/** Parse "HH:MM" into minutes since midnight */
function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

/** Format minutes since midnight to "HH:MM" */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ============================================================
// CLIENT ACTIONS — Fetch available dates & slots, book, cancel
// ============================================================

/**
 * Get available dates for the next N days for a given advisor
 */
export async function getAvailableDates(
  advisorId: string,
  daysAhead: number = 14
): Promise<{ dates: AvailableDate[]; timezone: string; error?: string }> {
  try {
    const supabase = createWriteClient()

    // Fetch advisor schedule
    const { data: availability } = await supabase
      .from('advisor_availability')
      .select('*')
      .eq('user_id', advisorId)
      .single()

    if (!availability) {
      return { dates: [], timezone: 'Europe/Paris', error: 'Votre conseiller n\'a pas encore configuré ses disponibilités.' }
    }

    // Fetch blocked dates in range
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + daysAhead)

    const todayStr = today.toISOString().split('T')[0]!
    const endStr = endDate.toISOString().split('T')[0]!

    const { data: blockedDates } = await supabase
      .from('advisor_blocked_dates')
      .select('date_from, date_to')
      .eq('user_id', advisorId)
      .lte('date_from', endStr)
      .gte('date_to', todayStr)

    const blocked = blockedDates || []

    // Generate date list
    const dates: AvailableDate[] = []

    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]! ?? ''
      const dow = d.getDay() // 0=Sunday
      const dayCol = DAY_COLUMNS[dow] ?? 'monday'

      // Check if this day has working hours
      const startCol = `${dayCol}_start` as keyof typeof availability
      const endCol = `${dayCol}_end` as keyof typeof availability
      const hasHours = availability[startCol] !== null && availability[endCol] !== null

      // Check if date is blocked
      const isBlocked = blocked.some(
        (b: any) => dateStr >= b.date_from && dateStr <= b.date_to
      )

      dates.push({
        date: dateStr,
        dayOfWeek: FR_DAY_SHORT[dow] ?? '',
        dayNumber: d.getDate(),
        available: hasHours && !isBlocked,
      })
    }

    return { dates, timezone: availability.timezone }
  } catch (err) {
    console.error('[getAvailableDates] Error:', err)
    return { dates: [], timezone: 'Europe/Paris', error: 'Erreur lors du chargement des dates.' }
  }
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableSlots(
  advisorId: string,
  date: string  // "2026-02-16"
): Promise<{ slots: TimeSlot[]; timezone: string; error?: string }> {
  try {
    const supabase = createWriteClient()

    // Fetch advisor schedule
    const { data: availability } = await supabase
      .from('advisor_availability')
      .select('*')
      .eq('user_id', advisorId)
      .single()

    if (!availability) {
      return { slots: [], timezone: 'Europe/Paris', error: 'Disponibilités non configurées.' }
    }

    // Determine day of week
    const d = new Date(date + 'T00:00:00')
    const dow = d.getDay()
    const dayCol = DAY_COLUMNS[dow] ?? 'monday'

    const startCol = `${dayCol}_start` as keyof typeof availability
    const endCol = `${dayCol}_end` as keyof typeof availability
    const dayStart = availability[startCol] as string | null
    const dayEnd = availability[endCol] as string | null

    if (!dayStart || !dayEnd) {
      return { slots: [], timezone: availability.timezone, error: 'Jour non travaillé.' }
    }

    // Check if date is blocked
    const { data: blockedDates } = await supabase
      .from('advisor_blocked_dates')
      .select('id')
      .eq('user_id', advisorId)
      .lte('date_from', date)
      .gte('date_to', date)
      .limit(1)

    if (blockedDates && blockedDates.length > 0) {
      return { slots: [], timezone: availability.timezone, error: 'Jour indisponible.' }
    }

    // Generate 1-hour slots
    const slotDuration = availability.slot_duration_minutes || 60
    const startMinutes = timeToMinutes(dayStart)
    const endMinutes = timeToMinutes(dayEnd)
    const allSlots: TimeSlot[] = []

    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      allSlots.push({
        start: minutesToTime(m),
        end: minutesToTime(m + slotDuration),
        available: true,
      })
    }

    // Fetch existing appointments for this date (non-cancelled)
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('advisor_id', advisorId)
      .eq('appointment_date', date)
      .not('status', 'in', '("cancelled_by_client","cancelled_by_advisor")')

    const booked = existingAppointments || []

    // Mark booked slots as unavailable
    for (const slot of allSlots) {
      const slotStart = timeToMinutes(slot.start)
      const slotEnd = timeToMinutes(slot.end)

      for (const appt of booked) {
        const apptStart = timeToMinutes(appt.start_time as string)
        const apptEnd = timeToMinutes(appt.end_time as string)

        // Overlap check
        if (slotStart < apptEnd && slotEnd > apptStart) {
          slot.available = false
          break
        }
      }
    }

    // Remove past slots if date is today
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]!
    if (date === todayStr) {
      // Calculate current time in advisor timezone (approximate using UTC offset)
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      for (const slot of allSlots) {
        if (timeToMinutes(slot.start) <= currentMinutes) {
          slot.available = false
        }
      }
    }

    return { slots: allSlots, timezone: availability.timezone }
  } catch (err) {
    console.error('[getAvailableSlots] Error:', err)
    return { slots: [], timezone: 'Europe/Paris', error: 'Erreur lors du chargement des créneaux.' }
  }
}

/**
 * Book an appointment
 */
export async function bookAppointment(input: {
  advisorId: string
  dossierId: string
  participantId: string
  participantName: string
  participantEmail: string
  date: string
  startTime: string
  note?: string
}): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
  try {
    const supabase = createWriteClient()

    // Fetch advisor info
    const { data: advisor } = await supabase
      .from('users')
      .select('id, full_name, email, tenant_id')
      .eq('id', input.advisorId)
      .single()

    if (!advisor) {
      return { success: false, error: 'Conseiller introuvable.' }
    }

    // Fetch availability for timezone + slot duration
    const { data: availability } = await supabase
      .from('advisor_availability')
      .select('timezone, slot_duration_minutes')
      .eq('user_id', input.advisorId)
      .single()

    if (!availability) {
      return { success: false, error: 'Disponibilités non configurées.' }
    }

    const slotDuration = availability.slot_duration_minutes || 60
    const startMinutes = timeToMinutes(input.startTime)
    const endTime = minutesToTime(startMinutes + slotDuration)

    // Double-check: is the slot still available? (anti-conflict)
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('advisor_id', input.advisorId)
      .eq('appointment_date', input.date)
      .eq('start_time', input.startTime)
      .not('status', 'in', '("cancelled_by_client","cancelled_by_advisor")')
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' }
    }

    // Create the appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        tenant_id: advisor.tenant_id,
        dossier_id: input.dossierId,
        advisor_id: input.advisorId,
        participant_id: input.participantId,
        appointment_date: input.date,
        start_time: input.startTime,
        end_time: endTime,
        timezone: availability.timezone,
        participant_name: input.participantName,
        participant_email: input.participantEmail,
        advisor_name: advisor.full_name,
        advisor_email: advisor.email,
        note: input.note || null,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[bookAppointment] Insert error:', insertError)
      return { success: false, error: 'Erreur lors de la réservation.' }
    }

    // Format date for email
    const dateObj = new Date(input.date + 'T00:00:00')
    const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Send confirmation email to client
    try {
      const clientBody = `
<h2>Votre rendez-vous est confirmé !</h2>
<p>Bonjour ${input.participantName},</p>
<p>Votre rendez-vous téléphonique avec <strong>${advisor.full_name}</strong> est confirmé :</p>
<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">📅 Date</td>
    <td style="padding: 8px 16px;">${dateFormatted}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">🕐 Heure</td>
    <td style="padding: 8px 16px;">${input.startTime} — ${endTime} (${availability.timezone})</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">⏱ Durée</td>
    <td style="padding: 8px 16px;">1 heure</td>
  </tr>
</table>
${input.note ? `<p><strong>Votre message :</strong> ${input.note}</p>` : ''}
<p>Votre conseiller vous appellera à l'heure convenue. Si vous devez annuler, vous pouvez le faire depuis votre espace client.</p>
`
      await sendEmail({
        to: input.participantEmail,
        toName: input.participantName,
        subject: `Votre rendez-vous avec ${advisor.full_name} est confirmé`,
        html: generateEmailHtml(clientBody, advisor.full_name),
      })
    } catch (emailErr) {
      console.error('[bookAppointment] Client email error:', emailErr)
    }

    // Send confirmation email to advisor
    try {
      const advisorBody = `
<h2>Nouveau rendez-vous</h2>
<p>Bonjour ${advisor.full_name},</p>
<p>Un nouveau rendez-vous téléphonique a été réservé :</p>
<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">👤 Client</td>
    <td style="padding: 8px 16px;">${input.participantName}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">📅 Date</td>
    <td style="padding: 8px 16px;">${dateFormatted}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">🕐 Heure</td>
    <td style="padding: 8px 16px;">${input.startTime} — ${endTime}</td>
  </tr>
</table>
${input.note ? `<p><strong>Message du client :</strong> ${input.note}</p>` : ''}
<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nomadays.com'}/admin/dossiers/${input.dossierId}" style="color: #0FB6BC;">Voir le dossier</a></p>
`
      await sendEmail({
        to: advisor.email,
        toName: advisor.full_name,
        subject: `Nouveau rendez-vous : ${input.participantName} — ${dateFormatted} à ${input.startTime}`,
        html: generateEmailHtml(advisorBody),
      })
    } catch (emailErr) {
      console.error('[bookAppointment] Advisor email error:', emailErr)
    }

    // Update confirmation_sent_at
    await supabase
      .from('appointments')
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq('id', appointment.id)

    revalidatePath(`/client/voyages/${input.dossierId}`)

    return { success: true, appointmentId: appointment.id }
  } catch (err) {
    console.error('[bookAppointment] Error:', err)
    return { success: false, error: 'Erreur inattendue lors de la réservation.' }
  }
}

/**
 * Cancel an appointment (client-side)
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createWriteClient()

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return { success: false, error: 'Rendez-vous introuvable.' }
    }

    if (appointment.status !== 'confirmed') {
      return { success: false, error: 'Ce rendez-vous ne peut pas être annulé.' }
    }

    // Update status
    await supabase
      .from('appointments')
      .update({
        status: 'cancelled_by_client',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', appointmentId)

    // Send cancellation emails
    const dateObj = new Date(appointment.appointment_date + 'T00:00:00')
    const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Email to advisor
    if (appointment.advisor_email) {
      try {
        const body = `
<h2>Rendez-vous annulé</h2>
<p>Le rendez-vous avec <strong>${appointment.participant_name}</strong> du ${dateFormatted} à ${appointment.start_time} a été annulé par le client.</p>
${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
`
        await sendEmail({
          to: appointment.advisor_email,
          subject: `Rendez-vous annulé : ${appointment.participant_name} — ${dateFormatted}`,
          html: generateEmailHtml(body),
        })
      } catch (e) {
        console.error('[cancelAppointment] Email error:', e)
      }
    }

    revalidatePath(`/client/voyages/${appointment.dossier_id}`)

    return { success: true }
  } catch (err) {
    console.error('[cancelAppointment] Error:', err)
    return { success: false, error: 'Erreur lors de l\'annulation.' }
  }
}

// ============================================================
// ADMIN ACTIONS — Manage availability, blocked dates, appointments
// ============================================================

/**
 * Get advisor availability schedule
 */
export async function getAdvisorAvailability(
  userId: string
): Promise<{ schedule: AdvisorSchedule | null; error?: string }> {
  try {
    const supabase = createWriteClient()

    const { data } = await supabase
      .from('advisor_availability')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!data) {
      // Return default empty schedule
      const defaultDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      return {
        schedule: {
          timezone: 'Europe/Paris',
          slotDurationMinutes: 60,
          days: defaultDays.map(day => ({
            day,
            label: FR_DAY_LONG[day] ?? day,
            enabled: false,
            start: null,
            end: null,
          })),
        },
      }
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return {
      schedule: {
        timezone: data.timezone,
        slotDurationMinutes: data.slot_duration_minutes,
        days: days.map(day => ({
          day,
          label: FR_DAY_LONG[day] ?? day,
          enabled: (data as any)[`${day}_start`] !== null,
          start: (data as any)[`${day}_start`] || null,
          end: (data as any)[`${day}_end`] || null,
        })),
      },
    }
  } catch (err) {
    console.error('[getAdvisorAvailability] Error:', err)
    return { schedule: null, error: 'Erreur lors du chargement.' }
  }
}

/**
 * Save advisor availability schedule
 */
export async function saveAdvisorAvailability(
  userId: string,
  tenantId: string,
  schedule: {
    timezone: string
    days: { day: string; enabled: boolean; start: string | null; end: string | null }[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createWriteClient()

    // Build the row data
    const row: Record<string, any> = {
      user_id: userId,
      tenant_id: tenantId,
      timezone: schedule.timezone,
      slot_duration_minutes: 60,
    }

    for (const d of schedule.days) {
      row[`${d.day}_start`] = d.enabled ? d.start : null
      row[`${d.day}_end`] = d.enabled ? d.end : null
    }

    // Upsert (insert or update if user_id already exists)
    const { error } = await supabase
      .from('advisor_availability')
      .upsert(row, { onConflict: 'user_id' })

    if (error) {
      console.error('[saveAdvisorAvailability] Error:', error)
      return { success: false, error: 'Erreur lors de la sauvegarde.' }
    }

    revalidatePath('/admin/settings/availability')
    return { success: true }
  } catch (err) {
    console.error('[saveAdvisorAvailability] Error:', err)
    return { success: false, error: 'Erreur inattendue.' }
  }
}

/**
 * Get blocked date ranges for an advisor
 */
export async function getBlockedDates(
  userId: string
): Promise<{ blockedDates: BlockedDateRange[]; error?: string }> {
  try {
    const supabase = createWriteClient()

    const { data } = await supabase
      .from('advisor_blocked_dates')
      .select('id, date_from, date_to, reason')
      .eq('user_id', userId)
      .order('date_from', { ascending: true })

    return {
      blockedDates: (data || []).map((b: any) => ({
        id: b.id,
        dateFrom: b.date_from,
        dateTo: b.date_to,
        reason: b.reason,
      })),
    }
  } catch (err) {
    console.error('[getBlockedDates] Error:', err)
    return { blockedDates: [], error: 'Erreur lors du chargement.' }
  }
}

/**
 * Add a blocked date range
 */
export async function addBlockedDates(
  userId: string,
  tenantId: string,
  dateFrom: string,
  dateTo: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createWriteClient()

    const { error } = await supabase
      .from('advisor_blocked_dates')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        date_from: dateFrom,
        date_to: dateTo,
        reason,
      })

    if (error) {
      console.error('[addBlockedDates] Error:', error)
      return { success: false, error: 'Erreur lors de l\'ajout.' }
    }

    revalidatePath('/admin/settings/availability')
    return { success: true }
  } catch (err) {
    console.error('[addBlockedDates] Error:', err)
    return { success: false, error: 'Erreur inattendue.' }
  }
}

/**
 * Remove a blocked date range
 */
export async function removeBlockedDates(
  blockedDateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createWriteClient()

    const { error } = await supabase
      .from('advisor_blocked_dates')
      .delete()
      .eq('id', blockedDateId)

    if (error) {
      console.error('[removeBlockedDates] Error:', error)
      return { success: false, error: 'Erreur lors de la suppression.' }
    }

    revalidatePath('/admin/settings/availability')
    return { success: true }
  } catch (err) {
    console.error('[removeBlockedDates] Error:', err)
    return { success: false, error: 'Erreur inattendue.' }
  }
}

/**
 * Get upcoming appointments for an advisor
 */
export async function getAdvisorAppointments(
  userId: string
): Promise<{ appointments: AppointmentInfo[]; error?: string }> {
  try {
    const supabase = createWriteClient()

    const today = new Date().toISOString().split('T')[0]!

    const { data } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, end_time, timezone, participant_name, participant_email, advisor_name, dossier_id, note, status, created_at')
      .eq('advisor_id', userId)
      .gte('appointment_date', today)
      .not('status', 'in', '("cancelled_by_client","cancelled_by_advisor")')
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20)

    return {
      appointments: (data || []).map((a: any) => ({
        id: a.id,
        appointmentDate: a.appointment_date,
        startTime: a.start_time,
        endTime: a.end_time,
        timezone: a.timezone,
        participantName: a.participant_name,
        participantEmail: a.participant_email,
        advisorName: a.advisor_name,
        dossierId: a.dossier_id,
        note: a.note,
        status: a.status,
        createdAt: a.created_at,
      })),
    }
  } catch (err) {
    console.error('[getAdvisorAppointments] Error:', err)
    return { appointments: [], error: 'Erreur lors du chargement.' }
  }
}

/**
 * Cancel an appointment (advisor-side)
 */
export async function cancelAppointmentByAdvisor(
  appointmentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createWriteClient()

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return { success: false, error: 'Rendez-vous introuvable.' }
    }

    // Update status
    await supabase
      .from('appointments')
      .update({
        status: 'cancelled_by_advisor',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', appointmentId)

    // Send cancellation email to client
    if (appointment.participant_email) {
      try {
        const dateObj = new Date(appointment.appointment_date + 'T00:00:00')
        const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })

        const body = `
<h2>Rendez-vous annulé</h2>
<p>Bonjour ${appointment.participant_name},</p>
<p>Nous sommes désolés, votre rendez-vous du <strong>${dateFormatted}</strong> à <strong>${appointment.start_time}</strong> avec ${appointment.advisor_name} a dû être annulé.</p>
${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
<p>N'hésitez pas à reprendre un rendez-vous depuis votre espace client.</p>
`
        await sendEmail({
          to: appointment.participant_email,
          toName: appointment.participant_name || undefined,
          subject: `Rendez-vous annulé — ${dateFormatted}`,
          html: generateEmailHtml(body, appointment.advisor_name || undefined),
        })
      } catch (e) {
        console.error('[cancelAppointmentByAdvisor] Email error:', e)
      }
    }

    revalidatePath('/admin/settings/availability')

    return { success: true }
  } catch (err) {
    console.error('[cancelAppointmentByAdvisor] Error:', err)
    return { success: false, error: 'Erreur lors de l\'annulation.' }
  }
}

// ============================================================
// CRON — Appointment reminders (J-1)
// ============================================================

/**
 * Send reminder emails for all appointments happening tomorrow.
 * Called by the cron route /api/cron/appointment-reminders.
 *
 * Logic:
 *  - Find all confirmed appointments where appointment_date = tomorrow
 *    AND reminder_sent_at IS NULL
 *  - Send a reminder email to client + advisor
 *  - Mark reminder_sent_at to avoid duplicates
 */
export async function sendAppointmentReminders(): Promise<{
  sent: number
  errors: number
}> {
  const supabase = createWriteClient()

  // Tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]!

  console.log(`[appointment-reminders] Processing reminders for ${tomorrowStr}`)

  // Find eligible appointments
  const { data: appointments, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('appointment_date', tomorrowStr)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)

  if (fetchError) {
    console.error('[appointment-reminders] Fetch error:', fetchError)
    return { sent: 0, errors: 1 }
  }

  if (!appointments || appointments.length === 0) {
    console.log('[appointment-reminders] No appointments need reminders tomorrow.')
    return { sent: 0, errors: 0 }
  }

  console.log(`[appointment-reminders] Found ${appointments.length} appointment(s) to remind.`)

  let sent = 0
  let errors = 0

  for (const appt of appointments) {
    try {
      const dateObj = new Date(appt.appointment_date + 'T00:00:00')
      const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      // ── Reminder to client ──
      if (appt.participant_email) {
        const clientBody = `
<h2>Rappel : votre rendez-vous est demain</h2>
<p>Bonjour ${appt.participant_name || 'Cher voyageur'},</p>
<p>Nous vous rappelons votre rendez-vous téléphonique avec <strong>${appt.advisor_name}</strong> :</p>
<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">📅 Date</td>
    <td style="padding: 8px 16px;">${dateFormatted}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">🕐 Heure</td>
    <td style="padding: 8px 16px;">${appt.start_time} — ${appt.end_time} (${appt.timezone})</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">⏱ Durée</td>
    <td style="padding: 8px 16px;">1 heure</td>
  </tr>
</table>
<p>Votre conseiller vous appellera à l'heure convenue. Assurez-vous d'être disponible sur votre téléphone.</p>
<p style="color: #737373; font-size: 13px;">Si vous devez annuler, rendez-vous sur votre espace client.</p>
`
        await sendEmail({
          to: appt.participant_email,
          toName: appt.participant_name || undefined,
          subject: `Rappel : rendez-vous demain avec ${appt.advisor_name} à ${appt.start_time}`,
          html: generateEmailHtml(clientBody, appt.advisor_name || undefined),
        })
      }

      // ── Reminder to advisor ──
      if (appt.advisor_email) {
        const advisorBody = `
<h2>Rappel : rendez-vous demain</h2>
<p>Bonjour ${appt.advisor_name || ''},</p>
<p>Rappel de votre rendez-vous téléphonique de demain :</p>
<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">👤 Client</td>
    <td style="padding: 8px 16px;">${appt.participant_name || 'Non renseigné'}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">📅 Date</td>
    <td style="padding: 8px 16px;">${dateFormatted}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; background: #f5f5f5; font-weight: bold;">🕐 Heure</td>
    <td style="padding: 8px 16px;">${appt.start_time} — ${appt.end_time}</td>
  </tr>
</table>
${appt.note ? `<p><strong>Message du client :</strong> ${appt.note}</p>` : ''}
<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nomadays.com'}/admin/dossiers/${appt.dossier_id}" style="color: #0FB6BC;">Voir le dossier</a></p>
`
        await sendEmail({
          to: appt.advisor_email,
          toName: appt.advisor_name || undefined,
          subject: `Rappel : rendez-vous demain avec ${appt.participant_name || 'un client'} à ${appt.start_time}`,
          html: generateEmailHtml(advisorBody),
        })
      }

      // Mark reminder as sent
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', appt.id)

      sent++
      console.log(`[appointment-reminders] Reminder sent for appointment ${appt.id}`)
    } catch (err) {
      errors++
      console.error(`[appointment-reminders] Error for appointment ${appt.id}:`, err)
    }
  }

  console.log(`[appointment-reminders] Done. Sent: ${sent}, Errors: ${errors}`)
  return { sent, errors }
}
