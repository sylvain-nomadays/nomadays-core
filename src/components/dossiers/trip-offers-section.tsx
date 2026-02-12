'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus,
  Copy,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Edit,
  Eye,
  Search,
  Loader2,
  MapPin,
  Calendar,
  ArrowLeft,
  Check,
  ImageIcon,
  Tag,
  Send,
  CheckCircle,
  Filter,
  Upload,
  Link2,
  Trash2,
  Globe,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { HelpTooltip, EmptyStateWithHelp } from '@/components/ui/help-tooltip'
import { useTrips, useDuplicateTrip, useUpdateTrip, useDeselectTrip } from '@/hooks/useTrips'
import type { Trip } from '@/lib/api/types'
import { toast } from 'sonner'
import {
  getDossierOfferDocuments,
  uploadDossierDocument,
  createExternalOffer,
  deleteDossierDocument,
  publishExternalOffer,
  type DossierDocument,
} from '@/lib/actions/documents'

interface TripOffersSectionProps {
  dossierId: string
  clientName?: string | null
  clientEmail?: string | null
  sourceCircuitId?: string | null
  linkedTrips: Trip[]
  onTripCreated?: () => void
  onSelectionRequested?: (preSelectedTripId?: number) => void
  onDeselected?: () => void
}

// ─── Trip type labels ──────────────────────────────────────────────
const TRIP_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  template: { label: 'Template', color: '#8BA080', bg: '#F4F7F3' },
  online: { label: 'Web', color: '#0FB6BC', bg: '#E6F9FA' },
  gir: { label: 'GIR', color: '#DD9371', bg: '#FDF5F2' },
  custom: { label: 'Sur mesure', color: '#737373', bg: '#F5F5F5' },
}

const TARIFICATION_MODE_LABELS: Record<string, string> = {
  range_web: 'Prix / tranche',
  per_person: 'Par personne',
  per_group: 'Par groupe',
  service_list: 'Multi-groupes',
  enumeration: 'Détail prestations',
}

type FilterMode = 'active' | 'rejected' | 'all'

export function TripOffersSection({
  dossierId,
  clientName,
  clientEmail,
  sourceCircuitId,
  linkedTrips,
  onTripCreated,
  onSelectionRequested,
  onDeselected,
}: TripOffersSectionProps) {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  const [showExternalOfferForm, setShowExternalOfferForm] = useState(false)
  const [publishingTripId, setPublishingTripId] = useState<number | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [sendEmailOnPublish, setSendEmailOnPublish] = useState(true)
  const [filterMode, setFilterMode] = useState<FilterMode>('active')
  const { mutate: deselectTrip, loading: deselecting } = useDeselectTrip()

  // External offers (PDF / links)
  const [externalOffers, setExternalOffers] = useState<DossierDocument[]>([])
  const [loadingOffers, setLoadingOffers] = useState(false)

  const { mutate: updateTrip, loading: publishing } = useUpdateTrip()

  // Load external offers
  useEffect(() => {
    async function loadOffers() {
      setLoadingOffers(true)
      try {
        const docs = await getDossierOfferDocuments(dossierId)
        setExternalOffers(docs)
      } catch (error) {
        console.error('Error loading external offers:', error)
      } finally {
        setLoadingOffers(false)
      }
    }
    loadOffers()
  }, [dossierId])

  const reloadExternalOffers = async () => {
    const docs = await getDossierOfferDocuments(dossierId)
    setExternalOffers(docs)
  }

  // Check if there's already a selected/confirmed trip
  const hasConfirmedTrip = linkedTrips.some(t => t.status === 'confirmed')
  // Check if there are publishable (sent) trips available for selection
  const hasSentTrips = linkedTrips.some(t => t.status === 'sent')
  const hasSelectableTrips = hasSentTrips && !hasConfirmedTrip

  // Filter trips based on filter mode
  const filteredTrips = useMemo(() => {
    switch (filterMode) {
      case 'active':
        return linkedTrips.filter(t => t.status !== 'cancelled')
      case 'rejected':
        return linkedTrips.filter(t => t.status === 'cancelled')
      case 'all':
        return linkedTrips
    }
  }, [linkedTrips, filterMode])

  const cancelledCount = linkedTrips.filter(t => t.status === 'cancelled').length

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      quoted: { label: 'Devis', variant: 'outline' },
      sent: { label: 'Envoyé', variant: 'default' },
      confirmed: { label: 'Confirmé', variant: 'default' },
      operating: { label: 'En cours', variant: 'default' },
      completed: { label: 'Terminé', variant: 'secondary' },
      cancelled: { label: 'Annulé', variant: 'destructive' },
    }
    const config = configs[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handlePublish = async () => {
    if (!publishingTripId) return
    try {
      await updateTrip({
        id: publishingTripId,
        data: { status: 'sent' },
      })
      toast.success('Proposition publiée — statut passé à "Envoyé"')
      setShowPublishDialog(false)
      setPublishingTripId(null)
      setSendEmailOnPublish(true) // Reset for next time
      onTripCreated?.() // refetch
    } catch (err) {
      console.error('Failed to publish trip:', err)
      toast.error('Erreur lors de la publication')
    }
  }

  const handleDeselect = async (tripId: number) => {
    try {
      const result = await deselectTrip(tripId)
      toast.success(`Sélection annulée — ${result.trips_restored} proposition(s) restaurée(s)`)
      onDeselected?.()
    } catch (err) {
      console.error('Failed to deselect trip:', err)
      toast.error('Erreur lors de la désélection')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Offres de voyage
          <HelpTooltip
            title="Offres de voyage"
            tips={[
              "Créez plusieurs versions pour comparer les options",
              "Publiez pour envoyer au client par email",
              "Sélectionnez la proposition retenue pour confirmer"
            ]}
          >
            <p>
              Les <strong>offres de voyage</strong> sont les propositions que vous
              envoyez au client. Chaque offre contient un programme détaillé,
              les prestations et le prix.
            </p>
            <p className="mt-2">
              Publiez une proposition pour l&apos;envoyer au client, puis
              sélectionnez celle retenue pour confirmer le dossier.
            </p>
          </HelpTooltip>
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Filter dropdown for cancelled trips */}
          {cancelledCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  {filterMode === 'active' ? 'Actives' : filterMode === 'rejected' ? 'Rejetées' : 'Toutes'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterMode('active')}>
                  {filterMode === 'active' && <Check className="h-4 w-4 mr-2" />}
                  <span className={filterMode !== 'active' ? 'ml-6' : ''}>Propositions actives</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterMode('rejected')}>
                  {filterMode === 'rejected' && <Check className="h-4 w-4 mr-2" />}
                  <span className={filterMode !== 'rejected' ? 'ml-6' : ''}>Propositions rejetées ({cancelledCount})</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterMode('all')}>
                  {filterMode === 'all' && <Check className="h-4 w-4 mr-2" />}
                  <span className={filterMode !== 'all' ? 'ml-6' : ''}>Toutes les propositions</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Select circuit button */}
          {hasSelectableTrips && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#0FB6BC] text-[#0FB6BC] hover:bg-[#E6F9FA]"
              onClick={() => onSelectionRequested?.()}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Sélectionner
            </Button>
          )}

          {/* Add trip button */}
          <Dialog open={showAddModal} onOpenChange={(open) => {
            setShowAddModal(open)
            if (!open) {
              setShowCopyPicker(false)
              setShowExternalOfferForm(false)
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className={(showCopyPicker || showExternalOfferForm) ? 'max-w-2xl' : 'max-w-md'}>
              {showCopyPicker ? (
                <CircuitPicker
                  dossierId={dossierId}
                  clientName={clientName}
                  onBack={() => setShowCopyPicker(false)}
                  onSuccess={(trip) => {
                    setShowAddModal(false)
                    setShowCopyPicker(false)
                    onTripCreated?.()
                    router.push(`/admin/circuits/${trip.id}`)
                  }}
                />
              ) : showExternalOfferForm ? (
                <ExternalOfferForm
                  dossierId={dossierId}
                  onBack={() => setShowExternalOfferForm(false)}
                  onSuccess={() => {
                    setShowAddModal(false)
                    setShowExternalOfferForm(false)
                    reloadExternalOffers()
                  }}
                />
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Ajouter une offre de voyage</DialogTitle>
                    <DialogDescription>
                      Choisissez comment créer la proposition
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-4"
                      onClick={() => setShowCopyPicker(true)}
                    >
                      <Copy className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium">Copier un circuit existant</p>
                        <p className="text-xs text-muted-foreground">Partir d&apos;un modèle ou circuit web</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-4"
                      onClick={() => {
                        setShowAddModal(false)
                      }}
                    >
                      <ExternalLink className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium">Rejoindre un départ GIR</p>
                        <p className="text-xs text-muted-foreground">Associer à un départ groupé existant</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-4"
                      onClick={() => {
                        setShowAddModal(false)
                      }}
                    >
                      <Plus className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium">Créer de zéro</p>
                        <p className="text-xs text-muted-foreground">Construire un circuit sur mesure</p>
                      </div>
                    </Button>

                    <div className="border-t pt-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-4"
                        onClick={() => setShowExternalOfferForm(true)}
                      >
                        <Upload className="h-5 w-5 mr-3 flex-shrink-0" />
                        <div className="text-left">
                          <p className="font-medium">Offre externe (PDF ou lien)</p>
                          <p className="text-xs text-muted-foreground">Uploadez un PDF ou collez un lien web</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sourceCircuitId && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Demande depuis le site</span>
              </div>
              <Button variant="outline" size="sm">
                Voir le circuit
              </Button>
            </div>
          </div>
        )}

        {filteredTrips.length > 0 ? (
          <div className="space-y-3">
            {filteredTrips.map((trip) => {
              const typeInfo = TRIP_TYPE_LABELS[trip.type] ?? TRIP_TYPE_LABELS['custom']!
              const cotations = trip.cotations_summary || []
              const isConfirmed = trip.status === 'confirmed'
              const isCancelled = trip.status === 'cancelled'
              return (
                <div
                  key={trip.id}
                  className={`flex rounded-lg border transition-colors cursor-pointer overflow-hidden ${
                    isConfirmed
                      ? 'border-[#0FB6BC] bg-[#E6F9FA]/30 hover:bg-[#E6F9FA]/50'
                      : isCancelled
                      ? 'border-gray-200 bg-gray-50 opacity-60 hover:opacity-80'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => router.push(`/admin/circuits/${trip.id}`)}
                >
                  {/* Thumbnail à gauche */}
                  <div className="w-28 h-auto flex-shrink-0 bg-gray-100">
                    {trip.hero_photo_url ? (
                      <img
                        src={trip.hero_photo_url}
                        alt={trip.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[80px]">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{trip.name}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: typeInfo.color, backgroundColor: typeInfo.bg }}
                      >
                        {typeInfo.label}
                      </span>
                      {getStatusBadge(trip.status)}
                      {isConfirmed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0FB6BC] text-white flex-shrink-0">
                          ✓ Sélectionné
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      {trip.duration_days > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {trip.duration_days}j
                        </span>
                      )}
                      {trip.destination_country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {trip.destination_country}
                        </span>
                      )}
                      {trip.start_date && (
                        <span>
                          Départ {format(new Date(trip.start_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>

                    {/* Cotations / Tarification */}
                    {cotations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cotations.map((cot) => (
                          <div
                            key={cot.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs"
                          >
                            <Tag className="h-3 w-3 text-gray-400" />
                            <span className="font-medium text-gray-700">{cot.name}</span>
                            {cot.tarification_mode && (
                              <span className="text-gray-400">
                                · {TARIFICATION_MODE_LABELS[cot.tarification_mode] || cot.tarification_mode}
                              </span>
                            )}
                            {cot.price_label && (
                              <span className="font-semibold text-[#0FB6BC]">{cot.price_label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-start p-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/circuits/${trip.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le circuit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/circuits/${trip.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        {(trip.status === 'draft' || trip.status === 'quoted') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setPublishingTripId(trip.id)
                                setShowPublishDialog(true)
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Publier au client
                            </DropdownMenuItem>
                          </>
                        )}
                        {!hasConfirmedTrip && ['draft', 'sent', 'quoted'].includes(trip.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectionRequested?.(trip.id)
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Sélectionner
                            </DropdownMenuItem>
                          </>
                        )}
                        {trip.status === 'confirmed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={deselecting}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeselect(trip.id)
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Désélectionner
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        ) : filterMode === 'rejected' ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Aucune proposition rejetée
          </div>
        ) : (
          <EmptyStateWithHelp
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            title="Aucune offre de voyage"
            description="Créez votre première proposition pour ce client. Vous pourrez y détailler le programme, les prestations et le tarif."
            features={[
              "Copiez un circuit existant pour gagner du temps",
              "Créez plusieurs versions pour comparer",
              "Publiez pour envoyer au client par email"
            ]}
            action={{
              label: "Créer une offre",
              onClick: () => setShowAddModal(true)
            }}
          />
        )}
        {/* External offers (PDFs / links) */}
        {externalOffers.length > 0 && (
          <div className="space-y-2 mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Offres externes</p>
            {externalOffers.map((doc) => (
              <ExternalOfferCard
                key={doc.id}
                document={doc}
                dossierId={dossierId}
                clientEmail={clientEmail}
                onDeleted={reloadExternalOffers}
                onPublished={reloadExternalOffers}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Publish confirmation dialog */}
      <Dialog open={showPublishDialog} onOpenChange={(open) => {
        setShowPublishDialog(open)
        if (!open) setSendEmailOnPublish(true) // Reset on close
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publier la proposition</DialogTitle>
            <DialogDescription>
              Le statut du circuit passera à &laquo;&nbsp;Envoyé&nbsp;&raquo;.
              Vous pouvez choisir d&apos;envoyer ou non un email au client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Send email checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="send-email"
                checked={sendEmailOnPublish}
                onCheckedChange={(checked) => setSendEmailOnPublish(checked === true)}
                disabled={!clientEmail}
              />
              <div className="grid gap-1">
                <Label
                  htmlFor="send-email"
                  className="text-sm font-medium cursor-pointer"
                >
                  Envoyer la proposition par email
                </Label>
                {clientEmail ? (
                  <p className="text-xs text-muted-foreground">
                    Destinataire : {clientName || 'Client'} ({clientEmail})
                  </p>
                ) : (
                  <p className="text-xs text-yellow-600">
                    Aucun email client configuré sur ce dossier
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-[#0FB6BC] hover:bg-[#0C9296]"
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publication...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Circuit Picker — Search & select a circuit to copy ──────────

function CircuitPicker({
  dossierId,
  clientName,
  onBack,
  onSuccess,
}: {
  dossierId: string
  clientName?: string | null
  onBack: () => void
  onSuccess: (trip: Trip) => void
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [copying, setCopying] = useState(false)
  // Step: 'select' → pick circuit, 'name' → name before copy
  const [step, setStep] = useState<'select' | 'name'>('select')
  const [newName, setNewName] = useState('')

  const { mutate: duplicateTrip } = useDuplicateTrip()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch trips
  const { data: tripsData, loading } = useTrips({
    search: debouncedSearch || undefined,
    type: typeFilter,
    page_size: 20,
  })

  const trips = tripsData?.items || []

  // When a trip is selected and user clicks "Next", go to naming step
  const handleGoToNaming = () => {
    if (!selectedTrip) return
    // Suggest name: "Circuit sur mesure pour {Client Name}"
    const suggestion = clientName
      ? `Circuit sur mesure pour ${clientName}`
      : `${selectedTrip.name} (copie)`
    setNewName(suggestion)
    setStep('name')
  }

  const handleCopy = async () => {
    if (!selectedTrip) return
    setCopying(true)
    try {
      const newTrip = await duplicateTrip({
        id: selectedTrip.id,
        dossierId,
        newName: newName.trim() || undefined,
        asType: 'custom',
      })
      toast.success(`Circuit "${newName.trim()}" copié avec succès`)
      onSuccess(newTrip)
    } catch (err) {
      console.error('Failed to duplicate trip:', err)
      toast.error('Erreur lors de la copie du circuit')
      setCopying(false)
    }
  }

  const typeFilters = [
    { value: undefined as string | undefined, label: 'Tous' },
    { value: 'template', label: 'Templates' },
    { value: 'online', label: 'Web' },
    { value: 'gir', label: 'GIR' },
    { value: 'custom', label: 'Sur mesure' },
  ]

  // ─── Step 2: Name the circuit ───────────────────────────────────
  if (step === 'name' && selectedTrip) {
    const typeInfo = TRIP_TYPE_LABELS[selectedTrip.type] ?? TRIP_TYPE_LABELS['custom']!
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setStep('select')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle>Nommer le circuit</DialogTitle>
              <DialogDescription>
                Donnez un nom au circuit qui sera créé pour ce dossier
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Source circuit recap */}
          <div className="p-3 rounded-lg bg-gray-50 border">
            <p className="text-xs text-muted-foreground mb-1">Circuit source</p>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{selectedTrip.name}</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ color: typeInfo.color, backgroundColor: typeInfo.bg }}
              >
                {typeInfo.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {selectedTrip.duration_days > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {selectedTrip.duration_days}j
                </span>
              )}
              {selectedTrip.destination_country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedTrip.destination_country}
                </span>
              )}
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label htmlFor="circuit-name" className="text-sm font-medium">
              Nom du nouveau circuit
            </label>
            <Input
              id="circuit-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Circuit sur mesure pour Jean Dupont"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  e.preventDefault()
                  handleCopy()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Le circuit sera créé en type &quot;Sur mesure&quot; et rattaché à ce dossier.
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => setStep('select')}>
            Retour
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!newName.trim() || copying}
            size="sm"
          >
            {copying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copie en cours...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copier et créer
              </>
            )}
          </Button>
        </div>
      </>
    )
  }

  // ─── Step 1: Select a circuit ───────────────────────────────────
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <DialogTitle>Copier un circuit existant</DialogTitle>
            <DialogDescription>
              Sélectionnez le circuit source à copier dans ce dossier
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* Search + type filter */}
      <div className="space-y-3 pt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom de circuit..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {typeFilters.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                typeFilter === f.value
                  ? 'bg-[#0FB6BC] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results list */}
      <div className="max-h-[360px] overflow-y-auto -mx-1 px-1 space-y-1.5 mt-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#0FB6BC]" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {debouncedSearch ? `Aucun circuit trouvé pour "${debouncedSearch}"` : 'Aucun circuit disponible'}
          </div>
        ) : (
          trips.map((trip) => {
            const typeInfo = TRIP_TYPE_LABELS[trip.type] ?? TRIP_TYPE_LABELS['custom']!
            const isSelected = selectedTrip?.id === trip.id
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => setSelectedTrip(isSelected ? null : trip)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-[#0FB6BC] bg-[#E6F9FA] ring-1 ring-[#0FB6BC]/30'
                    : 'border-gray-200 hover:border-[#99E7EB] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Selection indicator */}
                  <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-[#0FB6BC] bg-[#0FB6BC]' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{trip.name}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: typeInfo.color, backgroundColor: typeInfo.bg }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {trip.duration_days > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {trip.duration_days}j
                        </span>
                      )}
                      {trip.locations_summary && trip.locations_summary.length > 0 && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {trip.locations_summary.slice(0, 3).join(' · ')}
                        </span>
                      )}
                      {trip.destination_country && !trip.locations_summary?.length && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trip.destination_country}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          {selectedTrip
            ? `Sélectionné : ${selectedTrip.name}`
            : `${trips.length} circuit${trips.length !== 1 ? 's' : ''} trouvé${trips.length !== 1 ? 's' : ''}`
          }
        </p>
        <Button
          onClick={handleGoToNaming}
          disabled={!selectedTrip}
          size="sm"
        >
          Suivant
        </Button>
      </div>
    </>
  )
}

// ─── External Offer Form — Upload PDF or paste link ─────────────

function ExternalOfferForm({
  dossierId,
  onBack,
  onSuccess,
}: {
  dossierId: string
  onBack: () => void
  onSuccess: () => void
}) {
  const [mode, setMode] = useState<'pdf' | 'link'>('pdf')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [priceTotal, setPriceTotal] = useState('')
  const [pricePerPerson, setPricePerPerson] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [saving, setSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      // Auto-fill name from filename if empty
      if (!name) {
        setName(selected.name.replace(/\.pdf$/i, ''))
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const canSubmit = name.trim() && (
    (mode === 'pdf' && file) ||
    (mode === 'link' && url.trim())
  )

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      if (mode === 'pdf' && file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', name.trim())
        if (priceTotal) formData.append('price_total', priceTotal)
        if (pricePerPerson) formData.append('price_per_person', pricePerPerson)
        formData.append('currency', currency)
        await uploadDossierDocument(dossierId, formData)
        toast.success('PDF ajouté avec succès')
      } else if (mode === 'link') {
        await createExternalOffer(dossierId, {
          name: name.trim(),
          url: url.trim(),
          price_total: priceTotal ? parseFloat(priceTotal) : null,
          price_per_person: pricePerPerson ? parseFloat(pricePerPerson) : null,
          currency,
        })
        toast.success('Lien ajouté avec succès')
      }
      onSuccess()
    } catch (error) {
      console.error('Error adding external offer:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <DialogTitle>Offre externe</DialogTitle>
            <DialogDescription>
              Uploadez un PDF ou collez un lien vers votre offre
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 pt-4">
        {/* Offer name */}
        <div className="space-y-2">
          <Label htmlFor="offer-name">Titre de l&apos;offre *</Label>
          <Input
            id="offer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Circuit Thaïlande 10 jours"
            autoFocus
          />
        </div>

        {/* Mode toggle */}
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('pdf')}
              className={mode === 'pdf' ? '' : ''}
            >
              <FileText className="h-4 w-4 mr-2" />
              Fichier PDF
            </Button>
            <Button
              type="button"
              variant={mode === 'link' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('link')}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Lien externe
            </Button>
          </div>
        </div>

        {/* PDF upload zone */}
        {mode === 'pdf' && (
          <div className="space-y-2">
            <Label>Fichier PDF *</Label>
            {file ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Cliquez pour sélectionner un PDF</p>
                  <p className="text-xs text-muted-foreground">PDF uniquement, 20 MB max</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        )}

        {/* External link */}
        {mode === 'link' && (
          <div className="space-y-2">
            <Label htmlFor="offer-url">URL *</Label>
            <Input
              id="offer-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Lien vers Google Drive, Dropbox, site web, etc.
            </p>
          </div>
        )}

        {/* Pricing section */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tarification (optionnel)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="price-total" className="text-xs">Prix total</Label>
              <Input
                id="price-total"
                value={priceTotal}
                onChange={(e) => setPriceTotal(e.target.value)}
                placeholder="1 250"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price-pp" className="text-xs">Prix / personne</Label>
              <Input
                id="price-pp"
                value={pricePerPerson}
                onChange={(e) => setPricePerPerson(e.target.value)}
                placeholder="625"
                type="number"
                min="0"
                step="1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="currency" className="text-xs">Devise</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="THB">THB (฿)</option>
              <option value="VND">VND (₫)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={onBack}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === 'pdf' ? 'Upload en cours...' : 'Enregistrement...'}
            </>
          ) : (
            <>
              {mode === 'pdf' ? <Upload className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              Ajouter l&apos;offre
            </>
          )}
        </Button>
      </div>
    </>
  )
}

// ─── External Offer Card — Display uploaded PDF or link ─────────

function ExternalOfferCard({
  document: doc,
  dossierId,
  clientEmail,
  onDeleted,
  onPublished,
}: {
  document: DossierDocument
  dossierId: string
  clientEmail?: string | null
  onDeleted: () => void
  onPublished: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const isPdf = doc.type === 'proposal_pdf'
  const isPublished = !!doc.published_at
  const hasClientEmail = clientEmail && !clientEmail.endsWith('@noemail.local')

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteDossierDocument(doc.id, dossierId)
      toast.success('Offre supprimée')
      onDeleted()
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishExternalOffer(doc.id, dossierId)
      toast.success('Offre publiée et email envoyé au client')
      onPublished()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la publication')
    } finally {
      setPublishing(false)
    }
  }

  const handleOpen = () => {
    window.open(doc.file_url, '_blank', 'noopener,noreferrer')
  }

  // Extract domain from URL for display
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€', USD: '$', THB: '฿', VND: '₫', GBP: '£',
  }
  const currSymbol = CURRENCY_SYMBOLS[doc.currency] || doc.currency

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors group">
      {/* Icon */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
        isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
      }`}>
        {isPdf ? <FileText className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{doc.name}</p>
          {isPublished && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 flex-shrink-0 border-green-300 text-green-600 bg-green-50">
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
              Publié
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isPdf ? (
            <>
              <span>PDF</span>
              {doc.file_size && (
                <>
                  <span>·</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </>
              )}
            </>
          ) : (
            <span className="truncate">{getDomain(doc.file_url)}</span>
          )}
          <span>·</span>
          <span>{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}</span>
        </div>
      </div>

      {/* Price display */}
      {(doc.price_total || doc.price_per_person) && (
        <div className="flex-shrink-0 text-right">
          {doc.price_total && (
            <p className="text-sm font-semibold text-foreground">
              {doc.price_total.toLocaleString('fr-FR')} {currSymbol}
            </p>
          )}
          {doc.price_per_person && (
            <p className="text-[11px] text-muted-foreground">
              {doc.price_per_person.toLocaleString('fr-FR')} {currSymbol}/pers
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0"
        onClick={handleOpen}
      >
        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
        Ouvrir
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 flex-shrink-0"
            disabled={deleting || publishing}
          >
            {(deleting || publishing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpen}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir dans un nouvel onglet
          </DropdownMenuItem>
          {!isPublished && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handlePublish}
                disabled={!hasClientEmail || publishing}
                title={!hasClientEmail ? 'Aucune adresse email client' : undefined}
              >
                <Send className="h-4 w-4 mr-2" />
                {publishing ? 'Envoi en cours...' : 'Publier et envoyer au client'}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
