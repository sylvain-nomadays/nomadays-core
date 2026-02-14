'use client'

import { useState, useEffect } from 'react'
import { ChatCircleDots, CalendarDots, Clock, Phone } from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import { BookingModal } from './booking-modal'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SalonDeTheWrapperProps {
  advisorName: string
  children: React.ReactNode
  continentTheme: ContinentTheme
  countryCode: string | null
  advisorPhone?: string | null
  advisorId?: string
  dossierId?: string
  participantId?: string
  participantEmail?: string
  participantName?: string
}

// ─── UTC offsets (same data as local-info-bar.tsx) ───────────────────────────

const UTC_OFFSETS: Record<string, number> = {
  VN: 7, TH: 7, KH: 7, LA: 7, MM: 6.5, ID: 7, IN: 5.5, LK: 5.5,
  NP: 5.75, JP: 9, TZ: 3, KE: 3, ZA: 2, MA: 1, MG: 3, CR: -6,
  PE: -5, MX: -6, CO: -5, AR: -3, BR: -3, CL: -4, BO: -4, EC: -5,
}

// ─── SalonInfoBar — local time + call button ─────────────────────────────────

function SalonInfoBar({
  countryCode,
  advisorPhone,
  continentTheme,
  advisorId,
  advisorName,
  dossierId,
  participantId,
  participantEmail,
  participantName,
}: {
  countryCode: string | null
  advisorPhone?: string | null
  continentTheme: ContinentTheme
  advisorId?: string
  advisorName?: string
  dossierId?: string
  participantId?: string
  participantEmail?: string
  participantName?: string
}) {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [localTime, setLocalTime] = useState<string>('')
  const utcOffset = countryCode ? UTC_OFFSETS[countryCode.toUpperCase()] ?? null : null

  useEffect(() => {
    if (utcOffset === null) return

    const updateTime = () => {
      const now = new Date()
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
      const localMs = utcMs + utcOffset * 3600000
      const local = new Date(localMs)
      setLocalTime(
        local.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [utcOffset])

  const utcLabel = utcOffset !== null
    ? `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset % 1 === 0 ? utcOffset : utcOffset}`
    : null

  return (
    <div className="flex items-center justify-between px-6 lg:px-10 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      {/* Left: local time */}
      <div className="flex items-center gap-4">
        {localTime && utcLabel && (
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} weight="duotone" style={{ color: continentTheme.primary }} />
            <span className="font-semibold text-gray-800">{localTime}</span>
            <span className="text-gray-400 text-xs">({utcLabel})</span>
          </div>
        )}
      </div>

      {/* Right: call + booking buttons */}
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-90 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: continentTheme.primary }}
          onClick={() => {
            if (advisorPhone) {
              window.open(`tel:${advisorPhone}`, '_self')
            }
          }}
          disabled={!advisorPhone}
          title={advisorPhone ? `Appeler ${advisorPhone}` : 'Appel bientôt disponible'}
        >
          <Phone size={16} weight="duotone" />
          <span>Appeler</span>
        </button>

        {advisorId && dossierId && participantId && (
          <>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-90 border"
              style={{
                borderColor: continentTheme.primary,
                color: continentTheme.primary,
                backgroundColor: `${continentTheme.primary}10`,
              }}
              onClick={() => setBookingOpen(true)}
            >
              <CalendarDots size={16} weight="duotone" />
              <span>Prendre RDV</span>
            </button>

            <BookingModal
              open={bookingOpen}
              onOpenChange={setBookingOpen}
              advisorId={advisorId}
              advisorName={advisorName || 'Votre conseiller'}
              dossierId={dossierId}
              participantId={participantId}
              participantEmail={participantEmail || ''}
              participantName={participantName || ''}
              continentTheme={continentTheme}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Layout styles injected when Salon de Thé tab is active ─────────────────
//
// Strategy:
//   1. Hide tab bar (navigation via site header instead).
//   2. Convert voyageur-main-layout from 2-col grid → single column.
//   3. Remove destination-layout max-width (was capping at 1400px).
//   4. Hide voyage hero, info bar, left sidebar, right sidebar.
//   5. Proposals are rendered inline below messages (no sidebar needed).

const SALON_DE_THE_STYLES = `
  /* Hide tab bar — navigation via site header (Salon de Thé link) */
  [data-slot="tabs-list"] { display: none !important; }

  /* Hide voyage-specific elements */
  .voyage-hero-section,
  .voyage-info-bar { display: none !important; }

  /* Collapse left sidebar + remove max-width constraint */
  .destination-layout {
    grid-template-columns: 1fr !important;
    max-width: none !important;
  }
  .destination-layout > aside:first-child { display: none !important; }

  /* Remove padding on inner content area (aquarelle handles its own) */
  .destination-layout > div:last-child {
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-top: 0 !important;
  }

  /* Convert the 2-col grid (1fr + 340px) → single column */
  .voyageur-main-layout {
    grid-template-columns: 1fr !important;
  }

  /* Hide the right sidebar entirely */
  .voyageur-main-layout > aside {
    display: none !important;
  }

  .voyageur-main-layout > main {
    min-height: auto !important;
  }
`

// ─── Banner responsive styles ───────────────────────────────────────────────

const BANNER_STYLES = `
  .salon-banner {
    position: relative;
    overflow: hidden;
    width: 100vw;
    aspect-ratio: 16 / 9;
  }

  .salon-banner-img {
    display: block;
    width: 100%;
    height: auto;
  }

  @media (max-width: 768px) {
    .salon-banner {
      aspect-ratio: 4 / 5;
    }
    .salon-banner-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 40%;
    }
  }
`

// ─── Component ───────────────────────────────────────────────────────────────

export function SalonDeTheWrapper({
  advisorName,
  children,
  continentTheme,
  countryCode,
  advisorPhone,
  advisorId,
  dossierId,
  participantId,
  participantEmail,
  participantName,
}: SalonDeTheWrapperProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SALON_DE_THE_STYLES }} />
      <style dangerouslySetInnerHTML={{ __html: BANNER_STYLES }} />

      <div className="flex flex-col">
        {/* ── Full-bleed Aquarelle Banner ── */}
        <div className="salon-banner relative w-full bg-[#f5f0e8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/salon-de-the-hero.png"
            alt="Deux voyageurs échangent autour d'un thé sous une terrasse tropicale avec vue sur des temples au coucher du soleil"
            className="salon-banner-img"
            width={1456}
            height={816}
            fetchPriority="high"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end px-6 lg:px-10 pb-6 lg:pb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ChatCircleDots size={22} weight="duotone" className="text-white" />
              </div>
              <h1
                className="text-3xl lg:text-4xl text-white drop-shadow-md"
                style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600 }}
              >
                Salon de Thé
              </h1>
            </div>
            <p
              className="text-white/85 text-sm ml-[52px] drop-shadow-sm"
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 300 }}
            >
              Prenons le temps d&apos;un thé pour imaginer votre voyage.
            </p>
          </div>
        </div>

        {/* ── Info bar: local time + call button ── */}
        <SalonInfoBar
          countryCode={countryCode}
          advisorPhone={advisorPhone}
          continentTheme={continentTheme}
          advisorId={advisorId}
          advisorName={advisorName}
          dossierId={dossierId}
          participantId={participantId}
          participantEmail={participantEmail}
          participantName={participantName}
        />

        {/* ── Messaging content + proposals ── */}
        <div className="px-6 lg:px-10 pt-6">
          {children}
        </div>
      </div>
    </>
  )
}
