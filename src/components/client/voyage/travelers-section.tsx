'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Phone,
  Envelope,
  UserPlus,
  PaperPlaneTilt,
  Link as LinkIcon,
  UserCirclePlus,
  Crown,
  Copy,
  Check as CheckIcon,
  X,
  FloppyDisk,
  PencilSimple,
  MapPin,
  CalendarBlank,
  IdentificationBadge,
  Leaf,
  Warning,
  WhatsappLogo,
  UsersThree,
  CheckCircle,
  Bed,
} from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { getCountryFlag } from '@/lib/constants/countries'
import type { ContinentTheme } from '../continent-theme'
import {
  clientAddParticipant,
  generateInvitationLink,
  transferLead,
  clientUpdateParticipant,
  clientUpdateRoomShare,
} from '@/lib/actions/client-modifications'
import {
  CIVILITIES,
  DIETARY_OPTIONS,
  COMMON_ALLERGIES,
  extractAllergies,
  getDietLabel,
  normalizeDietValue,
  calculateAge,
  buildMedicalNotes,
} from '@/lib/constants/participant-options'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParticipantData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  whatsapp?: string | null
  civility?: string | null
  birth_date?: string | null
  nationality?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
  passport_number?: string | null
  passport_expiry?: string | null
  dietary_requirements?: string | null
  medical_notes?: string | null
}

interface DossierParticipant {
  is_lead: boolean
  room_share_with?: string | null
  participant: ParticipantData
}

interface TravelersSectionProps {
  participants: DossierParticipant[]
  continentTheme: ContinentTheme
  dossierId: string
  currentParticipantId: string
  currentParticipantName: string
  isLead: boolean
  departureDateFrom?: string | null
  departureDateTo?: string | null
}

type AddMode = 'email' | 'link' | 'manual'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateFr(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}

function getCivilityLabel(civility: string | null | undefined): string {
  if (!civility) return ''
  const c = CIVILITIES.find(ci => ci.value === civility)
  return c?.label || ''
}

function isPassportExpiringSoon(passportExpiry: string, departureDateFrom?: string | null): boolean {
  const expiryDate = new Date(passportExpiry)
  const referenceDate = departureDateFrom ? new Date(departureDateFrom) : new Date()
  const sixMonthsBefore = new Date(expiryDate)
  sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6)
  return referenceDate >= sixMonthsBefore
}

function getProfileCompleteness(p: ParticipantData): { complete: boolean; pct: number } {
  const essentialFields = [p.first_name, p.last_name, p.email, p.birth_date, p.nationality, p.passport_number]
  const filled = essentialFields.filter(Boolean).length
  return { complete: filled >= 5, pct: Math.round((filled / essentialFields.length) * 100) }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TravelersSection({
  participants,
  continentTheme,
  dossierId,
  currentParticipantId,
  currentParticipantName,
  isLead,
  departureDateFrom,
}: TravelersSectionProps) {
  // ─── Add traveler state ────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form fields (add) — simple fields for email/link modes
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAgeCategory, setNewAgeCategory] = useState<'adult' | 'teen' | 'child' | 'infant'>('adult')

  // Extended fields for manual mode (full profile)
  const [newParticipant, setNewParticipant] = useState({
    civility: '' as string,
    birthDate: '',
    nationality: '',
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
  })

  // Invitation link
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Transfer lead
  const [isPendingTransfer, startTransitionTransfer] = useTransition()

  // ─── Edit profile state ──────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ParticipantData | null>(null)
  const [isPendingEdit, startTransitionEdit] = useTransition()
  const [editForm, setEditForm] = useState({
    civility: '' as string,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    birthDate: '',
    nationality: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    passportNumber: '',
    passportExpiry: '',
    dietaryRequirements: '',
    allergies: [] as string[],
    allergyOther: '',
    medicalNotesOther: '',
  })

  // ─── Room share state ──────────────────────────────────────────────────
  const [roomShareDialogOpen, setRoomShareDialogOpen] = useState(false)
  const [roomShareTarget, setRoomShareTarget] = useState<string | null>(null)
  const [roomShareSelected, setRoomShareSelected] = useState<string>('')
  const [isPendingRoomShare, startTransitionRoomShare] = useTransition()

  // Build participant name map for room sharing display
  const participantNameMap = new Map<string, string>()
  participants.forEach(dp => {
    participantNameMap.set(dp.participant.id, `${dp.participant.first_name} ${dp.participant.last_name}`.trim())
  })

  const resetForm = () => {
    setNewFirstName('')
    setNewLastName('')
    setNewEmail('')
    setNewPhone('')
    setNewAgeCategory('adult')
    setNewParticipant({
      civility: '',
      birthDate: '',
      nationality: '',
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
    })
    setAddMode(null)
    setInvitationUrl(null)
    setLinkCopied(false)
  }

  const openAddDialog = () => {
    resetForm()
    setAddDialogOpen(true)
  }

  // ─── Open edit dialog ──────────────────────────────────────────────────
  const openEditDialog = (p: ParticipantData) => {
    const allergies = extractAllergies(p.medical_notes)
    const knownAllergies = allergies.filter(a => COMMON_ALLERGIES.includes(a))
    const otherAllergies = allergies.filter(a => !COMMON_ALLERGIES.includes(a))
    const medicalNotesRest = p.medical_notes?.replace(/^Allergies:\s*.+?(?:\n|$)/, '').trim() || ''

    setEditTarget(p)
    setEditForm({
      civility: p.civility || '',
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      email: p.email?.endsWith('@noemail.local') ? '' : (p.email || ''),
      phone: p.phone || '',
      whatsapp: p.whatsapp || '',
      birthDate: p.birth_date || '',
      nationality: p.nationality || '',
      address: p.address || '',
      city: p.city || '',
      postalCode: p.postal_code || '',
      country: p.country || '',
      passportNumber: p.passport_number || '',
      passportExpiry: p.passport_expiry || '',
      dietaryRequirements: normalizeDietValue(p.dietary_requirements),
      allergies: knownAllergies,
      allergyOther: otherAllergies.join(', '),
      medicalNotesOther: medicalNotesRest,
    })
    setEditDialogOpen(true)
  }

  // ─── Handle save profile ──────────────────────────────────────────────
  const handleSaveProfile = () => {
    if (!editTarget) return
    startTransitionEdit(async () => {
      const medicalNotes = buildMedicalNotes(editForm.allergies, editForm.allergyOther, editForm.medicalNotesOther)

      await clientUpdateParticipant({
        dossierId,
        requestingParticipantId: currentParticipantId,
        requestingParticipantName: currentParticipantName,
        targetParticipantId: editTarget.id,
        updates: {
          civility: editForm.civility || null,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email || undefined,
          phone: editForm.phone,
          whatsapp: editForm.whatsapp,
          birthDate: editForm.birthDate,
          nationality: editForm.nationality,
          address: editForm.address,
          city: editForm.city,
          postalCode: editForm.postalCode,
          country: editForm.country,
          passportNumber: editForm.passportNumber,
          passportExpiry: editForm.passportExpiry,
          dietaryRequirements: editForm.dietaryRequirements,
          medicalNotes: medicalNotes || '',
        },
      })
      setEditDialogOpen(false)
      setEditTarget(null)
    })
  }

  // ─── Room share handlers ──────────────────────────────────────────────
  const openRoomShareDialog = (participantId: string, currentPartner: string | null) => {
    setRoomShareTarget(participantId)
    setRoomShareSelected(currentPartner || '')
    setRoomShareDialogOpen(true)
  }

  const handleSaveRoomShare = () => {
    if (!roomShareTarget) return
    startTransitionRoomShare(async () => {
      await clientUpdateRoomShare({
        dossierId,
        requestingParticipantId: currentParticipantId,
        requestingParticipantName: currentParticipantName,
        targetParticipantId: roomShareTarget,
        roomShareWith: roomShareSelected || null,
      })
      setRoomShareDialogOpen(false)
      setRoomShareTarget(null)
    })
  }

  // ─── Handle invite by email ────────────────────────────────────────────────
  const handleInviteByEmail = () => {
    if (!newEmail.trim()) return
    startTransition(async () => {
      await clientAddParticipant({
        dossierId,
        requestingParticipantId: currentParticipantId,
        requestingParticipantName: currentParticipantName,
        firstName: newEmail.split('@')[0] || 'Invité',
        lastName: '',
        email: newEmail.trim(),
        ageCategory: newAgeCategory,
        sendInvitation: true,
      })
      setAddDialogOpen(false)
      resetForm()
    })
  }

  // ─── Handle copy link ──────────────────────────────────────────────────────
  const handleGenerateLink = () => {
    if (!newFirstName.trim() || !newLastName.trim()) return
    startTransition(async () => {
      const result = await generateInvitationLink({
        dossierId,
        participantId: currentParticipantId,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email: newEmail.trim() || undefined,
        ageCategory: newAgeCategory,
        requestingParticipantId: currentParticipantId,
      })
      setInvitationUrl(result.invitationUrl)
    })
  }

  const handleCopyLink = async () => {
    if (!invitationUrl) return
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  // ─── Handle manual create ──────────────────────────────────────────────────
  const handleManualCreate = () => {
    if (!newFirstName.trim() || !newLastName.trim()) return
    // Build medical notes from structured allergies
    const medicalNotes = buildMedicalNotes(newParticipant.allergies, newParticipant.allergyOther, '')
    startTransition(async () => {
      await clientAddParticipant({
        dossierId,
        requestingParticipantId: currentParticipantId,
        requestingParticipantName: currentParticipantName,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        ageCategory: newAgeCategory,
        sendInvitation: !!newEmail.trim(),
        civility: newParticipant.civility || undefined,
        birthDate: newParticipant.birthDate || undefined,
        nationality: newParticipant.nationality || undefined,
        whatsapp: newParticipant.whatsapp.trim() || undefined,
        address: newParticipant.address.trim() || undefined,
        city: newParticipant.city.trim() || undefined,
        postalCode: newParticipant.postalCode.trim() || undefined,
        country: newParticipant.country || undefined,
        passportNumber: newParticipant.passportNumber.trim() || undefined,
        passportExpiry: newParticipant.passportExpiry || undefined,
        dietaryRequirements: newParticipant.dietaryRequirements || undefined,
        medicalNotes: medicalNotes || undefined,
      })
      setAddDialogOpen(false)
      resetForm()
    })
  }

  // ─── Handle transfer lead ──────────────────────────────────────────────────
  const handleTransferLead = (newLeadId: string, newLeadName: string) => {
    startTransitionTransfer(async () => {
      await transferLead({
        dossierId,
        currentLeadId: currentParticipantId,
        currentLeadName: currentParticipantName,
        newLeadId,
        newLeadName,
      })
    })
  }

  return (
    <div className="space-y-6">
      {/* Participants header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {participants.length} voyageur{participants.length > 1 ? 's' : ''} enregistré{participants.length > 1 ? 's' : ''}
        </p>
        {isLead && (
          <Button
            variant="outline"
            size="sm"
            onClick={openAddDialog}
            className="gap-1.5 text-xs"
            style={{ borderColor: `${continentTheme.primary}40`, color: continentTheme.primary }}
          >
            <UserPlus size={14} weight="duotone" />
            Ajouter un voyageur
          </Button>
        )}
      </div>

      {/* Participant list */}
      {(!participants || participants.length === 0) ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            Les informations des voyageurs seront disponibles prochainement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {participants.map((dp) => {
            const p = dp.participant
            const participantFullName = `${p.first_name} ${p.last_name}`.trim()
            const isNoEmail = p.email?.endsWith('@noemail.local')
            const isSelf = p.id === currentParticipantId
            const canEdit = isSelf || isLead
            const civLabel = getCivilityLabel(p.civility)
            const flag = p.nationality ? getCountryFlag(p.nationality) : ''
            const allergies = extractAllergies(p.medical_notes)
            const diet = getDietLabel(p.dietary_requirements)
            const hasDiet = p.dietary_requirements && p.dietary_requirements !== '' && p.dietary_requirements !== 'standard'
            const profileStatus = getProfileCompleteness(p)

            // Passport alert
            const passportExpiring = p.passport_expiry && isPassportExpiringSoon(p.passport_expiry, departureDateFrom)

            // Address display
            const addressParts = [p.address, p.city, p.postal_code].filter(Boolean)
            const countryFlag = p.country ? getCountryFlag(p.country) : ''
            const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

            // Room share
            const roomPartnerName = dp.room_share_with ? participantNameMap.get(dp.room_share_with) : null

            // Check if profile has detailed info
            const hasDetailedInfo = p.birth_date || p.nationality || p.passport_number || p.address || p.dietary_requirements || allergies.length > 0

            return (
              <div
                key={p.id}
                className="rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors overflow-hidden"
              >
                {/* Top row: Avatar + Name + Badges + Edit */}
                <div className="flex items-start justify-between p-4 pb-0">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${continentTheme.primary}15` }}
                    >
                      <span className="text-sm font-bold" style={{ color: continentTheme.primary }}>
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </span>
                    </div>

                    {/* Name + civility + flag */}
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {flag && <span className="mr-1.5">{flag}</span>}
                        {civLabel && <span className="text-gray-500">{civLabel} </span>}
                        {p.first_name} {p.last_name}
                      </p>
                      {/* Contact line */}
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {!isNoEmail && p.email && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Envelope size={12} weight="duotone" />
                            {p.email}
                          </span>
                        )}
                        {p.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone size={12} weight="duotone" />
                            {p.phone}
                          </span>
                        )}
                        {p.whatsapp && p.whatsapp !== p.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <WhatsappLogo size={12} weight="duotone" />
                            {p.whatsapp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: badges + edit */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dp.is_lead && (
                      <Badge
                        className="text-xs border-0"
                        style={{ backgroundColor: `${continentTheme.accent}15`, color: continentTheme.accent }}
                      >
                        Contact principal
                      </Badge>
                    )}

                    {profileStatus.complete && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 gap-1">
                        <CheckCircle size={12} weight="duotone" />
                        Complet
                      </Badge>
                    )}

                    {passportExpiring && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1">
                        <Warning size={12} weight="fill" />
                        Passeport
                      </Badge>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => openEditDialog(p)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Modifier le profil"
                      >
                        <PencilSimple size={15} weight="duotone" />
                      </button>
                    )}

                    {/* Transfer lead option */}
                    {isLead && !dp.is_lead && p.id !== currentParticipantId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                            <Crown size={14} weight="duotone" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTransferLead(p.id, participantFullName)}
                            disabled={isPendingTransfer}
                          >
                            <Crown size={14} weight="duotone" className="mr-2" />
                            Désigner comme contact principal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Detailed info rows */}
                {hasDetailedInfo ? (
                  <div className="px-4 pb-4 pt-3 space-y-1.5">
                    {p.birth_date && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CalendarBlank size={13} weight="duotone" className="text-gray-400 flex-shrink-0" />
                        <span>
                          {formatDateFr(p.birth_date)}
                          <span className="text-gray-400 ml-1">({calculateAge(p.birth_date)} ans)</span>
                        </span>
                      </div>
                    )}

                    {p.passport_number && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <IdentificationBadge size={13} weight="duotone" className="text-gray-400 flex-shrink-0" />
                        <span>
                          Passeport : {p.passport_number}
                          {p.passport_expiry && (
                            <span className={passportExpiring ? 'text-amber-600 font-medium ml-1' : 'text-gray-400 ml-1'}>
                              — expire le {formatDateFr(p.passport_expiry)}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {(hasDiet || allergies.length > 0) && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                        <Leaf size={13} weight="duotone" className="text-gray-400 flex-shrink-0" />
                        {hasDiet && <span>{diet}</span>}
                        {allergies.length > 0 && (
                          <span className="text-amber-700 font-medium">
                            <Warning size={11} weight="fill" className="inline mr-0.5" />
                            Allergies : {allergies.join(', ')}
                          </span>
                        )}
                      </div>
                    )}

                    {fullAddress && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin size={13} weight="duotone" className="text-gray-400 flex-shrink-0" />
                        <span>{fullAddress}{countryFlag && ` ${countryFlag}`}</span>
                      </div>
                    )}

                    {roomPartnerName && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Bed size={13} weight="duotone" className="text-gray-400 flex-shrink-0" />
                        <span>Chambre partagée avec {roomPartnerName}</span>
                      </div>
                    )}
                  </div>
                ) : canEdit ? (
                  <div className="px-4 pb-4 pt-3">
                    <button
                      onClick={() => openEditDialog(p)}
                      className="text-xs px-3 py-2 rounded-lg border border-dashed border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50 transition-colors w-full text-center"
                    >
                      Complétez votre profil pour faciliter l&apos;organisation de votre voyage
                    </button>
                  </div>
                ) : (
                  <div className="pb-3" />
                )}

                {/* Room share action */}
                {canEdit && participants.length > 1 && (
                  <div className="px-4 pb-3 flex justify-end">
                    <button
                      onClick={() => openRoomShareDialog(p.id, dp.room_share_with || null)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <UsersThree size={13} weight="duotone" />
                      {roomPartnerName ? 'Modifier le partage' : 'Partage de chambre'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Edit Profile Dialog ──────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) setEditTarget(null); setEditDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier le profil</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {editTarget ? `${editTarget.first_name} ${editTarget.last_name}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Section 1: Identité */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identité</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Civilité</Label>
                  <Select value={editForm.civility || '_none'} onValueChange={(v) => setEditForm({ ...editForm, civility: v === '_none' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {CIVILITIES.filter(c => c.value !== '').map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Prénom</Label>
                    <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nom</Label>
                    <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date de naissance</Label>
                    <Input type="date" value={editForm.birthDate} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nationalité</Label>
                    <CountryCombobox value={editForm.nationality} onChange={(code) => setEditForm({ ...editForm, nationality: code })} placeholder="Sélectionner" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Contact */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Téléphone</Label>
                    <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+33 6 12 34 56 78" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">WhatsApp</Label>
                    <Input type="tel" value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} placeholder="+33 6 12 34 56 78" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Adresse */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adresse</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Adresse</Label>
                  <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="12 rue de la Paix" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Code postal</Label>
                    <Input value={editForm.postalCode} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} placeholder="75002" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Ville</Label>
                    <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Paris" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Pays</Label>
                    <CountryCombobox value={editForm.country} onChange={(code) => setEditForm({ ...editForm, country: code })} placeholder="Pays" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Documents de voyage */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents de voyage</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">N° Passeport</Label>
                  <Input value={editForm.passportNumber} onChange={(e) => setEditForm({ ...editForm, passportNumber: e.target.value })} placeholder="AB123456" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Date d&apos;expiration</Label>
                  <Input type="date" value={editForm.passportExpiry} onChange={(e) => setEditForm({ ...editForm, passportExpiry: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 5: Régime alimentaire & Allergies (style pilules DMC) */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Alimentation</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Régime alimentaire</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((diet) => {
                      const isSelected = diet.value === ''
                        ? !editForm.dietaryRequirements
                        : editForm.dietaryRequirements === diet.value
                      return (
                        <label
                          key={diet.value || '_standard'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="editDietaryRequirements"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => setEditForm({ ...editForm, dietaryRequirements: diet.value })}
                          />
                          {diet.label}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Allergies connues</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGIES.map(allergy => (
                      <label
                        key={allergy}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                          editForm.allergies.includes(allergy)
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-200'
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
                    value={editForm.allergyOther}
                    onChange={(e) => setEditForm({ ...editForm, allergyOther: e.target.value })}
                    placeholder="Autre allergie..."
                    className="text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isPendingEdit}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isPendingEdit || !editForm.firstName.trim() || !editForm.lastName.trim()}
              style={{ backgroundColor: continentTheme.primary }}
              className="text-white"
            >
              <FloppyDisk size={14} className="mr-1.5" />
              {isPendingEdit ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Room Share Dialog ──────────────────────────────────────────── */}
      <Dialog open={roomShareDialogOpen} onOpenChange={setRoomShareDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Partage de chambre</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Qui dort avec {roomShareTarget ? participantNameMap.get(roomShareTarget) : ''} ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <button
              onClick={() => setRoomShareSelected('')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-colors ${
                roomShareSelected === '' ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Bed size={16} weight="duotone" className="text-gray-400" />
              <span>Chambre individuelle</span>
            </button>

            {participants
              .filter(dp => dp.participant.id !== roomShareTarget)
              .map(dp => (
                <button
                  key={dp.participant.id}
                  onClick={() => setRoomShareSelected(dp.participant.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-colors ${
                    roomShareSelected === dp.participant.id ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: `${continentTheme.primary}15`, color: continentTheme.primary }}
                  >
                    {dp.participant.first_name?.[0]}{dp.participant.last_name?.[0]}
                  </div>
                  <span>{dp.participant.first_name} {dp.participant.last_name}</span>
                </button>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomShareDialogOpen(false)} disabled={isPendingRoomShare}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveRoomShare}
              disabled={isPendingRoomShare}
              style={{ backgroundColor: continentTheme.primary }}
              className="text-white"
            >
              {isPendingRoomShare ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Traveler Dialog ──────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setAddDialogOpen(open) }}>
        <DialogContent className={addMode === 'manual' ? 'sm:max-w-lg' : 'sm:max-w-md'}>
          <DialogHeader>
            <DialogTitle className="font-display">Ajouter un voyageur</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Choisissez comment ajouter un nouveau participant à votre voyage.
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Choose mode */}
          {!addMode && (
            <div className="space-y-3 py-2">
              <button
                onClick={() => setAddMode('email')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${continentTheme.primary}12` }}>
                  <PaperPlaneTilt size={20} weight="duotone" style={{ color: continentTheme.primary }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Inviter par email</p>
                  <p className="text-xs text-gray-500">Envoyer une invitation automatique par email</p>
                </div>
              </button>

              <button
                onClick={() => setAddMode('link')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${continentTheme.primary}12` }}>
                  <LinkIcon size={20} weight="duotone" style={{ color: continentTheme.primary }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Copier un lien d&apos;invitation</p>
                  <p className="text-xs text-gray-500">Générer un lien à partager manuellement</p>
                </div>
              </button>

              <button
                onClick={() => setAddMode('manual')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${continentTheme.primary}12` }}>
                  <UserCirclePlus size={20} weight="duotone" style={{ color: continentTheme.primary }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Créer manuellement</p>
                  <p className="text-xs text-gray-500">Renseigner les informations du voyageur</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 2a: Invite by email */}
          {addMode === 'email' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm">Email du voyageur</Label>
                <Input type="email" placeholder="jean@exemple.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoFocus />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMode(null)} disabled={isPending}>Retour</Button>
                <Button onClick={handleInviteByEmail} disabled={isPending || !newEmail.trim()} style={{ backgroundColor: continentTheme.primary }} className="text-white">
                  <PaperPlaneTilt size={14} className="mr-1.5" />
                  {isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2b: Copy link */}
          {addMode === 'link' && (
            <div className="space-y-4 py-2">
              {!invitationUrl ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Prénom</Label>
                      <Input placeholder="Jean" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Nom</Label>
                      <Input placeholder="Martin" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddMode(null)} disabled={isPending}>Retour</Button>
                    <Button onClick={handleGenerateLink} disabled={isPending || !newFirstName.trim() || !newLastName.trim()} style={{ backgroundColor: continentTheme.primary }} className="text-white">
                      <LinkIcon size={14} className="mr-1.5" />
                      {isPending ? 'Génération...' : 'Générer le lien'}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Lien d&apos;invitation</Label>
                    <div className="flex items-center gap-2">
                      <Input value={invitationUrl} readOnly className="text-xs bg-gray-50" />
                      <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0 gap-1.5">
                        {linkCopied ? <CheckIcon size={14} className="text-green-600" /> : <Copy size={14} />}
                        {linkCopied ? 'Copié' : 'Copier'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Partagez ce lien avec {newFirstName} pour qu&apos;il puisse accéder à l&apos;espace voyage.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm() }}>Terminé</Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}

          {/* Step 2c: Manual create (full profile form) */}
          {addMode === 'manual' && (
            <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
              {/* Section: Identité */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identité</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Civilité</Label>
                    <Select value={newParticipant.civility || '_none'} onValueChange={(v) => setNewParticipant({ ...newParticipant, civility: v === '_none' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">—</SelectItem>
                        {CIVILITIES.filter(c => c.value !== '').map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Prénom *</Label>
                      <Input placeholder="Jean" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nom *</Label>
                      <Input placeholder="Martin" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Date de naissance</Label>
                      <Input type="date" value={newParticipant.birthDate} onChange={(e) => setNewParticipant({ ...newParticipant, birthDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nationalité</Label>
                      <CountryCombobox value={newParticipant.nationality} onChange={(code) => setNewParticipant({ ...newParticipant, nationality: code })} placeholder="Pays..." />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email (optionnel)</Label>
                    <Input type="email" placeholder="jean@exemple.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    <p className="text-xs text-gray-400">Si renseigné, une invitation à l&apos;espace voyage sera envoyée.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Téléphone</Label>
                      <Input type="tel" placeholder="+33 6 12 34 56 78" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">WhatsApp</Label>
                      <Input type="tel" placeholder="+33 6 12 34 56 78" value={newParticipant.whatsapp} onChange={(e) => setNewParticipant({ ...newParticipant, whatsapp: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Adresse */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adresse</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Adresse</Label>
                    <Input placeholder="12 rue de la Paix" value={newParticipant.address} onChange={(e) => setNewParticipant({ ...newParticipant, address: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-[100px_1fr_120px] gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Code postal</Label>
                      <Input placeholder="75002" value={newParticipant.postalCode} onChange={(e) => setNewParticipant({ ...newParticipant, postalCode: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Ville</Label>
                      <Input placeholder="Paris" value={newParticipant.city} onChange={(e) => setNewParticipant({ ...newParticipant, city: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Pays</Label>
                      <CountryCombobox value={newParticipant.country} onChange={(code) => setNewParticipant({ ...newParticipant, country: code })} placeholder="Pays..." />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Documents de voyage */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents de voyage</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">N° Passeport</Label>
                    <Input placeholder="N° passeport" value={newParticipant.passportNumber} onChange={(e) => setNewParticipant({ ...newParticipant, passportNumber: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date d&apos;expiration</Label>
                    <Input type="date" value={newParticipant.passportExpiry} onChange={(e) => setNewParticipant({ ...newParticipant, passportExpiry: e.target.value })} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Régime alimentaire & Allergies (style pilules DMC) */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Alimentation</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Régime alimentaire</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_OPTIONS.map((diet) => {
                        const isSelected = diet.value === ''
                          ? !newParticipant.dietaryRequirements
                          : newParticipant.dietaryRequirements === diet.value
                        return (
                          <label
                            key={diet.value || '_standard'}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="newDietaryRequirements"
                              className="sr-only"
                              checked={isSelected}
                              onChange={() => setNewParticipant({ ...newParticipant, dietaryRequirements: diet.value })}
                            />
                            {diet.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Allergies connues</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ALLERGIES.map(allergy => (
                        <label
                          key={allergy}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                            newParticipant.allergies.includes(allergy)
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-200'
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
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Age category is auto-calculated from birth date server-side — hidden from client UI */}
            </div>
          )}

          {/* Footer for manual mode */}
          {addMode === 'manual' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMode(null)} disabled={isPending}>
                <X size={14} className="mr-1.5" />
                Retour
              </Button>
              <Button onClick={handleManualCreate} disabled={isPending || !newFirstName.trim() || !newLastName.trim()} style={{ backgroundColor: continentTheme.primary }} className="text-white">
                <FloppyDisk size={14} className="mr-1.5" />
                {isPending ? 'Création...' : 'Créer le voyageur'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
