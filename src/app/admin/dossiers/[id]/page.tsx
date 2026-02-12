'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  MessageSquare,
  Edit,
  MoreHorizontal,
  Flame,
  Copy,
  FileText,
  CheckCircle,
  XCircle,
  Mail,
  CreditCard,
  Upload,
  UserPlus,
  UserMinus,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getDossierById, updateDossierStatus, toggleDossierHot, updateDossier } from '@/lib/actions/dossiers'
import { getDossierNotes } from '@/lib/actions/notes'
import { getDossierTravelLogistics } from '@/lib/actions/travel-logistics'
import { DOSSIER_STATUSES, getStatusConfig, getLanguageConfig } from '@/lib/constants'
import type { DossierStatus, CustomerStatus } from '@/lib/supabase/database.types'
import { toast } from 'sonner'
import { TripOffersSection } from '@/components/dossiers/trip-offers-section'
import { SelectCircuitDialog } from '@/components/dossiers/select-circuit-dialog'
import { ParticipantsSection } from '@/components/dossiers/participants-section'
import { TravelLogisticsSection } from '@/components/dossiers/travel-logistics-section'
import { DossierInfoCards } from '@/components/dossiers/dossier-info-cards'
import { DossierNotesPanel } from '@/components/dossiers/dossier-notes-panel'
import { MessagingSection } from '@/components/dossiers/messaging-section'
import { DossierNotesFullSection } from '@/components/dossiers/dossier-notes-full-section'
import { InvoicesSection } from '@/components/dossiers/invoices-section'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { createClient } from '@/lib/supabase/client'
import { useTrips } from '@/hooks/useTrips'

type DossierData = Awaited<ReturnType<typeof getDossierById>>
type NotesData = Awaited<ReturnType<typeof getDossierNotes>>
type LogisticsData = Awaited<ReturnType<typeof getDossierTravelLogistics>>

export default function DossierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [notes, setNotes] = useState<NotesData>({ teamNotes: [], personalNotes: [] })
  const [logistics, setLogistics] = useState<LogisticsData>({ arrivals: [], departures: [] })
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showSelectDialog, setShowSelectDialog] = useState(false)
  const [preSelectedTripId, setPreSelectedTripId] = useState<number | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('apercu')

  const id = params.id as string

  // Fetch linked circuits for this dossier
  const { data: linkedTripsData, refetch: refetchLinkedTrips } = useTrips({ dossier_id: id })
  const linkedTrips = linkedTripsData?.items || []

  useEffect(() => {
    async function loadData() {
      try {
        // Load dossier, notes, logistics and current user in parallel
        const [dossierData, notesData, logisticsData] = await Promise.all([
          getDossierById(id),
          getDossierNotes(id),
          getDossierTravelLogistics(id),
        ])

        setDossier(dossierData)
        setNotes(notesData)
        setLogistics(logisticsData)

        // Get current user ID from Supabase client
        // Note: users.id IS auth.users.id (same UUID)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }
      } catch (error) {
        console.error('Error loading dossier:', error)
        toast.error('Erreur lors du chargement du dossier')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const reloadNotes = async () => {
    const notesData = await getDossierNotes(id)
    setNotes(notesData)
  }

  const reloadDossier = async () => {
    try {
      const dossierData = await getDossierById(id)
      setDossier(dossierData)
    } catch (error) {
      console.error('Error reloading dossier:', error)
    }
  }

  async function handleStatusChange(newStatus: DossierStatus) {
    if (!dossier) return
    setUpdating(true)
    try {
      await updateDossierStatus(dossier.id, newStatus)
      setDossier({ ...dossier, status: newStatus })
      toast.success('Statut mis à jour')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdating(false)
    }
  }

  async function handleToggleHot() {
    if (!dossier) return
    try {
      await toggleDossierHot(dossier.id, !dossier.is_hot)
      setDossier({ ...dossier, is_hot: !dossier.is_hot })
      toast.success(dossier.is_hot ? 'Dossier refroidi' : 'Dossier marqué comme chaud')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  async function handleUpdateDossier(data: Record<string, unknown>) {
    if (!dossier) return
    try {
      // Map component property names to database column names
      const dbData: Record<string, unknown> = {}

      if ('departureDateFrom' in data) dbData.departure_date_from = data.departureDateFrom
      if ('departureDateTo' in data) dbData.departure_date_to = data.departureDateTo
      if ('durationDays' in data) dbData.duration_days = data.durationDays
      if ('paxAdults' in data) dbData.pax_adults = data.paxAdults
      if ('paxTeens' in data) dbData.pax_teens = data.paxTeens
      if ('paxChildren' in data) dbData.pax_children = data.paxChildren
      if ('paxInfants' in data) dbData.pax_infants = data.paxInfants
      if ('roomingPreferences' in data) dbData.rooming_preferences = data.roomingPreferences
      if ('budgetMin' in data) dbData.budget_min = data.budgetMin
      if ('budgetMax' in data) dbData.budget_max = data.budgetMax

      await updateDossier(dossier.id, dbData)

      // Update local state with db column names
      setDossier({ ...dossier, ...dbData })
      toast.success('Dossier mis à jour')
    } catch (error) {
      console.error('handleUpdateDossier error:', error)
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      toast.error(`Erreur lors de la mise à jour: ${msg}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!dossier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Dossier introuvable</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(dossier.status as DossierStatus)
  const langConfig = getLanguageConfig(dossier.language || 'FR')

  // Type assertions for nested arrays (Supabase doesn't generate types)
  type DossierParticipant = {
    id: string
    is_lead: boolean
    room_preference: string | null
    room_share_with?: string | null
    is_traveling?: boolean
    age_category?: string
    participant: {
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
      has_portal_access?: boolean
      confirmed_trips_count?: number
    } | null
  }

  type DossierEvent = {
    id: string
    event_type: string
    actor_email: string | null
    payload: Record<string, unknown>
    created_at: string
  }

  const participants = (dossier.participants || []) as unknown as DossierParticipant[]
  const events = (dossier.events || []) as unknown as DossierEvent[]

  const leadDossierParticipant = participants.find(p => p.is_lead)
  const leadParticipant = leadDossierParticipant?.participant
  const leadIsTraveling = leadDossierParticipant?.is_traveling !== false
  const otherParticipants = participants.filter(p => !p.is_lead).map(p => ({
    ...p,
    is_traveling: p.is_traveling !== false,
    age_category: (p.age_category || 'adult') as 'adult' | 'teen' | 'child' | 'infant'
  }))

  // Client name for title (just participant name, not trip name)
  const clientName = leadParticipant
    ? `${leadParticipant.first_name} ${leadParticipant.last_name}`
    : dossier.title

  const notesCount = notes.teamNotes.length + notes.personalNotes.length

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {dossier.reference}
                  </Badge>
                  <span className="text-lg">{langConfig.flag}</span>
                  <h1 className="text-2xl font-bold">{clientName}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={dossier.is_hot ? 'text-orange-500' : 'text-muted-foreground'}
                    onClick={handleToggleHot}
                    title={dossier.is_hot ? 'Retirer du statut chaud' : 'Marquer comme dossier chaud'}
                  >
                    <Flame className={`h-5 w-5 ${dossier.is_hot ? 'fill-current' : ''}`} />
                  </Button>
                  {dossier.is_hot && (
                    <Badge className="bg-orange-500 text-white text-xs">
                      HOT
                    </Badge>
                  )}
                  <HelpTooltip
                    title="Dossier chaud"
                    tips={[
                      "Cliquez sur la flamme pour activer/désactiver",
                      "Les dossiers chauds remontent en priorité dans vos listes",
                      "Idéal pour les clients VIP ou urgents"
                    ]}
                  >
                    <p>
                      Un <strong>dossier chaud</strong> est un dossier prioritaire qui nécessite
                      une attention particulière. Il apparaîtra en haut de vos listes et dans
                      la section &quot;Urgent&quot; du tableau de bord.
                    </p>
                  </HelpTooltip>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Créé le {format(new Date(dossier.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={dossier.status}
                onValueChange={(value) => handleStatusChange(value as DossierStatus)}
                disabled={updating}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOSSIER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <HelpTooltip
                title="Statut du dossier"
                tips={[
                  "Le statut est automatiquement mis à jour lors de certaines actions",
                  "Passez en 'Confirmé' uniquement après accord ferme du client",
                  "Un dossier 'Perdu' peut toujours être réactivé"
                ]}
              >
                <p>
                  Le <strong>statut</strong> reflète l&apos;avancement du dossier dans votre pipeline commercial :
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li><strong>Lead</strong> → Nouvelle demande à qualifier</li>
                  <li><strong>Devis en cours</strong> → Vous préparez une proposition</li>
                  <li><strong>Devis envoyé</strong> → En attente de réponse client</li>
                  <li><strong>Confirmé</strong> → Le client a validé !</li>
                  <li><strong>Acompte/Soldé</strong> → Paiements reçus</li>
                </ul>
              </HelpTooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Archiver
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ============ TABS ============ */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line">
              <TabsTrigger value="apercu">
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="messagerie">
                <Mail className="h-4 w-4 mr-1.5" />
                Messagerie
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Notes & Suivi
                {notesCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs h-5 min-w-[20px] px-1.5">
                    {notesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-1.5" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* ---- Tab: Aperçu (default) ---- */}
            <TabsContent value="apercu" className="mt-6 space-y-6">
              {/* Info Cards - Editable */}
              <DossierInfoCards
                dossierId={dossier.id}
                departureDateFrom={dossier.departure_date_from}
                departureDateTo={dossier.departure_date_to}
                durationDays={dossier.duration_days}
                paxAdults={dossier.pax_adults || 0}
                paxTeens={(dossier as any).pax_teens || 0}
                paxChildren={dossier.pax_children || 0}
                paxInfants={(dossier as any).pax_infants || 0}
                roomingPreferences={(dossier as any).rooming_preferences || []}
                budgetMin={dossier.budget_min}
                budgetMax={dossier.budget_max}
                onUpdate={handleUpdateDossier}
              />

              {/* Trip Offers Section */}
              <TripOffersSection
                dossierId={dossier.id}
                clientName={dossier.client_name}
                clientEmail={leadParticipant?.email || (dossier as any).client_email || null}
                sourceCircuitId={dossier.source_circuit_id}
                linkedTrips={linkedTrips}
                onTripCreated={refetchLinkedTrips}
                onSelectionRequested={(tripId) => {
                  setPreSelectedTripId(tripId)
                  setShowSelectDialog(true)
                }}
                onDeselected={refetchLinkedTrips}
              />

              {/* Select Circuit Dialog */}
              <SelectCircuitDialog
                open={showSelectDialog}
                onOpenChange={(open) => {
                  setShowSelectDialog(open)
                  if (!open) setPreSelectedTripId(undefined)
                }}
                trips={linkedTrips}
                preSelectedTripId={preSelectedTripId}
                onSuccess={() => {
                  refetchLinkedTrips()
                  setShowSelectDialog(false)
                  setPreSelectedTripId(undefined)
                }}
              />

              {/* Travel Logistics (Arrival/Departure) */}
              <TravelLogisticsSection
                dossierId={dossier.id}
                arrivals={logistics.arrivals}
                departures={logistics.departures}
                participants={participants
                  .map(p => p.participant)
                  .filter(Boolean)
                  .filter((p, i, arr) => arr.findIndex(x => x!.id === p!.id) === i) as any[]}
                enabled={true}
                onToggleEnabled={() => {}}
                departureDateFrom={dossier.departure_date_from}
                departureDateTo={dossier.departure_date_to}
              />

              {/* Client Notes */}
              {dossier.client_notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Notes de la demande client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {dossier.client_notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Contact & Participants */}
              <ParticipantsSection
                dossierId={dossier.id}
                leadParticipant={leadParticipant}
                leadDossierParticipant={leadDossierParticipant as any}
                leadIsTraveling={leadIsTraveling}
                otherParticipants={otherParticipants}
                departureDateFrom={dossier.departure_date_from}
                departureDateTo={dossier.departure_date_to}
                onDataChange={reloadDossier}
              />

              {/* Advisor */}
              {dossier.advisor && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Conseiller assigné</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-secondary">
                          {dossier.advisor.first_name?.[0]}{dossier.advisor.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {dossier.advisor.first_name} {dossier.advisor.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dossier.advisor.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline / History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Historique
                  </CardTitle>
                  <CardDescription>
                    Suivi automatique des actions sur le dossier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="relative space-y-4">
                      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                      {events
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 10)
                        .map((event) => (
                        <div key={event.id} className="relative flex gap-4 pl-10">
                          <div className={`absolute left-2 top-1 h-4 w-4 rounded-full border-2 bg-background flex items-center justify-center ${getEventIconColor(event.event_type)}`}>
                            {getEventIcon(event.event_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {getEventLabel(event.event_type)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.created_at), 'dd MMM à HH:mm', { locale: fr })}
                              </span>
                            </div>
                            {event.actor_email && (
                              <p className="text-xs text-muted-foreground">
                                par {event.actor_email}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        L&apos;historique enregistre automatiquement toutes les actions :
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Changements de statut du dossier</li>
                        <li>• Envoi et réception de propositions</li>
                        <li>• Paiements reçus (acompte, solde)</li>
                        <li>• Documents ajoutés/envoyés</li>
                        <li>• Emails envoyés au client</li>
                        <li>• Ajout/modification de participants</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Tab: Messagerie ---- */}
            <TabsContent value="messagerie" className="mt-6">
              {(leadParticipant?.email || (dossier as any).client_email || leadParticipant?.whatsapp) ? (
                <MessagingSection
                  dossierId={dossier.id}
                  clientEmail={leadParticipant?.email || (dossier as any).client_email}
                  clientName={leadParticipant
                    ? `${leadParticipant.first_name} ${leadParticipant.last_name}`
                    : (dossier as any).client_name || 'Client'}
                  clientWhatsApp={leadParticipant?.whatsapp || null}
                  advisorName={dossier.advisor ? `${dossier.advisor.first_name} ${dossier.advisor.last_name}` : 'Conseiller'}
                  destination={dossier.title || ''}
                  variables={{
                    dossier_reference: dossier.reference,
                    departure_date: dossier.departure_date_from ? format(new Date(dossier.departure_date_from), 'dd MMMM yyyy', { locale: fr }) : '',
                    return_date: dossier.departure_date_to ? format(new Date(dossier.departure_date_to), 'dd MMMM yyyy', { locale: fr }) : '',
                    pax_count: String((dossier.pax_adults || 0) + (dossier.pax_children || 0)),
                    total_price: dossier.budget_max ? `${dossier.budget_max.toLocaleString('fr-FR')} €` : '',
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Aucune adresse email ou WhatsApp</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajoutez un email ou un numéro WhatsApp au participant principal pour activer la messagerie
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ---- Tab: Notes & Suivi ---- */}
            <TabsContent value="notes" className="mt-6">
              <DossierNotesFullSection
                dossierId={dossier.id}
                notes={notes}
                nomadaysContactId={dossier.nomadays_contact_id || undefined}
                nomadaysContactName={dossier.advisor?.first_name ? `${dossier.advisor.first_name} ${dossier.advisor.last_name}` : undefined}
                dmcAdvisorId={dossier.advisor_id || undefined}
                dmcAdvisorName={dossier.advisor?.first_name ? `${dossier.advisor.first_name} ${dossier.advisor.last_name}` : undefined}
                currentUserId={currentUserId}
                onNotesChange={reloadNotes}
              />
            </TabsContent>

            {/* ---- Tab: Documents & Facturation ---- */}
            <TabsContent value="documents" className="mt-6">
              <InvoicesSection
                dossierId={dossier.id}
                dossierReference={dossier.reference}
                clientName={(dossier as any).client_name || null}
                clientEmail={leadParticipant?.email || (dossier as any).client_email || null}
                clientCompany={(dossier as any).client_company || null}
                clientAddress={(dossier as any).client_address || null}
                destinationCountries={(dossier as any).destination_countries || undefined}
                travelStartDate={dossier.departure_date_from || null}
                travelEndDate={dossier.departure_date_to || null}
                participants={participants
                  .filter(dp => dp.participant)
                  .map(dp => ({
                    id: dp.participant!.id,
                    first_name: dp.participant!.first_name,
                    last_name: dp.participant!.last_name,
                    email: dp.participant!.email,
                    phone: dp.participant!.phone,
                    address: dp.participant!.address,
                    city: dp.participant!.city,
                    postal_code: dp.participant!.postal_code,
                    country: dp.participant!.country,
                    is_lead: dp.is_lead,
                  }))}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Sidebar - Notes Panel */}
      <div className="w-80 border-l bg-muted/20 p-4 overflow-auto">
        <DossierNotesPanel
          dossierId={dossier.id}
          notes={notes.teamNotes}
          personalNotes={notes.personalNotes}
          nomadaysContactId={dossier.nomadays_contact_id || undefined}
          nomadaysContactName={dossier.advisor?.first_name ? `${dossier.advisor.first_name} ${dossier.advisor.last_name}` : undefined}
          dmcAdvisorId={dossier.advisor_id || undefined}
          dmcAdvisorName={dossier.advisor?.first_name ? `${dossier.advisor.first_name} ${dossier.advisor.last_name}` : undefined}
          currentUserId={currentUserId}
          onNotesChange={reloadNotes}
        />
      </div>
    </div>
  )
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    dossier_created: 'Dossier créé',
    dossier_status_changed: 'Statut modifié',
    proposal_created: 'Proposition créée',
    proposal_sent: 'Proposition envoyée',
    proposal_accepted: 'Proposition acceptée',
    proposal_rejected: 'Proposition refusée',
    deposit_received: 'Acompte reçu',
    payment_received: 'Paiement reçu',
    fully_paid: 'Paiement complet',
    document_uploaded: 'Document ajouté',
    document_sent: 'Document envoyé',
    email_sent: 'Email envoyé',
    note_added: 'Note ajoutée',
    participant_added: 'Participant ajouté',
    participant_removed: 'Participant retiré',
    assigned: 'Conseiller assigné',
    released_to_dmc: 'Transmis au DMC',
  }
  return labels[eventType] || eventType
}

function getEventIcon(eventType: string): React.ReactNode {
  const iconClass = "h-2.5 w-2.5"
  switch (eventType) {
    case 'proposal_accepted':
    case 'fully_paid':
      return <CheckCircle className={iconClass} />
    case 'proposal_rejected':
      return <XCircle className={iconClass} />
    case 'email_sent':
    case 'document_sent':
      return <Mail className={iconClass} />
    case 'deposit_received':
    case 'payment_received':
      return <CreditCard className={iconClass} />
    case 'document_uploaded':
      return <Upload className={iconClass} />
    case 'participant_added':
      return <UserPlus className={iconClass} />
    case 'participant_removed':
      return <UserMinus className={iconClass} />
    case 'dossier_status_changed':
      return <RefreshCw className={iconClass} />
    default:
      return null
  }
}

function getEventIconColor(eventType: string): string {
  switch (eventType) {
    case 'proposal_accepted':
    case 'fully_paid':
      return 'border-green-500 text-green-500'
    case 'proposal_rejected':
      return 'border-red-500 text-red-500'
    case 'deposit_received':
    case 'payment_received':
      return 'border-emerald-500 text-emerald-500'
    default:
      return 'border-primary'
  }
}
