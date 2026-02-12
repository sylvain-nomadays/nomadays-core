'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FileText,
  Plus,
  MoreHorizontal,
  Download,
  Send,
  ArrowRight,
  XCircle,
  CheckCircle,
  Receipt,
  Pencil,
  HelpCircle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { useInvoices } from '@/hooks/useInvoices'
import { CreateInvoicePanel, type InvoiceParticipant } from '@/components/invoices/create-invoice-panel'
import { InvoiceDetailSheet } from '@/components/invoices/invoice-detail-sheet'
import type { InvoiceSummary, InvoiceType, InvoiceStatus } from '@/lib/api/types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface InvoicesSectionProps {
  dossierId: string
  dossierReference: string
  clientName?: string | null
  clientEmail?: string | null
  clientAddress?: string | null
  clientCompany?: string | null
  destinationCountries?: string[]
  travelStartDate?: string | null
  travelEndDate?: string | null
  participants?: InvoiceParticipant[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_BADGE_STYLES: Record<InvoiceType, string> = {
  DEV: 'bg-sage-100 text-sage-800 border-sage-200',
  PRO: 'bg-primary-100 text-primary-800 border-primary-200',
  FA: 'bg-secondary-100 text-secondary-800 border-secondary-200',
  AV: 'bg-red-100 text-red-800 border-red-200',
}

const TYPE_LABELS: Record<InvoiceType, string> = {
  DEV: 'Devis',
  PRO: 'Proforma',
  FA: 'Facture',
  AV: 'Avoir',
}

const STATUS_BADGE_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  paid: 'Payé',
  cancelled: 'Annulé',
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InvoicesSection({
  dossierId,
  dossierReference,
  clientName,
  clientEmail,
  clientAddress,
  clientCompany,
  destinationCountries,
  travelStartDate,
  travelEndDate,
  participants = [],
}: InvoicesSectionProps) {
  const [typeFilter, setTypeFilter] = useState<InvoiceType | undefined>(undefined)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createType, setCreateType] = useState<InvoiceType>('DEV')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | undefined>(undefined)

  const {
    invoices,
    total,
    isLoading,
    refetch,
    generatePdf,
    generatingPdf,
    send,
    sending,
    markPaid,
    markingPaid,
    cancel,
    cancelling,
    advance,
    advancing,
    remove,
    removing,
  } = useInvoices({
    dossier_id: dossierId,
    type: typeFilter,
  })

  // ---- Handlers ----

  const handleCreateOpen = (type: InvoiceType) => {
    setCreateType(type)
    setShowCreateDialog(true)
  }

  const handleCreated = () => {
    setShowCreateDialog(false)
    refetch()
    toast.success('Document créé avec succès')
  }

  const handleGeneratePdf = async (id: number) => {
    try {
      await generatePdf(id)
      refetch()
      toast.success('PDF généré avec succès')
    } catch {
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleSend = async (invoice: InvoiceSummary) => {
    const email = invoice.client_name ? clientEmail : clientEmail
    if (!email) {
      toast.error("Pas d'adresse email client")
      return
    }
    try {
      await send({ id: invoice.id, to_email: email })
      refetch()
      toast.success('Document envoyé')
    } catch {
      toast.error("Erreur lors de l'envoi")
    }
  }

  const handleMarkPaid = async (id: number) => {
    try {
      const result = await markPaid({ id, data: {} })
      refetch()
      if (result?.generated_invoice) {
        toast.success(
          `Payé ! Facture ${result.generated_invoice.number} générée automatiquement`
        )
      } else {
        toast.success('Marqué comme payé')
      }
    } catch {
      toast.error('Erreur')
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await cancel({ id, data: { reason: "Annulé par l'utilisateur" } })
      refetch()
      toast.success('Document annulé')
    } catch {
      toast.error("Erreur lors de l'annulation")
    }
  }

  const handleAdvance = async (id: number) => {
    try {
      await advance(id)
      refetch()
      toast.success('Workflow avancé')
    } catch {
      toast.error("Erreur lors de l'avancement du workflow")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      refetch()
      toast.success('Document supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  // ---- Computed ----

  const totalInvoiced = invoices
    .filter((i) => i.type === 'FA' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.total_ttc, 0)

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_ttc, 0)

  const totalDue = totalInvoiced - totalPaid

  const currency = invoices[0]?.currency || 'EUR'

  // ---- Filter chips ----

  const filterOptions: Array<{ label: string; value: InvoiceType | undefined }> = [
    { label: 'Tous', value: undefined },
    { label: 'Devis', value: 'DEV' },
    { label: 'Proformas', value: 'PRO' },
    { label: 'Factures', value: 'FA' },
    { label: 'Avoirs', value: 'AV' },
  ]

  // Empty state adapté au filtre actif
  const emptyStateConfig = (() => {
    switch (typeFilter) {
      case 'PRO':
        return { text: 'Créez une proforma pour commencer', btn: 'Créer une proforma', type: 'PRO' as InvoiceType }
      case 'FA':
        return { text: 'Les factures sont générées automatiquement au paiement d\'une proforma', btn: null, type: null }
      case 'AV':
        return { text: 'Les avoirs sont créés depuis une facture existante', btn: null, type: null }
      default: // 'DEV' or undefined (Tous)
        return { text: 'Créez un devis pour commencer', btn: 'Créer un devis', type: 'DEV' as InvoiceType }
    }
  })()

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-semibold">Documents & Facturation</h3>
            <p className="text-sm text-muted-foreground">
              {total} document{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5">
                <HelpCircle className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-80 text-sm">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Processus de facturation</h4>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Badge className="bg-sage-100 text-sage-800 border-sage-200 text-xs shrink-0">DEV</Badge>
                    <span className="text-muted-foreground text-xs">
                      <strong className="text-foreground">Devis</strong> — Proposition commerciale envoyée au client. Modifiable et sans engagement.
                    </span>
                  </div>
                  <div className="flex items-center justify-center text-muted-foreground/40">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-primary-100 text-primary-800 border-primary-200 text-xs shrink-0">PRO</Badge>
                    <span className="text-muted-foreground text-xs">
                      <strong className="text-foreground">Proforma</strong> — Document d&apos;engagement avec acompte et solde. Modifiable tant que non payée.
                    </span>
                  </div>
                  <div className="flex items-center justify-center text-muted-foreground/40">
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-xs ml-1">paiement acompte</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-secondary-100 text-secondary-800 border-secondary-200 text-xs shrink-0">FA</Badge>
                    <span className="text-muted-foreground text-xs">
                      <strong className="text-foreground">Facture</strong> — Générée automatiquement au paiement de la proforma. Document définitif (non modifiable).
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs shrink-0">AV</Badge>
                    <span className="text-muted-foreground text-xs">
                      <strong className="text-foreground">Avoir</strong> — Annule partiellement ou totalement une facture.
                    </span>
                  </div>
                </div>
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  Les DEV et PRO peuvent être modifiés même après envoi. Les FA et AV sont verrouillés (obligation légale).
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreateOpen('DEV')}>
              <Badge className={`${TYPE_BADGE_STYLES.DEV} mr-2 text-xs`}>DEV</Badge>
              Devis
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateOpen('PRO')}>
              <Badge className={`${TYPE_BADGE_STYLES.PRO} mr-2 text-xs`}>PRO</Badge>
              Proforma
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setTypeFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === opt.value
                ? 'bg-[#0FB6BC] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chargement...
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <h4 className="font-medium mb-1">Aucun document</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {emptyStateConfig.text}
            </p>
            {emptyStateConfig.btn && emptyStateConfig.type && (
              <Button size="sm" variant="outline" onClick={() => handleCreateOpen(emptyStateConfig.type!)}>
                <Plus className="h-4 w-4 mr-1" />
                {emptyStateConfig.btn}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
              onClick={() => setSelectedInvoiceId(invoice.id)}
            >
              <CardContent className="flex items-center gap-4 py-3 px-4">
                {/* Type badge */}
                <Badge className={`${TYPE_BADGE_STYLES[invoice.type]} text-xs font-bold min-w-[40px] justify-center`}>
                  {invoice.type}
                </Badge>

                {/* Number & date */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{invoice.number}</span>
                    {invoice.parent_invoice_id && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(invoice.issue_date)}
                    {invoice.client_name && ` — ${invoice.client_name}`}
                    {invoice.client_company && !invoice.client_name && ` — ${invoice.client_company}`}
                    {invoice.pax_count && invoice.pax_count > 0 && (
                      <span className="ml-1.5 text-primary-600">
                        ({invoice.pax_count} pers.)
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    {formatAmount(invoice.total_ttc, invoice.currency)}
                  </div>
                  {invoice.due_date && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <div className="text-xs text-muted-foreground">
                      Éch. {formatDate(invoice.due_date)}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <Badge className={`${STATUS_BADGE_STYLES[invoice.status as InvoiceStatus]} text-xs`}>
                  {STATUS_LABELS[invoice.status as InvoiceStatus]}
                </Badge>

                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => setSelectedInvoiceId(invoice.id)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGeneratePdf(invoice.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Générer PDF
                    </DropdownMenuItem>
                    {invoice.pdf_url && (
                      <DropdownMenuItem asChild>
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger PDF
                        </a>
                      </DropdownMenuItem>
                    )}
                    {/* Modifier : DEV/PRO en draft+sent, FA/AV en draft uniquement */}
                    {((['DEV', 'PRO'].includes(invoice.type) && ['draft', 'sent'].includes(invoice.status)) ||
                      (!['DEV', 'PRO'].includes(invoice.type) && invoice.status === 'draft')
                    ) && (
                      <DropdownMenuItem onClick={() => setSelectedInvoiceId(invoice.id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {invoice.status === 'draft' && (
                      <DropdownMenuItem onClick={() => handleSend(invoice)}>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer
                      </DropdownMenuItem>
                    )}
                    {['DEV', 'PRO'].includes(invoice.type) && invoice.status === 'sent' && (
                      <DropdownMenuItem onClick={() => handleSend(invoice)}>
                        <Send className="h-4 w-4 mr-2" />
                        Renvoyer
                      </DropdownMenuItem>
                    )}
                    {invoice.type === 'DEV' && invoice.status !== 'cancelled' && (
                      <DropdownMenuItem onClick={() => handleAdvance(invoice.id)}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Créer Proforma
                      </DropdownMenuItem>
                    )}
                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.type !== 'AV' && (
                      <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marquer payé
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {invoice.status !== 'cancelled' && (
                      <DropdownMenuItem
                        onClick={() => handleCancel(invoice.id)}
                        className="text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuler
                      </DropdownMenuItem>
                    )}
                    {invoice.status === 'draft' && (
                      <DropdownMenuItem
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {invoices.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Facturé :</span>{' '}
                <span className="font-semibold">{formatAmount(totalInvoiced, currency)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Payé :</span>{' '}
                <span className="font-semibold text-green-600">{formatAmount(totalPaid, currency)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Restant :</span>{' '}
                <span className={`font-semibold ${totalDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatAmount(totalDue, currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create panel */}
      <CreateInvoicePanel
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        dossierId={dossierId}
        invoiceType={createType}
        clientName={clientName}
        clientEmail={clientEmail}
        clientCompany={clientCompany}
        clientAddress={clientAddress}
        destinationCountries={destinationCountries}
        travelStartDate={travelStartDate}
        travelEndDate={travelEndDate}
        participants={participants}
        onCreated={handleCreated}
      />

      {/* Detail sheet */}
      <InvoiceDetailSheet
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(undefined)}
        onRefresh={refetch}
      />
    </div>
  )
}
