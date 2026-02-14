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
  draft: { label: 'Brouillon', icon: FileText, className: 'bg-gray-100/80 text-gray-600' },
  sent: { label: 'Proposition envoyee', icon: Clock, className: 'bg-amber-50/80 text-amber-700' },
  quoted: { label: 'Devis', icon: Clock, className: 'bg-amber-50/80 text-amber-700' },
  confirmed: { label: 'Confirme', icon: CheckCircle, className: 'bg-emerald-50/80 text-emerald-700' },
  operating: { label: 'En cours', icon: CheckCircle, className: 'bg-blue-50/80 text-blue-700' },
  completed: { label: 'Termine', icon: CheckCircle, className: 'bg-gray-100/80 text-gray-600' },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripHighlight {
  title: string
  icon?: string
}

interface TripPricing {
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
  onSelect?: () => void
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
  onSelect,
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

  // Validity date
  const validUntilFormatted = pricing?.valid_until
    ? new Date(pricing.valid_until).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  // Format start date for display
  const startDateFormatted = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
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
            {startDateFormatted && (
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={15} weight="duotone" />
                {startDateFormatted}
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
            {/* Pricing grid: main price + options side by side on desktop */}
            <div className={`grid gap-3 ${hasOptions ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Main price card */}
              <div
                className="rounded-2xl p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${continentTheme.primary} 0%, ${continentTheme.accent} 100%)` }}
              >
                <div className="flex items-center gap-2 text-xs opacity-80 mb-1.5">
                  <CurrencyEur size={14} weight="duotone" />
                  Prix total du voyage
                </div>
                <div className="font-display font-extrabold text-3xl mb-1">
                  {formatPrice(pricing!.total_price!)}
                </div>
                {(pricing!.price_per_person ?? 0) > 0 && (
                  <div className="text-sm opacity-85">
                    soit {formatPrice(pricing!.price_per_person!)} / personne
                  </div>
                )}
                {paxLabel && (
                  <div className="text-xs opacity-70 mt-2">
                    {paxLabel}
                  </div>
                )}
                {pricing!.description && (
                  <div className="text-xs opacity-70 mt-1">
                    {pricing!.description}
                  </div>
                )}
              </div>

              {/* Options / supplements card */}
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
          {dossierId && (
            <Link
              href={`/client/voyages/${dossierId}?tab=program`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: continentTheme.primary }}
            >
              <ClipboardText size={16} weight="duotone" />
              Programme detaille
            </Link>
          )}
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
          Circuit selectionne
        </div>
      )}
    </article>
  )
}
