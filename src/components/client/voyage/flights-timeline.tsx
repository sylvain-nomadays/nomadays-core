'use client'

import { useState, useTransition } from 'react'
import {
  AirplaneTilt,
  AirplaneTakeoff,
  AirplaneLanding,
  Train,
  Bus,
  Car,
  Boat,
  MapPin,
  Plus,
  PencilSimple,
  Trash,
  X,
  CaretDown,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import {
  clientCreateTravelLogistic,
  clientUpdateTravelLogistic,
  clientDeleteTravelLogistic,
} from '@/lib/actions/client-modifications'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TravelLogistic {
  id: string
  type: 'arrival' | 'departure'
  transport_type: string
  transport_info: string | null
  scheduled_datetime: string | null
  location: string | null
  all_participants: boolean
  participant_ids: string[] | null
  notes: string | null
}

interface FlightsTimelineProps {
  logistics: TravelLogistic[]
  continentTheme: ContinentTheme
  dossierId: string
  participantId: string
  participantName: string
  isLead: boolean
  departureDateFrom: string | null
  departureDateTo: string | null
  destinationCountryCode: string | null
}

// ─── Airports by country ─────────────────────────────────────────────────────

const AIRPORTS_BY_COUNTRY: Record<string, { code: string; name: string; city: string }[]> = {
  TH: [
    { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok' },
    { code: 'DMK', name: 'Don Mueang', city: 'Bangkok' },
    { code: 'HKT', name: 'Phuket International', city: 'Phuket' },
    { code: 'CNX', name: 'Chiang Mai International', city: 'Chiang Mai' },
    { code: 'USM', name: 'Koh Samui', city: 'Koh Samui' },
    { code: 'KBV', name: 'Krabi International', city: 'Krabi' },
  ],
  VN: [
    { code: 'SGN', name: 'Tan Son Nhat', city: 'Ho Chi Minh' },
    { code: 'HAN', name: 'Noi Bai', city: 'Hanoi' },
    { code: 'DAD', name: 'Da Nang International', city: 'Da Nang' },
    { code: 'CXR', name: 'Cam Ranh', city: 'Nha Trang' },
    { code: 'PQC', name: 'Phu Quoc', city: 'Phu Quoc' },
  ],
  KH: [
    { code: 'PNH', name: 'Phnom Penh International', city: 'Phnom Penh' },
    { code: 'REP', name: 'Siem Reap International', city: 'Siem Reap' },
  ],
  LA: [
    { code: 'VTE', name: 'Wattay International', city: 'Vientiane' },
    { code: 'LPQ', name: 'Luang Prabang International', city: 'Luang Prabang' },
  ],
  MM: [
    { code: 'RGN', name: 'Yangon International', city: 'Yangon' },
    { code: 'MDL', name: 'Mandalay International', city: 'Mandalay' },
  ],
  ID: [
    { code: 'DPS', name: 'Ngurah Rai', city: 'Bali' },
    { code: 'CGK', name: 'Soekarno-Hatta', city: 'Jakarta' },
    { code: 'JOG', name: 'Adisucipto', city: 'Yogyakarta' },
  ],
  MY: [
    { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur' },
    { code: 'PEN', name: 'Penang International', city: 'Penang' },
    { code: 'LGK', name: 'Langkawi International', city: 'Langkawi' },
  ],
  PH: [
    { code: 'MNL', name: 'Ninoy Aquino', city: 'Manille' },
    { code: 'CEB', name: 'Mactan-Cebu', city: 'Cebu' },
  ],
  JP: [
    { code: 'NRT', name: 'Narita', city: 'Tokyo' },
    { code: 'HND', name: 'Haneda', city: 'Tokyo' },
    { code: 'KIX', name: 'Kansai', city: 'Osaka' },
  ],
  LK: [{ code: 'CMB', name: 'Bandaranaike', city: 'Colombo' }],
  IN: [
    { code: 'DEL', name: 'Indira Gandhi', city: 'New Delhi' },
    { code: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai' },
    { code: 'COK', name: 'Cochin International', city: 'Kochi' },
  ],
  NP: [{ code: 'KTM', name: 'Tribhuvan', city: 'Kathmandu' }],
}

const DEPARTURE_AIRPORTS = [
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris' },
  { code: 'ORY', name: 'Orly', city: 'Paris' },
  { code: 'LYS', name: 'Saint-Exupéry', city: 'Lyon' },
  { code: 'MRS', name: 'Provence', city: 'Marseille' },
  { code: 'NCE', name: 'Côte d\'Azur', city: 'Nice' },
  { code: 'TLS', name: 'Blagnac', city: 'Toulouse' },
  { code: 'BOD', name: 'Mérignac', city: 'Bordeaux' },
  { code: 'NTE', name: 'Atlantique', city: 'Nantes' },
  { code: 'GVA', name: 'Genève', city: 'Genève' },
  { code: 'ZRH', name: 'Zurich', city: 'Zurich' },
  { code: 'BRU', name: 'Bruxelles', city: 'Bruxelles' },
]

// ─── Transport config ────────────────────────────────────────────────────────

type TransportType = 'flight' | 'train' | 'bus' | 'car' | 'boat' | 'other'

const TRANSPORT_CONFIG: Record<TransportType, { label: string; icon: PhosphorIcon }> = {
  flight: { label: 'Vol', icon: AirplaneTilt },
  train: { label: 'Train', icon: Train },
  bus: { label: 'Bus', icon: Bus },
  car: { label: 'Voiture', icon: Car },
  boat: { label: 'Bateau', icon: Boat },
  other: { label: 'Autre', icon: MapPin },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(datetime: string | null) {
  if (!datetime) return null
  const dt = new Date(datetime)
  return {
    date: dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function toDatetimeLocal(datetime: string | null): string {
  if (!datetime) return ''
  const dt = new Date(datetime)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

// ─── Logistic Card ───────────────────────────────────────────────────────────

function LogisticCard({
  item,
  isArrival,
  continentTheme,
  onEdit,
  onDelete,
  isDeleting,
}: {
  item: TravelLogistic
  isArrival: boolean
  continentTheme: ContinentTheme
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const transportType = (item.transport_type || 'flight') as TransportType
  const config = TRANSPORT_CONFIG[transportType] || TRANSPORT_CONFIG.flight
  const Icon = item.transport_type === 'flight'
    ? (isArrival ? AirplaneLanding : AirplaneTakeoff)
    : config.icon
  const iconColor = isArrival ? '#10b981' : '#f59e0b'
  const formatted = formatDateTime(item.scheduled_datetime)

  return (
    <div className="flex gap-4 group">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon size={20} weight="duotone" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 w-px bg-gray-200 my-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="p-4 rounded-xl border border-gray-100 bg-white relative">
          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Modifier"
            >
              <PencilSimple size={14} weight="duotone" />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Supprimer"
            >
              {isDeleting ? (
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
              ) : (
                <Trash size={14} weight="duotone" />
              )}
            </button>
          </div>

          <div className="flex items-start justify-between gap-3 pr-16">
            <div>
              {item.location && (
                <p className="text-lg font-bold text-gray-900">{item.location}</p>
              )}
              {item.transport_info && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 mt-1">
                  {config.label} {item.transport_info}
                </span>
              )}
              {!item.transport_info && item.transport_type !== 'flight' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 mt-1">
                  {config.label}
                </span>
              )}
            </div>
            {formatted && (
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-gray-900">{formatted.date}</p>
                <p className="text-sm text-gray-500 mt-0.5">{formatted.time}</p>
              </div>
            )}
          </div>

          {item.notes && (
            <p className="text-xs text-gray-400 mt-2">{item.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add/Edit Form ───────────────────────────────────────────────────────────

function LogisticForm({
  type,
  editItem,
  continentTheme,
  dossierId,
  participantId,
  participantName,
  departureDateFrom,
  departureDateTo,
  destinationCountryCode,
  onSave,
  onCancel,
}: {
  type: 'arrival' | 'departure'
  editItem: TravelLogistic | null
  continentTheme: ContinentTheme
  dossierId: string
  participantId: string
  participantName: string
  departureDateFrom: string | null
  departureDateTo: string | null
  destinationCountryCode: string | null
  onSave: (item: TravelLogistic) => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [transportType, setTransportType] = useState<TransportType>(
    (editItem?.transport_type as TransportType) || 'flight'
  )
  const [transportInfo, setTransportInfo] = useState(editItem?.transport_info || '')
  const [location, setLocation] = useState(editItem?.location || '')
  const [scheduledDatetime, setScheduledDatetime] = useState(() => {
    if (editItem) return toDatetimeLocal(editItem.scheduled_datetime)
    // Pre-fill date from dossier dates
    const dossierDate = type === 'arrival' ? departureDateFrom : departureDateTo
    if (dossierDate) return `${dossierDate}T12:00`
    return ''
  })
  const [notes, setNotes] = useState(editItem?.notes || '')
  const [showAirportSearch, setShowAirportSearch] = useState(false)
  const [airportSearch, setAirportSearch] = useState('')

  // Airports for search
  const destinationAirports = destinationCountryCode
    ? AIRPORTS_BY_COUNTRY[destinationCountryCode] || []
    : Object.values(AIRPORTS_BY_COUNTRY).flat()

  // For arrivals: show destination airports. For departures: show departure airports
  const suggestedAirports = type === 'arrival' ? destinationAirports : DEPARTURE_AIRPORTS
  const allAirports = [...suggestedAirports, ...(type === 'arrival' ? DEPARTURE_AIRPORTS : destinationAirports)]

  const filteredAirports = airportSearch
    ? allAirports.filter(a =>
        `${a.code} ${a.name} ${a.city}`.toLowerCase().includes(airportSearch.toLowerCase())
      )
    : suggestedAirports

  const handleSubmit = () => {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        if (editItem) {
          const data = await clientUpdateTravelLogistic({
            dossierId,
            participantId,
            participantName,
            logisticId: editItem.id,
            transportType,
            transportInfo: transportInfo || undefined,
            scheduledDatetime: scheduledDatetime || undefined,
            location: location || undefined,
            notes: notes || undefined,
          })
          onSave(data as TravelLogistic)
        } else {
          const data = await clientCreateTravelLogistic({
            dossierId,
            participantId,
            participantName,
            type,
            transportType,
            transportInfo: transportInfo || undefined,
            scheduledDatetime: scheduledDatetime || undefined,
            location: location || undefined,
            notes: notes || undefined,
          })
          onSave(data as TravelLogistic)
        }
      } catch (error: any) {
        console.error('Failed to save logistic:', error)
        setErrorMsg(error?.message || 'Une erreur est survenue. Veuillez réessayer.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">
          {editItem
            ? (type === 'arrival' ? 'Modifier l\'arrivée' : 'Modifier le départ')
            : (type === 'arrival' ? 'Ajouter votre arrivée' : 'Ajouter votre départ')}
        </h4>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Transport type selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Type de transport</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(TRANSPORT_CONFIG) as [TransportType, typeof TRANSPORT_CONFIG[TransportType]][]).map(([key, cfg]) => {
            const TIcon = cfg.icon
            const isActive = transportType === key
            return (
              <button
                key={key}
                onClick={() => setTransportType(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
                style={isActive ? { color: continentTheme.primary } : undefined}
              >
                <TIcon size={14} weight={isActive ? 'duotone' : 'regular'} />
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Flight number */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            N° de {transportType === 'flight' ? 'vol' : transportType === 'train' ? 'train' : 'transport'}
          </label>
          <input
            type="text"
            placeholder="Ex: TG930, AF164..."
            value={transportInfo}
            onChange={(e) => setTransportInfo(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        </div>

        {/* Date & time */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Date et heure</label>
          <input
            type="datetime-local"
            value={scheduledDatetime}
            onChange={(e) => setScheduledDatetime(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Airport / Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">
          {transportType === 'flight'
            ? (type === 'arrival' ? 'Aéroport d\'arrivée' : 'Aéroport de départ')
            : 'Lieu'}
        </label>
        {transportType === 'flight' ? (
          <div className="relative">
            <button
              onClick={() => setShowAirportSearch(!showAirportSearch)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-left"
            >
              <span className={location ? 'text-gray-900' : 'text-gray-400'}>
                {location || 'Sélectionner un aéroport...'}
              </span>
              <CaretDown size={14} className="text-gray-400" />
            </button>
            {showAirportSearch && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                    <MagnifyingGlass size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un aéroport..."
                      value={airportSearch}
                      onChange={(e) => setAirportSearch(e.target.value)}
                      className="flex-1 text-sm bg-transparent outline-none"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredAirports.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">Aucun aéroport trouvé</p>
                  ) : (
                    filteredAirports.map((airport) => (
                      <button
                        key={airport.code}
                        onClick={() => {
                          setLocation(`${airport.code} — ${airport.city}`)
                          setShowAirportSearch(false)
                          setAirportSearch('')
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <span className="font-mono text-xs font-semibold text-gray-500 w-8">{airport.code}</span>
                        <span className="text-gray-700">{airport.city}</span>
                        <span className="text-gray-400 text-xs">— {airport.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <input
            type="text"
            placeholder="Gare, station, lieu..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Notes (optionnel)</label>
        <textarea
          placeholder="Informations complémentaires..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: continentTheme.primary }}
        >
          {isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            editItem ? 'Enregistrer' : 'Ajouter'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FlightsTimeline({
  logistics: initialLogistics,
  continentTheme,
  dossierId,
  participantId,
  participantName,
  isLead,
  departureDateFrom,
  departureDateTo,
  destinationCountryCode,
}: FlightsTimelineProps) {
  const [logistics, setLogistics] = useState(initialLogistics)
  const [showForm, setShowForm] = useState<'arrival' | 'departure' | null>(null)
  const [editingItem, setEditingItem] = useState<TravelLogistic | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const arrivals = logistics.filter(l => l.type === 'arrival')
  const departures = logistics.filter(l => l.type === 'departure')

  const handleSave = (item: TravelLogistic) => {
    if (editingItem) {
      setLogistics(prev => prev.map(l => l.id === editingItem.id ? item : l))
    } else {
      setLogistics(prev => [...prev, item])
    }
    setShowForm(null)
    setEditingItem(null)
  }

  const handleEdit = (item: TravelLogistic) => {
    setEditingItem(item)
    setShowForm(item.type)
  }

  const handleDelete = async (item: TravelLogistic) => {
    setDeletingId(item.id)
    try {
      await clientDeleteTravelLogistic({
        dossierId,
        participantId,
        participantName,
        logisticId: item.id,
      })
      setLogistics(prev => prev.filter(l => l.id !== item.id))
    } catch (error) {
      console.error('Failed to delete logistic:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancel = () => {
    setShowForm(null)
    setEditingItem(null)
  }

  // Empty state
  if (arrivals.length === 0 && departures.length === 0 && !showForm) {
    return (
      <div className="text-center py-16">
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <AirplaneTilt size={24} weight="duotone" className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-500 mb-1">
          Aucun vol n&apos;a encore été renseigné.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Indiquez vos horaires d&apos;arrivée et de départ pour faciliter l&apos;organisation de vos transferts.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowForm('arrival')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#10b981' }}
          >
            <AirplaneLanding size={16} weight="duotone" />
            Ajouter mon arrivée
          </button>
          <button
            onClick={() => setShowForm('departure')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#f59e0b' }}
          >
            <AirplaneTakeoff size={16} weight="duotone" />
            Ajouter mon départ
          </button>
        </div>

        {/* Show form below CTA if one was clicked */}
        {showForm && (
          <div className="mt-6 text-left">
            <LogisticForm
              type={showForm}
              editItem={null}
              continentTheme={continentTheme}
              dossierId={dossierId}
              participantId={participantId}
              participantName={participantName}
              departureDateFrom={departureDateFrom}
              departureDateTo={departureDateTo}
              destinationCountryCode={destinationCountryCode}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ─── Arrivals ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.primary}15` }}
            >
              <AirplaneLanding size={15} weight="duotone" style={{ color: continentTheme.primary }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Arrivée</h3>
          </div>
          {arrivals.length === 0 || isLead ? (
            <button
              onClick={() => { setEditingItem(null); setShowForm('arrival') }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Plus size={14} weight="bold" />
              Ajouter
            </button>
          ) : null}
        </div>

        {arrivals.length > 0 ? (
          <div>
            {arrivals.map((item) => (
              <LogisticCard
                key={item.id}
                item={item}
                isArrival
                continentTheme={continentTheme}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item)}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        ) : !showForm || showForm !== 'arrival' ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
            Aucune arrivée renseignée
          </p>
        ) : null}

        {showForm === 'arrival' && (
          <div className="mt-3">
            <LogisticForm
              type="arrival"
              editItem={editingItem}
              continentTheme={continentTheme}
              dossierId={dossierId}
              participantId={participantId}
              participantName={participantName}
              departureDateFrom={departureDateFrom}
              departureDateTo={departureDateTo}
              destinationCountryCode={destinationCountryCode}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

      {/* ─── Departures ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.accent}15` }}
            >
              <AirplaneTakeoff size={15} weight="duotone" style={{ color: continentTheme.accent }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Départ</h3>
          </div>
          {departures.length === 0 || isLead ? (
            <button
              onClick={() => { setEditingItem(null); setShowForm('departure') }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <Plus size={14} weight="bold" />
              Ajouter
            </button>
          ) : null}
        </div>

        {departures.length > 0 ? (
          <div>
            {departures.map((item) => (
              <LogisticCard
                key={item.id}
                item={item}
                isArrival={false}
                continentTheme={continentTheme}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item)}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        ) : !showForm || showForm !== 'departure' ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
            Aucun départ renseigné
          </p>
        ) : null}

        {showForm === 'departure' && (
          <div className="mt-3">
            <LogisticForm
              type="departure"
              editItem={editingItem}
              continentTheme={continentTheme}
              dossierId={dossierId}
              participantId={participantId}
              participantName={participantName}
              departureDateFrom={departureDateFrom}
              departureDateTo={departureDateTo}
              destinationCountryCode={destinationCountryCode}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>
    </div>
  )
}
