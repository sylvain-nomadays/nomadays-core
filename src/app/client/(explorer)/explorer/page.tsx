import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchDestinationAgencies } from '@/lib/actions/explorer'
import { ExplorerView } from '@/components/client/explorer/ExplorerView'

export default async function ExplorerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Fetch participant
  const { data: participantData } = await supabase
    .from('participants')
    .select('id, first_name, last_name')
    .eq('email', user.email)
    .single()

  const participant = participantData as { id: string; first_name: string; last_name: string } | null

  if (!participant) {
    redirect('/client')
  }

  // Fetch agencies
  const { data: agencies } = await fetchDestinationAgencies()

  // Fetch existing wishlists to show "already contacted" state
  let wishCountryCodes: string[] = []
  try {
    const { data: wishData } = await (supabase
      .from('traveler_wishlists' as any))
      .select('country_code')
      .eq('participant_id', participant.id) as { data: any[] | null }
    wishCountryCodes = (wishData || []).map((w: any) => w.country_code?.toUpperCase()).filter(Boolean)
  } catch {
    // Table may not exist
  }

  return (
    <ExplorerView
      agencies={agencies}
      participantId={participant.id}
      wishCountryCodes={wishCountryCodes}
    />
  )
}
