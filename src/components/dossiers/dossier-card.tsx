'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, MapPin, Euro, Phone, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { getCustomerStatusConfig } from '@/lib/constants'
import type { CustomerStatus } from '@/lib/supabase/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DossierRow = Record<string, any>

interface DossierCardProps {
  dossier: DossierRow
  isDragging?: boolean
}

export function DossierCard({ dossier, isDragging }: DossierCardProps) {
  const totalPax = (dossier.pax_adults || 0) + (dossier.pax_children || 0) + (dossier.pax_infants || 0)
  const customerConfig = dossier.lead_customer_status
    ? getCustomerStatusConfig(dossier.lead_customer_status as CustomerStatus)
    : null

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
            {dossier.trip_type && (
              <Badge variant="outline" className="text-xs">
                {dossier.trip_type}
              </Badge>
            )}
          </div>

          {/* Client name + Customer status badge */}
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm line-clamp-1 leading-tight flex-1">
              {dossier.client_name || dossier.title || 'Sans nom'}
            </h4>
            {customerConfig && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 flex-shrink-0 whitespace-nowrap"
                style={{ borderColor: customerConfig.color, color: customerConfig.color }}
              >
                {customerConfig.icon} {customerConfig.label}
              </Badge>
            )}
          </div>

          {/* WhatsApp or Phone (instead of email) */}
          {dossier.lead_phone && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {dossier.lead_phone}
            </p>
          )}

          {/* Info row: destination, pax, duration, offers count */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {dossier.destination_countries?.length > 0 && (
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
            {dossier.trips_count > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {dossier.trips_count} offre{dossier.trips_count > 1 ? 's' : ''}
              </span>
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

          {/* Footer: Created at */}
          <div className="flex items-center justify-end pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(dossier.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>

          {/* Tags */}
          {dossier.tags && dossier.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dossier.tags.slice(0, 3).map((tag: string) => (
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
