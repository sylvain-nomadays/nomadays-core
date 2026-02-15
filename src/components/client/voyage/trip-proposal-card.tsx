import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  FileText,
  CalendarBlank,
  MapPin,
  Users,
  Sparkle,
  Airplane,
  ChatCircleDots,
  ClipboardText,
  CurrencyEur,
  Timer,
  ListPlus,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'

// ─── Trip type badge config ─────────────────────────────────────────────────

const TRIP_TYPE_BADGE: Record<string, { label: string; bg: string }> = {
  custom: { label: 'Sur mesure', bg: 'rgba(15, 182, 188, 0.85)' },
  online: { label: 'Sur mesure', bg: 'rgba(15, 182, 188, 0.85)' },
  template: { label: 'Sur mesure', bg: 'rgba(15, 182, 188, 0.85)' },
  gir: { label: 'Voyage en groupe', bg: 'rgba(221, 147, 113, 0.85)' },
}

// ─── Status config ───────────────────────────────────────────────────────────

const TRIP_STATUS_CONFIG: Record<string, { label: string; icon: PhosphorIcon; className: string }> = {
  draft: { label: 'En pr\u00E9paration', icon: Clock, className: 'bg-gray-100/80 text-gray-600' },
  sent: { label: 'En discussion', icon: ChatCircleDots, className: 'bg-amber-50/80 text-amber-700' },
  quoted: { label: 'En discussion', icon: ChatCircleDots, className: 'bg-amber-50/80 text-amber-700' },
  confirmed: { label: 'S\u00E9lectionn\u00E9', icon: CheckCircle, className: 'bg-emerald-50/80 text-emerald-700' },
  operating: { label: 'Voyage en cours', icon: Airplane, className: 'bg-blue-50/80 text-blue-700' },
  completed: { label: 'Termin\u00E9', icon: CheckCircle, className: 'bg-gray-100/80 text-gray-600' },
  cancelled: { label: 'Non retenu', icon: FileText, className: 'bg-gray-100/80 text-gray-400' },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripHighlight {
  title: string
  icon?: string
}

interface PricingSupplement {
  label: string
  price: number
  per_person: boolean
}

interface TripPricing {
  cotation_id?: number | null
  label?: string | null
  total_pax?: number | null
  total_price?: number | null
  price_per_person?: number | null
  args_json?: { adult?: number; label?: string } | null
  valid_until?: string | null
  is_primary?: boolean | null
  option_type?: string | null
  description?: string | null
  supplement_price?: number | null
  supplement_per_person?: boolean | null
  sort_order?: number | null
  supplements?: PricingSupplement[] | null
}

interface TripProposalCardProps {
  trip: {
    id: number
    name: string
    type?: string
    status: string
    duration_days?: number | null
    destination_country?: string | null
    description_short?: string | null
    start_date?: string | null
    end_date?: string | null
    heroPhotoUrl?: string | null
    highlights?: TripHighlight[] | null
    created_at?: string | null
  }
  isConfirmed: boolean
  continentTheme: ContinentTheme
  stops?: string[]
  travelersCount?: number
  advisorFirstName?: string | null
  dossierId?: string
  pricing?: TripPricing | null
  pricingOptions?: TripPricing[]
  currency?: string
  departureDateFrom?: string | null
  departureDateTo?: string | null
  isLead?: boolean
  hasConfirmedTrip?: boolean
  selectedCotationId?: number | null
  onChooseProposal?: (tripId: number, cotationId?: number) => void
  onSelect?: () => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

// ─── PricingOptionCard — reusable card for multi-option pricing ──────────────

function PricingOptionCard({
  option,
  isPrimary,
  continentTheme,
  formatPrice,
  paxLabel,
  isSelected,
  isNotRetained,
  showChooseButton,
  onChoose,
  chooseLabel = 'Choisir cette option',
}: {
  option: TripPricing
  isPrimary: boolean
  continentTheme: ContinentTheme
  formatPrice: (amount: number) => string
  paxLabel?: string | null
  isSelected?: boolean
  isNotRetained?: boolean
  showChooseButton?: boolean
  onChoose?: () => void
  chooseLabel?: string
}) {
  const supplements = option.supplements || []
  const hasPricePerPerson = (option.price_per_person ?? 0) > 0

  // Selection state badge
  const selectionBadge = isSelected ? (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-2">
      <CheckCircle size={14} weight="duotone" />
      Option retenue
    </div>
  ) : isNotRetained ? (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 text-xs font-medium mb-2">
      Non retenue
    </div>
  ) : null

  if (isPrimary) {
    return (
      <div
        className={`rounded-2xl p-5 text-white flex flex-col relative transition-all ${
          isSelected ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
        } ${isNotRetained ? 'opacity-50 grayscale' : ''}`}
        style={{ background: `linear-gradient(135deg, ${continentTheme.primary} 0%, ${continentTheme.accent} 100%)` }}
      >
        {/* Selection badge */}
        {isSelected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 w-fit">
            <CheckCircle size={14} weight="duotone" />
            Option retenue
          </div>
        )}
        {isNotRetained && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white/70 text-xs font-medium mb-2 w-fit">
            Non retenue
          </div>
        )}
        {/* Option label */}
        {option.label && (
          <div className="font-display font-bold text-sm opacity-90 mb-2">
            {option.label}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs opacity-80 mb-1.5">
          <CurrencyEur size={14} weight="duotone" />
          Prix total du voyage
        </div>
        <div className="font-display font-extrabold text-3xl mb-1">
          {formatPrice(option.total_price!)}
        </div>
        {hasPricePerPerson && (
          <div className="text-sm opacity-85">
            soit {formatPrice(option.price_per_person!)} / personne
          </div>
        )}
        {paxLabel && (
          <div className="text-xs opacity-70 mt-2">
            {paxLabel}
          </div>
        )}
        {option.description && (
          <div className="text-xs opacity-80 mt-2 leading-relaxed">
            {option.description}
          </div>
        )}
        {/* Supplements */}
        {supplements.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5">
            <div className="text-xs font-semibold opacity-80">Suppléments disponibles</div>
            {supplements.map((sup, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs opacity-85">
                <span>{sup.label}</span>
                <span className="font-semibold">
                  +{formatPrice(sup.price)}{sup.per_person ? '/pers' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* Choose button */}
        {showChooseButton && !isSelected && !isNotRetained && onChoose && (
          <button
            onClick={(e) => { e.stopPropagation(); onChoose() }}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all cursor-pointer"
          >
            <CheckCircle size={16} weight="duotone" />
            {chooseLabel}
          </button>
        )}
      </div>
    )
  }

  // Alternative option: outline style
  return (
    <div
      className={`rounded-2xl p-5 border-2 flex flex-col transition-all ${
        isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 border-emerald-300' : ''
      } ${isNotRetained ? 'opacity-50 grayscale' : ''}`}
      style={isSelected
        ? { borderColor: '#6ee7b7', backgroundColor: '#ecfdf520' }
        : { borderColor: `${continentTheme.primary}30`, backgroundColor: `${continentTheme.primary}05` }
      }
    >
      {/* Selection badge */}
      {selectionBadge}
      {/* Option label */}
      {option.label && (
        <div className="font-display font-bold text-sm mb-2" style={{ color: isNotRetained ? '#9ca3af' : continentTheme.primary }}>
          {option.label}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
        <CurrencyEur size={14} weight="duotone" style={{ color: continentTheme.accent }} />
        Prix total du voyage
      </div>
      <div className="font-display font-extrabold text-3xl mb-1" style={{ color: isNotRetained ? '#9ca3af' : continentTheme.primary }}>
        {formatPrice(option.total_price!)}
      </div>
      {hasPricePerPerson && (
        <div className={`text-sm ${isNotRetained ? 'text-gray-400' : 'text-gray-600'}`}>
          soit {formatPrice(option.price_per_person!)} / personne
        </div>
      )}
      {paxLabel && (
        <div className="text-xs text-gray-400 mt-2">
          {paxLabel}
        </div>
      )}
      {option.description && (
        <div className={`text-xs mt-2 leading-relaxed ${isNotRetained ? 'text-gray-400' : 'text-gray-500'}`}>
          {option.description}
        </div>
      )}
      {/* Supplements */}
      {supplements.length > 0 && (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${continentTheme.primary}15` }}>
          <div className="text-xs font-semibold text-gray-500">Suppléments disponibles</div>
          {supplements.map((sup, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
              <span>{sup.label}</span>
              <span className="font-semibold" style={{ color: continentTheme.primary }}>
                +{formatPrice(sup.price)}{sup.per_person ? '/pers' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Choose button */}
      {showChooseButton && !isSelected && !isNotRetained && onChoose && (
        <button
          onClick={(e) => { e.stopPropagation(); onChoose() }}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
        >
          <CheckCircle size={16} weight="duotone" />
          Choisir cette option
        </button>
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TripProposalCard({
  trip,
  isConfirmed,
  continentTheme,
  stops,
  travelersCount,
  advisorFirstName,
  dossierId,
  pricing,
  pricingOptions = [],
  currency = 'EUR',
  departureDateFrom,
  departureDateTo,
  isLead,
  hasConfirmedTrip,
  selectedCotationId,
  onChooseProposal,
  onSelect,
  isExpanded,
  onToggleExpand,
}: TripProposalCardProps) {
  const statusConfig = TRIP_STATUS_CONFIG[trip.status] ?? {
    label: trip.status,
    icon: Clock as PhosphorIcon,
    className: 'bg-gray-100/80 text-gray-600',
  }
  const StatusIcon = statusConfig.icon

  const tripType = TRIP_TYPE_BADGE[trip.type || 'custom'] ?? TRIP_TYPE_BADGE.custom!
  const highlights = (trip.highlights || []).slice(0, 5)
  const tripStops = (stops || []).slice(0, 8)

  // Pricing helpers
  const hasPricing = pricing && (pricing.total_price ?? 0) > 0
  const hasOptions = pricingOptions.length > 0
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  const paxLabel = pricing?.args_json?.adult
    ? `Base ${pricing.args_json.adult} voyageur${pricing.args_json.adult > 1 ? 's' : ''}`
    : pricing?.label || null

  // Multi-option detection: alternatives with full pricing (from published cotations)
  const alternativeOptions = pricingOptions.filter(
    (o) => o.option_type === 'alternative' && (o.total_price ?? 0) > 0
  )
  const isMultiOption = alternativeOptions.length > 0

  // Selection states for multi-option
  const allOptions = isMultiOption ? [pricing!, ...alternativeOptions] : []
  const hasAnyCotationId = allOptions.some(o => o.cotation_id)
  const hasCotationSelection = selectedCotationId != null && hasAnyCotationId
  // Can the lead choose an option?
  const canChooseOption = isLead && !hasConfirmedTrip && onChooseProposal && trip.status !== 'cancelled'
  // Legacy supplements (from trip_pax_configs)
  const legacySupplements = pricingOptions.filter(
    (o) => o.option_type === 'supplement' || (o.option_type !== 'alternative' && o !== pricing)
  )

  // Validity date
  const validUntilFormatted = pricing?.valid_until
    ? new Date(pricing.valid_until).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  // Format travel dates (prefer dossier dates, fallback to trip dates)
  const effectiveFrom = departureDateFrom || trip.start_date
  const effectiveTo = departureDateTo || trip.end_date
  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const formatDateFull = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  const travelDatesFormatted = effectiveFrom
    ? effectiveTo
      ? `${formatDateShort(effectiveFrom)} — ${formatDateFull(effectiveTo)}`
      : `À partir du ${formatDateFull(effectiveFrom)}`
    : null

  const createdAtFormatted = trip.created_at
    ? new Date(trip.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <article
      className={`rounded-2xl overflow-hidden border-2 transition-all bg-white shadow-sm hover:shadow-lg ${
        isConfirmed
          ? 'border-emerald-300 ring-2 ring-emerald-100'
          : 'border-transparent hover:border-gray-200'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
    >
      {/* ─── Image Header ──────────────────────────────────────────────── */}
      <div className="relative h-[220px]">
        {trip.heroPhotoUrl ? (
          <Image
            src={trip.heroPhotoUrl}
            alt={trip.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${continentTheme.primary} 0%, ${continentTheme.accent} 100%)` }}
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Trip type badge — top left */}
        <div className="absolute top-4 left-4">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-sm"
            style={{ backgroundColor: tripType.bg }}
          >
            {trip.type === 'gir' ? (
              <Users size={14} weight="duotone" />
            ) : (
              <Airplane size={14} weight="duotone" />
            )}
            {tripType.label}
          </span>
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-4 right-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${statusConfig.className}`}
          >
            <StatusIcon size={14} weight="duotone" />
            {statusConfig.label}
          </span>
        </div>

        {/* Title overlay on image */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h3 className="font-display font-extrabold text-2xl text-white leading-tight mb-2">
            {trip.name}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/85">
            {trip.duration_days && (
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={15} weight="duotone" />
                {trip.duration_days} jours
              </span>
            )}
            {travelersCount != null && travelersCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Users size={15} weight="duotone" />
                {travelersCount} voyageur{travelersCount > 1 ? 's' : ''}
              </span>
            )}
            {travelDatesFormatted && (
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={15} weight="duotone" />
                {travelDatesFormatted}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Body ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-5">
        {/* Description */}
        {trip.description_short && (
          <p className="text-[15px] text-gray-600 leading-relaxed line-clamp-3">
            {trip.description_short}
          </p>
        )}

        {/* Etapes (stops) */}
        {tripStops.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
              <MapPin size={16} weight="duotone" style={{ color: continentTheme.primary }} />
              Etapes
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {tripStops.join(' \u2192 ')}
            </p>
          </div>
        )}

        {/* Pricing */}
        {hasPricing ? (
          <div className="space-y-3">
            {isMultiOption ? (
              /* ─── Multi-option pricing: side-by-side cards ─── */
              <div className={`grid gap-3 ${alternativeOptions.length + 1 >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {/* Primary option card */}
                <PricingOptionCard
                  option={pricing!}
                  isPrimary
                  continentTheme={continentTheme}
                  formatPrice={formatPrice}
                  paxLabel={paxLabel}
                  isSelected={hasCotationSelection && pricing!.cotation_id === selectedCotationId}
                  isNotRetained={hasCotationSelection && pricing!.cotation_id !== selectedCotationId}
                  showChooseButton={!!canChooseOption && hasAnyCotationId && !hasCotationSelection}
                  onChoose={() => onChooseProposal?.(trip.id, pricing!.cotation_id ?? undefined)}
                />
                {/* Alternative option cards */}
                {alternativeOptions.map((option, idx) => (
                  <PricingOptionCard
                    key={idx}
                    option={option}
                    isPrimary={false}
                    continentTheme={continentTheme}
                    formatPrice={formatPrice}
                    paxLabel={option.args_json?.adult
                      ? `Base ${option.args_json.adult} voyageur${option.args_json.adult > 1 ? 's' : ''}`
                      : option.label || null}
                    isSelected={hasCotationSelection && option.cotation_id === selectedCotationId}
                    isNotRetained={hasCotationSelection && option.cotation_id !== selectedCotationId}
                    showChooseButton={!!canChooseOption && hasAnyCotationId && !hasCotationSelection}
                    onChoose={() => onChooseProposal?.(trip.id, option.cotation_id ?? undefined)}
                  />
                ))}
              </div>
            ) : (
              /* ─── Single option pricing ─── */
              <div className={`grid gap-3 ${hasOptions ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Main price card — uses PricingOptionCard for consistency */}
                <PricingOptionCard
                  option={pricing!}
                  isPrimary
                  continentTheme={continentTheme}
                  formatPrice={formatPrice}
                  paxLabel={paxLabel}
                  showChooseButton={!!canChooseOption && !isConfirmed}
                  onChoose={() => onChooseProposal?.(trip.id, pricing!.cotation_id ?? undefined)}
                  chooseLabel="Choisir cette proposition"
                />

                {/* Legacy options / supplements card */}
                {hasOptions && (
                  <div
                    className="rounded-2xl p-5 border"
                    style={{ borderColor: `${continentTheme.accent}40`, backgroundColor: `${continentTheme.accent}08` }}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-3">
                      <ListPlus size={14} weight="duotone" style={{ color: continentTheme.accent }} />
                      Options disponibles
                    </div>
                    <ul className="space-y-2.5">
                      {pricingOptions.map((option, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-3 text-sm"
                          style={{ borderBottom: idx < pricingOptions.length - 1 ? `1px solid ${continentTheme.accent}20` : 'none', paddingBottom: idx < pricingOptions.length - 1 ? '0.625rem' : '0' }}
                        >
                          <span className="text-gray-600">
                            {option.description || option.label}
                          </span>
                          <span className="font-semibold whitespace-nowrap" style={{ color: continentTheme.primary }}>
                            {option.option_type === 'supplement' && option.supplement_price != null
                              ? `+${formatPrice(option.supplement_price)}${option.supplement_per_person ? '/pers' : ''}`
                              : option.option_type === 'alternative' && (option.total_price ?? 0) > 0
                                ? formatPrice(option.total_price!)
                                : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Validity date */}
            {validUntilFormatted && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Timer size={13} weight="duotone" />
                Offre valable jusqu&apos;au {validUntilFormatted}
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 border-2 border-dashed flex items-center gap-3"
            style={{ borderColor: `${continentTheme.primary}40`, backgroundColor: `${continentTheme.primary}08` }}
          >
            <CurrencyEur size={20} weight="duotone" style={{ color: continentTheme.primary }} className="flex-shrink-0 opacity-60" />
            <p className="text-sm text-gray-500 leading-relaxed">
              {advisorFirstName
                ? `${advisorFirstName} ne vous a pas encore fait d\u2019offre tarifaire pour ce voyage`
                : 'Votre h\u00F4te ne vous a pas encore fait d\u2019offre tarifaire pour ce voyage'}
            </p>
          </div>
        )}

        {/* Highlights (points forts) */}
        {highlights.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2.5">
              <Sparkle size={16} weight="duotone" style={{ color: continentTheme.primary }} />
              Points forts
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {highlights.map((h, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-700"
                >
                  {h.icon ? <span className="text-sm">{h.icon}</span> : <span className="text-sm" style={{ color: continentTheme.primary }}>•</span>}
                  {h.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer ────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onToggleExpand ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: continentTheme.primary }}
            >
              <ClipboardText size={16} weight="duotone" />
              {isExpanded ? 'Masquer le détail' : 'Programme détaillé'}
              {isExpanded ? (
                <CaretUp size={14} weight="bold" />
              ) : (
                <CaretDown size={14} weight="bold" />
              )}
            </button>
          ) : dossierId ? (
            <Link
              href={`/client/voyages/${dossierId}?tab=proposals`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: continentTheme.primary }}
            >
              <ClipboardText size={16} weight="duotone" />
              Programme détaillé
            </Link>
          ) : null}
          {advisorFirstName && dossierId && (
            <Link
              href={`/client/voyages/${dossierId}?tab=messages`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors"
              style={{
                borderColor: continentTheme.primary,
                color: continentTheme.primary,
              }}
            >
              <ChatCircleDots size={16} weight="duotone" />
              Discuter avec {advisorFirstName}
            </Link>
          )}
        </div>

        {createdAtFormatted && (
          <span className="text-xs text-gray-400">
            Reçue le {createdAtFormatted}
          </span>
        )}
      </div>

      {/* Confirmed indicator */}
      {isConfirmed && (
        <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle size={18} weight="duotone" />
          Proposition sélectionnée
        </div>
      )}
    </article>
  )
}
