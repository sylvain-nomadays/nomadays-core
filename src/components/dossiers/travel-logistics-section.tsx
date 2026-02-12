'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Train,
  Bus,
  Car,
  Ship,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Clock,
  MapPin,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { createTravelLogistic, updateTravelLogistic, deleteTravelLogistic } from '@/lib/actions/travel-logistics'
import { toast } from 'sonner'
import type { TransportType } from '@/lib/supabase/database.types'

// Aéroports par pays (destination)
const AIRPORTS_BY_COUNTRY: Record<string, { code: string; name: string; city: string }[]> = {
  TH: [ // Thaïlande
    { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok' },
    { code: 'DMK', name: 'Don Mueang', city: 'Bangkok' },
    { code: 'HKT', name: 'Phuket International', city: 'Phuket' },
    { code: 'CNX', name: 'Chiang Mai International', city: 'Chiang Mai' },
    { code: 'USM', name: 'Koh Samui', city: 'Koh Samui' },
    { code: 'KBV', name: 'Krabi International', city: 'Krabi' },
  ],
  VN: [ // Vietnam
    { code: 'SGN', name: 'Tan Son Nhat', city: 'Ho Chi Minh' },
    { code: 'HAN', name: 'Noi Bai', city: 'Hanoi' },
    { code: 'DAD', name: 'Da Nang International', city: 'Da Nang' },
    { code: 'CXR', name: 'Cam Ranh', city: 'Nha Trang' },
    { code: 'PQC', name: 'Phu Quoc', city: 'Phu Quoc' },
  ],
  KH: [ // Cambodge
    { code: 'PNH', name: 'Phnom Penh International', city: 'Phnom Penh' },
    { code: 'REP', name: 'Siem Reap International', city: 'Siem Reap' },
  ],
  LA: [ // Laos
    { code: 'VTE', name: 'Wattay International', city: 'Vientiane' },
    { code: 'LPQ', name: 'Luang Prabang International', city: 'Luang Prabang' },
  ],
  MM: [ // Myanmar
    { code: 'RGN', name: 'Yangon International', city: 'Yangon' },
    { code: 'MDL', name: 'Mandalay International', city: 'Mandalay' },
  ],
  ID: [ // Indonésie
    { code: 'DPS', name: 'Ngurah Rai', city: 'Bali' },
    { code: 'CGK', name: 'Soekarno-Hatta', city: 'Jakarta' },
    { code: 'JOG', name: 'Adisucipto', city: 'Yogyakarta' },
  ],
  MY: [ // Malaisie
    { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur' },
    { code: 'PEN', name: 'Penang International', city: 'Penang' },
    { code: 'LGK', name: 'Langkawi International', city: 'Langkawi' },
  ],
  PH: [ // Philippines
    { code: 'MNL', name: 'Ninoy Aquino', city: 'Manille' },
    { code: 'CEB', name: 'Mactan-Cebu', city: 'Cebu' },
  ],
  JP: [ // Japon
    { code: 'NRT', name: 'Narita', city: 'Tokyo' },
    { code: 'HND', name: 'Haneda', city: 'Tokyo' },
    { code: 'KIX', name: 'Kansai', city: 'Osaka' },
  ],
  LK: [ // Sri Lanka
    { code: 'CMB', name: 'Bandaranaike', city: 'Colombo' },
  ],
  IN: [ // Inde
    { code: 'DEL', name: 'Indira Gandhi', city: 'New Delhi' },
    { code: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai' },
    { code: 'COK', name: 'Cochin International', city: 'Kochi' },
  ],
  NP: [ // Népal
    { code: 'KTM', name: 'Tribhuvan', city: 'Kathmandu' },
  ],
}

// Aéroports de départ courants (Europe/Monde)
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
  { code: 'AMS', name: 'Schiphol', city: 'Amsterdam' },
  { code: 'FRA', name: 'Frankfurt', city: 'Francfort' },
  { code: 'LHR', name: 'Heathrow', city: 'Londres' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha' },
]

// Tous les aéroports (pour recherche)
const ALL_DESTINATION_AIRPORTS = Object.values(AIRPORTS_BY_COUNTRY).flat()

interface TravelLogistic {
  id: string
  type: 'arrival' | 'departure'
  transport_type: TransportType
  transport_info: string | null
  scheduled_datetime: string | null
  location: string | null
  all_participants: boolean
  participant_ids: string[] | null
  notes: string | null
}

interface Participant {
  id: string
  first_name: string
  last_name: string
}

interface TravelLogisticsSectionProps {
  dossierId: string
  arrivals: TravelLogistic[]
  departures: TravelLogistic[]
  participants: Participant[]
  enabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  destinationCountry?: string // Code pays ISO (TH, VN, etc.)
  onLogisticsChange?: () => void
  departureDateFrom?: string | null  // Date de départ du dossier (ISO)
  departureDateTo?: string | null    // Date de retour du dossier (ISO)
}

const TRANSPORT_ICONS: Record<TransportType, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  train: <Train className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  boat: <Ship className="h-4 w-4" />,
  other: <MapPin className="h-4 w-4" />,
}

const TRANSPORT_LABELS: Record<TransportType, string> = {
  flight: 'Vol',
  train: 'Train',
  bus: 'Bus',
  car: 'Voiture',
  boat: 'Bateau',
  other: 'Autre',
}

function ParticipantAvatar({ participant }: { participant: Participant }) {
  const initials = `${participant.first_name?.[0] || ''}${participant.last_name?.[0] || ''}`.toUpperCase()
  return (
    <div
      className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-medium ring-2 ring-background"
      title={`${participant.first_name} ${participant.last_name}`}
    >
      {initials}
    </div>
  )
}

function LogisticItem({
  item,
  onEdit,
  onDelete,
  deleting,
  participants
}: {
  item: TravelLogistic
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
  participants: Participant[]
}) {
  // Resolve participant names from IDs
  const assignedParticipants = !item.all_participants && item.participant_ids
    ? item.participant_ids
        .map(id => participants.find(p => p.id === id))
        .filter(Boolean) as Participant[]
    : []

  // For flights, use landing/takeoff icons based on arrival/departure
  const transportIcon = item.transport_type === 'flight'
    ? (item.type === 'arrival'
      ? <PlaneLanding className="h-4 w-4" />
      : <PlaneTakeoff className="h-4 w-4" />)
    : TRANSPORT_ICONS[item.transport_type]

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card group">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
        {transportIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{TRANSPORT_LABELS[item.transport_type]}</span>
          {item.transport_info && (
            <Badge variant="outline" className="text-xs">
              {item.transport_info}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {item.scheduled_datetime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(item.scheduled_datetime), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
        </div>
        {/* Participant avatars */}
        {item.all_participants ? (
          <div className="flex items-center gap-1 mt-1.5">
            <Users className="h-3 w-3 text-muted-foreground mr-0.5" />
            <div className="flex -space-x-1.5">
              {participants.map((p) => (
                <ParticipantAvatar key={p.id} participant={p} />
              ))}
            </div>
          </div>
        ) : assignedParticipants.length > 0 ? (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex -space-x-1.5">
              {assignedParticipants.map((p) => (
                <ParticipantAvatar key={p.id} participant={p} />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground ml-1">
              {assignedParticipants.length}/{participants.length}
            </span>
          </div>
        ) : !item.all_participants ? (
          <p className="text-xs text-muted-foreground mt-1">
            <Users className="h-3 w-3 inline mr-1" />
            Participants spécifiques
          </p>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function TravelLogisticsSection({
  dossierId,
  arrivals: initialArrivals,
  departures: initialDepartures,
  participants,
  enabled,
  onToggleEnabled,
  destinationCountry = 'TH', // Thaïlande par défaut
  onLogisticsChange,
  departureDateFrom,
  departureDateTo
}: TravelLogisticsSectionProps) {
  const [arrivals, setArrivals] = useState(initialArrivals)
  const [departures, setDepartures] = useState(initialDepartures)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<'arrival' | 'departure'>('arrival')
  const [editingItem, setEditingItem] = useState<TravelLogistic | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [transportType, setTransportType] = useState<TransportType>('flight')
  const [transportInfo, setTransportInfo] = useState('')
  const [scheduledDatetime, setScheduledDatetime] = useState('')
  const [arrivalAirport, setArrivalAirport] = useState('')
  const [allParticipants, setAllParticipants] = useState(true)
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [arrivalAirportOpen, setArrivalAirportOpen] = useState(false)

  // Get suggested airports for destination country
  const suggestedAirports = AIRPORTS_BY_COUNTRY[destinationCountry] || ALL_DESTINATION_AIRPORTS.slice(0, 10)

  // Compute which participants are already assigned per type (arrival/departure)
  // A participant is "covered" if they're on a logistic with all_participants=true OR in participant_ids
  const getAssignedParticipantIds = (items: TravelLogistic[]): Set<string> => {
    const assigned = new Set<string>()
    for (const item of items) {
      if (item.all_participants) {
        // All participants are covered by this item
        participants.forEach(p => assigned.add(p.id))
      } else if (item.participant_ids) {
        item.participant_ids.forEach(id => assigned.add(id))
      }
    }
    return assigned
  }

  const assignedArrivalIds = getAssignedParticipantIds(arrivals)
  const assignedDepartureIds = getAssignedParticipantIds(departures)
  const allArrivalsAssigned = participants.length > 0 && participants.every(p => assignedArrivalIds.has(p.id))
  const allDeparturesAssigned = participants.length > 0 && participants.every(p => assignedDepartureIds.has(p.id))

  // For the add/edit form: which participants are available (not yet assigned to another item of the same type)
  const getAvailableParticipants = (type: 'arrival' | 'departure', excludeItemId?: string): Participant[] => {
    const items = type === 'arrival' ? arrivals : departures
    const assigned = new Set<string>()
    for (const item of items) {
      if (excludeItemId && item.id === excludeItemId) continue // Don't count the item being edited
      if (item.all_participants) {
        participants.forEach(p => assigned.add(p.id))
      } else if (item.participant_ids) {
        item.participant_ids.forEach(id => assigned.add(id))
      }
    }
    return participants.filter(p => !assigned.has(p.id))
  }

  const resetForm = () => {
    setTransportType('flight')
    setTransportInfo('')
    setScheduledDatetime('')
    setArrivalAirport('')
    setAllParticipants(true)
    setSelectedParticipantIds([])
    setNotes('')
  }

  const openAddModal = (type: 'arrival' | 'departure') => {
    setAddType(type)
    resetForm()
    // Pre-select most common airport for this country
    const firstAirport = suggestedAirports[0]
    if (type === 'arrival' && firstAirport) {
      setArrivalAirport(`${firstAirport.code} - ${firstAirport.city}`)
    }
    // Pre-fill date from dossier dates (arrival → departure_date_from, departure → departure_date_to)
    const dossierDate = type === 'arrival' ? departureDateFrom : departureDateTo
    if (dossierDate) {
      // datetime-local expects "YYYY-MM-DDThh:mm" format
      // Default to midday if no time provided
      setScheduledDatetime(`${dossierDate}T12:00`)
    }
    // If some participants are already assigned, force "specific" mode
    const available = getAvailableParticipants(type)
    if (available.length < participants.length) {
      setAllParticipants(false)
    }
    setShowAddModal(true)
  }

  const openEditModal = (item: TravelLogistic) => {
    setEditingItem(item)
    setAddType(item.type)
    setTransportType(item.transport_type)
    setTransportInfo(item.transport_info || '')
    // Parse scheduled_datetime for datetime-local input
    if (item.scheduled_datetime) {
      const dt = new Date(item.scheduled_datetime)
      const pad = (n: number) => n.toString().padStart(2, '0')
      setScheduledDatetime(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`)
    } else {
      setScheduledDatetime('')
    }
    setArrivalAirport(item.location || '')
    setAllParticipants(item.all_participants)
    setSelectedParticipantIds(item.participant_ids || [])
    setNotes(item.notes || '')
    setShowAddModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Location = just the destination airport (the only one relevant for the DMC)
      const location = arrivalAirport

      if (editingItem) {
        // UPDATE existing item
        const updatedItem = await updateTravelLogistic(editingItem.id, dossierId, {
          transportType,
          transportInfo: transportInfo || undefined,
          scheduledDatetime: scheduledDatetime || undefined,
          location: location || undefined,
          allParticipants,
          participantIds: allParticipants ? undefined : selectedParticipantIds,
          notes: notes || undefined,
        })

        // Optimistic update
        if (updatedItem) {
          const update = (prev: TravelLogistic[]) =>
            prev.map(item => item.id === editingItem.id ? updatedItem as TravelLogistic : item)
          if (editingItem.type === 'arrival') {
            setArrivals(update)
          } else {
            setDepartures(update)
          }
        }

        toast.success('Modifié avec succès')
      } else {
        // CREATE new item
        const newItem = await createTravelLogistic({
          dossierId,
          type: addType,
          transportType,
          transportInfo: transportInfo || undefined,
          scheduledDatetime: scheduledDatetime || undefined,
          location: location || undefined,
          allParticipants,
          participantIds: allParticipants ? undefined : selectedParticipantIds,
          notes: notes || undefined,
        })

        // Optimistic update
        if (newItem) {
          if (addType === 'arrival') {
            setArrivals(prev => [...prev, newItem as TravelLogistic])
          } else {
            setDepartures(prev => [...prev, newItem as TravelLogistic])
          }
        }

        toast.success(addType === 'arrival' ? 'Arrivée ajoutée' : 'Départ ajouté')
      }

      setShowAddModal(false)
      setEditingItem(null)
      onLogisticsChange?.()
    } catch (error) {
      console.error('Error saving logistic:', error)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: TravelLogistic) => {
    setDeletingId(item.id)
    try {
      await deleteTravelLogistic(item.id, dossierId)

      // Optimistic update
      if (item.type === 'arrival') {
        setArrivals(prev => prev.filter(a => a.id !== item.id))
      } else {
        setDepartures(prev => prev.filter(d => d.id !== item.id))
      }

      toast.success('Supprimé')
      onLogisticsChange?.()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Arrivée et Départ
            <HelpTooltip
              title="Arrivées & Départs"
              tips={[
                "Ces infos apparaissent dans le calendrier des arrivées/départs",
                "Utile pour organiser les transferts aéroport",
                "Ajoutez le n° de vol pour faciliter le suivi"
              ]}
            >
              <p>
                Renseignez les <strong>informations de vol</strong> ou de transport
                de vos clients pour organiser leur accueil et leurs transferts.
              </p>
              <p className="mt-2">
                Ces données seront visibles dans le <strong>calendrier des arrivées/départs</strong>
                de votre agence.
              </p>
            </HelpTooltip>
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onToggleEnabled} />
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-6">
            {/* Arrivals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Arrivée dans le pays</h4>
                {!allArrivalsAssigned && (
                  <Button variant="ghost" size="sm" onClick={() => openAddModal('arrival')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </div>
              {arrivals.length > 0 ? (
                <div className="space-y-2">
                  {arrivals.map((item) => (
                    <LogisticItem
                      key={item.id}
                      item={item}
                      participants={participants}
                      onEdit={() => openEditModal(item)}
                      onDelete={() => handleDelete(item)}
                      deleting={deletingId === item.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                  Aucune arrivée renseignée
                </p>
              )}
            </div>

            {/* Departures */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Départ du pays</h4>
                {!allDeparturesAssigned && (
                  <Button variant="ghost" size="sm" onClick={() => openAddModal('departure')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </div>
              {departures.length > 0 ? (
                <div className="space-y-2">
                  {departures.map((item) => (
                    <LogisticItem
                      key={item.id}
                      item={item}
                      participants={participants}
                      onEdit={() => openEditModal(item)}
                      onDelete={() => handleDelete(item)}
                      deleting={deletingId === item.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                  Aucun départ renseigné
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open)
        if (!open) setEditingItem(null)
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? (addType === 'arrival' ? 'Modifier l\'arrivée' : 'Modifier le départ')
                : (addType === 'arrival' ? 'Ajouter une arrivée' : 'Ajouter un départ')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de transport *</Label>
                <Select value={transportType} onValueChange={(v) => setTransportType(v as TransportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">
                      <span className="flex items-center gap-2">
                        <Plane className="h-4 w-4" /> Vol
                      </span>
                    </SelectItem>
                    <SelectItem value="train">
                      <span className="flex items-center gap-2">
                        <Train className="h-4 w-4" /> Train
                      </span>
                    </SelectItem>
                    <SelectItem value="bus">
                      <span className="flex items-center gap-2">
                        <Bus className="h-4 w-4" /> Bus
                      </span>
                    </SelectItem>
                    <SelectItem value="car">
                      <span className="flex items-center gap-2">
                        <Car className="h-4 w-4" /> Voiture
                      </span>
                    </SelectItem>
                    <SelectItem value="other">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Autre
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>N° de vol / train</Label>
                <Input
                  placeholder="Ex: TG930, AF164..."
                  value={transportInfo}
                  onChange={(e) => setTransportInfo(e.target.value)}
                />
              </div>
            </div>

            {transportType === 'flight' && (
              <div className="space-y-2">
                <Label>
                  {addType === 'arrival'
                    ? "Aéroport d'arrivée *"
                    : "Aéroport de départ *"}
                </Label>
                <Popover open={arrivalAirportOpen} onOpenChange={setArrivalAirportOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {arrivalAirport || "Sélectionner un aéroport..."}
                      <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher un aéroport..." />
                      <CommandList>
                        <CommandEmpty>Aucun aéroport trouvé</CommandEmpty>
                        <CommandGroup heading="Aéroports suggérés">
                          {suggestedAirports.map((airport) => (
                            <CommandItem
                              key={airport.code}
                              value={`${airport.code} ${airport.name} ${airport.city}`}
                              onSelect={() => {
                                setArrivalAirport(`${airport.code} - ${airport.city}`)
                                setArrivalAirportOpen(false)
                              }}
                            >
                              <span className="font-mono mr-2">{airport.code}</span>
                              {airport.city} - {airport.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Autres aéroports">
                          {ALL_DESTINATION_AIRPORTS
                            .filter(a => !suggestedAirports.find(s => s.code === a.code))
                            .slice(0, 20)
                            .map((airport) => (
                            <CommandItem
                              key={airport.code}
                              value={`${airport.code} ${airport.name} ${airport.city}`}
                              onSelect={() => {
                                setArrivalAirport(`${airport.code} - ${airport.city}`)
                                setArrivalAirportOpen(false)
                              }}
                            >
                              <span className="font-mono mr-2">{airport.code}</span>
                              {airport.city} - {airport.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  {addType === 'arrival'
                    ? "Où le client arrive dans le pays"
                    : "D'où le client repart"}
                </p>
              </div>
            )}

            {transportType !== 'flight' && (
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input
                  placeholder="Gare, station..."
                  value={arrivalAirport}
                  onChange={(e) => setArrivalAirport(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Date et heure</Label>
              <Input
                type="datetime-local"
                value={scheduledDatetime}
                onChange={(e) => setScheduledDatetime(e.target.value)}
              />
            </div>

            {(() => {
              // Compute available participants for this form (exclude those already assigned to other items of the same type)
              const availableParticipants = getAvailableParticipants(addType, editingItem?.id)
              // "All" option is only available if all participants are still available (no other items assigned any)
              const canSelectAll = availableParticipants.length === participants.length

              return (
                <div className="space-y-2">
                  <Label>Participants</Label>
                  {canSelectAll ? (
                    <Select
                      value={allParticipants ? 'all' : 'specific'}
                      onValueChange={(v) => {
                        const isAll = v === 'all'
                        setAllParticipants(isAll)
                        if (isAll) setSelectedParticipantIds([])
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les participants</SelectItem>
                        <SelectItem value="specific">Participants spécifiques</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    // When some participants are already assigned, force "specific" mode
                    <p className="text-sm text-muted-foreground">
                      <Users className="h-4 w-4 inline mr-1" />
                      Participants disponibles ({availableParticipants.length} restant{availableParticipants.length > 1 ? 's' : ''})
                    </p>
                  )}
                  {!allParticipants && availableParticipants.length > 0 && (
                    <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                      {availableParticipants.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                          <Checkbox
                            checked={selectedParticipantIds.includes(p.id)}
                            onCheckedChange={(checked) => {
                              setSelectedParticipantIds(prev =>
                                checked
                                  ? [...prev, p.id]
                                  : prev.filter(id => id !== p.id)
                              )
                            }}
                          />
                          {p.first_name} {p.last_name}
                        </label>
                      ))}
                      {selectedParticipantIds.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          Sélectionnez au moins un participant
                        </p>
                      )}
                    </div>
                  )}
                  {!allParticipants && availableParticipants.length === 0 && participants.length > 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Tous les participants sont déjà assignés
                    </p>
                  )}
                  {participants.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun participant dans ce dossier
                    </p>
                  )}
                </div>
              )
            })()}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Informations complémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddModal(false); setEditingItem(null) }} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !arrivalAirport}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                editingItem ? 'Enregistrer' : 'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
