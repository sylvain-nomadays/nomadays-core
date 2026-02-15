'use client'

import { useState, useEffect } from 'react'
import { ChatCircleDots, CalendarDots, Clock, Phone, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind } from '@phosphor-icons/react'
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
  officeCity?: string | null
  officeLat?: number | null
  officeLng?: number | null
  aquarelleUrl?: string | null
}

// ─── Country info: UTC offset + capital coords (lat, lon) for weather ────────

interface CountryInfo {
  utcOffset: number
  capital: [number, number] // [latitude, longitude] for weather API fallback
}

const COUNTRY_INFO: Record<string, CountryInfo> = {
  VN: { utcOffset: 7, capital: [21.03, 105.85] },      // Hanoi
  TH: { utcOffset: 7, capital: [13.75, 100.52] },      // Bangkok
  KH: { utcOffset: 7, capital: [11.56, 104.92] },      // Phnom Penh
  LA: { utcOffset: 7, capital: [17.97, 102.63] },      // Vientiane
  MM: { utcOffset: 6.5, capital: [16.87, 96.20] },     // Yangon
  ID: { utcOffset: 7, capital: [-6.21, 106.85] },      // Jakarta
  IN: { utcOffset: 5.5, capital: [28.61, 77.21] },     // New Delhi
  LK: { utcOffset: 5.5, capital: [6.93, 79.85] },      // Colombo
  NP: { utcOffset: 5.75, capital: [27.72, 85.32] },    // Katmandou
  JP: { utcOffset: 9, capital: [35.68, 139.69] },      // Tokyo
  TZ: { utcOffset: 3, capital: [-6.79, 39.28] },       // Dar es Salaam
  KE: { utcOffset: 3, capital: [-1.29, 36.82] },       // Nairobi
  ZA: { utcOffset: 2, capital: [-33.93, 18.42] },      // Le Cap
  MA: { utcOffset: 1, capital: [33.97, -6.85] },       // Rabat
  MG: { utcOffset: 3, capital: [-18.88, 47.51] },      // Antananarivo
  CR: { utcOffset: -6, capital: [9.93, -84.08] },      // San José
  PE: { utcOffset: -5, capital: [-12.05, -77.04] },    // Lima
  MX: { utcOffset: -6, capital: [19.43, -99.13] },     // Mexico City
  CO: { utcOffset: -5, capital: [4.71, -74.07] },      // Bogota
  AR: { utcOffset: -3, capital: [-34.60, -58.38] },    // Buenos Aires
  BR: { utcOffset: -3, capital: [-15.78, -47.93] },    // Brasilia
  CL: { utcOffset: -4, capital: [-33.45, -70.67] },    // Santiago
  BO: { utcOffset: -4, capital: [-16.50, -68.15] },    // La Paz
  EC: { utcOffset: -5, capital: [-0.18, -78.47] },     // Quito
}

// ─── Weather icon mapping (WMO weather codes → Phosphor icons) ──────────────

function WeatherIcon({ code, size = 16, className }: { code: number; size?: number; className?: string }) {
  // WMO Weather interpretation codes
  // 0: Clear sky, 1-3: Partly cloudy, 45-48: Fog, 51-57: Drizzle,
  // 61-67: Rain, 71-77: Snow, 80-82: Rain showers, 85-86: Snow showers, 95-99: Thunderstorm
  if (code === 0 || code === 1) return <Sun size={size} weight="duotone" className={className} />
  if (code <= 3) return <Cloud size={size} weight="duotone" className={className} />
  if (code <= 48) return <Wind size={size} weight="duotone" className={className} />
  if (code <= 67) return <CloudRain size={size} weight="duotone" className={className} />
  if (code <= 77) return <CloudSnow size={size} weight="duotone" className={className} />
  if (code <= 86) return <CloudRain size={size} weight="duotone" className={className} />
  if (code <= 99) return <CloudLightning size={size} weight="duotone" className={className} />
  return <Sun size={size} weight="duotone" className={className} />
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
  officeCity,
  officeLat,
  officeLng,
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
  officeCity?: string | null
  officeLat?: number | null
  officeLng?: number | null
}) {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [localTime, setLocalTime] = useState<string>('')
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)
  const countryInfo = countryCode ? COUNTRY_INFO[countryCode.toUpperCase()] ?? null : null
  const utcOffset = countryInfo?.utcOffset ?? null

  // Local time
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

  // Weather — Open-Meteo (free, no API key)
  // Priority: tenant office coords > country capital fallback
  useEffect(() => {
    let lat: number | undefined
    let lon: number | undefined

    if (officeLat != null && officeLng != null) {
      // Tenant office location (e.g. Chiang Mai for Thailand DMC)
      lat = officeLat
      lon = officeLng
    } else if (countryInfo) {
      // Fallback to country capital
      ;[lat, lon] = countryInfo.capital
    }

    if (lat == null || lon == null) return

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data?.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
          })
        }
      })
      .catch(() => {
        // Silent — weather is decorative, don't break UX
      })
  }, [countryInfo, officeLat, officeLng])

  const utcLabel = utcOffset !== null
    ? `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset % 1 === 0 ? utcOffset : utcOffset}`
    : null

  return (
    <div className="flex items-center justify-between px-6 lg:px-10 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      {/* Left: local time + weather */}
      <div className="flex items-center gap-4 flex-wrap">
        {localTime && utcLabel && (
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} weight="duotone" style={{ color: continentTheme.primary }} />
            <span className="font-semibold text-gray-800">{localTime}</span>
            <span className="text-gray-400 text-xs">({utcLabel})</span>
          </div>
        )}

        {/* Separator */}
        {localTime && weather && (
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
        )}

        {/* Weather */}
        {weather && (
          <div className="flex items-center gap-1.5 text-sm">
            <WeatherIcon code={weather.code} size={16} className="text-gray-500" />
            <span className="font-semibold text-gray-800">{weather.temp}°C</span>
            {officeCity && (
              <span className="text-gray-400 text-xs">({officeCity})</span>
            )}
          </div>
        )}
      </div>

      {/* Right: call + booking buttons — editorial hierarchy */}
      <div className="flex items-center gap-2.5">
        {/* Secondary: Appeler — ghost/outline, subtle */}
        <button
          className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-35 disabled:cursor-not-allowed"
          style={{
            border: `1.5px solid ${continentTheme.primary}40`,
            color: continentTheme.primary,
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${continentTheme.primary}08`
            e.currentTarget.style.borderColor = `${continentTheme.primary}70`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.borderColor = `${continentTheme.primary}40`
          }}
          onClick={() => {
            if (advisorPhone) {
              window.open(`tel:${advisorPhone}`, '_self')
            }
          }}
          disabled={!advisorPhone}
          title={advisorPhone ? `Appeler ${advisorPhone}` : 'Appel bientôt disponible'}
        >
          <Phone size={15} weight="duotone" />
          <span>Appeler</span>
        </button>

        {/* Primary: Prendre RDV — warm filled, soft shadow */}
        {advisorId && dossierId && participantId && (
          <>
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: continentTheme.primary,
                boxShadow: `0 2px 8px ${continentTheme.primary}30`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 3px 12px ${continentTheme.primary}45`
                e.currentTarget.style.transform = 'translateY(-0.5px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 2px 8px ${continentTheme.primary}30`
                e.currentTarget.style.transform = 'translateY(0)'
              }}
              onClick={() => setBookingOpen(true)}
            >
              <CalendarDots size={15} weight="duotone" />
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

  /* Subtle editorial gradient — soft vignette on bottom-left only */
  .salon-banner-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        to top,
        rgba(30, 25, 20, 0.52) 0%,
        rgba(30, 25, 20, 0.30) 18%,
        rgba(30, 25, 20, 0.08) 40%,
        transparent 60%
      ),
      linear-gradient(
        to right,
        rgba(30, 25, 20, 0.15) 0%,
        transparent 50%
      );
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
    .salon-banner-overlay {
      background:
        linear-gradient(
          to top,
          rgba(30, 25, 20, 0.58) 0%,
          rgba(30, 25, 20, 0.32) 25%,
          rgba(30, 25, 20, 0.06) 50%,
          transparent 65%
        );
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
  officeCity,
  officeLat,
  officeLng,
  aquarelleUrl,
}: SalonDeTheWrapperProps) {
  const bannerSrc = aquarelleUrl || '/images/salon-de-the-hero.png'
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SALON_DE_THE_STYLES }} />
      <style dangerouslySetInnerHTML={{ __html: BANNER_STYLES }} />

      <div className="flex flex-col">
        {/* ── Full-bleed Aquarelle Banner ── */}
        <div className="salon-banner relative w-full bg-[#f5f0e8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerSrc}
            alt="Deux voyageurs échangent autour d'un thé sous une terrasse tropicale avec vue sur des temples au coucher du soleil"
            className="salon-banner-img"
            width={1456}
            height={816}
            fetchPriority="high"
          />

          {/* Subtle editorial overlay — warm vignette, not a dark band */}
          <div className="salon-banner-overlay" />

          {/* Text block — lifted from bottom edge with generous spacing */}
          <div className="absolute inset-0 flex flex-col justify-end px-8 lg:px-14 pb-10 lg:pb-14">
            <div className="flex items-center gap-3.5 mb-2.5">
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                <ChatCircleDots size={22} weight="duotone" className="text-white/90" />
              </div>
              <h1
                className="text-[2rem] lg:text-[2.75rem] text-white"
                style={{
                  fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  lineHeight: 1.1,
                  textShadow: '0 1px 8px rgba(0,0,0,0.18)',
                }}
              >
                Salon de Thé
              </h1>
            </div>
            <p
              className="text-white/80 text-[0.9rem] lg:text-[0.95rem] ml-[58px]"
              style={{
                fontFamily: 'var(--font-inter), "Inter", system-ui, sans-serif',
                fontWeight: 300,
                lineHeight: 1.5,
                letterSpacing: '0.2px',
                textShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}
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
          officeCity={officeCity}
          officeLat={officeLat}
          officeLng={officeLng}
        />

        {/* ── Messaging content + proposals ── */}
        <div className="px-6 lg:px-10 pt-6">
          {children}
        </div>
      </div>
    </>
  )
}
