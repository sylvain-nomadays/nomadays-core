'use client'

import { useState, useTransition } from 'react'
import { MapTrifold, PaperPlaneTilt, CheckCircle, Info } from '@phosphor-icons/react'
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
import { addPastTrip } from '@/lib/actions/traveler-wishlists'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PastTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantId: string
  onTripAdded?: (countryCode: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PastTripDialog({
  open,
  onOpenChange,
  participantId,
  onTripAdded,
}: PastTripDialogProps) {
  const [countryCode, setCountryCode] = useState('')
  const [isNomadays, setIsNomadays] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!countryCode) {
      setError('Veuillez selectionner un pays')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await addPastTrip(participantId, countryCode, isNomadays, note || undefined)
      if (result.error) {
        setError(result.error)
        return
      }
      onOpenChange(false)
      setCountryCode('')
      setIsNomadays(false)
      setNote('')
      onTripAdded?.(countryCode)
    })
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setCountryCode('')
      setIsNomadays(false)
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
            <MapTrifold size={22} weight="duotone" className="text-[#8BA080]" />
            Ajouter un ancien voyage
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Enrichissez votre carte du monde avec vos voyages precedents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Country selection */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium">
              Quel pays avez-vous visite ? *
            </Label>
            <CountryCombobox
              value={countryCode}
              onChange={setCountryCode}
              placeholder="Rechercher un pays..."
            />
          </div>

          {/* Nomadays toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Etait-ce un voyage Nomadays ?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Pas Nomadays */}
              <button
                type="button"
                onClick={() => setIsNomadays(false)}
                className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  !isNomadays
                    ? 'border-[#8BA080] bg-[#8BA080]/5 text-[#8BA080]'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {!isNomadays && (
                  <CheckCircle size={16} weight="fill" className="absolute top-2 right-2 text-[#8BA080]" />
                )}
                <span className="text-lg">🌍</span>
                <span>Pas Nomadays</span>
              </button>

              {/* Voyage Nomadays */}
              <button
                type="button"
                onClick={() => setIsNomadays(true)}
                className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  isNomadays
                    ? 'border-[#0FB6BC] bg-[#0FB6BC]/5 text-[#0FB6BC]'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {isNomadays && (
                  <CheckCircle size={16} weight="fill" className="absolute top-2 right-2 text-[#0FB6BC]" />
                )}
                <span className="text-lg">✈️</span>
                <span>Voyage Nomadays</span>
              </button>
            </div>

            {/* Info message based on choice */}
            <div className={`flex items-start gap-2 text-[11px] rounded-lg px-3 py-2 ${
              isNomadays
                ? 'text-[#0FB6BC] bg-[#0FB6BC]/5'
                : 'text-gray-500 bg-gray-50'
            }`}>
              <Info size={14} weight="duotone" className="flex-shrink-0 mt-0.5" />
              {isNomadays ? (
                <span>Un administrateur Nomadays verifiera ce voyage. Une fois valide, il comptera dans vos points fidelite.</span>
              ) : (
                <span>Ce voyage sera ajoute directement a votre carte du monde.</span>
              )}
            </div>
          </div>

          {/* Note / souvenir */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              Un souvenir ? <span className="text-gray-400 font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce que vous avez aime, un moment fort..."
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
              style={{ backgroundColor: '#8BA080' }}
            >
              {isPending ? (
                <span className="animate-pulse">Ajout en cours...</span>
              ) : (
                <>
                  <PaperPlaneTilt size={16} weight="duotone" />
                  Ajouter
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
