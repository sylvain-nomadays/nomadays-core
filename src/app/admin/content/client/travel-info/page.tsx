'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SpinnerGap, FloppyDisk, CaretDown, CaretRight, Sparkle, GlobeHemisphereWest,
  Trash, PlusCircle, CheckCircle, Eye,
  Stamp, Suitcase, CurrencyDollar, WifiHigh, FirstAidKit, CloudSun, HandsPraying,
  // Item-level icons (for the icon picker)
  AirplaneTilt, TShirt, ShieldCheck, Plug, ClipboardText,
  Bank, Coins, CreditCard, ChartBar,
  SimCard, DeviceMobile,
  Syringe, Pill, Drop, Lock, FirstAid,
  Dress, Church, ProhibitInset, Translate,
  CalendarBlank, Thermometer, CloudRain, Backpack,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useUserRole } from '@/lib/hooks/use-user-role'
import {
  listCountryTravelInfo,
  updateCountryTravelInfo,
  type CountryTravelInfoRow,
  type TravelInfoCategory,
  type TravelInfoItem,
} from '@/lib/actions/travel-info'

// ─── Country name helper ──────────────────────────────────────────────────────

function countryNameFr(code: string): string {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

function countryFlag(code: string): string {
  try {
    return code
      .toUpperCase()
      .split('')
      .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
      .join('')
  } catch {
    return ''
  }
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; nextAction?: string; nextStatus?: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', nextAction: 'Publier', nextStatus: 'published' },
  needs_review: { label: 'À valider', color: 'bg-amber-100 text-amber-700', nextAction: 'Approuver', nextStatus: 'approved' },
  approved: { label: 'Approuvé', color: 'bg-blue-100 text-blue-700', nextAction: 'Publier', nextStatus: 'published' },
  published: { label: 'Publié', color: 'bg-green-100 text-green-700' },
}

// ─── Icon map (category icons — Phosphor duotone) ─────────────────────────────

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  Stamp,
  Suitcase,
  CurrencyDollar,
  WifiHigh,
  FirstAidKit,
  CloudSun,
  HandsPraying,
}

// ─── Item icon picker options (emoji → Phosphor icon) ────────────────────────

const ITEM_ICON_OPTIONS: { emoji: string; label: string; Icon: React.ComponentType<any> }[] = [
  // Formalités
  { emoji: '🛂', label: 'Visa / Passeport', Icon: Stamp },
  { emoji: '✈️', label: 'Vol / Avion', Icon: AirplaneTilt },
  // Préparation
  { emoji: '🧳', label: 'Bagages', Icon: Suitcase },
  { emoji: '👔', label: 'Tenue', Icon: TShirt },
  { emoji: '🛡️', label: 'Assurance', Icon: ShieldCheck },
  { emoji: '🔌', label: 'Adaptateur', Icon: Plug },
  { emoji: '📋', label: 'Documents', Icon: ClipboardText },
  // Budget & Paiement
  { emoji: '💱', label: 'Devise', Icon: CurrencyDollar },
  { emoji: '🏧', label: 'Change / Retrait', Icon: Bank },
  { emoji: '💰', label: 'Pourboire', Icon: Coins },
  { emoji: '💳', label: 'Carte bancaire', Icon: CreditCard },
  { emoji: '📊', label: 'Budget', Icon: ChartBar },
  // Communication
  { emoji: '📱', label: 'Carte SIM', Icon: SimCard },
  { emoji: '📶', label: 'Wi-Fi', Icon: WifiHigh },
  { emoji: '📲', label: 'Applications', Icon: DeviceMobile },
  // Santé & Sécurité
  { emoji: '💉', label: 'Vaccins', Icon: Syringe },
  { emoji: '💊', label: 'Pharmacie', Icon: Pill },
  { emoji: '🚰', label: 'Eau / Alimentation', Icon: Drop },
  { emoji: '🔒', label: 'Sécurité', Icon: Lock },
  { emoji: '🆘', label: 'Urgences', Icon: FirstAid },
  // Culture & Étiquette
  { emoji: '🙏', label: 'Coutumes', Icon: HandsPraying },
  { emoji: '👗', label: 'Code vestimentaire', Icon: Dress },
  { emoji: '🛕', label: 'Religion / Temples', Icon: Church },
  { emoji: '🚫', label: 'Gestes à éviter', Icon: ProhibitInset },
  { emoji: '🗣️', label: 'Mots utiles', Icon: Translate },
  // Météo & Saison
  { emoji: '🌤️', label: 'Climat', Icon: CloudSun },
  { emoji: '📅', label: 'Saison', Icon: CalendarBlank },
  { emoji: '🌡️', label: 'Températures', Icon: Thermometer },
  { emoji: '🌧️', label: 'Précipitations', Icon: CloudRain },
  { emoji: '🎒', label: 'Bagages saison', Icon: Backpack },
]

// Reverse lookup: emoji string → icon component
const EMOJI_TO_ICON: Record<string, React.ComponentType<any>> = {}
for (const opt of ITEM_ICON_OPTIONS) {
  EMOJI_TO_ICON[opt.emoji] = opt.Icon
}

// ─── Icon Picker (inline popover) ────────────────────────────────────────────

function ItemIconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (emoji: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const CurrentIcon = EMOJI_TO_ICON[value] || null

  return (
    <div ref={containerRef} className="relative flex-shrink-0 w-16">
      <label className="text-[10px] text-gray-400 block mb-1">Icône</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-8 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:border-gray-300 transition-colors"
        title={value ? ITEM_ICON_OPTIONS.find(o => o.emoji === value)?.label || value : 'Choisir une icône'}
      >
        {CurrentIcon ? (
          <CurrentIcon size={18} weight="duotone" className="text-primary-500" />
        ) : value ? (
          <span className="text-base">{value}</span>
        ) : (
          <PlusCircle size={16} weight="duotone" className="text-gray-300" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-[280px]">
          <p className="text-[10px] text-gray-400 mb-1.5 px-1">Choisir une icône</p>
          <div className="grid grid-cols-6 gap-1">
            {ITEM_ICON_OPTIONS.map((opt) => (
              <button
                key={opt.emoji}
                type="button"
                onClick={() => {
                  onChange(opt.emoji)
                  setOpen(false)
                }}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                  value === opt.emoji
                    ? 'bg-primary-50 ring-2 ring-primary-500'
                    : 'hover:bg-gray-50'
                }`}
                title={opt.label}
              >
                <opt.Icon size={20} weight="duotone" className={
                  value === opt.emoji ? 'text-primary-500' : 'text-gray-500'
                } />
              </button>
            ))}
          </div>
          {/* Option to clear */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="mt-1.5 w-full text-[10px] text-gray-400 hover:text-red-500 transition-colors py-1"
            >
              Retirer l&apos;icône
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TravelInfoAdminPage() {
  const { tenantId, loading: roleLoading } = useUserRole()
  const [row, setRow] = useState<CountryTravelInfoRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editedCategories, setEditedCategories] = useState<TravelInfoCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [generating, setGenerating] = useState(false)

  // Country code is derived from the existing travel info row (destination),
  // NOT from tenant.country_code (which is the company's HQ country, e.g. FR).
  const countryCode = row?.country_code || 'TH'
  const countryName = countryNameFr(countryCode)
  const flag = countryFlag(countryCode)

  // ── Load data ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const data = await listCountryTravelInfo(tenantId)
      const found = data[0] || null
      setRow(found)
      if (found) {
        setEditedCategories(JSON.parse(JSON.stringify(found.categories)))
      } else {
        setEditedCategories([])
      }
    } catch (err) {
      console.error('[TravelInfoAdmin] Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (!roleLoading && tenantId) {
      loadData()
    }
  }, [roleLoading, tenantId, loadData])

  // ── Generate via API ────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!tenantId) return
    setGenerating(true)
    try {
      const resp = await fetch('/api/generate-travel-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'country',
          countryCode,
          tenantId,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        setSaveMessage(`Erreur: ${err.error}`)
        setTimeout(() => setSaveMessage(''), 5000)
        return
      }

      setSaveMessage('Contenu IA généré avec succès !')
      setTimeout(() => setSaveMessage(''), 4000)
      await loadData()
    } catch {
      setSaveMessage('Erreur réseau')
      setTimeout(() => setSaveMessage(''), 4000)
    } finally {
      setGenerating(false)
    }
  }

  // ── Save edits ──────────────────────────────────────────────────────────────

  const handleSave = async (newStatus?: string) => {
    if (!row) return
    setSaving(true)
    try {
      const result = await updateCountryTravelInfo({
        id: row.id,
        categories: editedCategories,
        status: newStatus,
      })

      if (result.success) {
        setSaveMessage(newStatus ? `${STATUS_CONFIG[newStatus]?.label || newStatus} ✓` : 'Enregistré ✓')
        setTimeout(() => setSaveMessage(''), 3000)
        await loadData()
      } else {
        setSaveMessage(`Erreur: ${result.error}`)
        setTimeout(() => setSaveMessage(''), 5000)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Edit helpers ────────────────────────────────────────────────────────────

  const updateItemField = (
    catIdx: number,
    itemIdx: number,
    field: keyof TravelInfoItem,
    value: string
  ) => {
    setEditedCategories(prev => {
      const cats = JSON.parse(JSON.stringify(prev))
      if (cats[catIdx]?.items?.[itemIdx]) {
        cats[catIdx].items[itemIdx][field] = value
      }
      return cats
    })
  }

  const addItem = (catIdx: number) => {
    setEditedCategories(prev => {
      const cats = JSON.parse(JSON.stringify(prev))
      if (cats[catIdx]) {
        const newKey = `custom_${Date.now()}`
        cats[catIdx].items.push({
          key: newKey,
          label: '',
          emoji: '',
          content: '',
        })
      }
      return cats
    })
  }

  const removeItem = (catIdx: number, itemIdx: number) => {
    setEditedCategories(prev => {
      const cats = JSON.parse(JSON.stringify(prev))
      if (cats[catIdx]?.items) {
        cats[catIdx].items.splice(itemIdx, 1)
      }
      return cats
    })
  }

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  const statusConf: { label: string; color: string; nextAction?: string; nextStatus?: string } =
    STATUS_CONFIG[row?.status || 'draft'] || { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', nextAction: 'Publier', nextStatus: 'published' }

  const itemCount = editedCategories.reduce((sum, cat) => sum + cat.items.length, 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = roleLoading || loading

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">{flag}</span>
              Carnets pratiques — {countryName}
              {row && (
                <Badge variant="outline" className={`${statusConf.color} border-0 text-xs ml-2`}>
                  {statusConf.label}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Informations pratiques pour vos voyageurs
              {row && (
                <span className="text-gray-400">
                  {' '}· {editedCategories.length} catégories · {itemCount} items
                  {row.generated_at && (
                    <> · Généré le {new Date(row.generated_at).toLocaleDateString('fr-FR')}</>
                  )}
                </span>
              )}
            </p>
          </div>

          {/* Save message */}
          {saveMessage && (
            <span className={`text-sm mr-3 ${
              saveMessage.includes('✓') || saveMessage.includes('succès')
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {saveMessage}
            </span>
          )}
        </div>

        {/* Action bar */}
        {row && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <SpinnerGap size={14} weight="bold" className="mr-1.5 animate-spin" />
              ) : (
                <Sparkle size={14} weight="duotone" className="mr-1.5" />
              )}
              Regénérer avec l&apos;IA
            </Button>

            {statusConf.nextAction && statusConf.nextStatus && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave(statusConf.nextStatus)}
                disabled={saving}
              >
                {row.status === 'draft' || row.status === 'approved' ? (
                  <Eye size={14} weight="duotone" className="mr-1.5" />
                ) : (
                  <CheckCircle size={14} weight="duotone" className="mr-1.5" />
                )}
                {statusConf.nextAction}
              </Button>
            )}

            <div className="flex-1" />

            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
            >
              {saving ? (
                <SpinnerGap size={14} weight="bold" className="mr-1.5 animate-spin" />
              ) : (
                <FloppyDisk size={14} weight="duotone" className="mr-1.5" />
              )}
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <SpinnerGap size={24} weight="bold" className="animate-spin text-muted-foreground" />
          </div>
        ) : !row ? (
          /* Empty state — no content yet */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">{flag}</div>
            <GlobeHemisphereWest size={48} weight="duotone" className="text-gray-200 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Aucun carnet pratique pour {countryName}
            </p>
            <p className="text-sm text-gray-400 mb-6 max-w-md">
              Générez automatiquement les informations pratiques (visa, santé, budget, culture…)
              grâce à l&apos;IA. Vous pourrez ensuite les personnaliser.
            </p>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <SpinnerGap size={20} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <Sparkle size={20} weight="duotone" className="mr-2" />
              )}
              Générer le carnet avec l&apos;IA
            </Button>
          </div>
        ) : (
          /* Categories editor */
          <div className="space-y-1 max-w-5xl">
            {editedCategories.map((cat, catIdx) => {
              const isCatExpanded = expandedCategories.has(cat.key)
              const CatIcon = CATEGORY_ICONS[cat.icon] || Stamp

              return (
                <div key={cat.key} className="border rounded-lg bg-white overflow-hidden">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors text-left"
                  >
                    {isCatExpanded ? (
                      <CaretDown size={16} weight="bold" className="text-gray-400" />
                    ) : (
                      <CaretRight size={16} weight="bold" className="text-gray-400" />
                    )}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <CatIcon size={18} weight="duotone" className="text-primary-500" />
                    </div>
                    <span className="font-semibold text-sm flex-1">{cat.label}</span>
                    <span className="text-xs text-gray-400">
                      {cat.items.length} {cat.items.length > 1 ? 'items' : 'item'}
                    </span>
                  </button>

                  {/* Category items */}
                  {isCatExpanded && (
                    <div className="border-t px-5 pb-4 pt-3 space-y-3">
                      {cat.items.map((item, itemIdx) => (
                        <div
                          key={item.key}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                        >
                          {/* Icon picker */}
                          <ItemIconPicker
                            value={item.emoji || ''}
                            onChange={(emoji) => updateItemField(catIdx, itemIdx, 'emoji', emoji)}
                          />

                          {/* Label */}
                          <div className="w-44 flex-shrink-0">
                            <label className="text-[10px] text-gray-400 block mb-1">Titre</label>
                            <Input
                              value={item.label}
                              onChange={e => updateItemField(catIdx, itemIdx, 'label', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400 block mb-1">Contenu</label>
                            <Textarea
                              value={item.content}
                              onChange={e => updateItemField(catIdx, itemIdx, 'content', e.target.value)}
                              rows={2}
                              className="text-sm resize-none"
                            />
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => removeItem(catIdx, itemIdx)}
                            className="flex-shrink-0 mt-5 text-gray-300 hover:text-red-500 transition-colors"
                            title="Supprimer cet item"
                          >
                            <Trash size={16} weight="duotone" />
                          </button>
                        </div>
                      ))}

                      {/* Add item button */}
                      <button
                        onClick={() => addItem(catIdx)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-2"
                      >
                        <PlusCircle size={14} weight="duotone" />
                        Ajouter un item
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
