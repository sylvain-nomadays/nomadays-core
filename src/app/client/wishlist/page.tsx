import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart } from 'lucide-react'

export default async function ClientWishlistPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Liste d'envies</h1>
        <p className="text-muted-foreground">
          Vos destinations et expériences favorites
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes favoris</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Votre liste d'envies est vide
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Explorez nos destinations et ajoutez vos coups de cœur
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
