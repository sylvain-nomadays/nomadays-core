'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus,
  Copy,
  ExternalLink,
  FileText,
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { HelpTooltip, EmptyStateWithHelp } from '@/components/ui/help-tooltip'

interface TripOffer {
  id: string
  title: string
  version: number
  status: string
  total_sell: number | null
  currency: string
  pax_count: number | null
  price_per_person: number | null
  sent_at: string | null
  created_at: string
}

interface TripOffersSectionProps {
  dossierId: string
  sourceCircuitId?: string | null
  tripOffers: TripOffer[]
}

export function TripOffersSection({ dossierId, sourceCircuitId, tripOffers }: TripOffersSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false)

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      sent: { label: 'Envoyée', variant: 'default' },
      viewed: { label: 'Vue', variant: 'outline' },
      accepted: { label: 'Acceptée', variant: 'default' },
      rejected: { label: 'Refusée', variant: 'destructive' },
      expired: { label: 'Expirée', variant: 'secondary' },
    }
    const config = configs[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
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
              "Le client peut voir et accepter directement depuis son espace",
              "Une fois acceptée, l'offre devient la base du voyage"
            ]}
          >
            <p>
              Les <strong>offres de voyage</strong> sont les propositions que vous
              envoyez au client. Chaque offre contient un programme détaillé,
              les prestations et le prix.
            </p>
            <p className="mt-2">
              Vous pouvez créer plusieurs versions jusqu'à trouver
              la formule idéale pour votre client.
            </p>
          </HelpTooltip>
        </CardTitle>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                onClick={() => {
                  // TODO: Copy existing circuit
                  setShowAddModal(false)
                }}
              >
                <Copy className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Copier un circuit existant</p>
                  <p className="text-xs text-muted-foreground">Partir d'un modèle de circuit</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => {
                  // TODO: Link to GIR
                  setShowAddModal(false)
                }}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Rejoindre un départ GIR</p>
                  <p className="text-xs text-muted-foreground">Associer à un départ groupé existant</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => {
                  // TODO: Link to web trip
                  setShowAddModal(false)
                }}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Lier à un voyage web</p>
                  <p className="text-xs text-muted-foreground">Utiliser un circuit du site internet</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => {
                  // TODO: Create from scratch
                  setShowAddModal(false)
                }}
              >
                <Plus className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Créer de zéro</p>
                  <p className="text-xs text-muted-foreground">Construire un circuit sur mesure</p>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

        {tripOffers.length > 0 ? (
          <div className="space-y-3">
            {tripOffers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{offer.title}</span>
                    <Badge variant="outline" className="text-xs">
                      v{offer.version}
                    </Badge>
                    {getStatusBadge(offer.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {offer.pax_count && (
                      <span>{offer.pax_count} pax</span>
                    )}
                    {offer.price_per_person && (
                      <span>{offer.price_per_person.toLocaleString()} €/pers</span>
                    )}
                    {offer.sent_at && (
                      <span>
                        Envoyée le {format(new Date(offer.sent_at), 'dd MMM', { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    {offer.total_sell && (
                      <p className="font-semibold text-lg">
                        {offer.total_sell.toLocaleString()} €
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer au client
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateWithHelp
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            title="Aucune offre de voyage"
            description="Créez votre première proposition pour ce client. Vous pourrez y détailler le programme, les prestations et le tarif."
            features={[
              "Copiez un circuit existant pour gagner du temps",
              "Créez plusieurs versions pour comparer",
              "Envoyez directement au client depuis l'espace pro"
            ]}
            action={{
              label: "Créer une offre",
              onClick: () => setShowAddModal(true)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
