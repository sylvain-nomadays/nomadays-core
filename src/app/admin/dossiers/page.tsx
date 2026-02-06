import { Suspense } from 'react'
import { Plus, LayoutGrid, List, Filter } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PipelineBoard } from '@/components/dossiers/pipeline-board'
import { getDossiersGroupedByStatus, getPipelineStats } from '@/lib/actions/dossiers'
import { PIPELINE_STATUSES } from '@/lib/constants'
import type { DossierStatus } from '@/lib/supabase/database.types'

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STATUSES.map((status) => (
        <div key={status.value} className="flex flex-col min-w-[300px] max-w-[300px] bg-muted/30 rounded-lg">
          <div className="p-3 rounded-t-lg border-b-2 bg-muted/50">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

async function PipelineContent() {
  const [groupedDossiers, stats] = await Promise.all([
    getDossiersGroupedByStatus(),
    getPipelineStats(),
  ])

  // Ensure all statuses have an array
  const normalizedDossiers = PIPELINE_STATUSES.reduce(
    (acc, status) => {
      acc[status.value] = groupedDossiers[status.value] || []
      return acc
    },
    {} as Record<DossierStatus, typeof groupedDossiers[DossierStatus]>
  )

  return (
    <>
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-card rounded-lg border">
        <div className="text-sm">
          <span className="text-muted-foreground">Total actifs : </span>
          <span className="font-semibold">{stats.total || 0}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        {PIPELINE_STATUSES.slice(0, 4).map((status) => (
          <div key={status.value} className="text-sm">
            <span className="text-muted-foreground">{status.label} : </span>
            <span className="font-semibold">{stats[status.value] || 0}</span>
          </div>
        ))}
      </div>

      {/* Pipeline Board */}
      <PipelineBoard initialDossiers={normalizedDossiers} />
    </>
  )
}

export default function DossiersPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dossiers</h1>
          <p className="text-muted-foreground">Pipeline de vente et suivi des dossiers clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dossiers/list">
              <List className="h-4 w-4 mr-2" />
              Liste
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/dossiers/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau dossier
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-4 mb-6">
        <Input placeholder="Rechercher un dossier..." className="max-w-xs" />
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
        </Button>
      </div>

      {/* Pipeline */}
      <Suspense fallback={<PipelineSkeleton />}>
        <PipelineContent />
      </Suspense>
    </div>
  )
}
