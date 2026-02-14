import Link from 'next/link'
import Image from 'next/image'
import { GlobeSimple } from '@phosphor-icons/react/dist/ssr'
import { getContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DestinationCardProps {
  dossierId: string
  title: string
  destination?: string | null
  travelDateStart?: string | null
  travelDateEnd?: string | null
  status: string
  heroPhotoUrl?: string | null
  tenantName?: string | null
  totalTravelers?: number
  destinationCountryCode?: string | null
  hostName?: string | null
}

// ─── Status badge config ─────────────────────────────────────────────────────

function getStatusBadge(status: string, travelDateStart?: string | null): { label: string; bg: string } {
  // If upcoming, show "Dans X jours"
  if (travelDateStart) {
    const now = new Date()
    const start = new Date(travelDateStart)
    const diffDays = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 0 && diffDays <= 90) {
      return { label: `Dans ${diffDays} jours`, bg: '#D4A847' }
    }
  }

  switch (status) {
    case 'won':
    case 'confirmed':
      return { label: 'Confirme', bg: '#8BA080' }
    case 'proposal_sent':
    case 'negotiation':
      return { label: 'Proposition', bg: '#0FB6BC' }
    case 'lead':
    case 'qualified':
      return { label: 'En cours', bg: '#0FB6BC' }
    default:
      return { label: status, bg: '#636E72' }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DestinationCard({
  dossierId,
  title,
  destination,
  travelDateStart,
  status,
  heroPhotoUrl,
  destinationCountryCode,
  hostName,
}: DestinationCardProps) {
  const theme = getContinentTheme(destinationCountryCode)
  const badge = getStatusBadge(status, travelDateStart)

  return (
    <Link href={`/client/voyages/${dossierId}`} className="block group">
      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.15)]">
        {/* Background */}
        {heroPhotoUrl ? (
          <Image
            src={heroPhotoUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
        )}

        {/* Dark gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Status badge */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white"
          style={{ backgroundColor: badge.bg }}
        >
          {badge.label}
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
          {/* Country uppercase */}
          {destination && (
            <span className="text-[11px] uppercase tracking-[1.5px] opacity-80 mb-1">
              {destination}
            </span>
          )}

          {/* Title */}
          <span className="font-display font-bold text-lg leading-tight">
            {title}
          </span>

          {/* Host name */}
          {hostName && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs opacity-90">
              <div
                className="w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: theme.primary }}
              >
                {hostName[0]?.toUpperCase()}
              </div>
              Votre hote : {hostName}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Bannière Explorer (CTA pleine largeur) ─────────────────────────────────

export function ExplorerBanner() {
  return (
    <Link href="/client/explorer" className="block group col-span-full">
      <div
        className="relative overflow-hidden rounded-2xl py-8 px-8 flex items-center justify-center gap-4 text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(15,182,188,0.25)]"
        style={{ background: 'linear-gradient(135deg, #0FB6BC 0%, #0C9296 50%, #096D71 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />

        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
          <GlobeSimple size={28} weight="duotone" className="text-white" />
        </div>
        <div className="relative text-center sm:text-left">
          <span className="font-display font-bold text-base sm:text-lg block">
            En manque d&apos;inspiration ?
          </span>
          <span className="text-sm text-white/80 mt-0.5 block">
            Decouvrez vos hotes a travers le monde
          </span>
        </div>
      </div>
    </Link>
  )
}
