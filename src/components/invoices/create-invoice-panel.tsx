'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, X, FileText, Calendar, Users, GripVertical, UserCheck, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useInvoices } from '@/hooks/useInvoices'
import type { InvoiceType, InvoiceLineType, CreateInvoiceDTO } from '@/lib/api/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvoiceParticipant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
  is_lead: boolean
}

interface CreateInvoicePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossierId: string
  invoiceType: InvoiceType
  clientName?: string | null
  clientEmail?: string | null
  clientCompany?: string | null
  clientAddress?: string | null
  destinationCountries?: string[]
  travelStartDate?: string | null
  travelEndDate?: string | null
  participants?: InvoiceParticipant[]
  onCreated: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<InvoiceType, string> = {
  DEV: 'Devis',
  PRO: 'Proforma',
  FA: 'Facture',
  AV: 'Avoir',
}

const TYPE_BADGE_STYLES: Record<InvoiceType, string> = {
  DEV: 'bg-sage-100 text-sage-800 border-sage-200',
  PRO: 'bg-primary-100 text-primary-800 border-primary-200',
  FA: 'bg-secondary-100 text-secondary-800 border-secondary-200',
  AV: 'bg-red-100 text-red-800 border-red-200',
}

// Non-EU countries for VAT display
const NON_EU_COUNTRIES = new Set([
  'TH', 'VN', 'KH', 'LA', 'MM', 'ID', 'JP', 'LK', 'IN', 'NP', 'PH', 'MY',
])

interface LineInput {
  description: string
  quantity: number
  unit_price_ttc: number
  line_type: InvoiceLineType
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateInvoicePanel({
  open,
  onOpenChange,
  dossierId,
  invoiceType,
  clientName,
  clientEmail,
  clientCompany,
  clientAddress,
  destinationCountries,
  travelStartDate,
  travelEndDate,
  participants = [],
  onCreated,
}: CreateInvoicePanelProps) {
  const { create, creating } = useInvoices()

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

  // ---- Payeur / Participant selection ----
  const leadParticipant = participants.find(p => p.is_lead)
  const [selectedPayerId, setSelectedPayerId] = useState<string | 'other'>('')
  const [payerName, setPayerName] = useState<string>('')
  const [payerEmail, setPayerEmail] = useState<string>('')
  const [payerPhone, setPayerPhone] = useState<string>('')
  const [payerAddress, setPayerAddress] = useState<string>('')

  // Initialize payer to lead participant when panel opens
  useEffect(() => {
    if (open && participants.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lead = (participants.find(p => p.is_lead) ?? participants[0])!
      setSelectedPayerId(lead.id)
      setPayerName(`${lead.first_name} ${lead.last_name}`)
      setPayerEmail(lead.email || '')
      setPayerPhone(lead.phone || '')
      const addr = [lead.address, lead.postal_code, lead.city, lead.country].filter(Boolean).join(', ')
      setPayerAddress(addr)
    } else if (open) {
      // Fallback: use props
      setSelectedPayerId('other')
      setPayerName(clientName || '')
      setPayerEmail(clientEmail || '')
      setPayerPhone('')
      setPayerAddress(clientAddress || '')
    }
  }, [open, participants, clientName, clientEmail, clientAddress])

  const handlePayerChange = (payerId: string) => {
    setSelectedPayerId(payerId)
    if (payerId === 'other') {
      setPayerName('')
      setPayerEmail('')
      setPayerPhone('')
      setPayerAddress('')
      return
    }
    const p = participants.find(pp => pp.id === payerId)
    if (p) {
      setPayerName(`${p.first_name} ${p.last_name}`)
      setPayerEmail(p.email || '')
      setPayerPhone(p.phone || '')
      const addr = [p.address, p.postal_code, p.city, p.country].filter(Boolean).join(', ')
      setPayerAddress(addr)
    }
  }

  // Form state
  const [totalTtc, setTotalTtc] = useState<string>('')
  const [costHt, setCostHt] = useState<string>('')
  const [depositPct, setDepositPct] = useState<string>('30')
  const [clientNotes, setClientNotes] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [lines, setLines] = useState<LineInput[]>([])
  // Pax / insured persons
  const [paxCount, setPaxCount] = useState<string>('')
  // Dates d'échéance
  const [depositDueDateMode, setDepositDueDateMode] = useState<'7' | '15' | 'custom'>('7')
  const [depositDueDateCustom, setDepositDueDateCustom] = useState<string>('')
  const [balanceDueDateMode, setBalanceDueDateMode] = useState<'30' | '45' | 'custom'>('30')
  const [balanceDueDateCustom, setBalanceDueDateCustom] = useState<string>('')
  // Réforme e-facture 2026
  const [clientSiren, setClientSiren] = useState<string>('')
  const [deliveryLine1, setDeliveryLine1] = useState<string>('')
  const [deliveryCity, setDeliveryCity] = useState<string>('')
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>('')
  const [deliveryCountry, setDeliveryCountry] = useState<string>('')
  const [operationCategory, setOperationCategory] = useState<string>('PS')

  // Computed
  const amount = parseFloat(totalTtc) || 0
  const deposit = amount * (parseFloat(depositPct) || 30) / 100
  const balance = amount - deposit

  // VAT regime detection
  const isEU = destinationCountries?.some(
    (c) => !NON_EU_COUNTRIES.has(c.toUpperCase())
  )
  const vatRegime = isEU ? 'TVA sur la marge (20%)' : 'Exonération TVA (hors UE)'

  // Lines total
  const linesTotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price_ttc, 0)

  // Date helpers
  const addDays = (d: Date, n: number) => {
    const result = new Date(d)
    result.setDate(result.getDate() + n)
    return result.toISOString().split('T')[0]
  }

  const computeDepositDueDate = (): string | undefined => {
    if (depositDueDateMode === 'custom') return depositDueDateCustom || undefined
    const days = parseInt(depositDueDateMode)
    return addDays(new Date(), days)
  }

  const computeBalanceDueDate = (): string | undefined => {
    if (balanceDueDateMode === 'custom') return balanceDueDateCustom || undefined
    if (!travelStartDate) return undefined
    const start = new Date(travelStartDate)
    const days = parseInt(balanceDueDateMode)
    const result = new Date(start)
    result.setDate(result.getDate() - days)
    return result.toISOString().split('T')[0]
  }

  // Preview dates
  const depositDueDatePreview = computeDepositDueDate()
  const balanceDueDatePreview = computeBalanceDueDate()

  // ---- Line management ----

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price_ttc: 0, line_type: 'service' }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof LineInput, value: string | number) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value } as LineInput
    setLines(updated)
  }

  // ---- Submit ----

  const handleSubmit = async () => {
    const finalTotal = lines.length > 0 ? linesTotal : amount

    if (finalTotal <= 0) {
      toast.error('Le montant total doit être supérieur à 0')
      return
    }

    if (!payerEmail) {
      toast.error('L\'email du payeur est requis')
      return
    }

    const dto: CreateInvoiceDTO = {
      dossier_id: dossierId,
      type: invoiceType,
      total_ttc: finalTotal,
      deposit_pct: parseFloat(depositPct) || 30,
      notes: notes || undefined,
      client_notes: clientNotes || undefined,
    }

    // Client override (payer)
    if (payerName) dto.client_name = payerName
    if (payerEmail) dto.client_email = payerEmail
    if (payerPhone) dto.client_phone = payerPhone
    if (payerAddress) dto.client_address = payerAddress

    // Pax / insured persons
    const paxVal = parseInt(paxCount)
    if (paxVal > 0) dto.pax_count = paxVal

    // Dates d'échéance
    const depDue = computeDepositDueDate()
    const balDue = computeBalanceDueDate()
    if (depDue) dto.deposit_due_date = depDue
    if (balDue) dto.balance_due_date = balDue

    if (costHt) {
      dto.cost_ht = parseFloat(costHt)
    }

    // Réforme e-facture 2026
    if (clientSiren) dto.client_siren = clientSiren
    if (deliveryLine1) dto.delivery_address_line1 = deliveryLine1
    if (deliveryCity) dto.delivery_address_city = deliveryCity
    if (deliveryPostalCode) dto.delivery_address_postal_code = deliveryPostalCode
    if (deliveryCountry) dto.delivery_address_country = deliveryCountry
    if (operationCategory !== 'PS') dto.operation_category = operationCategory

    if (lines.length > 0) {
      dto.lines = lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_ttc: l.unit_price_ttc,
        line_type: l.line_type,
      }))
    }

    try {
      await create(dto)
      // Reset form
      resetForm()
      onCreated()
    } catch (err) {
      toast.error('Erreur lors de la création du document')
    }
  }

  const resetForm = () => {
    setTotalTtc('')
    setCostHt('')
    setDepositPct('30')
    setClientNotes('')
    setNotes('')
    setLines([])
    setPaxCount('')
    setDepositDueDateMode('7')
    setDepositDueDateCustom('')
    setBalanceDueDateMode('30')
    setBalanceDueDateCustom('')
    setClientSiren('')
    setDeliveryLine1('')
    setDeliveryCity('')
    setDeliveryPostalCode('')
    setDeliveryCountry('')
    setOperationCategory('PS')
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0 duration-300"
        onClick={() => onOpenChange(false)}
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

        {/* Header */}
        <div className="flex items-center gap-2 p-4 pl-7 border-b">
          <FileText className="h-5 w-5" />
          <span className="font-semibold">Créer un</span>
          <Badge className={`${TYPE_BADGE_STYLES[invoiceType]} text-sm`}>
            {TYPE_LABELS[invoiceType]}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="ml-auto h-8 w-8 p-0 rounded-full opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 pl-7">
          <div className="space-y-6">
            {/* ──── Payeur / Destinataire ──── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Payeur / Destinataire de la facture</Label>
              </div>

              {participants.length > 0 ? (
                <div className="space-y-3">
                  {/* Participant selector */}
                  <div className="grid grid-cols-1 gap-2">
                    {participants.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePayerChange(p.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          selectedPayerId === p.id
                            ? 'border-[#0FB6BC] bg-primary-50 ring-1 ring-[#0FB6BC]'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          selectedPayerId === p.id
                            ? 'bg-[#0FB6BC] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {p.first_name} {p.last_name}
                            {p.is_lead && (
                              <Badge className="bg-primary-100 text-primary-700 border-primary-200 text-[10px] px-1.5 py-0">
                                Contact principal
                              </Badge>
                            )}
                          </div>
                          {p.email && (
                            <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                          )}
                        </div>
                        {selectedPayerId === p.id && (
                          <div className="text-[#0FB6BC]">
                            <CheckIcon className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* Option "Autre" */}
                    <button
                      type="button"
                      onClick={() => handlePayerChange('other')}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedPayerId === 'other'
                          ? 'border-[#0FB6BC] bg-primary-50 ring-1 ring-[#0FB6BC]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 border-dashed'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        selectedPayerId === 'other'
                          ? 'bg-[#0FB6BC] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-sm text-muted-foreground">Autre destinataire...</div>
                    </button>
                  </div>

                  {/* Editable payer fields (always visible if 'other', or for overrides) */}
                  {selectedPayerId === 'other' && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Nom complet *</Label>
                          <Input
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder="Nom Prénom"
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Email *</Label>
                          <Input
                            type="email"
                            value={payerEmail}
                            onChange={(e) => setPayerEmail(e.target.value)}
                            placeholder="email@exemple.com"
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Téléphone</Label>
                          <Input
                            value={payerPhone}
                            onChange={(e) => setPayerPhone(e.target.value)}
                            placeholder="+33..."
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Adresse</Label>
                          <Input
                            value={payerAddress}
                            onChange={(e) => setPayerAddress(e.target.value)}
                            placeholder="Adresse complète"
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show selected payer summary (when not 'other') */}
                  {selectedPayerId !== 'other' && payerName && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      {clientCompany && <div className="font-medium">{clientCompany}</div>}
                      <div className={clientCompany ? 'text-sm' : 'font-medium'}>
                        {clientCompany ? `À l'attention de ${payerName}` : payerName}
                      </div>
                      {payerEmail && <div className="text-muted-foreground">{payerEmail}</div>}
                      {payerAddress && <div className="text-muted-foreground">{payerAddress}</div>}
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback: no participants, show static client info */
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Client (depuis le dossier)
                  </div>
                  {clientCompany && <div className="font-medium">{clientCompany}</div>}
                  {clientName && (
                    <div className="text-sm">{clientCompany ? `À l'attention de ${clientName}` : clientName}</div>
                  )}
                  {clientEmail && <div className="text-sm text-muted-foreground">{clientEmail}</div>}
                  {clientAddress && <div className="text-sm text-muted-foreground">{clientAddress}</div>}
                </div>
              )}
            </div>

            {/* ──── Pax / insured persons ──── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Nombre de personnes assurées</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Important pour l&apos;intégration Chapka. Indiquez le nombre total de voyageurs couverts par cette facture.
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPaxCount(String(n))}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      paxCount === String(n)
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
                    value={![1, 2, 3, 4].includes(parseInt(paxCount)) ? paxCount : ''}
                    onChange={(e) => setPaxCount(e.target.value)}
                    onFocus={() => {
                      if ([1, 2, 3, 4].includes(parseInt(paxCount))) {
                        setPaxCount('')
                      }
                    }}
                    className="w-20 h-10 text-sm"
                    min={1}
                    max={99}
                  />
                  <span className="text-xs text-muted-foreground">pers.</span>
                </div>
              </div>
            </div>

            {/* ──── Réforme e-facture 2026 ──── */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Informations réglementaires (e-facture 2026)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">SIREN client (B2B)</Label>
                  <Input
                    placeholder="123456789"
                    value={clientSiren}
                    onChange={(e) => setClientSiren(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="mt-1"
                    maxLength={9}
                  />
                </div>
                <div>
                  <Label className="text-xs">Catégorie d&apos;opération</Label>
                  <select
                    value={operationCategory}
                    onChange={(e) => setOperationCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="PS">Prestation de services</option>
                    <option value="LB">Livraison de biens</option>
                    <option value="LBPS">Biens + services</option>
                  </select>
                </div>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Adresse de livraison (si différente du client)
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="col-span-2">
                    <Input
                      placeholder="Adresse"
                      value={deliveryLine1}
                      onChange={(e) => setDeliveryLine1(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Code postal"
                      value={deliveryPostalCode}
                      onChange={(e) => setDeliveryPostalCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Ville"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Pays"
                      value={deliveryCountry}
                      onChange={(e) => setDeliveryCountry(e.target.value)}
                    />
                  </div>
                </div>
              </details>
            </div>

            {/* ──── VAT regime info ──── */}
            <div className="bg-primary-50 rounded-lg p-3 text-sm">
              <span className="font-medium">Régime TVA :</span>{' '}
              {vatRegime}
              {destinationCountries && destinationCountries.length > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({destinationCountries.join(', ')})
                </span>
              )}
            </div>

            {/* ──── Travel dates ──── */}
            {(travelStartDate || travelEndDate) && (
              <div className="text-sm text-muted-foreground">
                Voyage : {travelStartDate && new Date(travelStartDate).toLocaleDateString('fr-FR')}
                {travelEndDate && ` au ${new Date(travelEndDate).toLocaleDateString('fr-FR')}`}
              </div>
            )}

            <Separator />

            {/* ──── Lines or simple amount ──── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Lignes de facturation</Label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une ligne
                </Button>
              </div>

              {lines.length > 0 ? (
                <div className="space-y-3">
                  {lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => updateLine(i, 'description', e.target.value)}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qté"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="Prix unitaire"
                          value={line.unit_price_ttc || ''}
                          onChange={(e) => updateLine(i, 'unit_price_ttc', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-24 text-right text-sm font-medium pt-2">
                        {(line.quantity * line.unit_price_ttc).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeLine(i)} className="h-9 w-9 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right text-sm font-semibold">
                    Total lignes : {linesTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Montant total TTC</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={totalTtc}
                      onChange={(e) => setTotalTtc(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Une ligne générique « Forfait voyage » sera créée automatiquement
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ──── Deposit / Balance ──── */}
            {(invoiceType === 'PRO' || invoiceType === 'DEV') && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Taux d&apos;acompte</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {[30, 40, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDepositPct(String(pct))}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          depositPct === String(pct)
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
                        value={![30, 40, 50].includes(parseInt(depositPct)) ? depositPct : ''}
                        onChange={(e) => setDepositPct(e.target.value)}
                        onFocus={() => {
                          if ([30, 40, 50].includes(parseInt(depositPct))) {
                            setDepositPct('')
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Acompte</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                      {(lines.length > 0 ? linesTotal * (parseFloat(depositPct) || 30) / 100 : deposit).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Solde</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                      {(lines.length > 0 ? linesTotal - linesTotal * (parseFloat(depositPct) || 30) / 100 : balance).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                </div>
                {invoiceType === 'PRO' && (
                  <p className="text-xs text-muted-foreground">
                    La facture définitive sera générée automatiquement au règlement de l&apos;acompte.
                  </p>
                )}

                {/* Dates d'échéance */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Dates d&apos;échéance</Label>
                  </div>

                  {/* Acompte due date */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Échéance acompte</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      {[
                        { value: '7' as const, label: 'J+7' },
                        { value: '15' as const, label: 'J+15' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDepositDueDateMode(opt.value)}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            depositDueDateMode === opt.value
                              ? 'bg-[#0FB6BC] text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDepositDueDateMode('custom')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          depositDueDateMode === 'custom'
                            ? 'bg-[#0FB6BC] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Date libre
                      </button>
                      {depositDueDateMode === 'custom' ? (
                        <Input
                          type="date"
                          value={depositDueDateCustom}
                          onChange={(e) => setDepositDueDateCustom(e.target.value)}
                          className="w-40 h-8 text-xs ml-1"
                        />
                      ) : depositDueDatePreview ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          → {new Date(depositDueDatePreview).toLocaleDateString('fr-FR')}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Balance due date */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Échéance solde</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      {[
                        { value: '30' as const, label: 'J-30 départ' },
                        { value: '45' as const, label: 'J-45 départ' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBalanceDueDateMode(opt.value)}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            balanceDueDateMode === opt.value
                              ? 'bg-[#0FB6BC] text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBalanceDueDateMode('custom')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          balanceDueDateMode === 'custom'
                            ? 'bg-[#0FB6BC] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Date libre
                      </button>
                      {balanceDueDateMode === 'custom' ? (
                        <Input
                          type="date"
                          value={balanceDueDateCustom}
                          onChange={(e) => setBalanceDueDateCustom(e.target.value)}
                          className="w-40 h-8 text-xs ml-1"
                        />
                      ) : balanceDueDatePreview ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          → {new Date(balanceDueDatePreview).toLocaleDateString('fr-FR')}
                        </span>
                      ) : !travelStartDate ? (
                        <span className="text-xs text-orange-500 ml-2">
                          Pas de date de départ
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──── Cost HT (for margin VAT) ──── */}
            {isEU && (
              <div>
                <Label>Coût d&apos;achat HT (pour calcul TVA marge)</Label>
                <Input
                  type="number"
                  placeholder="Optionnel — pour calculer la TVA sur la marge"
                  value={costHt}
                  onChange={(e) => setCostHt(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Interne — non visible sur le document client
                </p>
              </div>
            )}

            <Separator />

            {/* ──── Notes ──── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Notes client (visible sur le document)</Label>
                <Textarea
                  placeholder="Informations pour le client..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label>Notes internes</Label>
                <Textarea
                  placeholder="Notes internes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 pl-7 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? 'Création...' : `Créer le ${TYPE_LABELS[invoiceType].toLowerCase()}`}
          </Button>
        </div>
      </div>
    </>
  )
}

// Simple check icon component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}
