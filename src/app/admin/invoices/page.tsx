'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, differenceInDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Receipt,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  MoreHorizontal,
  Download,
  Send,
  ArrowRight,
  XCircle,
  CheckCircle,
  Link2,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  User,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useInvoices, useInvoiceSellers, type InvoiceFilters } from '@/hooks/useInvoices'
import { InvoiceDetailSheet } from '@/components/invoices/invoice-detail-sheet'
import type { InvoiceSummary, InvoiceType, InvoiceStatus } from '@/lib/api/types'

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

const PAGE_SIZE = 25

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

function formatShortDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

// ─── Alert logic ─────────────────────────────────────────────────────────────

type AlertLevel = 'red' | 'orange' | 'none'

interface InvoiceAlert {
  level: AlertLevel
  message: string
}

function getInvoiceAlert(invoice: InvoiceSummary): InvoiceAlert {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Only check unpaid, non-cancelled invoices
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return { level: 'none', message: '' }
  }

  // RED: Facture non réglée à 7 jours du départ
  if (invoice.type === 'FA' && invoice.travel_start_date) {
    const travelStart = parseISO(invoice.travel_start_date)
    const daysUntilDeparture = differenceInDays(travelStart, today)
    if (daysUntilDeparture <= 7 && daysUntilDeparture >= 0) {
      return {
        level: 'red',
        message: `Facture non réglée — départ dans ${daysUntilDeparture} jour${daysUntilDeparture !== 1 ? 's' : ''}`,
      }
    }
  }

  // RED: Proforma avec plus de 7 jours de retard
  if (invoice.type === 'PRO' && invoice.due_date) {
    const dueDate = parseISO(invoice.due_date)
    const daysOverdue = differenceInDays(today, dueDate)
    if (daysOverdue > 7) {
      return {
        level: 'red',
        message: `Proforma en retard de ${daysOverdue} jours`,
      }
    }
  }

  // ORANGE: Any invoice/proforma past due date (but less than 7 days for PRO)
  if (invoice.due_date) {
    const dueDate = parseISO(invoice.due_date)
    const daysOverdue = differenceInDays(today, dueDate)
    if (daysOverdue > 0) {
      return {
        level: invoice.type === 'PRO' ? 'orange' : 'red',
        message: `Échéance dépassée de ${daysOverdue} jour${daysOverdue !== 1 ? 's' : ''}`,
      }
    }
  }

  return { level: 'none', message: '' }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  // ---- State ----
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dueDateFrom, setDueDateFrom] = useState('')
  const [dueDateTo, setDueDateTo] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [sellerFilter, setSellerFilter] = useState<string>('ALL')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | undefined>(undefined)

  // Sellers list
  const { sellers } = useInvoiceSellers()

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      setSearchDebounced(value)
      setPage(1)
    }, 400)
    setSearchTimeout(timeout)
  }

  // ---- Filters ----
  const filters: InvoiceFilters = useMemo(() => ({
    search: searchDebounced || undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    page,
    page_size: PAGE_SIZE,
    created_by_id: sellerFilter !== 'ALL' ? sellerFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    due_date_from: dueDateFrom || undefined,
    due_date_to: dueDateTo || undefined,
    overdue: overdueOnly || undefined,
  }), [searchDebounced, typeFilter, statusFilter, page, sellerFilter, dateFrom, dateTo, dueDateFrom, dueDateTo, overdueOnly])

  const {
    invoices,
    total,
    isLoading,
    refetch,
    generatePdf,
    share,
    markPaid,
    cancel,
    advance,
    remove,
    toggleReminder,
  } = useInvoices(filters)

  // ---- Computed ----
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const hasActiveFilters = dateFrom || dateTo || dueDateFrom || dueDateTo || overdueOnly || sellerFilter !== 'ALL'

  // Alert counts
  const alertCounts = useMemo(() => {
    let red = 0
    let orange = 0
    for (const inv of invoices) {
      const alert = getInvoiceAlert(inv)
      if (alert.level === 'red') red++
      else if (alert.level === 'orange') orange++
    }
    return { red, orange, total: red + orange }
  }, [invoices])

  // Summary stats
  const stats = useMemo(() => {
    const devisCount = invoices.filter(i => i.type === 'DEV').length
    const proformaCount = invoices.filter(i => i.type === 'PRO').length
    const factureCount = invoices.filter(i => i.type === 'FA').length
    const avoirCount = invoices.filter(i => i.type === 'AV').length
    return { devisCount, proformaCount, factureCount, avoirCount }
  }, [invoices])

  // ---- Handlers ----

  const handleGeneratePdf = async (id: number) => {
    try {
      const result = await generatePdf(id)
      refetch()
      toast.success('PDF généré avec succès')
      if (result?.pdf_url) {
        window.open(result.pdf_url, '_blank')
      }
    } catch {
      toast.error('Erreur lors de la génération du PDF')
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
      toast.success('Proforma créée')
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

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setDueDateFrom('')
    setDueDateTo('')
    setOverdueOnly(false)
    setSellerFilter('ALL')
    setPage(1)
  }

  // ---- Render ----

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#0FB6BC]" />
            Factures & Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} document{total !== 1 ? 's' : ''} au total
          </p>
        </div>

        {/* Alert badges in header */}
        {alertCounts.total > 0 && (
          <div className="flex items-center gap-2">
            {alertCounts.red > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 px-3 py-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {alertCounts.red} alerte{alertCounts.red !== 1 ? 's' : ''} critique{alertCounts.red !== 1 ? 's' : ''}
              </Badge>
            )}
            {alertCounts.orange > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 px-3 py-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {alertCounts.orange} en retard
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Search + Type tabs + Status filter row */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, n° dossier, n° facture..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setSearchDebounced(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as InvoiceStatus | 'ALL'); setPage(1) }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced filters toggle */}
          <Button
            variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1 bg-white/20 text-xs rounded-full px-1.5">
                {[dateFrom, dateTo, dueDateFrom, dueDateTo, overdueOnly, sellerFilter !== 'ALL' && sellerFilter].filter(Boolean).length}
              </span>
            )}
          </Button>

          {/* Overdue toggle */}
          <Button
            variant={overdueOnly ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => { setOverdueOnly(!overdueOnly); setPage(1) }}
            className="gap-1.5"
          >
            <AlertTriangle className="h-4 w-4" />
            En retard
          </Button>
        </div>

        {/* Type tabs */}
        <Tabs
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v as InvoiceType | 'ALL'); setPage(1) }}
        >
          <TabsList>
            <TabsTrigger value="ALL">
              Tous
              <span className="ml-1.5 text-xs text-muted-foreground">({total})</span>
            </TabsTrigger>
            <TabsTrigger value="DEV">
              Devis
              <span className="ml-1.5 text-xs text-muted-foreground">({stats.devisCount})</span>
            </TabsTrigger>
            <TabsTrigger value="PRO">
              Proformas
              <span className="ml-1.5 text-xs text-muted-foreground">({stats.proformaCount})</span>
            </TabsTrigger>
            <TabsTrigger value="FA">
              Factures
              <span className="ml-1.5 text-xs text-muted-foreground">({stats.factureCount})</span>
            </TabsTrigger>
            <TabsTrigger value="AV">
              Avoirs
              <span className="ml-1.5 text-xs text-muted-foreground">({stats.avoirCount})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Advanced filters panel */}
        {showFilters && (
          <Card>
            <CardContent className="py-4 px-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Date émission
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                      className="w-[140px] text-xs"
                      placeholder="Du"
                    />
                    <span className="text-muted-foreground text-xs">au</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                      className="w-[140px] text-xs"
                      placeholder="Au"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Date échéance
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dueDateFrom}
                      onChange={(e) => { setDueDateFrom(e.target.value); setPage(1) }}
                      className="w-[140px] text-xs"
                      placeholder="Du"
                    />
                    <span className="text-muted-foreground text-xs">au</span>
                    <Input
                      type="date"
                      value={dueDateTo}
                      onChange={(e) => { setDueDateTo(e.target.value); setPage(1) }}
                      className="w-[140px] text-xs"
                      placeholder="Au"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Vendeur
                  </label>
                  <Select
                    value={sellerFilter}
                    onValueChange={(v) => { setSellerFilter(v); setPage(1) }}
                  >
                    <SelectTrigger className="w-[180px] text-xs">
                      <SelectValue placeholder="Tous les vendeurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous les vendeurs</SelectItem>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-1" />
                    Effacer les filtres
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invoice table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Émission</TableHead>
              <TableHead className="w-[70px]">Type</TableHead>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Dossier</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">Aucun document trouvé</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {searchDebounced
                      ? 'Essayez avec d\'autres termes de recherche'
                      : 'Les documents apparaîtront ici une fois créés depuis un dossier'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const alert = getInvoiceAlert(invoice)
                return (
                  <TableRow
                    key={invoice.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      alert.level === 'red'
                        ? 'bg-red-50/50'
                        : alert.level === 'orange'
                          ? 'bg-orange-50/30'
                          : ''
                    }`}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    {/* Alert indicator */}
                    <TableCell className="pr-0">
                      {alert.level !== 'none' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="p-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AlertTriangle
                                className={`h-4 w-4 ${
                                  alert.level === 'red'
                                    ? 'text-red-500'
                                    : 'text-orange-500'
                                }`}
                              />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="right" className="w-auto text-sm">
                            <p className={alert.level === 'red' ? 'text-red-700 font-medium' : 'text-orange-700 font-medium'}>
                              {alert.message}
                            </p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>

                    {/* Issue date — first column */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(invoice.issue_date)}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge className={`${TYPE_BADGE_STYLES[invoice.type]} text-xs font-bold`}>
                        {invoice.type}
                      </Badge>
                    </TableCell>

                    {/* Number */}
                    <TableCell className="font-medium text-sm">
                      {invoice.number}
                    </TableCell>

                    {/* Client */}
                    <TableCell>
                      <div className="text-sm">
                        {invoice.client_company || invoice.client_name || '—'}
                      </div>
                      {invoice.client_company && invoice.client_name && (
                        <div className="text-xs text-muted-foreground">{invoice.client_name}</div>
                      )}
                    </TableCell>

                    {/* Dossier */}
                    <TableCell>
                      {invoice.dossier_reference && invoice.dossier_id ? (
                        <Link
                          href={`/admin/dossiers/${invoice.dossier_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-mono text-[#0FB6BC] hover:underline hover:text-[#0C9296] transition-colors"
                        >
                          {invoice.dossier_reference}
                        </Link>
                      ) : invoice.dossier_reference ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          {invoice.dossier_reference}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>

                    {/* Seller */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {invoice.created_by_name || '—'}
                      </span>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right">
                      <span className="font-semibold text-sm">
                        {formatAmount(invoice.total_ttc, invoice.currency)}
                      </span>
                    </TableCell>

                    {/* Due date */}
                    <TableCell>
                      {invoice.due_date ? (
                        <div>
                          <span className={`text-xs ${
                            alert.level === 'red'
                              ? 'text-red-600 font-medium'
                              : alert.level === 'orange'
                                ? 'text-orange-600 font-medium'
                                : 'text-muted-foreground'
                          }`}>
                            {formatShortDate(invoice.due_date)}
                          </span>
                          {/* Reminder indicator */}
                          {invoice.type === 'FA' && invoice.reminder_date && !invoice.reminder_sent_at && invoice.reminder_enabled !== false && (
                            <span className="text-[10px] text-secondary-500 block mt-0.5" title={`Relance prévue le ${formatShortDate(invoice.reminder_date)}`}>
                              <Clock className="h-3 w-3 inline mr-0.5 -mt-px" />
                              Relance {formatShortDate(invoice.reminder_date)}
                            </span>
                          )}
                          {invoice.reminder_sent_at && (
                            <span className="text-[10px] text-sage-600 block mt-0.5">
                              <CheckCircle className="h-3 w-3 inline mr-0.5 -mt-px" />
                              Relance envoyée
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge className={`${STATUS_BADGE_STYLES[invoice.status as InvoiceStatus]} text-xs`}>
                        {STATUS_LABELS[invoice.status as InvoiceStatus]}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
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
                            Télécharger PDF
                          </DropdownMenuItem>
                          {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  let token = invoice.share_token
                                  if (!token) {
                                    const result = await share(invoice.id)
                                    token = result.share_token
                                    refetch()
                                  }
                                  const url = `${window.location.origin}/invoices/${token}`
                                  await navigator.clipboard.writeText(url)
                                  toast.success('Lien copié dans le presse-papiers')
                                } catch {
                                  toast.error('Erreur lors de la création du lien')
                                }
                              }}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              {invoice.share_token ? 'Copier le lien' : 'Créer lien de partage'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
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
                          {/* Reminder toggle — only for FA invoices, not paid/cancelled */}
                          {invoice.type === 'FA' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.reminder_date && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const newState = !(invoice.reminder_enabled !== false)
                                  await toggleReminder({ id: invoice.id, enabled: newState })
                                  refetch()
                                  toast.success(newState ? 'Relance automatique activée' : 'Relance automatique désactivée')
                                } catch {
                                  toast.error('Erreur lors de la modification de la relance')
                                }
                              }}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              {invoice.reminder_enabled !== false ? 'Désactiver la relance' : 'Activer la relance'}
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'cancelled' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCancel(invoice.id)}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                            </>
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
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} ({total} résultats)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      <InvoiceDetailSheet
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(undefined)}
        onRefresh={refetch}
      />
    </div>
  )
}
