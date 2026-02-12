'use client'

import { useState, useTransition } from 'react'
import { PipelineColumn } from './pipeline-column'
import { PIPELINE_STATUSES } from '@/lib/constants'
import { updateDossierStatus } from '@/lib/actions/dossiers'
import { toast } from 'sonner'
import type { DossierStatus } from '@/lib/supabase/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DossierRow = Record<string, any>

interface PipelineBoardProps {
  initialDossiers: Record<DossierStatus, DossierRow[]>
}

export function PipelineBoard({ initialDossiers }: PipelineBoardProps) {
  const [dossiers, setDossiers] = useState(initialDossiers)
  const [isPending, startTransition] = useTransition()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatus: DossierStatus) => {
    e.preventDefault()
    const dossierId = e.dataTransfer.getData('dossierId')
    const currentStatus = e.dataTransfer.getData('currentStatus') as DossierStatus

    if (!dossierId || currentStatus === newStatus) return

    // Optimistic update
    const dossierToMove = dossiers[currentStatus]?.find((d) => d.id === dossierId)
    if (!dossierToMove) return

    setDossiers((prev) => ({
      ...prev,
      [currentStatus]: prev[currentStatus]?.filter((d) => d.id !== dossierId) || [],
      [newStatus]: [...(prev[newStatus] || []), { ...dossierToMove, status: newStatus }],
    }))

    // Server update
    startTransition(async () => {
      try {
        await updateDossierStatus(dossierId, newStatus)
        toast.success('Statut mis à jour')
      } catch {
        // Revert on error
        setDossiers((prev) => ({
          ...prev,
          [newStatus]: prev[newStatus]?.filter((d) => d.id !== dossierId) || [],
          [currentStatus]: [...(prev[currentStatus] || []), dossierToMove],
        }))
        toast.error('Erreur lors de la mise à jour')
      }
    })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STATUSES.map((status) => (
        <PipelineColumn
          key={status.value}
          status={status}
          dossiers={dossiers[status.value] || []}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}
