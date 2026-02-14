'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import Link from 'next/link'
import type { DestinationAgency, ExplorerContinent } from '@/lib/types/explorer'
import { ExplorerMapDynamic } from './index'
import { ExplorerSearchBar } from './ExplorerSearchBar'
import { AgencyPanel } from './AgencyPanel'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

interface ExplorerViewProps {
  agencies: DestinationAgency[]
  participantId: string
  wishCountryCodes: string[]
}

export function ExplorerView({
  agencies,
  participantId,
  wishCountryCodes,
}: ExplorerViewProps) {
  const [search, setSearch] = useState('')
  const [activeContinent, setActiveContinent] = useState<ExplorerContinent | 'all'>('all')
  const [selectedAgency, setSelectedAgency] = useState<DestinationAgency | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  // ─── Filtered agencies ─────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = agencies

    // Continent filter
    if (activeContinent !== 'all') {
      result = result.filter((a) => a.continent === activeContinent)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.country_name.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.tagline?.toLowerCase().includes(q)
      )
    }

    return result
  }, [agencies, activeContinent, search])

  const filteredIds = useMemo(() => new Set(filtered.map((a) => a.id)), [filtered])

  // ─── Handlers ──────────────────────────────────────────────────

  const handleSelectAgency = useCallback((agency: DestinationAgency) => {
    setSelectedAgency(agency)
    // On mobile, open the sheet
    if (window.innerWidth < 900) {
      setMobileSheetOpen(true)
    }
  }, [])

  const isWished = selectedAgency
    ? wishCountryCodes.includes(selectedAgency.country_code.toUpperCase())
    : false

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar: back + search */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
        <Link
          href="/client"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Retour
        </Link>
        <div className="h-5 w-px bg-gray-200" />
        <h1 className="font-display font-bold text-lg text-gray-800">
          Explorer les destinations
        </h1>
      </div>

      {/* Search + continent filters */}
      <ExplorerSearchBar
        search={search}
        onSearchChange={setSearch}
        activeContinent={activeContinent}
        onContinentChange={setActiveContinent}
        resultCount={filtered.length}
      />

      {/* Main: map + panel */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 min-h-0 p-2">
          <ExplorerMapDynamic
            agencies={agencies}
            filteredIds={filteredIds}
            filteredAgencies={filtered}
            selectedAgencyId={selectedAgency?.id ?? null}
            onSelectAgency={handleSelectAgency}
          />
        </div>

        {/* Agency panel — desktop only */}
        <div className="hidden min-[900px]:flex w-[420px] flex-shrink-0 border-l border-gray-100 bg-white">
          <AgencyPanel
            agency={selectedAgency}
            participantId={participantId}
            isWished={isWished}
          />
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <AgencyPanel
            agency={selectedAgency}
            participantId={participantId}
            isWished={isWished}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
