import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HeartStraight } from '@phosphor-icons/react/dist/ssr'
import { DestinationCard } from '@/components/client/dashboard/destination-card'
import { getCmsImageUrls } from '@/lib/actions/cms-images'

export default async function ClientVoyagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Récupérer le participant lié à cet email
  const { data: participantData } = await supabase
    .from('participants')
    .select('id, first_name, last_name')
    .eq('email', user.email)
    .single()

  const participant = participantData as { id: string; first_name: string; last_name: string } | null

  if (!participant) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <HeartStraight size={32} weight="duotone" className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">
            Aucun voyage n&apos;est associé à votre compte.
          </p>
        </div>
      </div>
    )
  }

  // Récupérer tous les dossiers du participant (dual strategy: dossier_participants + client_email)
  const { data: dpData } = await supabase
    .from('dossier_participants')
    .select('dossier_id')
    .eq('participant_id', participant.id)
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[] | null }

  const dpIds = (dpData || []).map((dp: any) => dp.dossier_id).filter(Boolean)

  const { data: emailDossiers } = await (supabase
    .from('dossiers') as any)
    .select('id')
    .eq('client_email', user.email)
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[] | null }

  const emailIds = (emailDossiers || []).map((d: any) => d.id).filter(Boolean)
  const allDossierIds = [...new Set([...dpIds, ...emailIds])]

  let allDossiers: any[] = []
  if (allDossierIds.length > 0) {
    const { data: dossierData } = await (supabase
      .from('dossiers') as any)
      .select('*')
      .in('id', allDossierIds)
      .order('created_at', { ascending: false }) as { data: any[] | null }

    allDossiers = (dossierData || []).map((d: any) => ({
      ...d,
      destination_country: d.destination_countries?.[0] || null,
      travel_date_start: d.departure_date_from || null,
      travel_date_end: d.departure_date_to || null,
      adults_count: d.pax_adults || d.adults_count || 0,
      children_count: d.pax_children || d.children_count || 0,
    }))
  }

  // Fetch tenant info
  const tenantIds = [...new Set(allDossiers.map((d: any) => d.tenant_id).filter(Boolean))]
  let tenantMap: Record<string, any> = {}
  if (tenantIds.length > 0) {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, logo_url')
      .in('id', tenantIds)
    for (const t of ((tenants || []) as any[])) {
      tenantMap[t.id] = t
    }
  }
  allDossiers = allDossiers.map((d: any) => ({
    ...d,
    tenant: tenantMap[d.tenant_id] || null,
  }))

  // Fetch CMS hero image for fallback
  const firstTenantId = tenantIds[0] || null
  let cmsHeroDestinationUrl: string | null = null
  if (firstTenantId) {
    try {
      const cmsImageUrls = await getCmsImageUrls(firstTenantId)
      cmsHeroDestinationUrl = cmsImageUrls['images.hero_destination'] || null
    } catch {
      // CMS images not critical
    }
  }

  // Fetch hero photos for each dossier
  const dossiersWithPhotos = await Promise.all(
    allDossiers.map(async (dossier: any) => {
      const { data: tripData } = await supabase
        .from('trips' as any)
        .select('id')
        .eq('dossier_id', dossier.id)
        .order('created_at', { ascending: false })
        .limit(1) as { data: any[] | null }

      const trip = tripData?.[0]
      let heroPhotoUrl: string | null = null

      if (trip) {
        const { data: photos } = await supabase
          .from('trip_photos' as any)
          .select('url_hero, url_medium, url_large, is_hero')
          .eq('trip_id', trip.id)
          .order('sort_order', { ascending: true })
          .limit(3) as { data: any[] | null }

        const heroPhoto = photos?.find((p: any) => p.is_hero) ?? photos?.[0]
        heroPhotoUrl = heroPhoto?.url_hero ?? heroPhoto?.url_large ?? heroPhoto?.url_medium ?? null
      }

      const totalTravelers = (dossier.adults_count || 0) + (dossier.children_count || 0)
      // Fallback cascade: CMS admin image (explicit override) → trip photo → null
      const finalHeroPhotoUrl = cmsHeroDestinationUrl || heroPhotoUrl
      return { ...dossier, heroPhotoUrl: finalHeroPhotoUrl, totalTravelers }
    })
  )

  // Séparer les voyages actifs et passés
  const now = new Date()
  const INACTIVE_STATUSES = new Set(['lost', 'cancelled', 'archived'])
  const activeDossiers = dossiersWithPhotos.filter((d: any) => {
    if (INACTIVE_STATUSES.has(d.status)) return false
    if (!d.travel_date_end) return true
    return new Date(d.travel_date_end) >= now
  })

  const pastDossiers = dossiersWithPhotos.filter((d: any) => {
    if (INACTIVE_STATUSES.has(d.status)) return true
    if (!d.travel_date_end) return false
    return new Date(d.travel_date_end) < now
  })

  const renderGrid = (dossiers: any[]) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {dossiers.map((dossier: any) => (
        <DestinationCard
          key={dossier.id}
          dossierId={dossier.id}
          title={dossier.title}
          destination={dossier.destination_country}
          travelDateStart={dossier.travel_date_start}
          travelDateEnd={dossier.travel_date_end}
          status={dossier.status}
          heroPhotoUrl={dossier.heroPhotoUrl}
          tenantName={dossier.tenant?.name}
          totalTravelers={dossier.totalTravelers}
          destinationCountryCode={dossier.destination_country}
        />
      ))}
    </div>
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes Voyages</h1>
        <p className="text-gray-500 mt-1">
          Retrouvez tous vos projets de voyage
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            En cours ({activeDossiers.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Passés ({pastDossiers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeDossiers.length === 0 ? (
            <div className="text-center py-12">
              <HeartStraight size={40} weight="duotone" className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-500">
                Aucun voyage en cours pour le moment.
              </p>
            </div>
          ) : (
            renderGrid(activeDossiers)
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastDossiers.length === 0 ? (
            <div className="text-center py-12">
              <HeartStraight size={40} weight="duotone" className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-500">
                Aucun voyage passé.
              </p>
            </div>
          ) : (
            renderGrid(pastDossiers)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
