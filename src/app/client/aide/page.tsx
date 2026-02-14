import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getContinentTheme } from '@/components/client/continent-theme'
import { FaqSearch } from '@/components/client/aide/faq-search'
import type { FaqItem } from '@/components/client/aide/faq-search'
import { EmergencyContactsCard } from '@/components/client/aide/emergency-contacts-card'
import { resolveSnippetsByCategory } from '@/lib/cms/resolve-snippets'
import {
  HelpCircle,
  MessageSquare,
} from 'lucide-react'

// ─── Component ──────────────────────────────────────────────────────────────

export default async function ClientAidePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Fetch continent theme + advisor info
  let continentTheme = getContinentTheme()
  let advisorInfo: { name: string; email: string } | null = null
  let activeDossierId: string | null = null

  const { data: participantData } = await supabase
    .from('participants')
    .select('id, email')
    .eq('email', user.email)
    .single()

  const participant = participantData as { id: string; email: string } | null

  if (participant) {
    // Find dossiers by client_email (Alembic schema)
    const { data: dossierData } = await (supabase
      .from('dossiers') as any)
      .select('id, destination_countries, status, departure_date_from, assigned_to_id')
      .eq('client_email', participant.email)
      .not('status', 'eq', 'lost')
      .order('created_at', { ascending: false })
      .limit(5) as { data: any[] | null }

    const dossiers = (dossierData || []).map((d: any) => ({
      id: d.id,
      destination_country: d.destination_countries?.[0] || null,
      status: d.status,
      travel_date_start: d.departure_date_from || null,
      assigned_to_id: d.assigned_to_id,
    }))

    const now = new Date()
    const activeDossier = dossiers.find((d: any) =>
      d.travel_date_start && new Date(d.travel_date_start) > now
    ) ?? dossiers[0] ?? null

    if (activeDossier?.destination_country) {
      continentTheme = getContinentTheme(activeDossier.destination_country)
    }

    if (activeDossier?.id) {
      activeDossierId = activeDossier.id
    }

    // Fetch advisor info if assigned_to_id exists
    if (activeDossier?.assigned_to_id) {
      const { data: advData } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', activeDossier.assigned_to_id)
        .single()
      if (advData) {
        const adv = advData as any
        advisorInfo = {
          name: `${adv.first_name || ''} ${adv.last_name || ''}`.trim() || 'Votre h\u00F4te',
          email: adv.email || '',
        }
      }
    }
  }

  // Fetch FAQ items from CMS snippets
  let faqItems: FaqItem[] = []
  try {
    const faqSnippets = await resolveSnippetsByCategory('faq', 'fr')
    faqItems = faqSnippets
      .filter(s => s.snippet_key.startsWith('faq.'))
      .map(s => {
        const meta = (s.metadata_json || {}) as Record<string, unknown>
        const questionObj = (meta.question || {}) as Record<string, string>
        return {
          id: s.snippet_key.replace('faq.', ''),
          question: questionObj.fr || '',
          answer: s.content_json?.fr || '',
          icon: (meta.icon as string) || 'HelpCircle',
          keywords: (meta.keywords as string[]) || [],
        }
      })
      .filter(item => item.question && item.answer) // skip empty items
  } catch (err) {
    console.error('[ClientAidePage] Error fetching FAQ snippets:', err)
    // faqItems stays empty -> FaqSearch will use its fallback
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centre d&apos;aide</h1>
        <p className="text-gray-500 mt-1">
          Retrouvez les r&eacute;ponses &agrave; vos questions les plus fr&eacute;quentes
        </p>
      </div>

      {/* Emergency contacts card (if active dossier with advisor) */}
      {advisorInfo && activeDossierId && (
        <EmergencyContactsCard
          advisorName={advisorInfo.name}
          advisorEmail={advisorInfo.email}
          dossierId={activeDossierId}
          themeColor={continentTheme.primary}
        />
      )}

      {/* FAQ with search */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.primary}15` }}
            >
              <HelpCircle className="h-4 w-4" style={{ color: continentTheme.primary }} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Questions fr&eacute;quentes</h2>
          </div>
        </div>

        <FaqSearch themeColor={continentTheme.primary} items={faqItems} />
      </div>

      {/* Contact advisor CTA */}
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: `${continentTheme.primary}08` }}
      >
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: `${continentTheme.primary}15` }}
        >
          <MessageSquare className="h-6 w-6" style={{ color: continentTheme.primary }} />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          Vous ne trouvez pas votre r&eacute;ponse ?
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Votre h&ocirc;te local est l&agrave; pour vous aider
        </p>
        <Link
          href="/client/messages"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: continentTheme.primary }}
        >
          <MessageSquare className="h-4 w-4" />
          Contacter votre h&ocirc;te
        </Link>
      </div>
    </div>
  )
}
