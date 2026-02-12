'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Loader2,
  MapPin,
  Calendar,
  ImageIcon,
  Tag,
  Users,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSelectionOptions, useSelectTrip } from '@/hooks/useTrips'
import type { Trip, SelectionCotation, SelectionEntry } from '@/lib/api/types'
import { toast } from 'sonner'

interface SelectCircuitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** All trips eligible for selection (status sent or confirmed but not yet selected) */
  trips: Trip[]
  /** Pre-select a specific trip (when coming from circuit detail view) */
  preSelectedTripId?: number
  /** Called after successful selection */
  onSuccess?: () => void
}

type Step = 'choose-trip' | 'choose-cotation' | 'choose-pax' | 'confirm'

const TARIFICATION_MODE_LABELS: Record<string, string> = {
  range_web: 'Prix / tranche',
  per_person: 'Par personne',
  per_group: 'Par groupe',
  service_list: 'Multi-groupes',
  enumeration: 'Détail prestations',
}

export function SelectCircuitDialog({
  open,
  onOpenChange,
  trips,
  preSelectedTripId,
  onSuccess,
}: SelectCircuitDialogProps) {
  // State
  const [step, setStep] = useState<Step>('choose-trip')
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [selectedCotationId, setSelectedCotationId] = useState<number | null>(null)
  const [selectedPaxCount, setSelectedPaxCount] = useState<number | null>(null)

  // Hooks
  const { data: selectionOptions, loading: loadingOptions, execute: fetchOptions } = useSelectionOptions(selectedTripId)
  const { mutate: selectTrip, loading: selecting } = useSelectTrip()

  // Eligible trips (draft, sent, quoted or confirmed — not cancelled)
  const eligibleTrips = trips.filter(t =>
    ['draft', 'sent', 'quoted', 'confirmed'].includes(t.status)
  )

  // Derived state
  const selectedTrip = eligibleTrips.find(t => t.id === selectedTripId) || null
  const cotations = selectionOptions?.cotations || []
  const selectedCotation = cotations.find(c => c.id === selectedCotationId) || null

  // Determine which steps are needed
  const needsTripChoice = !preSelectedTripId && eligibleTrips.length > 1
  const needsCotationChoice = cotations.length > 1
  const needsPaxChoice = selectedCotation?.tarification_mode === 'range_web' &&
    selectedCotation.entries.length > 1

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (preSelectedTripId) {
        setSelectedTripId(preSelectedTripId)
        setStep('choose-cotation')
      } else if (eligibleTrips.length === 1) {
        // Auto-select if only one eligible trip
        setSelectedTripId(eligibleTrips[0]!.id)
        setStep('choose-cotation')
      } else {
        setStep('choose-trip')
      }
      setSelectedCotationId(null)
      setSelectedPaxCount(null)
    }
  }, [open, preSelectedTripId, eligibleTrips.length])

  // Auto-advance when options are loaded
  useEffect(() => {
    if (step === 'choose-cotation' && selectionOptions) {
      if (cotations.length === 1) {
        // Auto-select single cotation
        setSelectedCotationId(cotations[0]!.id)
        const cot = cotations[0]!
        if (cot.tarification_mode === 'range_web' && cot.entries.length > 1) {
          setStep('choose-pax')
        } else {
          // Auto-select pax if only one entry
          if (cot.entries.length === 1 && cot.entries[0]?.pax_count) {
            setSelectedPaxCount(cot.entries[0].pax_count)
          }
          setStep('confirm')
        }
      }
    }
  }, [step, selectionOptions, cotations])

  // After selecting cotation, determine next step
  const handleCotationSelect = (cotId: number) => {
    setSelectedCotationId(cotId)
    const cot = cotations.find(c => c.id === cotId)
    if (cot?.tarification_mode === 'range_web' && cot.entries.length > 1) {
      setStep('choose-pax')
    } else {
      if (cot?.entries.length === 1 && cot.entries[0]?.pax_count) {
        setSelectedPaxCount(cot.entries[0].pax_count)
      }
      setStep('confirm')
    }
  }

  const handlePaxSelect = (paxCount: number) => {
    setSelectedPaxCount(paxCount)
    setStep('confirm')
  }

  const handleBack = () => {
    if (step === 'confirm') {
      if (needsPaxChoice) {
        setStep('choose-pax')
      } else if (needsCotationChoice) {
        setStep('choose-cotation')
      } else if (needsTripChoice) {
        setStep('choose-trip')
      }
    } else if (step === 'choose-pax') {
      if (needsCotationChoice) {
        setSelectedCotationId(null)
        setStep('choose-cotation')
      } else if (needsTripChoice) {
        setStep('choose-trip')
      }
    } else if (step === 'choose-cotation') {
      if (needsTripChoice) {
        setSelectedTripId(null)
        setStep('choose-trip')
      }
    }
  }

  const handleConfirm = async () => {
    if (!selectedTripId || !selectedCotationId) return
    try {
      const result = await selectTrip({
        tripId: selectedTripId,
        cotationId: selectedCotationId,
        finalPaxCount: selectedPaxCount || undefined,
      })
      const cancelled = result.other_trips_cancelled
      if (cancelled > 0) {
        toast.success(`Circuit confirmé ! ${cancelled} autre(s) proposition(s) archivée(s).`)
      } else {
        toast.success('Circuit confirmé !')
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error('Failed to select trip:', err)
      toast.error('Erreur lors de la sélection du circuit')
    }
  }

  // Get currently selected pax entry for display
  const selectedPaxEntry = selectedCotation?.entries.find(
    e => e.pax_count === selectedPaxCount
  )

  const canGoBack = (step === 'choose-cotation' && needsTripChoice) ||
    (step === 'choose-pax' && (needsCotationChoice || needsTripChoice)) ||
    (step === 'confirm')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 'choose-trip' && 'Sélectionner un circuit'}
                {step === 'choose-cotation' && 'Choisir la cotation'}
                {step === 'choose-pax' && 'Nombre de participants'}
                {step === 'confirm' && 'Confirmer la sélection'}
              </DialogTitle>
              <DialogDescription>
                {step === 'choose-trip' && 'Choisissez le circuit retenu pour ce dossier'}
                {step === 'choose-cotation' && 'Sélectionnez la formule tarifaire'}
                {step === 'choose-pax' && 'Précisez le nombre final de participants'}
                {step === 'confirm' && 'Vérifiez et confirmez votre sélection'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          {/* Step progress indicator */}
          <StepIndicator
            current={step}
            showTrip={needsTripChoice}
            showCotation={needsCotationChoice}
            showPax={needsPaxChoice}
          />

          {/* Step 1: Choose trip */}
          {step === 'choose-trip' && (
            <div className="space-y-2 mt-4 max-h-[360px] overflow-y-auto">
              {eligibleTrips.map((trip) => {
                const isSelected = selectedTripId === trip.id
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => {
                      setSelectedTripId(trip.id)
                      setStep('choose-cotation')
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-[#0FB6BC] bg-[#E6F9FA] ring-1 ring-[#0FB6BC]/30'
                        : 'border-gray-200 hover:border-[#99E7EB] hover:bg-gray-50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-md bg-gray-100 overflow-hidden">
                      {trip.hero_photo_url ? (
                        <img
                          src={trip.hero_photo_url}
                          alt={trip.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{trip.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {trip.duration_days > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {trip.duration_days}j
                          </span>
                        )}
                        {trip.destination_country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {trip.destination_country}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Choose cotation */}
          {step === 'choose-cotation' && (
            <div className="mt-4">
              {loadingOptions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0FB6BC]" />
                  <span className="ml-2 text-sm text-muted-foreground">Chargement des options...</span>
                </div>
              ) : cotations.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Aucune cotation disponible pour ce circuit.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {cotations.map((cot) => (
                    <button
                      key={cot.id}
                      type="button"
                      onClick={() => handleCotationSelect(cot.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedCotationId === cot.id
                          ? 'border-[#0FB6BC] bg-[#E6F9FA] ring-1 ring-[#0FB6BC]/30'
                          : 'border-gray-200 hover:border-[#99E7EB] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{cot.name}</p>
                          {cot.tarification_mode && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {TARIFICATION_MODE_LABELS[cot.tarification_mode] || cot.tarification_mode}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {cot.price_label && (
                            <p className="text-sm font-semibold text-[#0FB6BC]">{cot.price_label}</p>
                          )}
                          {cot.entries.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cot.entries.length} options de prix
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Choose pax count */}
          {step === 'choose-pax' && selectedCotation && (
            <div className="mt-4">
              <div className="p-3 rounded-lg bg-gray-50 border mb-3">
                <p className="text-xs text-muted-foreground mb-1">Cotation sélectionnée</p>
                <p className="text-sm font-medium">{selectedCotation.name}</p>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                Choisissez le nombre de participants pour calculer le tarif final :
              </p>

              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {selectedCotation.entries.map((entry, idx) => {
                  const isSelected = selectedPaxCount === entry.pax_count
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => entry.pax_count && handlePaxSelect(entry.pax_count)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#0FB6BC] bg-[#E6F9FA] ring-1 ring-[#0FB6BC]/30'
                          : 'border-gray-200 hover:border-[#99E7EB] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-sm">
                            {entry.pax_label || `${entry.pax_count} participants`}
                          </span>
                        </div>
                        {entry.selling_price !== undefined && entry.selling_price !== null && (
                          <span className="text-sm font-semibold text-[#0FB6BC]">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0,
                            }).format(entry.selling_price)}
                            <span className="text-xs font-normal text-muted-foreground"> /pers</span>
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-lg border border-[#0FB6BC] bg-[#E6F9FA]/30">
                <h4 className="text-sm font-semibold text-[#0FB6BC] mb-3">Récapitulatif</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Circuit</span>
                    <span className="font-medium">{selectedTrip?.name}</span>
                  </div>
                  {selectedCotation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cotation</span>
                      <span className="font-medium">{selectedCotation.name}</span>
                    </div>
                  )}
                  {selectedPaxEntry && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Participants</span>
                        <span className="font-medium">
                          {selectedPaxEntry.pax_label || `${selectedPaxEntry.pax_count} pax`}
                        </span>
                      </div>
                      {selectedPaxEntry.selling_price !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prix / personne</span>
                          <span className="font-semibold text-[#0FB6BC]">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0,
                            }).format(selectedPaxEntry.selling_price)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {eligibleTrips.length > 1 && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    Les autres propositions seront automatiquement archivées.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'confirm' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selecting || !selectedTripId || !selectedCotationId}
              className="bg-[#0FB6BC] hover:bg-[#0C9296]"
            >
              {selecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmer la sélection
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Step indicator ──────────────────────────────────────────────
function StepIndicator({
  current,
  showTrip,
  showCotation,
  showPax,
}: {
  current: Step
  showTrip: boolean
  showCotation: boolean
  showPax: boolean
}) {
  const steps: { key: Step; label: string }[] = []
  if (showTrip) steps.push({ key: 'choose-trip', label: 'Circuit' })
  if (showCotation) steps.push({ key: 'choose-cotation', label: 'Cotation' })
  if (showPax) steps.push({ key: 'choose-pax', label: 'Participants' })
  steps.push({ key: 'confirm', label: 'Confirmer' })

  if (steps.length <= 1) return null

  const currentIdx = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((s, idx) => {
        const isCompleted = idx < currentIdx
        const isCurrent = idx === currentIdx
        return (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-[#0FB6BC]'
                    : isCurrent
                    ? 'bg-[#0FB6BC]/40'
                    : 'bg-gray-200'
                }`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
