import { Card } from '@/components/ui/card'

export default function AdminDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Dossiers actifs</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">En attente de réponse</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Confirmés ce mois</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </Card>
      </div>

      <p className="mt-8 text-muted-foreground">
        Le dashboard sera connecté à la base de données après la migration initiale.
      </p>
    </div>
  )
}
