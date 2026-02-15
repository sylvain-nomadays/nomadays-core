'use client'

import { useState, useTransition } from 'react'
import {
  Check, NotePencil, CaretDown,
  // Item-level icons (mapped from emojis)
  Stamp, AirplaneTilt, Suitcase, TShirt, ShieldCheck, Plug, ClipboardText,
  CurrencyDollar, Bank, Coins, CreditCard, ChartBar,
  SimCard, WifiHigh, DeviceMobile,
  Syringe, Pill, Drop, Lock, FirstAid,
  HandsPraying, Dress, Church, ProhibitInset, Translate,
  CloudSun, CalendarBlank, Thermometer, CloudRain, Backpack,
} from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import type { TravelInfoItem } from '@/lib/actions/travel-info'

// ─── Emoji → Phosphor icon map ──────────────────────────────────────────────

const EMOJI_ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Formalités
  '🛂': Stamp,
  '✈️': AirplaneTilt,
  // Préparation
  '🧳': Suitcase,
  '👔': TShirt,
  '🛡️': ShieldCheck,
  '🔌': Plug,
  '📋': ClipboardText,
  // Budget & Paiement
  '💱': CurrencyDollar,
  '🏧': Bank,
  '💰': Coins,
  '💳': CreditCard,
  '📊': ChartBar,
  '💵': CurrencyDollar,
  // Communication
  '📱': SimCard,
  '📶': WifiHigh,
  '📲': DeviceMobile,
  // Santé & Sécurité
  '💉': Syringe,
  '💊': Pill,
  '🚰': Drop,
  '🔒': Lock,
  '🆘': FirstAid,
  '⚕️': FirstAid,
  // Culture & Étiquette
  '🙏': HandsPraying,
  '👗': Dress,
  '🛕': Church,
  '🚫': ProhibitInset,
  '🗣️': Translate,
  // Météo & Saison
  '🌤️': CloudSun,
  '📅': CalendarBlank,
  '🌡️': Thermometer,
  '🌧️': CloudRain,
  '🎒': Backpack,
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CarnetItemProps {
  item: TravelInfoItem
  categoryKey: string
  isChecked: boolean
  notes: string | null
  continentTheme: ContinentTheme
  onToggle: (categoryKey: string, itemKey: string) => Promise<void>
  onUpdateNotes: (categoryKey: string, itemKey: string, notes: string) => Promise<void>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CarnetItem({
  item,
  categoryKey,
  isChecked,
  notes,
  continentTheme,
  onToggle,
  onUpdateNotes,
}: CarnetItemProps) {
  const [showNotes, setShowNotes] = useState(!!notes)
  const [localNotes, setLocalNotes] = useState(notes || '')
  const [isPending, startTransition] = useTransition()
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const handleToggle = () => {
    startTransition(async () => {
      await onToggle(categoryKey, item.key)
    })
  }

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      await onUpdateNotes(categoryKey, item.key, localNotes)
    } finally {
      setIsSavingNotes(false)
    }
  }

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        isChecked
          ? 'bg-gray-50/80 border-gray-200'
          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
            isChecked
              ? 'border-transparent text-white'
              : 'border-gray-300 hover:border-gray-400'
          } ${isPending ? 'opacity-50' : ''}`}
          style={isChecked ? { backgroundColor: continentTheme.primary } : undefined}
          aria-label={isChecked ? 'Marquer comme non fait' : 'Marquer comme fait'}
        >
          {isChecked && <Check size={12} weight="bold" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.emoji && (() => {
              const EmojiIcon = EMOJI_ICON_MAP[item.emoji]
              if (EmojiIcon) {
                return (
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: continentTheme.light }}
                  >
                    <EmojiIcon size={14} weight="duotone" style={{ color: continentTheme.primary }} />
                  </span>
                )
              }
              // Fallback: render emoji as text if no mapping
              return <span className="text-base flex-shrink-0">{item.emoji}</span>
            })()}
            <h4
              className={`text-sm font-semibold transition-colors ${
                isChecked ? 'text-gray-400 line-through' : 'text-gray-800'
              }`}
            >
              {item.label}
            </h4>
            {isChecked && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: continentTheme.primary }}
              >
                <Check size={9} weight="bold" />
                C&apos;est fait
              </span>
            )}
          </div>

          <p
            className={`mt-1 text-sm leading-relaxed ${
              isChecked ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {item.content}
          </p>

          {/* Notes area */}
          {showNotes ? (
            <div className="mt-3">
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Ajouter une note personnelle..."
                className="w-full text-xs text-gray-600 bg-white/80 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-opacity-30 transition-shadow"
                style={{ focusRingColor: continentTheme.primary } as any}
                rows={2}
              />
              {isSavingNotes && (
                <p className="text-[10px] text-gray-400 mt-1">Enregistrement...</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowNotes(true)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <NotePencil size={12} />
              Note perso
              <CaretDown size={10} />
            </button>
          )}

          {/* Show existing notes if collapsed */}
          {!showNotes && notes && (
            <button
              onClick={() => setShowNotes(true)}
              className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500 italic"
            >
              <NotePencil size={12} className="mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{notes}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
