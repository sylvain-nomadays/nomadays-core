import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FolderHeart,
  Heart,
  MessageSquare,
  ArrowRight,
  Plane,
  Calendar,
  MapPin,
} from 'lucide-react'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  lead: { label: 'Nouvelle demande', variant: 'secondary' },
  qualified: { label: 'En cours', variant: 'default' },
  proposal_sent: { label: 'Devis envoyé', variant: 'outline' },
  negotiation: { label: 'En négociation', variant: 'outline' },
  won: { label: 'Confirmé', variant: 'default' },
  lost: { label: 'Annulé', variant: 'destructive' },
}

export default async function ClientHomePage() {
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
              Aucun voyage n'est associé à votre compte pour le moment.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contactez-nous pour créer votre premier voyage sur mesure.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Récupérer les dossiers du participant
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
        tenant:tenants(name, logo_url)
      )
    `)
    .eq('participant_id', participant.id)
    .order('created_at', { ascending: false })

  const dossiers = (dossierParticipants || [])
    .map((dp: any) => dp.dossier)
    .filter(Boolean)

  // Dossiers actifs (non perdus/annulés)
  const activeDossiers = dossiers.filter((d: any) => d.status !== 'lost')

  // Prochain voyage
  const upcomingTrip = activeDossiers.find((d: any) => {
    if (!d.travel_date_start) return false
    return new Date(d.travel_date_start) > new Date()
  })

  // Messages non lus (à implémenter avec un vrai compteur)
  const unreadMessages = 0

  return (
    <div className="p-6 space-y-6">
      {/* En-tête de bienvenue */}
      <div>
        <h1 className="text-2xl font-bold">
          Bonjour {participant.first_name} !
        </h1>
        <p className="text-muted-foreground">
          Bienvenue dans votre espace voyage Nomadays
        </p>
      </div>

      {/* Prochain voyage */}
      {upcomingTrip && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Votre prochain voyage</CardDescription>
                <CardTitle className="text-xl mt-1">{upcomingTrip.title}</CardTitle>
              </div>
              <Plane className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{upcomingTrip.destination_country}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {upcomingTrip.travel_date_start
                    ? new Date(upcomingTrip.travel_date_start).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Date à définir'}
                </span>
              </div>
            </div>
            <Link href={`/client/voyages/${upcomingTrip.id}`}>
              <Button className="mt-4" variant="default">
                Voir les détails
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Cartes de navigation rapide */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/client/voyages">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FolderHeart className="h-8 w-8 text-primary" />
                <Badge variant="secondary">{activeDossiers.length}</Badge>
              </div>
              <CardTitle className="text-lg">Mes Voyages</CardTitle>
              <CardDescription>
                Consultez vos voyages en cours et passés
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/client/wishlist">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Heart className="h-8 w-8 text-rose-500" />
              </div>
              <CardTitle className="text-lg">Liste d'envies</CardTitle>
              <CardDescription>
                Vos destinations et expériences favorites
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/client/messages">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <MessageSquare className="h-8 w-8 text-blue-500" />
                {unreadMessages > 0 && (
                  <Badge variant="destructive">{unreadMessages}</Badge>
                )}
              </div>
              <CardTitle className="text-lg">Messages</CardTitle>
              <CardDescription>
                Échangez avec vos conseillers voyage
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Liste des voyages récents */}
      {activeDossiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vos voyages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeDossiers.slice(0, 5).map((dossier: any) => {
                const status = statusLabels[dossier.status] || { label: dossier.status, variant: 'secondary' as const }
                return (
                  <Link
                    key={dossier.id}
                    href={`/client/voyages/${dossier.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{dossier.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {dossier.tenant?.name || 'Nomadays'} • {dossier.reference}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
