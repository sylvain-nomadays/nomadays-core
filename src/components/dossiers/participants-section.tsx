'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus,
  Mail,
  Phone,
  Globe,
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  UserPlus,
  Star,
  UserMinus,
  Bed,
  AlertTriangle,
  Leaf,
  Cake,
  Check,
  ChevronsUpDown,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { getCustomerStatusConfig, ROOM_TYPES } from '@/lib/constants'
import type { CustomerStatus } from '@/lib/supabase/database.types'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'
import { createParticipant, updateParticipant, updateDossierParticipant } from '@/lib/actions/participants'
import type { Civility } from '@/lib/actions/participants'
import { toast } from 'sonner'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { getCountryFlag } from '@/lib/constants/countries'
import { cn } from '@/lib/utils'
import {
  CIVILITIES,
  DIETARY_OPTIONS,
  COMMON_ALLERGIES,
  extractAllergies,
  getDietLabel,
  normalizeDietValue,
  calculateAge,
  getAgeCategoryFromBirthDate,
} from '@/lib/constants/participant-options'
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

// CIVILITIES, DIETARY_OPTIONS, COMMON_ALLERGIES imported from @/lib/constants/participant-options

interface Participant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  whatsapp?: string | null
  nationality?: string | null
  civility?: string | null
  birth_date?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
  passport_number?: string | null
  passport_expiry?: string | null
  dietary_requirements?: string | null
  medical_notes?: string | null
  notes?: string | null
  customer_status?: CustomerStatus
  confirmed_trips_count?: number
  has_portal_access?: boolean
}

interface DossierParticipant {
  id?: string
  participant: Participant | null
  is_lead: boolean
  is_traveling?: boolean
  room_preference?: string | null
  room_share_with?: string | null
  age_category?: 'adult' | 'teen' | 'child' | 'infant'
}

// calculateAge, getAgeCategoryFromBirthDate imported from @/lib/constants/participant-options

// Helper: format age display
function formatAge(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null
  const age = calculateAge(birthDate)
  if (age < 2) {
    // Show months for infants
    const birth = new Date(birthDate)
    const today = new Date()
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
    return `${months} mois`
  }
  return `${age} ans`
}

// getDietLabel, extractAllergies imported from @/lib/constants/participant-options

// Helper: check if a participant has a birthday during the trip
function getBirthdayDuringTrip(
  birthDate: string | null | undefined,
  departureDateFrom: string | null | undefined,
  departureDateTo: string | null | undefined
): Date | null {
  if (!birthDate || !departureDateFrom || !departureDateTo) return null
  const birth = new Date(birthDate)
  const from = new Date(departureDateFrom)
  const to = new Date(departureDateTo)

  // Check for the trip year(s)
  const yearsToCheck = [from.getFullYear()]
  if (to.getFullYear() !== from.getFullYear()) {
    yearsToCheck.push(to.getFullYear())
  }

  for (const year of yearsToCheck) {
    const birthdayThisYear = new Date(year, birth.getMonth(), birth.getDate())
    if (birthdayThisYear >= from && birthdayThisYear <= to) {
      return birthdayThisYear
    }
  }
  return null
}

interface ParticipantsSectionProps {
  dossierId: string
  leadParticipant: Participant | null | undefined
  leadDossierParticipant?: DossierParticipant | null
  leadIsTraveling?: boolean
  otherParticipants: DossierParticipant[]
  departureDateFrom?: string | null
  departureDateTo?: string | null
  onDataChange?: () => void | Promise<void>
}

export function ParticipantsSection({
  dossierId,
  leadParticipant,
  leadDossierParticipant,
  leadIsTraveling = true,
  otherParticipants,
  departureDateFrom,
  departureDateTo,
  onDataChange,
}: ParticipantsSectionProps) {
  const { role, tenantSettings } = useUserRole()
  const canSeeEmail = permissions.canSeeClientEmail(role, tenantSettings)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [selectedDossierParticipant, setSelectedDossierParticipant] = useState<DossierParticipant | null>(null)
  const [editingLead, setEditingLead] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [savingParticipant, setSavingParticipant] = useState(false)
  const [roomShareOpen, setRoomShareOpen] = useState(false)
  const [roomShareOpenNew, setRoomShareOpenNew] = useState(false)

  // Build a map of participant id -> name for room sharing display
  const allParticipants: DossierParticipant[] = [
    ...(leadParticipant ? [{ participant: leadParticipant, is_lead: true, is_traveling: leadIsTraveling } as DossierParticipant] : []),
    ...otherParticipants,
  ]
  const participantNameMap = new Map<string, string>()
  allParticipants.forEach(dp => {
    if (dp.participant) {
      participantNameMap.set(dp.participant.id, `${dp.participant.first_name} ${dp.participant.last_name}`)
    }
  })

  // Form state for new participant
  const [newParticipant, setNewParticipant] = useState({
    civility: '' as Civility | '',
    firstName: '',
    lastName: '',
    birthDate: '',
    nationality: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    passportNumber: '',
    passportExpiry: '',
    dietaryRequirements: '',
    allergies: [] as string[],
    allergyOther: '',
    medicalNotes: '',
    notes: '',
    ageCategory: 'adult' as 'adult' | 'teen' | 'child' | 'infant',
    roomPreference: '',
    roomShareWith: ''
  })

  // Lead is traveling toggle
  const [leadTraveling, setLeadTraveling] = useState(leadIsTraveling)

  const resetForm = () => {
    setNewParticipant({
      civility: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      nationality: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      passportNumber: '',
      passportExpiry: '',
      dietaryRequirements: '',
      allergies: [],
      allergyOther: '',
      medicalNotes: '',
      notes: '',
      ageCategory: 'adult',
      roomPreference: '',
      roomShareWith: ''
    })
  }

  // Edit form state
  const [editForm, setEditForm] = useState({
    civility: '' as Civility | '',
    firstName: '',
    lastName: '',
    birthDate: '',
    nationality: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    passportNumber: '',
    passportExpiry: '',
    dietaryRequirements: '',
    allergies: [] as string[],
    allergyOther: '',
    medicalNotes: '',
    notes: '',
    ageCategory: 'adult' as 'adult' | 'teen' | 'child' | 'infant',
    roomPreference: '',
    roomShareWith: ''
  })

  const populateEditForm = (p: Participant, dp?: DossierParticipant | null) => {
    // Extract allergies from medical_notes
    const allergies = extractAllergies(p.medical_notes)
    // Get the rest of medical_notes after the allergy line
    const medicalNotesRest = p.medical_notes?.replace(/^Allergies:\s*.+?(?:\n|$)/, '').trim() || ''

    setEditForm({
      civility: (p.civility as Civility) || '',
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      birthDate: p.birth_date || '',
      nationality: p.nationality || '',
      email: p.email || '',
      phone: p.phone || '',
      whatsapp: p.whatsapp || '',
      address: p.address || '',
      city: p.city || '',
      postalCode: p.postal_code || '',
      country: p.country || '',
      passportNumber: p.passport_number || '',
      passportExpiry: p.passport_expiry || '',
      dietaryRequirements: normalizeDietValue(p.dietary_requirements),
      allergies: allergies,
      allergyOther: '',
      medicalNotes: medicalNotesRest,
      notes: p.notes || '',
      ageCategory: (dp?.age_category || 'adult') as 'adult' | 'teen' | 'child' | 'infant',
      roomPreference: dp?.room_preference || '',
      roomShareWith: dp?.room_share_with || '',
    })
  }

  const handleSaveParticipant = async () => {
    if (!selectedParticipant) return
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error('Veuillez renseigner le prénom et le nom')
      return
    }

    // Combine allergies into medical notes
    const allergyList = [...editForm.allergies]
    if (editForm.allergyOther.trim()) {
      allergyList.push(editForm.allergyOther.trim())
    }
    const medicalNotes = allergyList.length > 0
      ? `Allergies: ${allergyList.join(', ')}${editForm.medicalNotes ? `\n${editForm.medicalNotes}` : ''}`
      : editForm.medicalNotes || undefined

    setSavingParticipant(true)
    try {
      // Update participant record
      // Only include email if user has permission (to avoid overwriting real email with empty value)
      await updateParticipant(selectedParticipant.id, dossierId, {
        civility: editForm.civility || null,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        ...(canSeeEmail ? { email: editForm.email.trim() || undefined } : {}),
        phone: editForm.phone.trim() || undefined,
        whatsapp: editForm.whatsapp.trim() || undefined,
        birthDate: editForm.birthDate || undefined,
        nationality: editForm.nationality || undefined,
        address: editForm.address.trim() || undefined,
        city: editForm.city.trim() || undefined,
        postalCode: editForm.postalCode.trim() || undefined,
        country: editForm.country || undefined,
        passportNumber: editForm.passportNumber.trim() || undefined,
        passportExpiry: editForm.passportExpiry || undefined,
        dietaryRequirements: editForm.dietaryRequirements && editForm.dietaryRequirements !== '_none' ? editForm.dietaryRequirements : undefined,
        medicalNotes: medicalNotes,
        notes: editForm.notes.trim() || undefined,
      })

      // Update dossier_participant record (age category, room preference)
      if (selectedDossierParticipant || editingLead) {
        await updateDossierParticipant(dossierId, selectedParticipant.id, {
          ageCategory: editForm.ageCategory,
          roomPreference: editForm.roomPreference || undefined,
          roomShareWith: editForm.roomShareWith || null,
        })
      }

      toast.success('Participant modifié avec succès')
      setShowEditModal(false)
      await onDataChange?.()
    } catch (error) {
      console.error('Error updating participant:', error)
      toast.error('Erreur lors de la modification du participant')
    } finally {
      setSavingParticipant(false)
    }
  }

  const handleAddParticipant = async () => {
    if (!newParticipant.firstName.trim() || !newParticipant.lastName.trim()) {
      toast.error('Veuillez renseigner le prénom et le nom')
      return
    }

    // Combine allergies into medical notes
    const allergyList = [...newParticipant.allergies]
    if (newParticipant.allergyOther.trim()) {
      allergyList.push(newParticipant.allergyOther.trim())
    }
    const medicalNotes = allergyList.length > 0
      ? `Allergies: ${allergyList.join(', ')}${newParticipant.medicalNotes ? `\n${newParticipant.medicalNotes}` : ''}`
      : newParticipant.medicalNotes || undefined

    setAddingParticipant(true)
    try {
      await createParticipant({
        dossierId,
        civility: newParticipant.civility as Civility || undefined,
        firstName: newParticipant.firstName.trim(),
        lastName: newParticipant.lastName.trim(),
        birthDate: newParticipant.birthDate || undefined,
        nationality: newParticipant.nationality || undefined,
        email: canSeeEmail ? (newParticipant.email.trim() || undefined) : undefined,
        phone: newParticipant.phone.trim() || undefined,
        whatsapp: newParticipant.whatsapp.trim() || undefined,
        address: newParticipant.address.trim() || undefined,
        city: newParticipant.city.trim() || undefined,
        postalCode: newParticipant.postalCode.trim() || undefined,
        country: newParticipant.country || undefined,
        passportNumber: newParticipant.passportNumber.trim() || undefined,
        passportExpiry: newParticipant.passportExpiry || undefined,
        dietaryRequirements: newParticipant.dietaryRequirements && newParticipant.dietaryRequirements !== '_none' ? newParticipant.dietaryRequirements : undefined,
        medicalNotes: medicalNotes,
        notes: newParticipant.notes.trim() || undefined,
        isLead: !leadParticipant,
        isTraveling: true,
        ageCategory: newParticipant.ageCategory,
        roomPreference: newParticipant.roomPreference || undefined,
        roomShareWith: newParticipant.roomShareWith || undefined,
      })

      toast.success('Participant ajouté avec succès')
      setShowAddModal(false)
      resetForm()
      await onDataChange?.()
    } catch (error) {
      console.error('Error adding participant:', error)
      toast.error('Erreur lors de l\'ajout du participant')
    } finally {
      setAddingParticipant(false)
    }
  }

  const getCustomerBadge = (participant: Participant) => {
    const status = participant.customer_status || 'new_customer'
    const config = getCustomerStatusConfig(status)!
    return (
      <Badge
        variant="outline"
        className="text-xs"
        style={{ borderColor: config.color, color: config.color }}
      >
        {config.icon} {config.label}
      </Badge>
    )
  }

  const handleInviteToPortal = (participant: Participant) => {
    setSelectedParticipant(participant)
    setShowInviteModal(true)
  }

  const handleEditParticipant = (participant: Participant, isLead: boolean, dp?: DossierParticipant | null) => {
    setSelectedParticipant(participant)
    setSelectedDossierParticipant(dp || null)
    setEditingLead(isLead)
    populateEditForm(participant, dp)
    setShowEditModal(true)
  }

  const handleToggleLeadTraveling = async () => {
    // TODO: API call to update is_traveling
    setLeadTraveling(!leadTraveling)
  }

  // Count travelers
  const travelingParticipants = otherParticipants.filter(p => p.is_traveling !== false)
  const totalTravelers = (leadTraveling && leadParticipant ? 1 : 0) + travelingParticipants.length

  // Birthday alerts during trip
  const birthdayAlerts: { name: string; date: Date }[] = []
  if (departureDateFrom && departureDateTo) {
    allParticipants.forEach(dp => {
      if (!dp.participant) return
      const bd = getBirthdayDuringTrip(dp.participant.birth_date, departureDateFrom, departureDateTo)
      if (bd) {
        birthdayAlerts.push({
          name: `${dp.participant.first_name} ${dp.participant.last_name}`,
          date: bd,
        })
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Contact & Participants</CardTitle>
              <CardDescription className="text-xs mt-1">
                {totalTravelers} voyageur{totalTravelers > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Birthday alerts during trip */}
          {birthdayAlerts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <Cake className="h-4 w-4" />
                Anniversaire{birthdayAlerts.length > 1 ? 's' : ''} pendant le voyage !
              </div>
              {birthdayAlerts.map((alert) => (
                <p key={alert.name} className="text-xs text-amber-700 ml-6">
                  🎂 <strong>{alert.name}</strong> — {format(alert.date, 'dd MMMM', { locale: fr })}
                </p>
              ))}
              <p className="text-[10px] text-amber-600 ml-6 italic">
                Pensez à prévoir une attention particulière
              </p>
            </div>
          )}

          {/* Contact Principal */}
          {leadParticipant ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Contact principal
                </h4>
                {!leadTraveling && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    <UserMinus className="h-3 w-3 mr-1" />
                    Ne voyage pas
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {leadParticipant.first_name?.[0]}{leadParticipant.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">
                      {leadParticipant.nationality && (
                        <span className="mr-1">{getCountryFlag(leadParticipant.nationality)}</span>
                      )}
                      {leadParticipant.first_name} {leadParticipant.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getCustomerBadge(leadParticipant)}
                    {/* Age */}
                    {leadParticipant.birth_date && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Cake className="h-3 w-3 mr-1" />
                        {formatAge(leadParticipant.birth_date)}
                      </Badge>
                    )}
                    {/* Diet alert */}
                    {leadParticipant.dietary_requirements && leadParticipant.dietary_requirements !== 'standard' && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <Leaf className="h-3 w-3 mr-1" />
                        {getDietLabel(leadParticipant.dietary_requirements)}
                      </Badge>
                    )}
                    {/* Allergy alert */}
                    {extractAllergies(leadParticipant.medical_notes).length > 0 && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Allergies
                      </Badge>
                    )}
                    {/* Birthday during trip alert */}
                    {(() => {
                      const bd = getBirthdayDuringTrip(leadParticipant.birth_date, departureDateFrom, departureDateTo)
                      return bd ? (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          🎂 Anniv. {format(bd, 'dd MMM', { locale: fr })}
                        </Badge>
                      ) : null
                    })()}
                  </div>

                  {/* Room info for lead */}
                  {leadDossierParticipant?.room_preference && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Bed className="h-3 w-3" />
                      {ROOM_TYPES.find(r => r.value === leadDossierParticipant.room_preference)?.label || leadDossierParticipant.room_preference}
                      {leadDossierParticipant.room_share_with && participantNameMap.get(leadDossierParticipant.room_share_with) && (
                        <span> avec {participantNameMap.get(leadDossierParticipant.room_share_with)}</span>
                      )}
                    </div>
                  )}

                  {/* Contact details - Email hidden for DMC */}
                  <div className="space-y-1 text-xs">
                    {canSeeEmail && leadParticipant.email && (
                      <a
                        href={`mailto:${leadParticipant.email}`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" />
                        {leadParticipant.email}
                      </a>
                    )}
                    {leadParticipant.phone && (
                      <a
                        href={`tel:${leadParticipant.phone}`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        {leadParticipant.phone}
                      </a>
                    )}
                  </div>

                  {/* Portal access */}
                  {leadParticipant.has_portal_access ? (
                    <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200 text-xs">
                      Accès portail activé
                    </Badge>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto mt-2 text-xs"
                      onClick={() => handleInviteToPortal(leadParticipant)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Inviter à l&apos;espace client
                    </Button>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditParticipant(leadParticipant, true, leadDossierParticipant)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleInviteToPortal(leadParticipant)}>
                      <Send className="h-4 w-4 mr-2" />
                      Inviter à l&apos;espace client
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleToggleLeadTraveling}>
                      <UserMinus className="h-4 w-4 mr-2" />
                      {leadTraveling ? 'Ne participe pas au voyage' : 'Participe au voyage'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-3">Aucun contact défini</p>
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un contact
              </Button>
            </div>
          )}

          {/* Other Participants */}
          {otherParticipants.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Autres voyageurs ({otherParticipants.length})
                </h4>
                <div className="space-y-2">
                  {otherParticipants.map((dp) => {
                    if (!dp.participant) return null
                    const p = dp.participant
                    const age = formatAge(p.birth_date)
                    const diet = getDietLabel(p.dietary_requirements)
                    const allergies = extractAllergies(p.medical_notes)
                    const hasDietAlert = p.dietary_requirements && p.dietary_requirements !== 'standard'
                    const hasAllergyAlert = allergies.length > 0
                    const birthdayDate = getBirthdayDuringTrip(p.birth_date, departureDateFrom, departureDateTo)
                    const roomType = dp.room_preference ? ROOM_TYPES.find(r => r.value === dp.room_preference) : null
                    const roomPartnerName = dp.room_share_with ? participantNameMap.get(dp.room_share_with) : null

                    return (
                      <div
                        key={p.id}
                        className={`flex items-start gap-3 p-2 rounded-lg group ${dp.is_traveling === false ? 'opacity-50' : ''}`}
                      >
                        <Avatar className="h-8 w-8 mt-0.5">
                          <AvatarFallback className="text-xs">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">
                              {p.nationality && (
                                <span className="mr-1">{getCountryFlag(p.nationality)}</span>
                              )}
                              {p.first_name} {p.last_name}
                            </p>
                            {age && (
                              <span className="text-xs text-muted-foreground">{age}</span>
                            )}
                            {dp.age_category && dp.age_category !== 'adult' && (
                              <Badge variant="outline" className="text-xs">
                                {dp.age_category === 'teen' && 'Ado'}
                                {dp.age_category === 'child' && 'Enfant'}
                                {dp.age_category === 'infant' && 'Bébé'}
                              </Badge>
                            )}
                            {dp.is_traveling === false && (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                Ne voyage pas
                              </Badge>
                            )}
                          </div>
                          {/* Room info */}
                          {roomType && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Bed className="h-3 w-3" />
                              {roomType.label}
                              {roomPartnerName && (
                                <span> avec {roomPartnerName}</span>
                              )}
                            </p>
                          )}
                          {/* Diet, allergy & birthday alerts */}
                          {(hasDietAlert || hasAllergyAlert || birthdayDate) && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {hasDietAlert && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200">
                                  <Leaf className="h-2.5 w-2.5 mr-0.5" />
                                  {diet}
                                </Badge>
                              )}
                              {hasAllergyAlert && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                  {allergies.length === 1 ? allergies[0] : `${allergies.length} allergies`}
                                </Badge>
                              )}
                              {birthdayDate && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                                  🎂 Anniv. {format(birthdayDate, 'dd MMM', { locale: fr })}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Star className="h-4 w-4 mr-2" />
                              Définir comme contact principal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditParticipant(p, false, dp)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Retirer du dossier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Participant Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un voyageur</DialogTitle>
            <DialogDescription>
              Seuls le prénom et le nom sont obligatoires. Les autres champs peuvent être complétés ultérieurement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">

            {/* === Identité === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Identité</h4>
              <div className="grid grid-cols-[120px_1fr_1fr] gap-3">
                <div className="space-y-2">
                  <Label>Civilité</Label>
                  <Select
                    value={newParticipant.civility}
                    onValueChange={(v) => setNewParticipant({ ...newParticipant, civility: v as Civility })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {CIVILITIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input
                    placeholder="Prénom"
                    value={newParticipant.firstName}
                    onChange={(e) => setNewParticipant({ ...newParticipant, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    placeholder="Nom"
                    value={newParticipant.lastName}
                    onChange={(e) => setNewParticipant({ ...newParticipant, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date de naissance</Label>
                  <Input
                    type="date"
                    value={newParticipant.birthDate}
                    onChange={(e) => {
                      const birthDate = e.target.value
                      const updates: Partial<typeof newParticipant> = { birthDate }
                      // Auto-calculate age category
                      if (birthDate) {
                        updates.ageCategory = getAgeCategoryFromBirthDate(birthDate)
                      }
                      setNewParticipant({ ...newParticipant, ...updates })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nationalité</Label>
                  <CountryCombobox
                    value={newParticipant.nationality}
                    onChange={(code) => setNewParticipant({ ...newParticipant, nationality: code })}
                    placeholder="Nationalité..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* === Contact === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Contact</h4>
              {canSeeEmail && (
                <div className="space-y-2">
                  <Label>Email <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Input
                    type="email"
                    placeholder="email@exemple.com"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={newParticipant.phone}
                    onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={newParticipant.whatsapp}
                    onChange={(e) => setNewParticipant({ ...newParticipant, whatsapp: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* === Adresse === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Adresse</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Adresse"
                  value={newParticipant.address}
                  onChange={(e) => setNewParticipant({ ...newParticipant, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-[1fr_120px_100px] gap-3">
                <div className="space-y-2">
                  <Input
                    placeholder="Ville"
                    value={newParticipant.city}
                    onChange={(e) => setNewParticipant({ ...newParticipant, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Code postal"
                    value={newParticipant.postalCode}
                    onChange={(e) => setNewParticipant({ ...newParticipant, postalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <CountryCombobox
                    value={newParticipant.country}
                    onChange={(code) => setNewParticipant({ ...newParticipant, country: code })}
                    placeholder="Pays..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* === Documents de voyage === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Documents de voyage</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>N° de passeport</Label>
                  <Input
                    placeholder="N° passeport"
                    value={newParticipant.passportNumber}
                    onChange={(e) => setNewParticipant({ ...newParticipant, passportNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d'expiration</Label>
                  <Input
                    type="date"
                    value={newParticipant.passportExpiry}
                    onChange={(e) => setNewParticipant({ ...newParticipant, passportExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* === Régime & Allergies === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Régime alimentaire & Allergies</h4>
              <div className="space-y-2">
                <Label>Régime</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((diet) => {
                    const isSelected = diet.value === ''
                      ? !newParticipant.dietaryRequirements || newParticipant.dietaryRequirements === '_none'
                      : newParticipant.dietaryRequirements === diet.value
                    return (
                      <label
                        key={diet.value || '_standard'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-muted/30 border-border text-muted-foreground hover:border-green-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newDietaryRequirements"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => setNewParticipant({
                            ...newParticipant,
                            dietaryRequirements: diet.value
                          })}
                        />
                        {diet.label}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGIES.map((allergy) => (
                    <label
                      key={allergy}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                        newParticipant.allergies.includes(allergy)
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-muted/30 border-border text-muted-foreground hover:border-red-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={newParticipant.allergies.includes(allergy)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...newParticipant.allergies, allergy]
                            : newParticipant.allergies.filter(a => a !== allergy)
                          setNewParticipant({ ...newParticipant, allergies: updated })
                        }}
                      />
                      {allergy}
                    </label>
                  ))}
                </div>
                <Input
                  placeholder="Autre allergie..."
                  value={newParticipant.allergyOther}
                  onChange={(e) => setNewParticipant({ ...newParticipant, allergyOther: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* === Voyage (catégorie + chambre) === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Voyage</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>
                    Catégorie d&apos;âge
                    {newParticipant.birthDate && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({formatAge(newParticipant.birthDate)} — auto-calculé)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={newParticipant.ageCategory}
                    onValueChange={(v) => setNewParticipant({ ...newParticipant, ageCategory: v as 'adult' | 'teen' | 'child' | 'infant' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">Adulte (18+)</SelectItem>
                      <SelectItem value="teen">Adolescent (12-17)</SelectItem>
                      <SelectItem value="child">Enfant (2-11)</SelectItem>
                      <SelectItem value="infant">Bébé (0-2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de chambre</Label>
                  <Select
                    value={newParticipant.roomPreference}
                    onValueChange={(v) => setNewParticipant({ ...newParticipant, roomPreference: v, roomShareWith: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((room) => (
                        <SelectItem key={room.value} value={room.value}>
                          {room.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Room sharing — shown for shared room types */}
              {['DBL', 'TWN', 'FAM'].includes(newParticipant.roomPreference) && allParticipants.length > 0 && (
                <div className="space-y-2">
                  <Label>Partage la chambre avec</Label>
                  <Popover open={roomShareOpenNew} onOpenChange={setRoomShareOpenNew}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {newParticipant.roomShareWith
                          ? participantNameMap.get(newParticipant.roomShareWith) || 'Participant inconnu'
                          : 'Sélectionner un participant...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un participant..." />
                        <CommandList>
                          <CommandEmpty>Aucun participant trouvé.</CommandEmpty>
                          <CommandGroup>
                            {allParticipants
                              .filter(dp => dp.participant)
                              .map(dp => (
                                <CommandItem
                                  key={dp.participant!.id}
                                  value={`${dp.participant!.first_name} ${dp.participant!.last_name}`}
                                  onSelect={() => {
                                    setNewParticipant({ ...newParticipant, roomShareWith: dp.participant!.id })
                                    setRoomShareOpenNew(false)
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4',
                                    newParticipant.roomShareWith === dp.participant!.id ? 'opacity-100' : 'opacity-0'
                                  )} />
                                  {dp.participant!.first_name} {dp.participant!.last_name}
                                </CommandItem>
                              ))
                            }
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {newParticipant.roomShareWith && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setNewParticipant({ ...newParticipant, roomShareWith: '' })}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Retirer le partage
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* === Notes libres === */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Informations complémentaires</h4>
              <Textarea
                placeholder="Autres informations importantes à communiquer avec votre agence de voyage..."
                className="min-h-[80px]"
                value={newParticipant.notes}
                onChange={(e) => setNewParticipant({ ...newParticipant, notes: e.target.value })}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={addingParticipant}>
              Annuler
            </Button>
            <Button onClick={handleAddParticipant} disabled={addingParticipant}>
              {addingParticipant ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite to Portal Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter à l'espace client</DialogTitle>
            <DialogDescription>
              {selectedParticipant && (
                <>
                  Un email sera envoyé à <strong>{selectedParticipant.email}</strong> avec un lien
                  pour accéder à son espace client et consulter les détails de son voyage.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Annuler
            </Button>
            <Button onClick={() => {
              // TODO: Send invitation
              setShowInviteModal(false)
            }}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le {editingLead ? 'contact principal' : 'voyageur'}</DialogTitle>
            <DialogDescription>
              Modifiez les informations du participant. Seuls le prénom et le nom sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-6 py-4">

              {/* === Identité === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Identité</h4>
                <div className="grid grid-cols-[120px_1fr_1fr] gap-3">
                  <div className="space-y-2">
                    <Label>Civilité</Label>
                    <Select
                      value={editForm.civility}
                      onValueChange={(v) => setEditForm({ ...editForm, civility: v as Civility })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {CIVILITIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input
                      placeholder="Prénom"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input
                      placeholder="Nom"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date de naissance</Label>
                    <Input
                      type="date"
                      value={editForm.birthDate}
                      onChange={(e) => {
                        const birthDate = e.target.value
                        const updates: Partial<typeof editForm> = { birthDate }
                        if (birthDate) {
                          updates.ageCategory = getAgeCategoryFromBirthDate(birthDate)
                        }
                        setEditForm({ ...editForm, ...updates })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationalité</Label>
                    <CountryCombobox
                      value={editForm.nationality}
                      onChange={(code) => setEditForm({ ...editForm, nationality: code })}
                      placeholder="Nationalité..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* === Contact === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Contact</h4>
                {canSeeEmail ? (
                  <div className="space-y-2">
                    <Label>Email <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                    <Input
                      type="email"
                      placeholder="email@exemple.com"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    L&apos;adresse email est gérée par Nomadays
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* === Adresse === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Adresse</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Adresse"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-[1fr_120px_100px] gap-3">
                  <div className="space-y-2">
                    <Input
                      placeholder="Ville"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Code postal"
                      value={editForm.postalCode}
                      onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <CountryCombobox
                      value={editForm.country}
                      onChange={(code) => setEditForm({ ...editForm, country: code })}
                      placeholder="Pays..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* === Documents de voyage === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Documents de voyage</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>N° de passeport</Label>
                    <Input
                      placeholder="N° passeport"
                      value={editForm.passportNumber}
                      onChange={(e) => setEditForm({ ...editForm, passportNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date d&apos;expiration</Label>
                    <Input
                      type="date"
                      value={editForm.passportExpiry}
                      onChange={(e) => setEditForm({ ...editForm, passportExpiry: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* === Régime & Allergies === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Régime alimentaire & Allergies</h4>
                <div className="space-y-2">
                  <Label>Régime</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((diet) => {
                      const isSelected = diet.value === ''
                        ? !editForm.dietaryRequirements || editForm.dietaryRequirements === '_none'
                        : editForm.dietaryRequirements === diet.value
                      return (
                        <label
                          key={diet.value || '_standard'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-muted/30 border-border text-muted-foreground hover:border-green-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="editDietaryRequirements"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => setEditForm({
                              ...editForm,
                              dietaryRequirements: diet.value
                            })}
                          />
                          {diet.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGIES.map((allergy) => (
                      <label
                        key={allergy}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                          editForm.allergies.includes(allergy)
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-muted/30 border-border text-muted-foreground hover:border-red-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={editForm.allergies.includes(allergy)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...editForm.allergies, allergy]
                              : editForm.allergies.filter(a => a !== allergy)
                            setEditForm({ ...editForm, allergies: updated })
                          }}
                        />
                        {allergy}
                      </label>
                    ))}
                  </div>
                  <Input
                    placeholder="Autre allergie..."
                    value={editForm.allergyOther}
                    onChange={(e) => setEditForm({ ...editForm, allergyOther: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* === Voyage (catégorie + chambre) === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Voyage</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>
                      Catégorie d&apos;âge
                      {editForm.birthDate && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({formatAge(editForm.birthDate)} — auto-calculé)
                        </span>
                      )}
                    </Label>
                    <Select
                      value={editForm.ageCategory}
                      onValueChange={(v) => setEditForm({ ...editForm, ageCategory: v as 'adult' | 'teen' | 'child' | 'infant' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adulte (18+)</SelectItem>
                        <SelectItem value="teen">Adolescent (12-17)</SelectItem>
                        <SelectItem value="child">Enfant (2-11)</SelectItem>
                        <SelectItem value="infant">Bébé (0-2)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type de chambre</Label>
                    <Select
                      value={editForm.roomPreference || '_none'}
                      onValueChange={(v) => setEditForm({ ...editForm, roomPreference: v === '_none' ? '' : v, roomShareWith: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucune préférence</SelectItem>
                        {ROOM_TYPES.map((room) => (
                          <SelectItem key={room.value} value={room.value}>
                            {room.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Room sharing — shown for shared room types */}
                {['DBL', 'TWN', 'FAM'].includes(editForm.roomPreference) && (
                  <div className="space-y-2">
                    <Label>Partage la chambre avec</Label>
                    <Popover open={roomShareOpen} onOpenChange={setRoomShareOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {editForm.roomShareWith
                            ? participantNameMap.get(editForm.roomShareWith) || 'Participant inconnu'
                            : 'Sélectionner un participant...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher un participant..." />
                          <CommandList>
                            <CommandEmpty>Aucun participant trouvé.</CommandEmpty>
                            <CommandGroup>
                              {allParticipants
                                .filter(dp => dp.participant && dp.participant.id !== selectedParticipant?.id)
                                .map(dp => (
                                  <CommandItem
                                    key={dp.participant!.id}
                                    value={`${dp.participant!.first_name} ${dp.participant!.last_name}`}
                                    onSelect={() => {
                                      setEditForm({ ...editForm, roomShareWith: dp.participant!.id })
                                      setRoomShareOpen(false)
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4',
                                      editForm.roomShareWith === dp.participant!.id ? 'opacity-100' : 'opacity-0'
                                    )} />
                                    {dp.participant!.first_name} {dp.participant!.last_name}
                                  </CommandItem>
                                ))
                              }
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {editForm.roomShareWith && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setEditForm({ ...editForm, roomShareWith: '' })}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Retirer le partage
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* === Notes libres === */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Informations complémentaires</h4>
                <Textarea
                  placeholder="Autres informations importantes..."
                  className="min-h-[80px]"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={savingParticipant}>
              Annuler
            </Button>
            <Button onClick={handleSaveParticipant} disabled={savingParticipant}>
              {savingParticipant ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
