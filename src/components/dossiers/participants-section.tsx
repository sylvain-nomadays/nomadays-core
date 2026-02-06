'use client'

import { useState } from 'react'
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
  Bed
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
import { getCustomerStatusConfig, ROOM_TYPES } from '@/lib/constants'
import type { CustomerStatus } from '@/lib/supabase/database.types'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'

interface Participant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  nationality?: string | null
  customer_status?: CustomerStatus
  confirmed_trips_count?: number
  has_portal_access?: boolean
  birth_date?: string | null
}

interface DossierParticipant {
  id?: string
  participant: Participant | null
  is_lead: boolean
  is_traveling: boolean
  room_preference?: string | null
  age_category?: 'adult' | 'teen' | 'child' | 'infant'
}

interface ParticipantsSectionProps {
  dossierId: string
  leadParticipant: Participant | null | undefined
  leadIsTraveling?: boolean
  otherParticipants: DossierParticipant[]
}

export function ParticipantsSection({
  dossierId,
  leadParticipant,
  leadIsTraveling = true,
  otherParticipants
}: ParticipantsSectionProps) {
  const { role } = useUserRole()
  const canSeeEmail = permissions.canSeeClientEmail(role)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [editingLead, setEditingLead] = useState(false)

  // Form state for new participant
  const [newParticipant, setNewParticipant] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ageCategory: 'adult' as 'adult' | 'teen' | 'child' | 'infant',
    roomPreference: ''
  })

  // Lead is traveling toggle
  const [leadTraveling, setLeadTraveling] = useState(leadIsTraveling)

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

  const handleEditParticipant = (participant: Participant, isLead: boolean) => {
    setSelectedParticipant(participant)
    setEditingLead(isLead)
    setShowEditModal(true)
  }

  const handleToggleLeadTraveling = async () => {
    // TODO: API call to update is_traveling
    setLeadTraveling(!leadTraveling)
  }

  // Count travelers
  const travelingParticipants = otherParticipants.filter(p => p.is_traveling !== false)
  const totalTravelers = (leadTraveling && leadParticipant ? 1 : 0) + travelingParticipants.length

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
                      {leadParticipant.first_name} {leadParticipant.last_name}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditParticipant(leadParticipant, true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInviteToPortal(leadParticipant)}>
                          <Send className="h-4 w-4 mr-2" />
                          Inviter à l'espace client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleToggleLeadTraveling}>
                          <UserMinus className="h-4 w-4 mr-2" />
                          {leadTraveling ? 'Ne participe pas au voyage' : 'Participe au voyage'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {getCustomerBadge(leadParticipant)}
                  </div>

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
                      Inviter à l'espace client
                    </Button>
                  )}
                </div>
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
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 p-2 rounded-lg group ${dp.is_traveling === false ? 'opacity-50' : ''}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {p.first_name} {p.last_name}
                            </p>
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
                          {dp.room_preference && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Bed className="h-3 w-3" />
                              {dp.room_preference}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Star className="h-4 w-4 mr-2" />
                              Définir comme contact principal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditParticipant(p, false)}>
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
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un voyageur</DialogTitle>
            <DialogDescription>
              Renseignez les informations du participant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Prénom"
                  value={newParticipant.firstName}
                  onChange={(e) => setNewParticipant({ ...newParticipant, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Nom"
                  value={newParticipant.lastName}
                  onChange={(e) => setNewParticipant({ ...newParticipant, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemple.com"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie d'âge</Label>
                <Select
                  value={newParticipant.ageCategory}
                  onValueChange={(v) => setNewParticipant({ ...newParticipant, ageCategory: v as any })}
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
                <Label>Préférence chambre</Label>
                <Select
                  value={newParticipant.roomPreference}
                  onValueChange={(v) => setNewParticipant({ ...newParticipant, roomPreference: v })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Annuler
            </Button>
            <Button onClick={() => setShowAddModal(false)}>
              Ajouter
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le {editingLead ? 'contact principal' : 'voyageur'}</DialogTitle>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input defaultValue={selectedParticipant.first_name} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input defaultValue={selectedParticipant.last_name} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" defaultValue={selectedParticipant.email} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input type="tel" defaultValue={selectedParticipant.phone || ''} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button onClick={() => setShowEditModal(false)}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
