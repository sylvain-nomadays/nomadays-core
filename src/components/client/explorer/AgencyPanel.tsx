'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  GlobeHemisphereWest,
  MapPin,
  Star,
  Calendar,
  Translate,
  Airplane,
  ChatCircleDots,
  Heart,
  Clock,
  Tag,
} from '@phosphor-icons/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DestinationAgency } from '@/lib/types/explorer'
import { EXPLORER_MARKER_COLORS } from '@/lib/types/explorer'
import { CONTINENT_THEMES } from '@/components/client/continent-theme'
import type { Continent } from '@/components/client/continent-theme'
import { contactAgencyHost } from '@/lib/actions/explorer'

interface AgencyPanelProps {
  agency: DestinationAgency | null
  participantId: string
  isWished: boolean
}

// Country code → flag emoji
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

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <GlobeHemisphereWest size={64} weight="duotone" className="text-gray-200 mb-4" />
      <h3 className="font-display font-bold text-lg text-gray-700 mb-2">
        Explorez nos destinations
      </h3>
      <p className="text-sm text-gray-400 max-w-[260px]">
        Cliquez sur un marqueur de la carte pour decouvrir l&apos;agence locale et ses circuits.
      </p>
    </div>
  )
}

// ─── Star rating ────────────────────────────────────────────────────────────

function StarRating({ score, color }: { score: number; color: string }) {
  const full = Math.floor(score)
  const hasHalf = score - full >= 0.3
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < full || (i === full && hasHalf)
        return (
          <Star
            key={i}
            size={14}
            weight={i < full ? 'fill' : i === full && hasHalf ? 'duotone' : 'regular'}
            style={filled ? { color } : undefined}
            className={filled ? '' : 'text-gray-300'}
          />
        )
      })}
    </div>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export function AgencyPanel({ agency, participantId, isWished }: AgencyPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [contacted, setContacted] = useState(isWished)

  if (!agency) return <EmptyState />

  const color = EXPLORER_MARKER_COLORS[agency.continent] || '#636E72'
  const theme = CONTINENT_THEMES[agency.continent as Continent] || CONTINENT_THEMES.default
  const accent = theme.accent
  const light = theme.light

  const handleContact = () => {
    startTransition(async () => {
      const result = await contactAgencyHost(participantId, agency.country_code, agency.name)
      if (result.dossierId) {
        setContacted(true)
        router.push(`/client/voyages/${result.dossierId}`)
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="pb-24">
          {/* Hero image */}
          <div className="relative h-[200px] bg-gray-100">
            {agency.cover_image_url ? (
              <Image
                src={agency.cover_image_url}
                alt={agency.name}
                fill
                className="object-cover"
                sizes="420px"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${color}40, ${color}80)` }}
              />
            )}

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Logo overlay */}
            {agency.logo_url && (
              <div className="absolute bottom-3 left-4 w-12 h-12 rounded-lg bg-white shadow-md overflow-hidden flex items-center justify-center">
                <Image
                  src={agency.logo_url}
                  alt={`Logo ${agency.name}`}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
            )}

            {/* Wished indicator */}
            {(contacted || isWished) && (
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-semibold text-[#DD9371]">
                <Heart size={12} weight="fill" className="text-[#DD9371]" />
                Deja dans vos envies
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 space-y-5">
            {/* Name + country */}
            <div>
              <h2 className="font-display font-bold text-xl text-gray-800">
                {agency.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                <MapPin size={14} weight="duotone" style={{ color }} />
                {countryFlag(agency.country_code)} {agency.country_name}
                {agency.location && ` — ${agency.location}`}
              </div>
            </div>

            {/* Tagline */}
            {agency.tagline && (
              <p className="text-sm text-gray-600 italic leading-relaxed">
                &ldquo;{agency.tagline}&rdquo;
              </p>
            )}

            {/* Description */}
            {agency.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {agency.description}
              </p>
            )}

            {/* Stats grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Airplane size={18} weight="duotone" style={{ color }} />}
                value={`${agency.trips_count}`}
                label="circuits"
              />
              <StatCard
                icon={<ChatCircleDots size={18} weight="duotone" style={{ color: accent }} />}
                value={`${agency.reviews_count}`}
                label="avis"
              />
              {agency.year_founded && (
                <StatCard
                  icon={<Calendar size={18} weight="duotone" style={{ color }} />}
                  value={`${agency.year_founded}`}
                  label="depuis"
                />
              )}
              {agency.languages.length > 0 && (
                <StatCard
                  icon={<Translate size={18} weight="duotone" style={{ color: accent }} />}
                  value={agency.languages.join(', ')}
                  label="langues"
                />
              )}
            </div>

            {/* Reviews score */}
            {agency.reviews_count > 0 && (
              <div className="flex items-center gap-2">
                <StarRating score={agency.reviews_score} color={color} />
                <span className="text-sm font-semibold text-gray-700">
                  {agency.reviews_score.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({agency.reviews_count} avis)
                </span>
              </div>
            )}

            {/* Host section */}
            {agency.host_name && (
              <div className="rounded-xl p-4" style={{ backgroundColor: light }}>
                <div className="flex items-center gap-3">
                  {agency.host_avatar_url ? (
                    <Image
                      src={agency.host_avatar_url}
                      alt={agency.host_name}
                      width={44}
                      height={44}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: color }}
                    >
                      {agency.host_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm text-gray-800">
                      {agency.host_name}
                    </div>
                    {agency.host_role && (
                      <div className="text-xs text-gray-500">{agency.host_role}</div>
                    )}
                    {agency.host_experience_years && (
                      <div className="text-xs text-gray-400">
                        {agency.host_experience_years} ans d&apos;experience
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Popular trips */}
            {agency.popular_trips.length > 0 && (
              <div>
                <h4 className="font-display font-bold text-sm text-gray-700 mb-3">
                  Circuits populaires
                </h4>
                <div className="space-y-2.5">
                  {agency.popular_trips.map((trip, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      {trip.image_url ? (
                        <Image
                          src={trip.image_url}
                          alt={trip.name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover w-12 h-12 flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Airplane size={20} weight="duotone" style={{ color }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-700 truncate">
                          {trip.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-0.5">
                            <Clock size={11} /> {trip.duration_days}j
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Tag size={11} /> {trip.theme}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-700">
                          {trip.price_from.toLocaleString('fr-FR')}{trip.currency === 'EUR' ? '\u00A0\u20AC' : ` ${trip.currency}`}
                        </div>
                        <div className="text-[10px] text-gray-400">a partir de</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sticky CTA */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={handleContact}
          disabled={isPending || contacted}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
            contacted
              ? 'bg-gray-100 text-gray-400 cursor-default'
              : 'text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
          }`}
          style={
            !contacted
              ? { background: `linear-gradient(to right, ${color}, ${accent})` }
              : undefined
          }
        >
          {isPending
            ? 'Connexion en cours...'
            : contacted
              ? 'Conversation deja initiee ✓'
              : `Debuter une conversation avec ${agency.host_name || 'votre hote'}`}
        </button>
      </div>
    </div>
  )
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
      {icon}
      <div>
        <div className="text-sm font-bold text-gray-700">{value}</div>
        <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  )
}
