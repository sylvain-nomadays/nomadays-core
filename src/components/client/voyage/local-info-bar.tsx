'use client'

import { useState, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalInfoBarProps {
  countryCode: string | null
}

// ─── Country data (static V1) ────────────────────────────────────────────────

interface CountryLocalData {
  utcOffset: number
  currency: { symbol: string; rate: string }
  proverbs: string[]
  proverbLabel: string
}

const COUNTRY_DATA: Record<string, CountryLocalData> = {
  VN: {
    utcOffset: 7,
    currency: { symbol: 'VND', rate: '1\u20AC = 26 500 VND' },
    proverbs: [
      '\u00AB H\u1ECDc \u0103n, h\u1ECDc n\u00F3i, h\u1ECDc g\u00F3i, h\u1ECDc m\u1EDF \u00BB',
      '\u00AB C\u00F3 c\u00F4ng m\u00E0i s\u1EAFt, c\u00F3 ng\u00E0y n\u00EAn kim \u00BB',
      '\u00AB \u0110i m\u1ED9t ng\u00E0y \u0111\u00E0ng, h\u1ECDc m\u1ED9t s\u00E0ng kh\u00F4n \u00BB',
    ],
    proverbLabel: 'Proverbe vietnamien',
  },
  TH: {
    utcOffset: 7,
    currency: { symbol: 'THB', rate: '1\u20AC = 38 THB' },
    proverbs: [
      '\u00AB \u0E19\u0E49\u0E33\u0E02\u0E36\u0E49\u0E19\u0E43\u0E2B\u0E49\u0E23\u0E35\u0E1A\u0E15\u0E31\u0E01\u0E19\u0E49\u0E33 \u00BB',
      '\u00AB \u0E0A\u0E49\u0E32\u0E44\u0E14\u0E49\u0E0A\u0E49\u0E32\u0E44\u0E1B \u00BB',
    ],
    proverbLabel: 'Proverbe tha\u00EFlandais',
  },
  KH: {
    utcOffset: 7,
    currency: { symbol: 'KHR', rate: '1\u20AC = 4 400 KHR' },
    proverbs: ['\u00AB Don\'t let an angry man wash dishes \u00BB'],
    proverbLabel: 'Proverbe khmer',
  },
  LA: {
    utcOffset: 7,
    currency: { symbol: 'LAK', rate: '1\u20AC = 23 000 LAK' },
    proverbs: ['\u00AB Chaque voyage est une le\u00E7on de vie \u00BB'],
    proverbLabel: 'Proverbe laotien',
  },
  MM: {
    utcOffset: 6.5,
    currency: { symbol: 'MMK', rate: '1\u20AC = 2 300 MMK' },
    proverbs: ['\u00AB Si tu veux aller vite, marche seul \u00BB'],
    proverbLabel: 'Proverbe birman',
  },
  ID: {
    utcOffset: 7,
    currency: { symbol: 'IDR', rate: '1\u20AC = 17 000 IDR' },
    proverbs: ['\u00AB Witing tresno jalaran soko kulino \u00BB'],
    proverbLabel: 'Proverbe indon\u00E9sien',
  },
  IN: {
    utcOffset: 5.5,
    currency: { symbol: 'INR', rate: '1\u20AC = 92 INR' },
    proverbs: ['\u00AB Le monde est un livre, et ceux qui ne voyagent pas n\'en lisent qu\'une page \u00BB'],
    proverbLabel: 'Proverbe indien',
  },
  LK: {
    utcOffset: 5.5,
    currency: { symbol: 'LKR', rate: '1\u20AC = 330 LKR' },
    proverbs: ['\u00AB La patience est la cl\u00E9 du paradis \u00BB'],
    proverbLabel: 'Proverbe sri-lankais',
  },
  NP: {
    utcOffset: 5.75,
    currency: { symbol: 'NPR', rate: '1\u20AC = 146 NPR' },
    proverbs: ['\u00AB La montagne ne vient pas \u00E0 celui qui attend \u00BB'],
    proverbLabel: 'Proverbe n\u00E9palais',
  },
  JP: {
    utcOffset: 9,
    currency: { symbol: 'JPY', rate: '1\u20AC = 163 JPY' },
    proverbs: [
      '\u00AB \u4E03\u8EE2\u3073\u516B\u8D77\u304D \u00BB (Tombe sept fois, rel\u00E8ve-toi huit)',
      '\u00AB \u82B1\u3088\u308A\u56E3\u5B50 \u00BB',
    ],
    proverbLabel: 'Proverbe japonais',
  },
  TZ: {
    utcOffset: 3,
    currency: { symbol: 'TZS', rate: '1\u20AC = 2 750 TZS' },
    proverbs: [
      '\u00AB Haraka haraka haina baraka \u00BB (La pr\u00E9cipitation n\'apporte pas la b\u00E9n\u00E9diction)',
      '\u00AB Safari njema \u00BB (Bon voyage)',
    ],
    proverbLabel: 'Proverbe swahili',
  },
  KE: {
    utcOffset: 3,
    currency: { symbol: 'KES', rate: '1\u20AC = 165 KES' },
    proverbs: ['\u00AB Pole pole ndio mwendo \u00BB (Doucement, c\'est la route)'],
    proverbLabel: 'Proverbe kenyan',
  },
  ZA: {
    utcOffset: 2,
    currency: { symbol: 'ZAR', rate: '1\u20AC = 20 ZAR' },
    proverbs: ['\u00AB Ubuntu : je suis parce que nous sommes \u00BB'],
    proverbLabel: 'Proverbe zoulou',
  },
  MA: {
    utcOffset: 1,
    currency: { symbol: 'MAD', rate: '1\u20AC = 11 MAD' },
    proverbs: ['\u00AB Celui qui voyage beaucoup sait beaucoup \u00BB'],
    proverbLabel: 'Proverbe marocain',
  },
  MG: {
    utcOffset: 3,
    currency: { symbol: 'MGA', rate: '1\u20AC = 4 900 MGA' },
    proverbs: ['\u00AB Ny fiainana dia toy ny lalana, tsy maintsy izorona \u00BB'],
    proverbLabel: 'Proverbe malgache',
  },
  CR: {
    utcOffset: -6,
    currency: { symbol: 'CRC', rate: '1\u20AC = 560 CRC' },
    proverbs: ['\u00AB Pura Vida \u00BB'],
    proverbLabel: 'Expression costaricienne',
  },
  PE: {
    utcOffset: -5,
    currency: { symbol: 'PEN', rate: '1\u20AC = 4.1 PEN' },
    proverbs: ['\u00AB Al que madruga, Dios le ayuda \u00BB'],
    proverbLabel: 'Proverbe p\u00E9ruvien',
  },
  MX: {
    utcOffset: -6,
    currency: { symbol: 'MXN', rate: '1\u20AC = 19 MXN' },
    proverbs: ['\u00AB El que no arriesga no gana \u00BB'],
    proverbLabel: 'Proverbe mexicain',
  },
  CO: {
    utcOffset: -5,
    currency: { symbol: 'COP', rate: '1\u20AC = 4 300 COP' },
    proverbs: ['\u00AB En tierra de ciegos, el tuerto es rey \u00BB'],
    proverbLabel: 'Proverbe colombien',
  },
  AR: {
    utcOffset: -3,
    currency: { symbol: 'ARS', rate: '1\u20AC = 950 ARS' },
    proverbs: ['\u00AB No hay mal que por bien no venga \u00BB'],
    proverbLabel: 'Proverbe argentin',
  },
  BR: {
    utcOffset: -3,
    currency: { symbol: 'BRL', rate: '1\u20AC = 5.4 BRL' },
    proverbs: ['\u00AB Quem n\u00E3o tem c\u00E3o, ca\u00E7a com gato \u00BB'],
    proverbLabel: 'Proverbe br\u00E9silien',
  },
  CL: {
    utcOffset: -4,
    currency: { symbol: 'CLP', rate: '1\u20AC = 1 020 CLP' },
    proverbs: ['\u00AB El que mucho abarca, poco aprieta \u00BB'],
    proverbLabel: 'Proverbe chilien',
  },
  BO: {
    utcOffset: -4,
    currency: { symbol: 'BOB', rate: '1\u20AC = 7.6 BOB' },
    proverbs: ['\u00AB No hay que buscar tres pies al gato \u00BB'],
    proverbLabel: 'Proverbe bolivien',
  },
  EC: {
    utcOffset: -5,
    currency: { symbol: 'USD', rate: '1\u20AC = 1.08 USD' },
    proverbs: ['\u00AB M\u00E1s vale p\u00E1jaro en mano \u00BB'],
    proverbLabel: 'Proverbe \u00E9quatorien',
  },
}

const DEFAULT_DATA: CountryLocalData = {
  utcOffset: 0,
  currency: { symbol: '', rate: '' },
  proverbs: ['\u00AB Le voyage est la seule chose que l\'on ach\u00E8te qui rend plus riche \u00BB'],
  proverbLabel: 'Proverbe du voyageur',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LocalInfoBar({ countryCode }: LocalInfoBarProps) {
  const data = countryCode ? COUNTRY_DATA[countryCode.toUpperCase()] ?? DEFAULT_DATA : DEFAULT_DATA
  const [localTime, setLocalTime] = useState<string>('')

  // Pick a proverb based on the day of year (deterministic for hydration)
  const proverb = data.proverbs[new Date().getDate() % data.proverbs.length]

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
      const localMs = utcMs + data.utcOffset * 3600000
      const local = new Date(localMs)
      setLocalTime(
        local.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [data.utcOffset])

  const utcLabel = data.utcOffset >= 0 ? `UTC+${data.utcOffset}` : `UTC${data.utcOffset}`

  return (
    <div className="bg-white border-b border-gray-200 px-8 lg:px-10 py-3.5">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Info items */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Local time */}
          {localTime && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-lg">&#128336;</span>
              <span className="font-semibold text-gray-800">{localTime}</span>
              <span className="text-gray-500">({utcLabel})</span>
            </div>
          )}

          {/* Exchange rate */}
          {data.currency.rate && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-lg">&#128177;</span>
              <span className="font-semibold text-gray-800">{data.currency.rate}</span>
            </div>
          )}
        </div>

        {/* Proverb */}
        <div className="flex items-center gap-2 text-[13px] italic text-gray-500">
          <span>&#127802;</span>
          <span>{proverb} — {data.proverbLabel}</span>
        </div>
      </div>
    </div>
  )
}
