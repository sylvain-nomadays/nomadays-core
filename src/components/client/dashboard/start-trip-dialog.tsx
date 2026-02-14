'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Airplane,
  PaperPlaneTilt,
  RocketLaunch,
  CalendarDots,
  CalendarPlus,
  Question,
  GlobeSimple,
  ArrowRight,
} from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { startNewTrip } from '@/lib/actions/explorer'

// ─── Period options (same as AddWishDialog) ─────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'imminent', label: 'Projet imminent', icon: RocketLaunch, color: '#DD9371' },
  { value: 'next_year', label: "L'annee prochaine", icon: CalendarDots, color: '#0FB6BC' },
  { value: 'in_2_years', label: 'Dans 2 ans', icon: CalendarPlus, color: '#8BA080' },
  { value: 'no_idea', label: 'Je ne sais pas', icon: Question, color: '#A3A3A3' },
] as const

// ─── Types ──────────────────────────────────────────────────────────────────

interface StartTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantId: string
  onTripCreated?: (dossierId: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StartTripDialog({
  open,
  onOpenChange,
  participantId,
  onTripCreated,
}: StartTripDialogProps) {
  const [countryCode, setCountryCode] = useState('')
  const [desiredPeriod, setDesiredPeriod] = useState('no_idea')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!countryCode) {
      setError('Veuillez selectionner une destination')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await startNewTrip(participantId, countryCode, desiredPeriod, note || undefined)
      if (result.error) {
        setError(result.error)
        return
      }
      // Success
      onOpenChange(false)
      setCountryCode('')
      setDesiredPeriod('no_idea')
      setNote('')
      if (result.dossierId) {
        onTripCreated?.(result.dossierId)
      }
    })
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setCountryCode('')
      setDesiredPeriod('no_idea')
      setNote('')
      setError(null)
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <Airplane size={22} weight="duotone" className="text-[#0FB6BC]" />
            Repartir en voyage
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Ou avez-vous envie de partir ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Country selection */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium">
              Destination *
            </Label>
            <CountryCombobox
              value={countryCode}
              onChange={setCountryCode}
              placeholder="Rechercher un pays..."
            />
          </div>

          {/* Desired period */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Quand aimeriez-vous partir ?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = desiredPeriod === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDesiredPeriod(option.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      isSelected
                        ? 'border-current bg-gray-50 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    style={isSelected ? { color: option.color, borderColor: option.color } : undefined}
                  >
                    <Icon size={18} weight={isSelected ? 'duotone' : 'regular'} />
                    <span className="leading-tight">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              Une note ? <span className="text-gray-400 font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce que vous aimeriez vivre lors de ce voyage..."
              className="resize-none h-20 text-sm"
              maxLength={500}
            />
            {note.length > 0 && (
              <p className="text-[11px] text-gray-400 text-right">{note.length}/500</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!countryCode || isPending}
              className="flex-1 gap-2"
              style={{ backgroundColor: '#0FB6BC' }}
            >
              {isPending ? (
                <span className="animate-pulse">Creation en cours...</span>
              ) : (
                <>
                  <PaperPlaneTilt size={16} weight="duotone" />
                  C&apos;est parti !
                </>
              )}
            </Button>
          </div>

          {/* Explorer CTA */}
          <Link
            href="/client/explorer"
            onClick={() => handleOpenChange(false)}
            className="flex items-center justify-center gap-2 pt-1 pb-1 text-sm text-gray-400 hover:text-[#0FB6BC] transition-colors group"
          >
            <GlobeSimple size={16} weight="duotone" />
            <span>Vous ne savez pas encore ? <span className="underline underline-offset-2">Explorez nos destinations</span></span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
