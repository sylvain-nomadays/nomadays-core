'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Users, MapPin, Euro } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { getStatusConfig, getTripTypeLabel } from '@/lib/constants'
import type { Dossier, DossierStatus } from '@/lib/supabase/database.types'

interface DossierWithRelations extends Dossier {
  dmc?: { id: string; name: string } | null
  advisor?: { id: string; first_name: string | null; last_name: string | null } | null
  participants?: Array<{
    participant: { id: string; first_name: string; last_name: string } | null
    is_lead: boolean
  }>
}

interface DossierCardProps {
  dossier: DossierWithRelations
  isDragging?: boolean
}

export function DossierCard({ dossier, isDragging }: DossierCardProps) {
  const statusConfig = getStatusConfig(dossier.status)
  const leadParticipant = dossier.participants?.find((p) => p.is_lead)?.participant
  const totalPax = dossier.pax_adults + dossier.pax_children + dossier.pax_infants

  const advisorInitials = dossier.advisor
    ? `${dossier.advisor.first_name?.[0] || ''}${dossier.advisor.last_name?.[0] || ''}`
    : '?'

  return (
    <Link href={`/admin/dossiers/${dossier.id}`}>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
          isDragging ? 'shadow-lg rotate-2 opacity-90' : ''
        }`}
      >
        <CardContent className="p-3 space-y-2">
          {/* Header: Reference + Trip Type */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">{dossier.reference}</span>
            <Badge variant="outline" className="text-xs">
              {getTripTypeLabel(dossier.trip_type)}
            </Badge>
          </div>

          {/* Title */}
          <h4 className="font-medium text-sm line-clamp-2 leading-tight">{dossier.title}</h4>

          {/* Lead participant */}
          {leadParticipant && (
            <p className="text-xs text-muted-foreground truncate">
              {leadParticipant.first_name} {leadParticipant.last_name}
            </p>
          )}

          {/* Info row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {dossier.destination_countries.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {dossier.destination_countries.join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalPax}
            </span>
            {dossier.duration_days && (
              <span>{dossier.duration_days}j</span>
            )}
          </div>

          {/* Date + Budget */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {dossier.departure_date_from && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(dossier.departure_date_from).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
            {dossier.budget_max && (
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {dossier.budget_max.toLocaleString('fr-FR')}
              </span>
            )}
          </div>

          {/* Footer: DMC + Advisor + Updated */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {dossier.dmc && (
                <Badge variant="secondary" className="text-xs h-5">
                  {dossier.dmc.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(dossier.updated_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
              {dossier.advisor && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {advisorInitials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>

          {/* Tags */}
          {dossier.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dossier.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1">
                  {tag}
                </Badge>
              ))}
              {dossier.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  +{dossier.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
