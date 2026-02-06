'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useTransition, useCallback } from 'react'
import { Search, X, ChevronDown, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ACTIVE_STATUSES, MARKETING_SOURCES, LANGUAGES } from '@/lib/constants'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'
import type { DossierStatus } from '@/lib/supabase/database.types'

interface Advisor {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface DossiersFiltersProps {
  advisors: Advisor[]
}

export function DossiersFilters({ advisors }: DossiersFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { role } = useUserRole()

  // Check if user can see marketing source (Nomadays only)
  const canSeeMarketingSource = permissions.canSeeMarketingSource(role)
  const [isPending, startTransition] = useTransition()

  // Local state for controlled inputs
  const [search, setSearch] = useState(searchParams.get('search') || '')

  // Get current filter values from URL
  const currentStatuses = searchParams.getAll('status') as DossierStatus[]
  const currentAdvisor = searchParams.get('advisor') || ''
  const currentLanguage = searchParams.get('language') || ''
  const currentSource = searchParams.get('source') || ''
  const currentFrom = searchParams.get('from') || ''
  const currentTo = searchParams.get('to') || ''

  // Count active filters
  const activeFilterCount = [
    currentStatuses.length > 0,
    currentAdvisor,
    currentLanguage,
    currentSource,
    currentFrom,
    currentTo,
  ].filter(Boolean).length

  // Update URL with new params
  const updateFilters = useCallback((updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      params.delete(key)
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        // Remove param
      } else if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else {
        params.set(key, value)
      }
    })

    // Reset to page 1 when filters change
    params.delete('page')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [pathname, router, searchParams])

  // Handle search
  const handleSearch = useCallback(() => {
    updateFilters({ search: search || null })
  }, [search, updateFilters])

  // Handle status toggle
  const handleStatusToggle = useCallback((status: DossierStatus) => {
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    updateFilters({ status: newStatuses.length > 0 ? newStatuses : null })
  }, [currentStatuses, updateFilters])

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearch('')
    startTransition(() => {
      router.push(pathname)
    })
  }, [pathname, router])

  return (
    <div className="space-y-4">
      {/* Search + Quick filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                updateFilters({ search: null })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Advisor */}
        <Select
          value={currentAdvisor || '_all'}
          onValueChange={(value) => updateFilters({ advisor: value === '_all' ? null : value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous</SelectItem>
            {advisors.map((advisor) => (
              <SelectItem key={advisor.id} value={advisor.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={advisor.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {advisor.first_name?.[0]}{advisor.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {advisor.first_name} {advisor.last_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language */}
        <Select
          value={currentLanguage || '_all'}
          onValueChange={(value) => updateFilters({ language: value === '_all' ? null : value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Langue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Toutes</SelectItem>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <span className="mr-2">{lang.flag}</span>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source - Only visible for Nomadays staff */}
        {canSeeMarketingSource && (
          <Select
            value={currentSource || '_all'}
            onValueChange={(value) => updateFilters({ source: value === '_all' ? null : value })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes</SelectItem>
              {MARKETING_SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[140px]">
              Statut
              {currentStatuses.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {currentStatuses.length}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {ACTIVE_STATUSES.map((status) => (
                <label
                  key={status.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={currentStatuses.includes(status.value)}
                    onCheckedChange={() => handleStatusToggle(status.value)}
                  />
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">{status.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date filters */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={currentFrom}
            onChange={(e) => updateFilters({ from: e.target.value || null })}
            className="w-[140px]"
            placeholder="Du"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={currentTo}
            onChange={(e) => updateFilters({ to: e.target.value || null })}
            className="w-[140px]"
            placeholder="Au"
          />
        </div>

        {/* Reset */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {currentStatuses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Statuts :</span>
          {currentStatuses.map((status) => {
            const config = ACTIVE_STATUSES.find(s => s.value === status)
            return (
              <Badge
                key={status}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => handleStatusToggle(status)}
              >
                <div
                  className="h-2 w-2 rounded-full mr-1.5"
                  style={{ backgroundColor: config?.color }}
                />
                {config?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )
          })}
        </div>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="h-1 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-1/3" />
        </div>
      )}
    </div>
  )
}
