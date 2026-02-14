import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import type { ContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeroDestinationProps {
  countryCode: string | null
  countryName: string
  countryFlag: string
  heroPhotoUrl: string | null
  subtitle: string
  hostName: string | null
  hostTitle: string
  continentTheme: ContinentTheme
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeroDestination({
  countryName,
  countryFlag,
  heroPhotoUrl,
  subtitle,
  hostName,
  hostTitle,
  continentTheme,
}: HeroDestinationProps) {
  return (
    <div className="relative h-[300px] overflow-hidden">
      {/* Background */}
      {heroPhotoUrl ? (
        <Image
          src={heroPhotoUrl}
          alt={countryName}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${continentTheme.gradient}`} />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/60" />

      {/* Content */}
      <div className="relative h-full flex justify-between items-end p-8 lg:p-10 max-w-[1400px] mx-auto">
        {/* Left — Country info */}
        <div className="text-white">
          {/* Back link */}
          <Link
            href="/client"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={16} weight="bold" />
            Mon espace
          </Link>

          {/* Country heading */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{countryFlag}</span>
            <h1 className="font-display font-extrabold text-4xl lg:text-[38px]">{countryName}</h1>
          </div>

          {/* Subtitle */}
          <p className="text-base text-white/90">{subtitle}</p>
        </div>

        {/* Right — Host mini card (glassmorphism) */}
        {hostName && (
          <div className="hidden sm:flex items-center gap-3.5 bg-white/15 backdrop-blur-[15px] rounded-2xl px-5 py-4 border border-white/20">
            <div
              className="w-[50px] h-[50px] rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: continentTheme.primary }}
            >
              {hostName[0]?.toUpperCase()}
            </div>
            <div className="text-white">
              <h4 className="font-display font-bold text-[15px]">{hostName}</h4>
              <span className="text-xs opacity-85">{hostTitle}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
