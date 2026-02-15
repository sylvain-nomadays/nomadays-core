'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvitationForm } from './invitation-form'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvitationData {
  participantId: string
  participantName: string
  participantEmail: string | null
  dossierId: string
  dossierTitle: string
  destination: string | null
  departureDateFrom: string | null
  departureDateTo: string | null
  tenantName: string | null
  advisorName: string | null
  token: string
}

// ─── Service role client ─────────────────────────────────────────────────────

function createWriteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Check if user is already logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Use service role to look up invitation token (RLS won't let anon read this)
  const writeClient = createWriteClient()

  // Find the dossier_participant by invitation_token
  const { data: dpRow, error: dpError } = await writeClient
    .from('dossier_participants')
    .select('id, dossier_id, participant_id, is_lead')
    .eq('invitation_token', token)
    .single()

  if (dpError || !dpRow) {
    return <InvalidToken />
  }

  // Fetch participant info
  const { data: participant } = await writeClient
    .from('participants')
    .select('id, first_name, last_name, email, user_id, has_portal_access')
    .eq('id', dpRow.participant_id)
    .single()

  if (!participant) {
    return <InvalidToken />
  }

  // If user already has an account linked, redirect to the dossier
  if (participant.user_id && participant.has_portal_access) {
    if (user) {
      redirect(`/client/voyages/${dpRow.dossier_id}`)
    }
    // Has account but not logged in → send to login
    redirect(`/login?redirect=/client/voyages/${dpRow.dossier_id}`)
  }

  // If logged in user's email matches the participant → auto-link and redirect
  if (user && user.email && participant.email && user.email.toLowerCase() === participant.email.toLowerCase()) {
    await writeClient
      .from('participants')
      .update({ user_id: user.id, has_portal_access: true, portal_invited_at: new Date().toISOString() })
      .eq('id', participant.id)

    // Clear the invitation token (single use)
    await writeClient
      .from('dossier_participants')
      .update({ invitation_token: null })
      .eq('id', dpRow.id)

    redirect(`/client/voyages/${dpRow.dossier_id}`)
  }

  // Fetch dossier info for display
  const { data: dossier } = await writeClient
    .from('dossiers')
    .select('id, title, destination_countries, departure_date_from, departure_date_to, tenant_id, assigned_to_id')
    .eq('id', dpRow.dossier_id)
    .single()

  if (!dossier) {
    return <InvalidToken />
  }

  // Get tenant name
  let tenantName: string | null = null
  if (dossier.tenant_id) {
    const { data: tenant } = await writeClient
      .from('tenants')
      .select('name')
      .eq('id', dossier.tenant_id)
      .single()
    tenantName = tenant?.name || null
  }

  // Get advisor name
  let advisorName: string | null = null
  if (dossier.assigned_to_id) {
    const { data: advisor } = await writeClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', dossier.assigned_to_id)
      .single()
    advisorName = advisor ? `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim() : null
  }

  // Destination display name
  const destinations = dossier.destination_countries as string[] | null
  const destinationDisplay = destinations?.[0]
    ? (() => {
        try {
          return new Intl.DisplayNames(['fr'], { type: 'region' }).of(destinations[0].toUpperCase()) || null
        } catch {
          return null
        }
      })()
    : null

  const invitationData: InvitationData = {
    participantId: participant.id,
    participantName: `${participant.first_name || ''} ${participant.last_name || ''}`.trim(),
    participantEmail: participant.email && !participant.email.includes('@noemail.local') ? participant.email : null,
    dossierId: dpRow.dossier_id,
    dossierTitle: dossier.title || 'Votre voyage',
    destination: destinationDisplay,
    departureDateFrom: dossier.departure_date_from || null,
    departureDateTo: dossier.departure_date_to || null,
    tenantName,
    advisorName,
    token,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6F9FA] via-white to-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#0FB6BC] flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="font-display font-bold text-xl text-gray-700">nomadays</span>
        </div>

        <InvitationForm invitation={invitationData} isLoggedIn={!!user} />
      </div>
    </div>
  )
}

// ─── Invalid token component ─────────────────────────────────────────────────

function InvalidToken() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6F9FA] via-white to-white flex flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-[#0FB6BC] flex items-center justify-center">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <span className="font-display font-bold text-xl text-gray-700">nomadays</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="font-display font-bold text-xl text-gray-800 mb-2">
          Lien d&apos;invitation invalide
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Ce lien d&apos;invitation est invalide ou a déjà été utilisé.
          Contactez la personne qui vous a invité pour obtenir un nouveau lien.
        </p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#0FB6BC' }}
        >
          Se connecter
        </a>
      </div>
    </div>
  )
}
