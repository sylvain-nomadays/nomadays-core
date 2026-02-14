'use client'

import { useState, useEffect, useTransition } from 'react'
import { CalendarDots, Clock, Phone, Spinner, CheckCircle, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { ContinentTheme } from '../continent-theme'
import {
  getAvailableDates,
  getAvailableSlots,
  bookAppointment,
  type AvailableDate,
  type TimeSlot,
} from '@/lib/actions/appointments'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advisorId: string
  advisorName: string
  dossierId: string
  participantId: string
  participantEmail: string
  participantName: string
  continentTheme: ContinentTheme
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BookingModal({
  open,
  onOpenChange,
  advisorId,
  advisorName,
  dossierId,
  participantId,
  participantEmail,
  participantName,
  continentTheme,
}: BookingModalProps) {
  // State
  const [dates, setDates] = useState<AvailableDate[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [timezone, setTimezone] = useState<string>('Europe/Paris')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Loading states
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Fetch available dates when modal opens ──
  useEffect(() => {
    if (!open || !advisorId) return

    // Reset state
    setSelectedDate(null)
    setSelectedSlot(null)
    setSlots([])
    setNote('')
    setError(null)
    setSuccess(false)

    setLoadingDates(true)
    getAvailableDates(advisorId, 14).then((result) => {
      setDates(result.dates)
      setTimezone(result.timezone)
      if (result.error) setError(result.error)
      setLoadingDates(false)
    })
  }, [open, advisorId])

  // ── Fetch available slots when a date is selected ──
  useEffect(() => {
    if (!selectedDate || !advisorId) return

    setSelectedSlot(null)
    setSlots([])
    setError(null)
    setLoadingSlots(true)

    getAvailableSlots(advisorId, selectedDate).then((result) => {
      setSlots(result.slots)
      if (result.error) setError(result.error)
      setLoadingSlots(false)
    })
  }, [selectedDate, advisorId])

  // ── Book the appointment ──
  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return

    setError(null)
    startTransition(async () => {
      const result = await bookAppointment({
        advisorId,
        dossierId,
        participantId,
        participantName,
        participantEmail,
        date: selectedDate,
        startTime: selectedSlot,
        note: note.trim() || undefined,
      })

      if (result.error) {
        setError(result.error)
        // Refresh slots in case the slot was taken
        const slotsResult = await getAvailableSlots(advisorId, selectedDate)
        setSlots(slotsResult.slots)
        setSelectedSlot(null)
        return
      }

      setSuccess(true)
      toast.success('Rendez-vous confirmé !', {
        description: `Le ${formatDateLong(selectedDate)} à ${selectedSlot}`,
      })

      // Close after a short delay
      setTimeout(() => {
        onOpenChange(false)
      }, 2000)
    })
  }

  // ── Helpers ──
  const formatDateLong = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const availableSlots = slots.filter(s => s.available)
  const hasAvailableSlots = availableSlots.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDots size={22} weight="duotone" style={{ color: continentTheme.primary }} />
            Prendre un rendez-vous
          </DialogTitle>
          <DialogDescription>
            Rendez-vous téléphonique d&apos;1 heure avec {advisorName}
          </DialogDescription>
        </DialogHeader>

        {/* ── Success state ── */}
        {success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.primary}15` }}
            >
              <CheckCircle size={36} weight="duotone" style={{ color: continentTheme.primary }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">Rendez-vous confirmé !</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDate && formatDateLong(selectedDate)} à {selectedSlot}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                Un email de confirmation vous a été envoyé.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* ── Step 1: Date selection ── */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">
                Choisissez une date
              </label>

              {loadingDates ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size={24} className="animate-spin text-gray-400" />
                </div>
              ) : dates.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Aucune date disponible pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {dates.map((d) => (
                    <button
                      key={d.date}
                      disabled={!d.available}
                      onClick={() => setSelectedDate(d.date)}
                      className="flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all"
                      style={{
                        backgroundColor:
                          selectedDate === d.date
                            ? continentTheme.primary
                            : d.available
                              ? '#f9fafb'
                              : 'transparent',
                        color:
                          selectedDate === d.date
                            ? 'white'
                            : d.available
                              ? '#374151'
                              : '#d1d5db',
                        cursor: d.available ? 'pointer' : 'not-allowed',
                        border: selectedDate === d.date
                          ? `2px solid ${continentTheme.primary}`
                          : '2px solid transparent',
                      }}
                    >
                      <span className="text-[10px] font-medium leading-tight">
                        {d.dayOfWeek}
                      </span>
                      <span className="text-lg font-bold leading-tight">
                        {d.dayNumber}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Step 2: Time slot selection ── */}
            {selectedDate && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Choisissez un créneau
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  <Clock size={12} weight="duotone" className="inline mr-1" />
                  Fuseau horaire : {timezone}
                </p>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : !hasAvailableSlots ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    Aucun créneau disponible ce jour.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.start)}
                        className="py-2.5 px-3 rounded-xl text-sm font-medium transition-all text-center"
                        style={{
                          backgroundColor:
                            selectedSlot === slot.start
                              ? continentTheme.primary
                              : slot.available
                                ? '#f9fafb'
                                : '#f3f4f6',
                          color:
                            selectedSlot === slot.start
                              ? 'white'
                              : slot.available
                                ? '#374151'
                                : '#d1d5db',
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          border:
                            selectedSlot === slot.start
                              ? `2px solid ${continentTheme.primary}`
                              : '2px solid transparent',
                        }}
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Optional note ── */}
            {selectedSlot && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Un message pour votre conseiller ? <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: J'aimerais discuter de l'itinéraire dans le nord..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: continentTheme.primary } as any}
                  rows={3}
                />
              </div>
            )}

            {/* ── Error message ── */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <XCircle size={18} weight="duotone" className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ── Confirm button ── */}
            {selectedSlot && (
              <div className="pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: continentTheme.primary }}
                >
                  {isPending ? (
                    <>
                      <Spinner size={16} className="animate-spin" />
                      Réservation en cours...
                    </>
                  ) : (
                    <>
                      <Phone size={16} weight="duotone" />
                      Confirmer le rendez-vous
                    </>
                  )}
                </button>

                {/* Summary */}
                <p className="text-xs text-gray-400 text-center mt-2">
                  {formatDateLong(selectedDate!)} • {selectedSlot} — {(() => {
                    const parts = selectedSlot.split(':').map(Number)
                    const h = parts[0] ?? 0
                    const m = parts[1] ?? 0
                    return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                  })()} • 1h avec {advisorName}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
