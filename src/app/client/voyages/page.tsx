import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Building2,
} from 'lucide-react'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  lead: { label: 'Nouvelle demande', variant: 'secondary' },
  qualified: { label: 'En cours', variant: 'default' },
  proposal_sent: { label: 'Devis envoyé', variant: 'outline' },
  negotiation: { label: 'En négociation', variant: 'outline' },
  won: { label: 'Confirmé', variant: 'default' },
  lost: { label: 'Annulé', variant: 'destructive' },
}

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
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucun voyage n'est associé à votre compte.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Récupérer tous les dossiers du participant
  const { data: dossierParticipants } = await supabase
    .from('dossier_participants')
    .select(`
      is_lead,
      dossier:dossiers(
        id,
        reference,
        title,
        status,
        travel_date_start,
        travel_date_end,
        destination_country,
        adults_count,
        children_count,
        created_at,
        tenant:tenants(name, logo_url)
      )
    `)
    .eq('participant_id', participant.id)
    .order('created_at', { ascending: false })

  const allDossiers = (dossierParticipants || [])
    .map((dp: any) => dp.dossier)
    .filter(Boolean)

  // Séparer les voyages actifs et passés
  const now = new Date()
  const activeDossiers = allDossiers.filter((d: any) => {
    if (d.status === 'lost') return false
    if (!d.travel_date_end) return true
    return new Date(d.travel_date_end) >= now
  })

  const pastDossiers = allDossiers.filter((d: any) => {
    if (d.status === 'lost') return true
    if (!d.travel_date_end) return false
    return new Date(d.travel_date_end) < now
  })

  const DossierCard = ({ dossier }: { dossier: any }) => {
    const status = statusLabels[dossier.status] || { label: dossier.status, variant: 'secondary' as const }
    const totalTravelers = (dossier.adults_count || 0) + (dossier.children_count || 0)

    return (
      <Link href={`/client/voyages/${dossier.id}`}>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-xs text-muted-foreground">{dossier.reference}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{dossier.title}</h3>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {dossier.destination_country && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{dossier.destination_country}</span>
                    </div>
                  )}
                  {dossier.travel_date_start && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(dossier.travel_date_start).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {dossier.travel_date_end && (
                          <>
                            {' - '}
                            {new Date(dossier.travel_date_end).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                  {totalTravelers > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{totalTravelers} voyageur{totalTravelers > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {dossier.tenant?.name && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{dossier.tenant.name}</span>
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground mt-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes Voyages</h1>
        <p className="text-muted-foreground">
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

        <TabsContent value="active" className="mt-4">
          {activeDossiers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Aucun voyage en cours pour le moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeDossiers.map((dossier: any) => (
                <DossierCard key={dossier.id} dossier={dossier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastDossiers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Aucun voyage passé.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastDossiers.map((dossier: any) => (
                <DossierCard key={dossier.id} dossier={dossier} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
