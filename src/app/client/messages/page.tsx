import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /client/messages — Redirects to the active dossier's messages tab.
 * The Salon de Thé messaging experience lives inside the voyage detail page
 * at /client/voyages/[id]?tab=messages.
 */
export default async function ClientMessagesRedirectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Find the participant
  const { data: participantData } = await supabase
    .from('participants')
    .select('id, email')
    .eq('email', user.email)
    .single()

  const participant = participantData as { id: string; email: string } | null

  if (!participant) {
    redirect('/client')
  }

  // Find the best dossier to redirect to (dual strategy: dossier_participants + client_email)
  const { data: dpData } = await supabase
    .from('dossier_participants')
    .select('dossier_id')
    .eq('participant_id', participant.id)
    .order('created_at', { ascending: false })
    .limit(5) as { data: any[] | null }

  const dpIds = (dpData || []).map((dp: any) => dp.dossier_id).filter(Boolean)

  const { data: emailDossiers } = await (supabase
    .from('dossiers') as any)
    .select('id')
    .eq('client_email', user.email)
    .not('status', 'eq', 'lost')
    .limit(5) as { data: any[] | null }

  const emailIds = (emailDossiers || []).map((d: any) => d.id).filter(Boolean)
  const allIds = [...new Set([...dpIds, ...emailIds])]

  if (allIds.length === 0) {
    redirect('/client')
  }

  // Get the best dossier (upcoming trip or most recent)
  const { data: dossierData } = await (supabase
    .from('dossiers') as any)
    .select('id, status, departure_date_from')
    .in('id', allIds)
    .neq('status', 'lost') as { data: any[] | null }

  const dossiers = (dossierData || []).filter((d: any) => d.status !== 'lost')
  const now = new Date()
  const best = dossiers.find((d: any) =>
    d.departure_date_from && new Date(d.departure_date_from) > now
  ) ?? dossiers[0] ?? null

  if (best) {
    redirect(`/client/voyages/${best.id}?tab=messages`)
  }

  redirect('/client')
}
