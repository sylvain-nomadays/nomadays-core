'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { House } from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'

// ─── CMS text overrides ─────────────────────────────────────────────────────

export interface WelcomeTexts {
  title_template: string  // e.g. "Bienvenue chez vous, {firstName} 🏠"
  subtitle: string
  proverb: string
}

const DEFAULT_TEXTS: WelcomeTexts = {
  title_template: 'Bienvenue chez vous, {firstName} \u{1F3E0}',
  subtitle: 'Votre espace voyageur Nomadays',
  proverb: 'Ici, nos h\u00f4tes locaux vous accueillent comme en famille',
}

// ─── Component ──────────────────────────────────────────────────────────────

interface WelcomeBannerProps {
  firstName: string
  upcomingTrip: {
    destination: string
    departureDate: string
    dossierId: string
    countryFlag?: string
  } | null
  continentTheme: ContinentTheme
  texts?: WelcomeTexts
}

function computeCountdown(targetDate: string) {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes }
}

export function WelcomeBanner({ firstName, upcomingTrip, continentTheme, texts }: WelcomeBannerProps) {
  const t = texts || DEFAULT_TEXTS

  const [countdown, setCountdown] = useState(() =>
    upcomingTrip ? computeCountdown(upcomingTrip.departureDate) : null
  )

  useEffect(() => {
    if (!upcomingTrip) return
    const interval = setInterval(() => {
      setCountdown(computeCountdown(upcomingTrip.departureDate))
    }, 60_000)
    return () => clearInterval(interval)
  }, [upcomingTrip])

  // Resolve the title template with the first name, strip emoji placeholders
  const titleRaw = t.title_template.replace('{firstName}', firstName)
  // Remove trailing emoji (🏠 or similar) — we render a Phosphor icon instead
  const title = titleRaw.replace(/\s*[\u{1F3E0}\u{1F30D}\u{2728}]\s*$/u, '')

  return (
    <section
      className="text-white px-8 lg:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0FB6BC 0%, #0a9a9f 100%)' }}
    >
      {/* Decorative circle */}
      <div
        className="absolute -top-20 right-24 w-[200px] h-[200px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />

      {/* Text */}
      <div className="relative z-10">
        <h1 className="font-display font-bold text-2xl lg:text-[26px] flex items-center gap-2">
          {title}
          <House size={26} weight="duotone" className="opacity-80" />
        </h1>
        <p className="text-[15px] opacity-90 mt-1">
          {t.subtitle}
        </p>
        <p className="text-sm italic mt-1.5" style={{ color: '#D4A847' }}>
          &laquo; {t.proverb} &raquo;
        </p>
      </div>

      {/* Countdown */}
      {upcomingTrip && countdown && countdown.days > 0 && (
        <Link href={`/client/voyages/${upcomingTrip.dossierId}`} className="relative z-10">
          <div className="bg-white/15 backdrop-blur-[10px] rounded-2xl px-7 py-5 text-center">
            <div className="text-xs opacity-80 mb-2">Prochain d&eacute;part</div>
            <div className="font-bold text-[15px] mb-3 flex items-center justify-center gap-1.5">
              {upcomingTrip.countryFlag && <span>{upcomingTrip.countryFlag}</span>}
              {upcomingTrip.destination}
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 rounded-[10px] py-2.5 px-3.5 min-w-[55px]">
                <div className="font-display text-2xl font-extrabold">{countdown.days}</div>
                <div className="text-[10px] uppercase opacity-80">Jours</div>
              </div>
              <div className="bg-white/20 rounded-[10px] py-2.5 px-3.5 min-w-[55px]">
                <div className="font-display text-2xl font-extrabold">{countdown.hours}</div>
                <div className="text-[10px] uppercase opacity-80">Heures</div>
              </div>
              <div className="bg-white/20 rounded-[10px] py-2.5 px-3.5 min-w-[55px]">
                <div className="font-display text-2xl font-extrabold">{String(countdown.minutes).padStart(2, '0')}</div>
                <div className="text-[10px] uppercase opacity-80">Min</div>
              </div>
            </div>
          </div>
        </Link>
      )}
    </section>
  )
}
