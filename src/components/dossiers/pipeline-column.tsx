'use client'

import { DossierCard } from './dossier-card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DossierStatus, Dossier } from '@/lib/supabase/database.types'

interface DossierWithRelations extends Dossier {
  dmc?: { id: string; name: string } | null
  advisor?: { id: string; first_name: string | null; last_name: string | null } | null
  participants?: Array<{
    participant: { id: string; first_name: string; last_name: string } | null
    is_lead: boolean
  }>
}

interface PipelineColumnProps {
  status: {
    value: DossierStatus
    label: string
    color: string
    bgColor: string
  }
  dossiers: DossierWithRelations[]
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, status: DossierStatus) => void
}

export function PipelineColumn({ status, dossiers, onDragOver, onDrop }: PipelineColumnProps) {
  return (
    <div
      className="flex flex-col min-w-[300px] max-w-[300px] bg-muted/30 rounded-lg"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, status.value)}
    >
      {/* Column header */}
      <div className={cn('p-3 rounded-t-lg border-b-2', status.bgColor)}>
        <div className="flex items-center justify-between">
          <h3 className={cn('font-semibold text-sm', status.color)}>{status.label}</h3>
          <Badge variant="secondary" className="text-xs">
            {dossiers.length}
          </Badge>
        </div>
      </div>

      {/* Cards container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
        {dossiers.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            Aucun dossier
          </div>
        ) : (
          dossiers.map((dossier) => (
            <div
              key={dossier.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('dossierId', dossier.id)
                e.dataTransfer.setData('currentStatus', dossier.status)
              }}
            >
              <DossierCard dossier={dossier} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
