'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  CalendarDots,
  UsersThree,
  PencilSimple,
  Minus,
  Plus,
  FloppyDisk,
  X,
  AirplaneTilt,
} from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateDossierDates, updateDossierPaxCount } from '@/lib/actions/client-modifications'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripSummaryBannerProps {
  dossierId: string
  participantId: string
  participantName: string
  isLead: boolean
  departureDateFrom: string | null
  departureDateTo: string | null
  durationDays: number | null
  paxAdults: number
  paxTeens: number
  paxChildren: number
  paxInfants: number
  continentTheme: ContinentTheme
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return 'Dates à confirmer'
  if (from && !to) return `Arrivée le ${formatDateFr(from)}`
  if (!from && to) return `Départ le ${formatDateFr(to)}`
  return `${formatDateFr(from)} — ${formatDateFr(to)}`
}

function formatPaxSummary(adults: number, teens: number, children: number, infants: number): string {
  const parts: string[] = []
  if (adults > 0) parts.push(`${adults} adulte${adults > 1 ? 's' : ''}`)
  if (teens > 0) parts.push(`${teens} ado${teens > 1 ? 's' : ''}`)
  if (children > 0) parts.push(`${children} enfant${children > 1 ? 's' : ''}`)
  if (infants > 0) parts.push(`${infants} bébé${infants > 1 ? 's' : ''}`)
  return parts.join(', ') || 'À préciser'
}

function calcDuration(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  const diff = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
}

function calcDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

// ─── Stepper component ──────────────────────────────────────────────────────

function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={14} weight="bold" />
        </button>
        <span className="w-8 text-center font-semibold text-gray-800 text-sm">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TripSummaryBanner({
  dossierId,
  participantId,
  participantName,
  isLead,
  departureDateFrom,
  departureDateTo,
  durationDays,
  paxAdults,
  paxTeens,
  paxChildren,
  paxInfants,
  continentTheme,
}: TripSummaryBannerProps) {
  // ─── Edit dates dialog ─────────────────────────────────────────────────────
  const [dateDialogOpen, setDateDialogOpen] = useState(false)
  const [editDateFrom, setEditDateFrom] = useState(departureDateFrom || '')
  const [editDateTo, setEditDateTo] = useState(departureDateTo || '')
  const [editDuration, setEditDuration] = useState<number | ''>(durationDays || '')
  const [isPendingDates, startTransitionDates] = useTransition()

  // Bidirectional: arrival date changed → recalc duration (if departure exists)
  const handleArrivalChange = (val: string) => {
    setEditDateFrom(val)
    if (val && editDateTo) {
      const d = calcDuration(val, editDateTo)
      if (d && d > 0) setEditDuration(d)
    }
  }

  // Bidirectional: departure date changed → recalc duration (if arrival exists)
  const handleDepartureChange = (val: string) => {
    setEditDateTo(val)
    if (editDateFrom && val) {
      const d = calcDuration(editDateFrom, val)
      if (d && d > 0) setEditDuration(d)
    }
  }

  // Bidirectional: duration changed → recalc departure date (if arrival exists)
  const handleDurationChange = (val: number | '') => {
    setEditDuration(val)
    if (editDateFrom && typeof val === 'number' && val > 0) {
      const arrival = new Date(editDateFrom + 'T00:00:00')
      arrival.setDate(arrival.getDate() + val - 1)
      const yyyy = arrival.getFullYear()
      const mm = String(arrival.getMonth() + 1).padStart(2, '0')
      const dd = String(arrival.getDate()).padStart(2, '0')
      setEditDateTo(`${yyyy}-${mm}-${dd}`)
    }
  }

  const handleSaveDates = () => {
    startTransitionDates(async () => {
      const duration = typeof editDuration === 'number' ? editDuration : calcDuration(editDateFrom || null, editDateTo || null)
      await updateDossierDates({
        dossierId,
        participantId,
        participantName,
        departureDateFrom: editDateFrom || null,
        departureDateTo: editDateTo || null,
        durationDays: duration,
      })
      setDateDialogOpen(false)
    })
  }

  // ─── Edit pax dialog ───────────────────────────────────────────────────────
  const [paxDialogOpen, setPaxDialogOpen] = useState(false)
  const [editAdults, setEditAdults] = useState(paxAdults)
  const [editTeens, setEditTeens] = useState(paxTeens)
  const [editChildren, setEditChildren] = useState(paxChildren)
  const [editInfants, setEditInfants] = useState(paxInfants)
  const [isPendingPax, startTransitionPax] = useTransition()

  const handleSavePax = () => {
    startTransitionPax(async () => {
      await updateDossierPaxCount({
        dossierId,
        participantId,
        participantName,
        paxAdults: editAdults,
        paxTeens: editTeens,
        paxChildren: editChildren,
        paxInfants: editInfants,
      })
      setPaxDialogOpen(false)
    })
  }

  // Reset forms when opening dialogs
  const openDateDialog = () => {
    setEditDateFrom(departureDateFrom || '')
    setEditDateTo(departureDateTo || '')
    setEditDuration(durationDays || calcDuration(departureDateFrom, departureDateTo) || '')
    setDateDialogOpen(true)
  }

  const openPaxDialog = () => {
    setEditAdults(paxAdults)
    setEditTeens(paxTeens)
    setEditChildren(paxChildren)
    setEditInfants(paxInfants)
    setPaxDialogOpen(true)
  }

  const totalPax = paxAdults + paxTeens + paxChildren + paxInfants
  const daysUntilDeparture = useMemo(() => calcDaysUntil(departureDateFrom), [departureDateFrom])
  const showCountdown = daysUntilDeparture !== null && daysUntilDeparture > 0

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-stretch gap-4">
        {/* Left: Dates + Pax */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Dates row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <CalendarDots size={20} weight="duotone" className="flex-shrink-0" style={{ color: continentTheme.primary }} />
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-800">
                  {formatDateRange(departureDateFrom, departureDateTo)}
                </span>
                {(durationDays || calcDuration(departureDateFrom, departureDateTo)) && (
                  <span
                    className="ml-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${continentTheme.primary}12`,
                      color: continentTheme.primary,
                    }}
                  >
                    {durationDays || calcDuration(departureDateFrom, departureDateTo)} jours
                  </span>
                )}
              </div>
            </div>
            {isLead && (
              <button
                onClick={openDateDialog}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                title="Modifier les dates"
              >
                <PencilSimple size={16} weight="duotone" />
              </button>
            )}
          </div>

          {/* Pax row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <UsersThree size={20} weight="duotone" className="flex-shrink-0" style={{ color: continentTheme.primary }} />
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-800">
                  {formatPaxSummary(paxAdults, paxTeens, paxChildren, paxInfants)}
                </span>
                {totalPax > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({totalPax} voyageur{totalPax > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>
            {isLead && (
              <button
                onClick={openPaxDialog}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                title="Modifier la composition"
              >
                <PencilSimple size={16} weight="duotone" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Countdown */}
        {showCountdown && (
          <>
            <div className="w-px bg-gray-100 self-stretch flex-shrink-0" />
            <div className="flex flex-col items-center justify-center px-3 flex-shrink-0 min-w-[100px]">
              <AirplaneTilt
                size={20}
                weight="duotone"
                style={{ color: continentTheme.primary }}
                className="mb-1.5"
              />
              <span
                className="text-2xl font-bold font-display leading-none"
                style={{ color: continentTheme.primary }}
              >
                {daysUntilDeparture}
              </span>
              <span className="text-[11px] text-gray-400 mt-1 font-medium">
                jour{daysUntilDeparture > 1 ? 's' : ''}
              </span>
              <span
                className="text-[10px] font-medium mt-0.5"
                style={{ color: continentTheme.primary, opacity: 0.7 }}
              >
                avant le départ
              </span>
            </div>
          </>
        )}
      </div>

      {/* ─── Edit Dates Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier les dates de voyage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-sm">Date d'arrivée</Label>
              <Input
                id="date-from"
                type="date"
                value={editDateFrom}
                onChange={(e) => handleArrivalChange(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-sm">Date de départ</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={editDateTo}
                  onChange={(e) => handleDepartureChange(e.target.value)}
                  min={editDateFrom || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm">Durée (jours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={365}
                  value={editDuration}
                  onChange={(e) => handleDurationChange(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="—"
                />
              </div>
            </div>
            {editDateFrom && editDateTo && typeof editDuration === 'number' && (
              <p className="text-xs text-gray-400">
                La durée et la date de départ sont liées : modifier l'un recalcule l'autre.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDateDialogOpen(false)}
              disabled={isPendingDates}
            >
              <X size={14} className="mr-1.5" />
              Annuler
            </Button>
            <Button
              onClick={handleSaveDates}
              disabled={isPendingDates}
              style={{ backgroundColor: continentTheme.primary }}
              className="text-white"
            >
              <FloppyDisk size={14} className="mr-1.5" />
              {isPendingDates ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Pax Dialog ────────────────────────────────────────────────── */}
      <Dialog open={paxDialogOpen} onOpenChange={setPaxDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier la composition du groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <NumberStepper label="Adultes" value={editAdults} onChange={setEditAdults} />
            <NumberStepper label="Adolescents (12-17 ans)" value={editTeens} onChange={setEditTeens} />
            <NumberStepper label="Enfants (2-11 ans)" value={editChildren} onChange={setEditChildren} />
            <NumberStepper label="Bébés (0-2 ans)" value={editInfants} onChange={setEditInfants} />
            <div className="pt-2 border-t border-gray-100 text-sm text-gray-500">
              Total : {editAdults + editTeens + editChildren + editInfants} voyageur{(editAdults + editTeens + editChildren + editInfants) > 1 ? 's' : ''}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaxDialogOpen(false)}
              disabled={isPendingPax}
            >
              <X size={14} className="mr-1.5" />
              Annuler
            </Button>
            <Button
              onClick={handleSavePax}
              disabled={isPendingPax || (editAdults + editTeens + editChildren + editInfants) === 0}
              style={{ backgroundColor: continentTheme.primary }}
              className="text-white"
            >
              <FloppyDisk size={14} className="mr-1.5" />
              {isPendingPax ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
