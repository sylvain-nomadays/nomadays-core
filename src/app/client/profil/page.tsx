import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone, MapPin } from 'lucide-react'

export default async function ClientProfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Récupérer les infos du participant
  const { data: participantData } = await supabase
    .from('participants')
    .select('*')
    .eq('email', user.email)
    .single()

  const participant = participantData as {
    first_name: string
    last_name: string
    email: string
    phone: string | null
    nationality: string | null
  } | null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Vos coordonnées pour vos voyages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom</Label>
                <Input
                  value={participant?.first_name || ''}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nom</Label>
                <Input
                  value={participant?.last_name || ''}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                value={participant?.email || user.email || ''}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone
              </Label>
              <Input
                value={participant?.phone || ''}
                disabled
                className="mt-1"
                placeholder="Non renseigné"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Nationalité
              </Label>
              <Input
                value={participant?.nationality || ''}
                disabled
                className="mt-1"
                placeholder="Non renseignée"
              />
            </div>

            <Button variant="outline" className="w-full" disabled>
              Modifier mes informations
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Pour modifier vos informations, contactez votre conseiller voyage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préférences de voyage</CardTitle>
            <CardDescription>
              Vos goûts et préférences pour personnaliser vos voyages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Les préférences de voyage seront bientôt disponibles
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Sécurité du compte</CardTitle>
            <CardDescription>
              Gérez votre mot de passe et la sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mot de passe</p>
                <p className="text-sm text-muted-foreground">
                  Dernière modification : jamais
                </p>
              </div>
              <Button variant="outline" disabled>
                Changer le mot de passe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
