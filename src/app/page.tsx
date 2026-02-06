import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <main className="text-center px-6">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Nomadays Core
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          Plateforme de gestion pour agences de voyage et DMCs
        </p>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Créer un compte</Link>
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-6 text-sm text-muted-foreground">
        Nomadays &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
