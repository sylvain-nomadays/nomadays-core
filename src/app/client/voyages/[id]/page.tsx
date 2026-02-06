import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Building2,
  Plane,
  FileText,
  MessageSquare,
  Shield,
  CreditCard,
} from 'lucide-react'
import { ClientMessagingSection } from '@/components/client/client-messaging-section'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  lead: { label: 'Nouvelle demande', variant: 'secondary' },
  qualified: { label: 'En cours', variant: 'default' },
  proposal_sent: { label: 'Devis envoyé', variant: 'outline' },
  negotiation: { label: 'En négociation', variant: 'outline' },
  won: { label: 'Confirmé', variant: 'default' },
  lost: { label: 'Annulé', variant: 'destructive' },
}

export default async function ClientVoyageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Récupérer le participant
  const { data: participantData } = await supabase
    .from('participants')
    .select('id, first_name, last_name, email')
    .eq('email', user.email)
    .single()

  const participant = participantData as {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null

  if (!participant) {
    redirect('/client')
  }

  // Vérifier que le participant a accès à ce dossier
  const { data: dossierParticipant } = await supabase
    .from('dossier_participants')
    .select('is_lead')
    .eq('dossier_id', id)
    .eq('participant_id', participant.id)
    .single()

  if (!dossierParticipant) {
    notFound()
  }

  // Récupérer le dossier avec toutes les infos
  const { data: dossier } = await supabase
    .from('dossiers')
    .select(`
      *,
      tenant:tenants(id, name, logo_url),
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, email),
      participants:dossier_participants(
        is_lead,
        participant:participants(id, first_name, last_name, email, phone)
      )
    `)
    .eq('id', id)
    .single()

  if (!dossier) {
    notFound()
  }

  // Cast dossier pour éviter les erreurs de type
  const dossierTyped = dossier as any

  // Récupérer les propositions de circuit
  const { data: proposals } = await supabase
    .from('dossier_circuit_proposals')
    .select(`
      *,
      circuit:circuits(id, name, duration_days, description)
    `)
    .eq('dossier_id', id)
    .order('version', { ascending: false })

  // Récupérer les vols
  const { data: logistics } = await supabase
    .from('dossier_travel_logistics')
    .select('*')
    .eq('dossier_id', id)
    .order('date', { ascending: true })

  const status = statusLabels[dossierTyped.status] || { label: dossierTyped.status, variant: 'secondary' as const }
  const totalTravelers = (dossierTyped.adults_count || 0) + (dossierTyped.children_count || 0)
  const advisorName = dossierTyped.advisor
    ? `${dossierTyped.advisor.first_name} ${dossierTyped.advisor.last_name}`
    : 'Votre conseiller'

  const arrivals = (logistics || []).filter((l: any) => l.type === 'arrival')
  const departures = (logistics || []).filter((l: any) => l.type === 'departure')

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/client/voyages"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux voyages
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{dossierTyped.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Référence : {dossierTyped.reference}
            {dossierTyped.tenant && ` • ${(dossierTyped.tenant as any).name}`}
          </p>
        </div>
      </div>

      {/* Infos principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">{dossierTyped.destination_country || 'À définir'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Dates</p>
                <p className="font-medium">
                  {dossierTyped.travel_date_start
                    ? new Date(dossierTyped.travel_date_start).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'À définir'}
                  {dossierTyped.travel_date_end && (
                    <> - {new Date(dossierTyped.travel_date_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Voyageurs</p>
                <p className="font-medium">
                  {totalTravelers > 0 ? `${totalTravelers} personne${totalTravelers > 1 ? 's' : ''}` : 'À définir'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Votre conseiller</p>
                <p className="font-medium">{advisorName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="circuit">Circuit</TabsTrigger>
          <TabsTrigger value="flights">Vols</TabsTrigger>
          <TabsTrigger value="travelers">Voyageurs</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Onglet Aperçu */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Proposition de circuit actuelle */}
          {proposals && proposals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Votre Circuit
                </CardTitle>
                <CardDescription>
                  Version {(proposals[0] as any).version} - {(proposals[0] as any).status === 'accepted' ? 'Accepté' : 'En attente de validation'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{(proposals[0] as any).circuit?.name || 'Circuit personnalisé'}</p>
                    <p className="text-sm text-muted-foreground">
                      {(proposals[0] as any).circuit?.duration_days || (proposals[0] as any).duration_days} jours
                    </p>
                  </div>
                  {(proposals[0] as any).total_price && (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-muted-foreground">Prix total</span>
                      <span className="text-xl font-bold">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format((proposals[0] as any).total_price)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vols */}
          {(arrivals.length > 0 || departures.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Vos Vols
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {arrivals.map((flight: any) => (
                    <div key={flight.id} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                      <Plane className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Arrivée - {flight.airport_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(flight.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                          {flight.time && ` à ${flight.time}`}
                        </p>
                        {flight.flight_number && (
                          <p className="text-sm">Vol {flight.flight_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {departures.map((flight: any) => (
                    <div key={flight.id} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                      <Plane className="h-5 w-5 text-orange-600 rotate-45" />
                      <div>
                        <p className="font-medium">Départ - {flight.airport_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(flight.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                          {flight.time && ` à ${flight.time}`}
                        </p>
                        {flight.flight_number && (
                          <p className="text-sm">Vol {flight.flight_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions rapides */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:bg-accent/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium">Assurance voyage</p>
                    <p className="text-sm text-muted-foreground">Protégez votre voyage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-accent/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium">Paiements</p>
                    <p className="text-sm text-muted-foreground">Gérez vos règlements</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-accent/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-medium">Documents</p>
                    <p className="text-sm text-muted-foreground">Vos documents de voyage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Circuit */}
        <TabsContent value="circuit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Votre Circuit</CardTitle>
              <CardDescription>Détail jour par jour de votre voyage</CardDescription>
            </CardHeader>
            <CardContent>
              {proposals && proposals.length > 0 ? (
                <div className="space-y-4">
                  <p className="font-medium text-lg">{(proposals[0] as any).circuit?.name || 'Circuit personnalisé'}</p>
                  <p className="text-muted-foreground">
                    {(proposals[0] as any).circuit?.description || 'Le détail du circuit sera bientôt disponible.'}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Votre conseiller prépare actuellement votre circuit sur mesure.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Vols */}
        <TabsContent value="flights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vos Vols</CardTitle>
              <CardDescription>Informations sur vos vols aller et retour</CardDescription>
            </CardHeader>
            <CardContent>
              {arrivals.length === 0 && departures.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Les informations de vol seront ajoutées une fois votre voyage confirmé.
                </p>
              ) : (
                <div className="space-y-6">
                  {arrivals.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Vol aller</h4>
                      {arrivals.map((flight: any) => (
                        <div key={flight.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{flight.airport_code}</p>
                              <p className="text-sm text-muted-foreground">{flight.airport_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {new Date(flight.date).toLocaleDateString('fr-FR')}
                              </p>
                              {flight.time && <p className="text-sm">{flight.time}</p>}
                            </div>
                          </div>
                          {flight.flight_number && (
                            <p className="mt-2 text-sm">Vol : {flight.flight_number}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {departures.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Vol retour</h4>
                      {departures.map((flight: any) => (
                        <div key={flight.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{flight.airport_code}</p>
                              <p className="text-sm text-muted-foreground">{flight.airport_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {new Date(flight.date).toLocaleDateString('fr-FR')}
                              </p>
                              {flight.time && <p className="text-sm">{flight.time}</p>}
                            </div>
                          </div>
                          {flight.flight_number && (
                            <p className="mt-2 text-sm">Vol : {flight.flight_number}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Voyageurs */}
        <TabsContent value="travelers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Les Voyageurs</CardTitle>
              <CardDescription>Participants à ce voyage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(dossierTyped.participants as any[])?.map((dp: any) => (
                  <div
                    key={dp.participant.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {dp.participant.first_name[0]}{dp.participant.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {dp.participant.first_name} {dp.participant.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{dp.participant.email}</p>
                      </div>
                    </div>
                    {dp.is_lead && (
                      <Badge variant="secondary">Contact principal</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Messages */}
        <TabsContent value="messages" className="mt-4">
          <ClientMessagingSection
            dossierId={dossierTyped.id}
            participantId={participant.id}
            participantEmail={participant.email}
            participantName={`${participant.first_name} ${participant.last_name}`}
            advisorEmail={(dossierTyped.advisor as any)?.email || ''}
            advisorName={advisorName}
          />
        </TabsContent>

        {/* Onglet Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Vos documents de voyage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Vos documents seront disponibles ici une fois votre voyage confirmé.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
