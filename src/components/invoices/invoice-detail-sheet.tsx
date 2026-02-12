'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Download,
  Send,
  ArrowRight,
  CheckCircle,
  XCircle,
  Shield,
  TrendingUp,
  Clock,
  Pencil,
  Plus,
  Trash2,
  Save,
  X,
  Users,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useInvoiceDetail, useInvoices } from '@/hooks/useInvoices'
import type {
  InvoiceType,
  InvoiceStatus,
  InvoicePaymentLinkStatus,
  UpdateInvoiceDTO,
} from '@/lib/api/types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface InvoiceDetailSheetProps {
  invoiceId: number | undefined
  onClose: () => void
  onRefresh: () => void
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

const PAYMENT_STATUS_STYLES: Record<InvoicePaymentLinkStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd MMMM yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}

// ─── Line Edit Row ──────────────────────────────────────────────────────────

interface LineEditValues {
  description: string
  details: string
  quantity: string
  unit_price_ttc: string
}

function EditableLineRow({
  line,
  currency,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  line: { id: number; description: string; details?: string | null; quantity: number; unit_price_ttc: number; total_ttc: number }
  currency: string
  onSave: (lineId: number, data: { description?: string; details?: string; quantity?: number; unit_price_ttc?: number }) => void
  onDelete: (lineId: number) => void
  saving: boolean
  deleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<LineEditValues>({
    description: line.description,
    details: line.details || '',
    quantity: String(line.quantity),
    unit_price_ttc: String(line.unit_price_ttc),
  })

  const handleSave = () => {
    onSave(line.id, {
      description: values.description,
      details: values.details || undefined,
      quantity: parseFloat(values.quantity) || 1,
      unit_price_ttc: parseFloat(values.unit_price_ttc) || 0,
    })
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="group flex items-start justify-between text-sm hover:bg-muted/30 rounded-md p-2 -mx-2">
        <div className="flex-1">
          <div>{line.description}</div>
          {line.details && (
            <div className="text-xs text-muted-foreground">{line.details}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {line.quantity} × {formatAmount(line.unit_price_ttc, currency)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-medium ml-4">
            {formatAmount(line.total_ttc, currency)}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => onDelete(line.id)}
              disabled={deleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 rounded-md p-3 space-y-2">
      <Input
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        placeholder="Description"
        className="h-8 text-sm"
      />
      <Input
        value={values.details}
        onChange={(e) => setValues({ ...values, details: e.target.value })}
        placeholder="Détails (optionnel)"
        className="h-8 text-xs"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Quantité</Label>
          <Input
            type="number"
            value={values.quantity}
            onChange={(e) => setValues({ ...values, quantity: e.target.value })}
            className="h-8 text-sm"
            min={0}
            step={1}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Prix unitaire TTC</Label>
          <Input
            type="number"
            value={values.unit_price_ttc}
            onChange={(e) => setValues({ ...values, unit_price_ttc: e.target.value })}
            className="h-8 text-sm"
            min={0}
            step={0.01}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-7 text-xs">
          <X className="h-3 w-3 mr-1" />
          Annuler
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
          <Save className="h-3 w-3 mr-1" />
          Sauver
        </Button>
      </div>
    </div>
  )
}

// ─── Add Line Form ──────────────────────────────────────────────────────────

function AddLineForm({
  onAdd,
  adding,
  onCancel,
}: {
  onAdd: (data: { description: string; details?: string; quantity: number; unit_price_ttc: number }) => void
  adding: boolean
  onCancel: () => void
}) {
  const [values, setValues] = useState({
    description: '',
    details: '',
    quantity: '1',
    unit_price_ttc: '',
  })

  const handleSubmit = () => {
    if (!values.description || !values.unit_price_ttc) {
      toast.error('Description et prix unitaire requis')
      return
    }
    onAdd({
      description: values.description,
      details: values.details || undefined,
      quantity: parseFloat(values.quantity) || 1,
      unit_price_ttc: parseFloat(values.unit_price_ttc) || 0,
    })
    setValues({ description: '', details: '', quantity: '1', unit_price_ttc: '' })
  }

  return (
    <div className="bg-primary-50/50 border border-primary-200 rounded-md p-3 space-y-2">
      <div className="text-xs font-medium text-primary-700">Nouvelle ligne</div>
      <Input
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        placeholder="Description *"
        className="h-8 text-sm"
        autoFocus
      />
      <Input
        value={values.details}
        onChange={(e) => setValues({ ...values, details: e.target.value })}
        placeholder="Détails (optionnel)"
        className="h-8 text-xs"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Quantité</Label>
          <Input
            type="number"
            value={values.quantity}
            onChange={(e) => setValues({ ...values, quantity: e.target.value })}
            className="h-8 text-sm"
            min={0}
            step={1}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Prix unitaire TTC *</Label>
          <Input
            type="number"
            value={values.unit_price_ttc}
            onChange={(e) => setValues({ ...values, unit_price_ttc: e.target.value })}
            className="h-8 text-sm"
            min={0}
            step={0.01}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
          Annuler
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={adding} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          {adding ? 'Ajout...' : 'Ajouter'}
        </Button>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InvoiceDetailSheet({
  invoiceId,
  onClose,
  onRefresh,
}: InvoiceDetailSheetProps) {
  const { invoice, isLoading, refetch } = useInvoiceDetail(invoiceId)
  const {
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
    update,
    updating,
    addLine,
    addingLine,
    updateLine,
    updatingLine,
    deleteLine,
    deletingLine,
  } = useInvoices()

  const isOpen = invoiceId !== undefined
  // DEV et PRO sont des documents commerciaux : éditables en draft + sent
  // FA et AV sont des documents définitifs (loi française) : éditables en draft uniquement
  const isEditable = invoice
    ? (['DEV', 'PRO'].includes(invoice.type)
      ? ['draft', 'sent'].includes(invoice.status)
      : invoice.status === 'draft')
    : false

  // ---- Resizable panel ----
  const MIN_WIDTH = 480
  const MAX_WIDTH = 1200
  const DEFAULT_WIDTH = 750
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(DEFAULT_WIDTH)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartX.current - ev.clientX
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta))
      setPanelWidth(newW)
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [panelWidth])

  // ---- Edit mode state ----
  const [isEditing, setIsEditing] = useState(false)
  const [showAddLine, setShowAddLine] = useState(false)
  const [editFields, setEditFields] = useState<UpdateInvoiceDTO>({})

  // Reset edit mode when invoice changes
  useEffect(() => {
    setIsEditing(false)
    setShowAddLine(false)
    setEditFields({})
  }, [invoiceId])

  // Initialize edit fields from invoice
  const startEditing = () => {
    if (!invoice) return
    setEditFields({
      client_name: invoice.client_name || '',
      client_email: invoice.client_email || '',
      client_phone: invoice.client_phone || '',
      client_company: invoice.client_company || '',
      client_address: invoice.client_address || '',
      client_siret: invoice.client_siret || '',
      client_siren: invoice.client_siren || '',
      due_date: invoice.due_date?.split('T')[0] || '',
      deposit_pct: invoice.deposit_pct,
      notes: invoice.notes || '',
      client_notes: invoice.client_notes || '',
      delivery_address_line1: invoice.delivery_address_line1 || '',
      delivery_address_city: invoice.delivery_address_city || '',
      delivery_address_postal_code: invoice.delivery_address_postal_code || '',
      delivery_address_country: invoice.delivery_address_country || '',
      pax_count: invoice.pax_count || undefined,
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditFields({})
  }

  const saveEditing = async () => {
    if (!invoiceId) return
    try {
      // Only send changed fields
      const changedFields: UpdateInvoiceDTO = {}
      const keys = Object.keys(editFields) as (keyof UpdateInvoiceDTO)[]
      for (const key of keys) {
        const val = editFields[key]
        if (val !== undefined && val !== '') {
          ;(changedFields as Record<string, unknown>)[key] = val
        }
      }
      await update({ id: invoiceId, data: changedFields })
      refetch()
      onRefresh()
      setIsEditing(false)
      toast.success('Document mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // ---- Line handlers ----

  const handleUpdateLine = async (lineId: number, data: { description?: string; details?: string; quantity?: number; unit_price_ttc?: number }) => {
    if (!invoiceId) return
    try {
      await updateLine({ invoiceId, lineId, data })
      refetch()
      onRefresh()
      toast.success('Ligne mise à jour')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleDeleteLine = async (lineId: number) => {
    if (!invoiceId) return
    try {
      await deleteLine({ invoiceId, lineId })
      refetch()
      onRefresh()
      toast.success('Ligne supprimée')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleAddLine = async (data: { description: string; details?: string; quantity: number; unit_price_ttc: number }) => {
    if (!invoiceId) return
    try {
      await addLine({ invoiceId, data })
      refetch()
      onRefresh()
      setShowAddLine(false)
      toast.success('Ligne ajoutée')
    } catch {
      toast.error('Erreur')
    }
  }

  // ---- Action handlers ----

  const handleGeneratePdf = async () => {
    if (!invoiceId) return
    try {
      await generatePdf(invoiceId)
      refetch()
      onRefresh()
      toast.success('PDF généré avec succès')
    } catch {
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleSend = async () => {
    if (!invoiceId || !invoice?.client_email) {
      toast.error("Pas d'adresse email client")
      return
    }
    try {
      await send({ id: invoiceId, to_email: invoice.client_email })
      refetch()
      onRefresh()
      toast.success('Document envoyé')
    } catch {
      toast.error("Erreur lors de l'envoi")
    }
  }

  const handleMarkPaid = async () => {
    if (!invoiceId) return
    try {
      const result = await markPaid({ id: invoiceId, data: {} })
      refetch()
      onRefresh()
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

  const handleCancel = async () => {
    if (!invoiceId) return
    try {
      await cancel({ id: invoiceId, data: { reason: "Annulé par l'utilisateur", create_credit_note: invoice?.type === 'FA' } })
      refetch()
      onRefresh()
      toast.success('Document annulé')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleAdvance = async () => {
    if (!invoiceId) return
    try {
      await advance(invoiceId)
      refetch()
      onRefresh()
      toast.success('Workflow avancé')
    } catch {
      toast.error("Erreur lors de l'avancement")
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0 duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-background border-l shadow-lg flex flex-col animate-in slide-in-from-right duration-300"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-4 cursor-col-resize z-[60] group flex items-center select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-0 bg-transparent group-hover:bg-primary-500/10 group-active:bg-primary-500/20 transition-colors" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
            <GripVertical className="h-10 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 pl-7">
          {isLoading || !invoice ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Chargement...
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col gap-1.5 pb-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${TYPE_BADGE_STYLES[invoice.type as InvoiceType]} font-bold`}>
                    {invoice.type}
                  </Badge>
                  <h2 className="text-lg font-semibold">{invoice.number}</h2>
                  <Badge className={`${STATUS_BADGE_STYLES[invoice.status as InvoiceStatus]} ml-auto`}>
                    {STATUS_LABELS[invoice.status as InvoiceStatus]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 rounded-full opacity-70 hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fermer</span>
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  {TYPE_LABELS[invoice.type as InvoiceType]} du {formatDate(invoice.issue_date)}
                </p>
                {invoice.type === 'FA' && invoice.parent_invoice_id && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs mt-1 w-fit">
                    Générée au paiement de la proforma
                  </Badge>
                )}
                {/* Edit toggle for drafts */}
                {isEditable && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="w-fit mt-2"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={saveEditing}
                      disabled={updating}
                      className="bg-primary-500 hover:bg-primary-600"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updating ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                  </div>
                )}
                {isEditing && invoice.status === 'sent' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs text-blue-700 mt-2">
                    Ce document a déjà été envoyé. Après modification, pensez à régénérer le PDF et renvoyer au client.
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Client info */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Client
                  </h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Nom</Label>
                          <Input
                            value={editFields.client_name || ''}
                            onChange={(e) => setEditFields({ ...editFields, client_name: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Société</Label>
                          <Input
                            value={editFields.client_company || ''}
                            onChange={(e) => setEditFields({ ...editFields, client_company: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <Input
                            type="email"
                            value={editFields.client_email || ''}
                            onChange={(e) => setEditFields({ ...editFields, client_email: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Téléphone</Label>
                          <Input
                            value={editFields.client_phone || ''}
                            onChange={(e) => setEditFields({ ...editFields, client_phone: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Adresse</Label>
                        <Input
                          value={editFields.client_address || ''}
                          onChange={(e) => setEditFields({ ...editFields, client_address: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">SIRET</Label>
                          <Input
                            value={editFields.client_siret || ''}
                            onChange={(e) => setEditFields({ ...editFields, client_siret: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">SIREN</Label>
                          <Input
                            value={editFields.client_siren || ''}
                            onChange={(e) => setEditFields({ ...editFields, client_siren: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      {invoice.client_company && (
                        <div className="font-medium">{invoice.client_company}</div>
                      )}
                      {invoice.client_name && (
                        <div>{invoice.client_company ? `À l'att. de ${invoice.client_name}` : <span className="font-medium">{invoice.client_name}</span>}</div>
                      )}
                      {invoice.client_email && (
                        <div className="text-muted-foreground">{invoice.client_email}</div>
                      )}
                      {invoice.client_phone && (
                        <div className="text-muted-foreground">{invoice.client_phone}</div>
                      )}
                      {invoice.client_address && (
                        <div className="text-muted-foreground">{invoice.client_address}</div>
                      )}
                      {invoice.client_siret && (
                        <div className="text-muted-foreground">SIRET : {invoice.client_siret}</div>
                      )}
                      {invoice.client_siren && (
                        <div className="text-muted-foreground">SIREN : {invoice.client_siren}</div>
                      )}
                    </div>
                  )}
                  {!isEditing && invoice.delivery_address_line1 && (
                    <div className="mt-2 pt-2 border-t border-dashed text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Adresse de livraison :</span><br />
                      {invoice.delivery_address_line1}
                      {invoice.delivery_address_postal_code && <>, {invoice.delivery_address_postal_code}</>}
                      {invoice.delivery_address_city && <> {invoice.delivery_address_city}</>}
                      {invoice.delivery_address_country && <><br />{invoice.delivery_address_country}</>}
                    </div>
                  )}
                  {isEditing && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Adresse de livraison</Label>
                      <Input
                        value={editFields.delivery_address_line1 || ''}
                        onChange={(e) => setEditFields({ ...editFields, delivery_address_line1: e.target.value })}
                        placeholder="Adresse"
                        className="h-8 text-sm"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={editFields.delivery_address_postal_code || ''}
                          onChange={(e) => setEditFields({ ...editFields, delivery_address_postal_code: e.target.value })}
                          placeholder="Code postal"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editFields.delivery_address_city || ''}
                          onChange={(e) => setEditFields({ ...editFields, delivery_address_city: e.target.value })}
                          placeholder="Ville"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editFields.delivery_address_country || ''}
                          onChange={(e) => setEditFields({ ...editFields, delivery_address_country: e.target.value })}
                          placeholder="Pays"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Réforme e-facture 2026 */}
                {!isEditing && (invoice.operation_category || invoice.pa_transmission_status) && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      E-facture 2026
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      {invoice.operation_category && (
                        <div>
                          <span className="text-muted-foreground">Catégorie :</span>{' '}
                          {invoice.operation_category === 'PS' ? 'Prestation de services' :
                           invoice.operation_category === 'LB' ? 'Livraison de biens' : 'Biens + services'}
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">TVA sur les débits :</span>{' '}
                        {invoice.vat_on_debits ? 'Oui' : 'Non (encaissements)'}
                      </div>
                      {invoice.pa_transmission_status && invoice.pa_transmission_status !== 'draft' && (
                        <div>
                          <span className="text-muted-foreground">Transmission PDP :</span>{' '}
                          <Badge variant="outline" className="text-xs">
                            {invoice.pa_transmission_status}
                          </Badge>
                          {invoice.pa_transmission_id && (
                            <span className="text-xs text-muted-foreground ml-1">({invoice.pa_transmission_id})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Dates
                  </h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Émission</Label>
                          <div className="text-sm font-medium mt-1">{formatDate(invoice.issue_date)}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Échéance</Label>
                          <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            {[
                              { days: 7, label: 'J+7' },
                              { days: 15, label: 'J+15' },
                              { days: 30, label: 'J+30' },
                            ].map((opt) => {
                              const d = new Date(invoice.issue_date)
                              d.setDate(d.getDate() + opt.days)
                              const val = d.toISOString().split('T')[0]
                              return (
                                <button
                                  key={opt.days}
                                  type="button"
                                  onClick={() => setEditFields({ ...editFields, due_date: val })}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    editFields.due_date === val
                                      ? 'bg-[#0FB6BC] text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                            {invoice.travel_start_date && [30, 45].map((days) => {
                              const d = new Date(invoice.travel_start_date!)
                              d.setDate(d.getDate() - days)
                              const val = d.toISOString().split('T')[0]
                              return (
                                <button
                                  key={`dep-${days}`}
                                  type="button"
                                  onClick={() => setEditFields({ ...editFields, due_date: val })}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    editFields.due_date === val
                                      ? 'bg-[#0FB6BC] text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  J-{days} départ
                                </button>
                              )
                            })}
                          </div>
                          <Input
                            type="date"
                            value={editFields.due_date || ''}
                            onChange={(e) => setEditFields({ ...editFields, due_date: e.target.value })}
                            className="h-8 text-sm mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Émission :</span>{' '}
                        <span className="font-medium">{formatDate(invoice.issue_date)}</span>
                      </div>
                      {invoice.due_date && (
                        <div>
                          <span className="text-muted-foreground">Échéance :</span>{' '}
                          <span className="font-medium">{formatDate(invoice.due_date)}</span>
                        </div>
                      )}
                      {invoice.travel_start_date && (
                        <div>
                          <span className="text-muted-foreground">Départ :</span>{' '}
                          {formatDate(invoice.travel_start_date)}
                        </div>
                      )}
                      {invoice.travel_end_date && (
                        <div>
                          <span className="text-muted-foreground">Retour :</span>{' '}
                          {formatDate(invoice.travel_end_date)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Deposit rate (edit mode only) */}
                {isEditing && (invoice.type === 'PRO' || invoice.type === 'DEV') && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Taux d&apos;acompte
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      {[30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setEditFields({ ...editFields, deposit_pct: pct })}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            editFields.deposit_pct === pct
                              ? 'bg-[#0FB6BC] text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-2">
                        <Input
                          type="number"
                          placeholder="Autre"
                          value={![30, 40, 50].includes(editFields.deposit_pct || 0) ? (editFields.deposit_pct || '') : ''}
                          onChange={(e) => setEditFields({ ...editFields, deposit_pct: parseFloat(e.target.value) || undefined })}
                          onFocus={() => {
                            if ([30, 40, 50].includes(editFields.deposit_pct || 0)) {
                              setEditFields({ ...editFields, deposit_pct: undefined })
                            }
                          }}
                          className="w-20 h-8 text-xs"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Lines table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Lignes
                    </h4>
                    {isEditable && !showAddLine && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddLine(true)}
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {invoice.lines.map((line) =>
                      isEditable ? (
                        <EditableLineRow
                          key={line.id}
                          line={line}
                          currency={invoice.currency}
                          onSave={handleUpdateLine}
                          onDelete={handleDeleteLine}
                          saving={updatingLine}
                          deleting={deletingLine}
                        />
                      ) : (
                        <div key={line.id} className="flex items-start justify-between text-sm p-2">
                          <div className="flex-1">
                            <div>{line.description}</div>
                            {line.details && (
                              <div className="text-xs text-muted-foreground">{line.details}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {line.quantity} × {formatAmount(line.unit_price_ttc, invoice.currency)}
                            </div>
                          </div>
                          <div className="font-medium ml-4">
                            {formatAmount(line.total_ttc, invoice.currency)}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Add line form */}
                  {showAddLine && (
                    <div className="mt-2">
                      <AddLineForm
                        onAdd={handleAddLine}
                        adding={addingLine}
                        onCancel={() => setShowAddLine(false)}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Totals */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Montants
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold text-primary-600">
                      <span>Total {invoice.type === 'AV' ? 'Avoir' : 'à payer'}</span>
                      <span>{formatAmount(invoice.total_ttc, invoice.currency)}</span>
                    </div>
                    {invoice.deposit_pct > 0 && invoice.type !== 'AV' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Acompte ({invoice.deposit_pct}%)</span>
                          <span>{formatAmount(invoice.deposit_amount, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Solde</span>
                          <span>{formatAmount(invoice.balance_amount, invoice.currency)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* VAT mention */}
                {invoice.vat_legal_mention && (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground italic border-l-2 border-primary-400">
                    {invoice.vat_legal_mention}
                  </div>
                )}

                {/* Payment links */}
                {invoice.payment_links.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Échéancier
                    </h4>
                    <div className="space-y-2">
                      {invoice.payment_links.map((pl) => (
                        <div key={pl.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
                          <div>
                            <span className="capitalize">{pl.payment_type === 'deposit' ? 'Acompte' : pl.payment_type === 'balance' ? 'Solde' : 'Intégral'}</span>
                            <span className="text-muted-foreground ml-2">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDate(pl.due_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatAmount(pl.amount, invoice.currency)}</span>
                            <Badge className={`${PAYMENT_STATUS_STYLES[pl.status as InvoicePaymentLinkStatus]} text-xs`}>
                              {pl.status === 'pending' ? 'En attente' : pl.status === 'paid' ? 'Payé' : pl.status === 'overdue' ? 'En retard' : 'Annulé'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment info */}
                {invoice.paid_at && (
                  <div className="bg-green-50 rounded-lg p-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 inline mr-1" />
                    Payé le {formatDate(invoice.paid_at)}
                    {invoice.payment_method && ` par ${invoice.payment_method}`}
                    {invoice.payment_ref && ` (réf: ${invoice.payment_ref})`}
                  </div>
                )}

                {/* Cancellation info */}
                {invoice.cancelled_at && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm">
                    <XCircle className="h-4 w-4 text-red-600 inline mr-1" />
                    Annulé le {formatDate(invoice.cancelled_at)}
                    {invoice.cancellation_reason && ` — ${invoice.cancellation_reason}`}
                  </div>
                )}

                {/* Sent info */}
                {invoice.sent_at && (
                  <div className="text-xs text-muted-foreground">
                    Envoyé le {formatDate(invoice.sent_at)} à {invoice.sent_to_email}
                  </div>
                )}

                {/* Notes */}
                {isEditing ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Notes
                    </h4>
                    <div>
                      <Label className="text-xs text-muted-foreground">Note client (visible sur le document)</Label>
                      <Textarea
                        value={editFields.client_notes || ''}
                        onChange={(e) => setEditFields({ ...editFields, client_notes: e.target.value })}
                        className="text-sm mt-1"
                        rows={2}
                        placeholder="Note visible par le client..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Note interne</Label>
                      <Textarea
                        value={editFields.notes || ''}
                        onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                        className="text-sm mt-1"
                        rows={2}
                        placeholder="Note interne..."
                      />
                    </div>
                  </div>
                ) : (invoice.notes || invoice.client_notes) ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Notes
                    </h4>
                    {invoice.client_notes && (
                      <div className="text-sm bg-muted/30 rounded p-2 mb-2">
                        <div className="text-xs text-muted-foreground mb-1">Note client</div>
                        {invoice.client_notes}
                      </div>
                    )}
                    {invoice.notes && (
                      <div className="text-sm bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Note interne</div>
                        {invoice.notes}
                      </div>
                    )}
                  </div>
                ) : null}

                <Separator />

                {/* Pax / insured persons */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    <Users className="h-3.5 w-3.5 inline mr-1" />
                    Personnes assurées
                  </h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Nombre de voyageurs couverts par cette facture (pour l&apos;intégration Chapka).
                      </p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEditFields({ ...editFields, pax_count: n })}
                            className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                              editFields.pax_count === n
                                ? 'bg-[#0FB6BC] text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-2">
                          <Input
                            type="number"
                            placeholder="Autre"
                            value={![1, 2, 3, 4].includes(editFields.pax_count || 0) ? (editFields.pax_count || '') : ''}
                            onChange={(e) => setEditFields({ ...editFields, pax_count: parseInt(e.target.value) || undefined })}
                            onFocus={() => {
                              if ([1, 2, 3, 4].includes(editFields.pax_count || 0)) {
                                setEditFields({ ...editFields, pax_count: undefined })
                              }
                            }}
                            className="w-20 h-9 text-sm"
                            min={1}
                            max={99}
                          />
                          <span className="text-xs text-muted-foreground">pers.</span>
                        </div>
                      </div>
                    </div>
                  ) : invoice.pax_count ? (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <span className="font-medium text-lg">{invoice.pax_count}</span>
                      <span className="text-muted-foreground ml-1">
                        {invoice.pax_count === 1 ? 'personne' : 'personnes'}
                      </span>
                      {invoice.pax_names && (() => {
                        try {
                          const names: string[] = JSON.parse(invoice.pax_names)
                          return names.length > 0 ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              {names.join(', ')}
                            </div>
                          ) : null
                        } catch {
                          return null
                        }
                      })()}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Non renseigné
                    </div>
                  )}
                </div>

                <Separator />

                {/* Chapka / Kantox placeholders */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Shield className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                    <div className="text-xs font-medium text-muted-foreground">Assurance Chapka</div>
                    <div className="text-xs text-muted-foreground/60">Bientôt disponible</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <TrendingUp className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                    <div className="text-xs font-medium text-muted-foreground">Couverture Kantox</div>
                    <div className="text-xs text-muted-foreground/60">Bientôt disponible</div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePdf}
                    disabled={generatingPdf}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {generatingPdf ? 'Génération...' : 'Générer PDF'}
                  </Button>

                  {invoice.pdf_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </a>
                    </Button>
                  )}

                  {(invoice.status === 'draft' || (
                    ['DEV', 'PRO'].includes(invoice.type) && invoice.status === 'sent'
                  )) && (
                    <Button size="sm" onClick={handleSend} disabled={sending}>
                      <Send className="h-4 w-4 mr-1" />
                      {sending ? 'Envoi...' : invoice.status === 'sent' ? 'Renvoyer' : 'Envoyer'}
                    </Button>
                  )}

                  {invoice.type === 'DEV' && invoice.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAdvance}
                      disabled={advancing}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Créer Proforma
                    </Button>
                  )}

                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.type !== 'AV' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={handleMarkPaid}
                      disabled={markingPaid}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Payé
                    </Button>
                  )}

                  {invoice.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
