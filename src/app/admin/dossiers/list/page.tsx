import { Suspense } from 'react'
import { getDossiers, getUrgentDossiers, getAdvisors } from '@/lib/actions/dossiers'
import { DossiersListView } from '@/components/dossiers/dossiers-list-view'
import { UrgentDossiers } from '@/components/dossiers/urgent-dossiers'
import { DossiersFilters } from '@/components/dossiers/dossiers-filters'
import { Button } from '@/components/ui/button'
import { Plus, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import type { DossierStatus, MarketingSource } from '@/lib/supabase/database.types'

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-muted animate-pulse rounded-lg" />
      <div className="h-96 bg-muted animate-pulse rounded-lg" />
    </div>
  )
}

// Urgent section component
async function UrgentSection() {
  const urgentData = await getUrgentDossiers()
  const hasUrgent = urgentData.hot.length > 0 || urgentData.newLeads.length > 0 || urgentData.inactive.length > 0

  if (!hasUrgent) return null

  return <UrgentDossiers data={urgentData} />
}

// Main list component
async function DossiersList({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const advisors = await getAdvisors()

  // Parse filters from URL
  const filters = {
    search: typeof searchParams.search === 'string' ? searchParams.search : undefined,
    status: searchParams.status
      ? (Array.isArray(searchParams.status) ? searchParams.status : [searchParams.status]) as DossierStatus[]
      : undefined,
    advisorId: typeof searchParams.advisor === 'string' ? searchParams.advisor : undefined,
    language: typeof searchParams.language === 'string' ? searchParams.language : undefined,
    marketingSource: typeof searchParams.source === 'string' ? searchParams.source as MarketingSource : undefined,
    dateFrom: typeof searchParams.from === 'string' ? searchParams.from : undefined,
    dateTo: typeof searchParams.to === 'string' ? searchParams.to : undefined,
    limit: 50,
    offset: typeof searchParams.page === 'string' ? (parseInt(searchParams.page) - 1) * 50 : 0,
  }

  const { data: dossiers, count } = await getDossiers(filters)

  return (
    <>
      <DossiersFilters advisors={advisors} />
      <DossiersListView dossiers={dossiers || []} totalCount={count || 0} />
    </>
  )
}

export default async function DossiersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dossiers</h1>
          <p className="text-muted-foreground">Liste des demandes et voyages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dossiers">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Pipeline
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

      {/* Urgent Section */}
      <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
        <UrgentSection />
      </Suspense>

      {/* Main List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <DossiersList searchParams={params} />
      </Suspense>
    </div>
  )
}
