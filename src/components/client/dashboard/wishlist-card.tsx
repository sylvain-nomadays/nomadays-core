import Link from 'next/link'
import Image from 'next/image'
import { HeartStraight, ChatCircle, RocketLaunch, CalendarDots, CalendarPlus, Question } from '@phosphor-icons/react/dist/ssr'
import { getContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WishlistCardProps {
  wishId: string
  countryCode: string
  countryName: string
  note?: string | null
  desiredPeriod?: string | null
  countryFlag?: string
  heroPhotoUrl?: string | null
}

// ─── Period config ──────────────────────────────────────────────────────────

function getPeriodInfo(period?: string | null): { label: string; icon: typeof RocketLaunch; color: string } {
  switch (period) {
    case 'imminent':
      return { label: 'Projet imminent', icon: RocketLaunch, color: '#DD9371' }
    case 'next_year':
      return { label: "L'année prochaine", icon: CalendarDots, color: '#0FB6BC' }
    case 'in_2_years':
      return { label: 'Dans 2 ans', icon: CalendarPlus, color: '#8BA080' }
    default:
      return { label: 'Je ne sais pas', icon: Question, color: '#A3A3A3' }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WishlistCard({
  countryCode,
  countryName: country,
  note,
  desiredPeriod,
  countryFlag,
  heroPhotoUrl,
}: WishlistCardProps) {
  const theme = getContinentTheme(countryCode)
  const period = getPeriodInfo(desiredPeriod)
  const PeriodIcon = period.icon

  return (
    <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
      {/* Background — photo or gradient fallback */}
      {heroPhotoUrl ? (
        <>
          <Image
            src={heroPhotoUrl}
            alt={country}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Dark gradient overlay from bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </>
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.4) 0%, transparent 60%)',
            }}
          />
        </>
      )}

      {/* Dashed border overlay (terracotta wishlist style) */}
      <div className="absolute inset-[6px] rounded-xl border-2 border-dashed border-white/30" />

      {/* Period badge — top right */}
      <div
        className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white"
        style={{ backgroundColor: period.color }}
      >
        <PeriodIcon size={12} weight="bold" />
        {period.label}
      </div>

      {/* Heart icon — top left */}
      <div className="absolute top-3 left-3">
        <HeartStraight size={22} weight="duotone" className="text-white/70" />
      </div>

      {/* Content — bottom */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
        {/* Flag + Country */}
        <div className="flex items-center gap-2 mb-1">
          {countryFlag && <span className="text-lg">{countryFlag}</span>}
          <span className="text-[11px] uppercase tracking-[1.5px] opacity-80">
            {country}
          </span>
        </div>

        {/* Note or default text */}
        <p className="font-display font-bold text-base leading-tight line-clamp-2">
          {note || `Je rêve de découvrir ${country}`}
        </p>

        {/* CTA: Discuter avec un hôte */}
        <Link
          href="/client/messages"
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold text-white hover:bg-white/30 transition-colors w-fit group-hover:bg-white/30"
        >
          <ChatCircle size={16} weight="duotone" />
          Discuter avec un hôte
        </Link>
      </div>
    </div>
  )
}
