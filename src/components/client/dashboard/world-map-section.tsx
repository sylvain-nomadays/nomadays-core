'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GlobeHemisphereWest, AirplaneTilt } from '@phosphor-icons/react'

interface MapDestination {
  id: string
  country: string
  countryCode: string
  title: string
  status: 'visited' | 'current' | 'wishlist'
  heroPhotoUrl?: string | null
  year?: string
}

interface WorldMapSectionProps {
  destinations: MapDestination[]
}

// Approximate coordinates (% from top-left) for common destination countries
const COUNTRY_POSITIONS: Record<string, { top: string; left: string }> = {
  VN: { top: '35%', left: '78%' },
  TH: { top: '38%', left: '72%' },
  KH: { top: '40%', left: '74%' },
  LA: { top: '36%', left: '73%' },
  MM: { top: '34%', left: '70%' },
  JP: { top: '28%', left: '85%' },
  CN: { top: '30%', left: '76%' },
  ID: { top: '52%', left: '78%' },
  IN: { top: '38%', left: '64%' },
  LK: { top: '44%', left: '65%' },
  NP: { top: '34%', left: '66%' },
  PH: { top: '38%', left: '82%' },
  TZ: { top: '52%', left: '48%' },
  KE: { top: '48%', left: '48%' },
  ZA: { top: '62%', left: '45%' },
  MA: { top: '30%', left: '38%' },
  MG: { top: '56%', left: '52%' },
  ET: { top: '44%', left: '50%' },
  EG: { top: '32%', left: '46%' },
  MX: { top: '34%', left: '15%' },
  CR: { top: '38%', left: '18%' },
  PE: { top: '52%', left: '22%' },
  CO: { top: '42%', left: '20%' },
  AR: { top: '62%', left: '24%' },
  CL: { top: '60%', left: '22%' },
  BR: { top: '50%', left: '28%' },
  BO: { top: '54%', left: '24%' },
  EC: { top: '46%', left: '20%' },
  CU: { top: '32%', left: '20%' },
  AU: { top: '60%', left: '85%' },
  NZ: { top: '66%', left: '92%' },
  FR: { top: '26%', left: '40%' },
  IT: { top: '28%', left: '42%' },
  ES: { top: '28%', left: '38%' },
  GR: { top: '30%', left: '44%' },
  PT: { top: '28%', left: '37%' },
  IS: { top: '18%', left: '35%' },
  NO: { top: '18%', left: '40%' },
}

const STATUS_COLORS = {
  visited: '#0FB6BC',
  current: '#D4A847',
  wishlist: '#DD9371',
}

export function WorldMapSection({ destinations }: WorldMapSectionProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <section className="bg-white flex-1 px-8 lg:px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-gray-800 flex items-center gap-2.5">
            <GlobeHemisphereWest size={28} weight="duotone" className="text-[#0FB6BC]" />
            Ma carte du monde
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Vos voyages passes, en cours et vos envies
          </p>
        </div>
        <button className="px-4 py-2.5 border-2 border-[#0FB6BC] text-[#0FB6BC] rounded-[10px] text-sm font-semibold hover:bg-[#0FB6BC] hover:text-white transition-colors">
          + Ajouter une envie
        </button>
      </div>

      {/* World Map */}
      <div className="relative rounded-[20px] h-[280px] overflow-hidden mb-8" style={{ background: 'linear-gradient(180deg, #E3F4F5 0%, #F0F7F4 100%)' }}>
        {/* SVG continents background */}
        <svg
          viewBox="0 0 1200 600"
          className="absolute inset-0 w-full h-full opacity-40"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            fill="#0FB6BC"
            fillOpacity="0.15"
            d="M200,150 Q300,100 400,150 Q450,250 350,300 Q250,280 200,150Z M450,120 Q600,80 750,130 Q800,220 700,280 Q550,300 450,200Z M780,100 Q900,70 1000,120 Q1050,200 950,280 Q850,300 780,180Z M150,350 Q250,320 350,380 Q380,480 280,520 Q180,500 150,350Z M600,350 Q720,310 820,370 Q860,470 760,520 Q640,510 600,350Z"
          />
        </svg>

        {/* Map Points */}
        {destinations.map((dest) => {
          const pos = COUNTRY_POSITIONS[dest.countryCode.toUpperCase()]
          if (!pos) return null

          const isHovered = hoveredId === dest.id
          const borderColor = STATUS_COLORS[dest.status]
          const borderStyle = dest.status === 'wishlist' ? 'dashed' : 'solid'

          return (
            <Link
              key={dest.id}
              href={`/client/voyages/${dest.id}`}
              className="absolute z-10 transition-transform hover:scale-110 hover:z-20"
              style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
              onMouseEnter={() => setHoveredId(dest.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="w-12 h-12 rounded-full overflow-hidden relative"
                style={{
                  border: `3px ${borderStyle} ${borderColor}`,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                }}
              >
                {dest.heroPhotoUrl ? (
                  <Image
                    src={dest.heroPhotoUrl}
                    alt={dest.country}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold">
                    {dest.countryCode}
                  </div>
                )}
                {dest.status === 'current' && (
                  <div
                    className="absolute inset-[-4px] rounded-full border-[3px] animate-pulse"
                    style={{ borderColor: '#D4A847' }}
                  />
                )}
              </div>

              {/* Hover label */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none">
                  {dest.title}
                </div>
              )}
            </Link>
          )
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-4 bg-white/90 px-4 py-2.5 rounded-[10px] text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#0FB6BC' }} />
            Voyages effectues
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#D4A847' }} />
            Confirme
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ border: '2px dashed #DD9371', background: 'transparent' }}
            />
            Envies
          </div>
        </div>
      </div>

      {/* Destinations Grid Title */}
      <h3 className="font-display font-bold text-base text-gray-800 mb-4 flex items-center gap-2">
        <AirplaneTilt size={20} weight="duotone" className="text-[#0FB6BC]" />
        Mes voyages
      </h3>
    </section>
  )
}
