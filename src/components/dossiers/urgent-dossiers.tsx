'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Flame, AlertCircle, Clock, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toggleDossierHot } from '@/lib/actions/dossiers'
import { getStatusConfig } from '@/lib/constants'
import type { DossierStatus } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DossierRow = Record<string, any>

interface UrgentDossiersProps {
  data: {
    hot: DossierRow[]
    newLeads: DossierRow[]
    inactive: DossierRow[]
  }
}

function UrgentDossierCard({ dossier, type }: { dossier: DossierRow; type: 'hot' | 'lead' | 'inactive' }) {
  const statusConfig = getStatusConfig(dossier.status as DossierStatus)

  const handleToggleHot = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleDossierHot(dossier.id, !dossier.is_hot)
      toast.success(dossier.is_hot ? 'Retiré des favoris' : 'Ajouté aux favoris')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <Link href={`/admin/dossiers/${dossier.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
        {/* Type indicator */}
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full shrink-0
          ${type === 'hot' ? 'bg-orange-100 text-orange-600' : ''}
          ${type === 'lead' ? 'bg-blue-100 text-blue-600' : ''}
          ${type === 'inactive' ? 'bg-yellow-100 text-yellow-600' : ''}
        `}>
          {type === 'hot' && <Flame className="h-4 w-4" />}
          {type === 'lead' && <AlertCircle className="h-4 w-4" />}
          {type === 'inactive' && <Clock className="h-4 w-4" />}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{dossier.reference}</span>
            {statusConfig && (
              <Badge
                variant="outline"
                className="text-xs h-5"
                style={{ borderColor: statusConfig.color, color: statusConfig.color }}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate">{dossier.client_name || 'Sans nom'}</p>
          {dossier.client_email && (
            <p className="text-xs text-muted-foreground truncate">
              {dossier.client_email}
            </p>
          )}
        </div>

        {/* Time info */}
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">
            {type === 'inactive' && dossier.last_activity_at
              ? `Inactif depuis ${formatDistanceToNow(new Date(dossier.last_activity_at), { locale: fr })}`
              : formatDistanceToNow(new Date(dossier.created_at), { addSuffix: true, locale: fr })
            }
          </p>
        </div>

        {/* Hot toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 shrink-0 ${dossier.is_hot ? 'text-orange-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
          onClick={handleToggleHot}
        >
          <Star className={`h-4 w-4 ${dossier.is_hot ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </Link>
  )
}

export function UrgentDossiers({ data }: UrgentDossiersProps) {
  const { hot, newLeads, inactive } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Hot Dossiers */}
      {hot.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Flame className="h-4 w-4" />
              Dossiers chauds ({hot.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hot.slice(0, 5).map((dossier: DossierRow) => (
              <UrgentDossierCard key={dossier.id} dossier={dossier} type="hot" />
            ))}
            {hot.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {hot.length - 5} autres
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Leads */}
      {newLeads.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <AlertCircle className="h-4 w-4" />
              Nouveaux leads ({newLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {newLeads.slice(0, 5).map((dossier: DossierRow) => (
              <UrgentDossierCard key={dossier.id} dossier={dossier} type="lead" />
            ))}
            {newLeads.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {newLeads.length - 5} autres
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-700">
              <Clock className="h-4 w-4" />
              À relancer ({inactive.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inactive.slice(0, 5).map((dossier: DossierRow) => (
              <UrgentDossierCard key={dossier.id} dossier={dossier} type="inactive" />
            ))}
            {inactive.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {inactive.length - 5} autres
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
