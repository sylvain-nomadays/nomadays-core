import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client to bypass RLS
function createWriteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, userId, participantId } = body

    if (!token || !userId || !participantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const writeClient = createWriteClient()

    // Verify the token is valid
    const { data: dpRow, error: dpError } = await writeClient
      .from('dossier_participants')
      .select('id, participant_id')
      .eq('invitation_token', token)
      .single()

    if (dpError || !dpRow) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    // Verify participant matches
    if (dpRow.participant_id !== participantId) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 403 })
    }

    // Link auth user to participant
    await writeClient
      .from('participants')
      .update({
        user_id: userId,
        has_portal_access: true,
        portal_invited_at: new Date().toISOString(),
      })
      .eq('id', participantId)

    // Clear the invitation token (single use)
    await writeClient
      .from('dossier_participants')
      .update({ invitation_token: null })
      .eq('id', dpRow.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invitation completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
