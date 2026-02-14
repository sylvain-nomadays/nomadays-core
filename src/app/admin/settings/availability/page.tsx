'use client'

import { useState, useEffect, useTransition } from 'react'
import { Clock, Calendar, Trash2, Plus, Phone, X, Globe } from 'lucide-react'
import { toast } from 'sonner'
import {
  getAdvisorAvailability,
  saveAdvisorAvailability,
  getBlockedDates,
  addBlockedDates,
  removeBlockedDates,
  getAdvisorAppointments,
  cancelAppointmentByAdvisor,
  type AdvisorSchedule,
  type BlockedDateRange,
  type AppointmentInfo,
} from '@/lib/actions/appointments'
import { createClient } from '@/lib/supabase/client'

// ─── Common timezones ────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (UTC+7)' },
  { value: 'Asia/Phnom_Penh', label: 'Phnom Penh (UTC+7)' },
  { value: 'Asia/Vientiane', label: 'Vientiane (UTC+7)' },
  { value: 'Asia/Yangon', label: 'Yangon (UTC+6:30)' },
  { value: 'Asia/Jakarta', label: 'Jakarta (UTC+7)' },
  { value: 'Asia/Colombo', label: 'Colombo (UTC+5:30)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (UTC+5:30)' },
  { value: 'Asia/Kathmandu', label: 'Katmandou (UTC+5:45)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (UTC+3)' },
  { value: 'Africa/Dar_es_Salaam', label: 'Dar es Salaam (UTC+3)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+2)' },
  { value: 'Africa/Casablanca', label: 'Casablanca (UTC+1)' },
  { value: 'Indian/Antananarivo', label: 'Antananarivo (UTC+3)' },
  { value: 'America/Costa_Rica', label: 'San José (UTC-6)' },
  { value: 'America/Lima', label: 'Lima (UTC-5)' },
  { value: 'America/Mexico_City', label: 'Mexico (UTC-6)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-4)' },
]

const BLOCKED_REASONS = [
  { value: 'vacation', label: 'Vacances' },
  { value: 'sick_leave', label: 'Arrêt maladie' },
  { value: 'training', label: 'Formation' },
  { value: 'other', label: 'Autre' },
]

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  // Current user
  const [userId, setUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Schedule
  const [schedule, setSchedule] = useState<AdvisorSchedule | null>(null)
  const [isSaving, startSaveTransition] = useTransition()

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([])
  const [showAddBlocked, setShowAddBlocked] = useState(false)
  const [newBlockedFrom, setNewBlockedFrom] = useState('')
  const [newBlockedTo, setNewBlockedTo] = useState('')
  const [newBlockedReason, setNewBlockedReason] = useState('vacation')

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentInfo[]>([])

  // ── Load current user + data ──
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user info (tenant_id)
        const { data: userData } = await (supabase
          .from('users') as any)
          .select('id, tenant_id')
          .eq('id', user.id)
          .single() as { data: { id: string; tenant_id: string } | null }

        if (!userData) return

        setUserId(userData.id)
        setTenantId(userData.tenant_id)

        // Fetch data in parallel
        const [scheduleResult, blockedResult, appointmentsResult] = await Promise.all([
          getAdvisorAvailability(userData.id),
          getBlockedDates(userData.id),
          getAdvisorAppointments(userData.id),
        ])

        if (scheduleResult.schedule) setSchedule(scheduleResult.schedule)
        setBlockedDates(blockedResult.blockedDates)
        setAppointments(appointmentsResult.appointments)
      } catch (err) {
        console.error('Error loading availability:', err)
        toast.error('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save schedule ──
  const handleSave = () => {
    if (!userId || !tenantId || !schedule) return

    startSaveTransition(async () => {
      const result = await saveAdvisorAvailability(userId, tenantId, {
        timezone: schedule.timezone,
        days: schedule.days.map(d => ({
          day: d.day,
          enabled: d.enabled,
          start: d.start,
          end: d.end,
        })),
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Disponibilités enregistrées')
      }
    })
  }

  // ── Toggle day ──
  const toggleDay = (dayIndex: number) => {
    if (!schedule) return
    const current = schedule.days[dayIndex]
    if (!current) return
    const newEnabled = !current.enabled
    const newDays = schedule.days.map((d, i) =>
      i === dayIndex
        ? { day: d.day, label: d.label, enabled: newEnabled, start: newEnabled ? '09:00' : null, end: newEnabled ? '18:00' : null }
        : d
    )
    setSchedule({ ...schedule, days: newDays })
  }

  // ── Update time ──
  const updateTime = (dayIndex: number, field: 'start' | 'end', value: string) => {
    if (!schedule) return
    const newDays = schedule.days.map((d, i) =>
      i === dayIndex
        ? { day: d.day, label: d.label, enabled: d.enabled, start: field === 'start' ? value : d.start, end: field === 'end' ? value : d.end }
        : d
    )
    setSchedule({ ...schedule, days: newDays })
  }

  // ── Add blocked date ──
  const handleAddBlocked = async () => {
    if (!userId || !tenantId || !newBlockedFrom || !newBlockedTo) return

    const result = await addBlockedDates(userId, tenantId, newBlockedFrom, newBlockedTo, newBlockedReason)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Période d\'absence ajoutée')
      setShowAddBlocked(false)
      setNewBlockedFrom('')
      setNewBlockedTo('')
      // Refresh
      const refreshed = await getBlockedDates(userId)
      setBlockedDates(refreshed.blockedDates)
    }
  }

  // ── Remove blocked date ──
  const handleRemoveBlocked = async (id: string) => {
    const result = await removeBlockedDates(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Période supprimée')
      setBlockedDates(prev => prev.filter(b => b.id !== id))
    }
  }

  // ── Cancel appointment ──
  const handleCancelAppointment = async (id: string) => {
    const result = await cancelAppointmentByAdvisor(id, 'Annulé par le conseiller')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Rendez-vous annulé')
      setAppointments(prev => prev.filter(a => a.id !== id))
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-100 rounded w-64" />
          <div className="h-64 bg-gray-50 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Erreur lors du chargement des disponibilités.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#0FB6BC]" />
          Mes disponibilités
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurez vos horaires de travail pour permettre à vos clients de prendre rendez-vous.
        </p>
      </div>

      {/* ── Timezone ── */}
      <div className="mb-8 bg-white rounded-2xl border border-gray-100 p-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
          <Globe className="w-4 h-4 text-gray-500" />
          Fuseau horaire
        </label>
        <select
          value={schedule.timezone}
          onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}
          className="w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC] focus:border-transparent"
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* ── Weekly schedule ── */}
      <div className="mb-8 bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
          <Clock className="w-4 h-4 text-gray-500" />
          Horaires hebdomadaires
        </h2>

        <div className="space-y-3">
          {schedule.days.map((day, idx) => (
            <div
              key={day.day}
              className="flex items-center gap-4 py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {/* Toggle */}
              <button
                onClick={() => toggleDay(idx)}
                className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                  day.enabled ? 'bg-[#0FB6BC]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    day.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>

              {/* Day label */}
              <span className={`w-24 text-sm font-medium ${day.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                {day.label}
              </span>

              {/* Time inputs */}
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.start || '09:00'}
                    onChange={(e) => updateTime(idx, 'start', e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                  />
                  <span className="text-gray-400 text-sm">→</span>
                  <input
                    type="time"
                    value={day.end || '18:00'}
                    onChange={(e) => updateTime(idx, 'end', e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-300 italic">Jour de repos</span>
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#0FB6BC' }}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les horaires'}
          </button>
        </div>
      </div>

      {/* ── Blocked dates ── */}
      <div className="mb-8 bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <X className="w-4 h-4 text-gray-500" />
            Périodes d&apos;absence
          </h2>
          <button
            onClick={() => setShowAddBlocked(!showAddBlocked)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#0FB6BC] hover:opacity-80 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>

        {/* Add form */}
        {showAddBlocked && (
          <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Du</label>
              <input
                type="date"
                value={newBlockedFrom}
                onChange={(e) => setNewBlockedFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Au</label>
              <input
                type="date"
                value={newBlockedTo}
                onChange={(e) => setNewBlockedTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Raison</label>
              <select
                value={newBlockedReason}
                onChange={(e) => setNewBlockedReason(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
              >
                {BLOCKED_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddBlocked}
              disabled={!newBlockedFrom || !newBlockedTo}
              className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#0FB6BC' }}
            >
              Ajouter
            </button>
          </div>
        )}

        {/* List */}
        {blockedDates.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune période d&apos;absence configurée.</p>
        ) : (
          <div className="space-y-2">
            {blockedDates.map(bd => (
              <div key={bd.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(bd.dateFrom + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(bd.dateTo + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {bd.reason && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      {BLOCKED_REASONS.find(r => r.value === bd.reason)?.label || bd.reason}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveBlocked(bd.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Upcoming appointments ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
          <Phone className="w-4 h-4 text-gray-500" />
          Prochains rendez-vous
        </h2>

        {appointments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map(appt => {
              const dateFormatted = new Date(appt.appointmentDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })

              return (
                <div key={appt.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <div className="text-sm font-bold text-gray-800">{dateFormatted}</div>
                      <div className="text-xs text-gray-500">{appt.startTime} — {appt.endTime}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{appt.participantName}</div>
                      {appt.note && (
                        <div className="text-xs text-gray-400 line-clamp-1 max-w-[300px]">{appt.note}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelAppointment(appt.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
