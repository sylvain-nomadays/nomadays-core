'use client'

import dynamic from 'next/dynamic'
import { GlobeHemisphereWest } from '@phosphor-icons/react'
import type { MapDestination } from './MapboxGlobeMap'

// ─── Dynamic import — Mapbox GL requires the browser (no SSR) ────────────────

const MapboxGlobeMap = dynamic(() => import('./MapboxGlobeMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <section className="bg-white px-4 md:px-8 lg:px-10 py-6">
      <div className="flex items-center gap-2.5 mb-5">
        <GlobeHemisphereWest size={28} weight="duotone" className="text-[#0FB6BC]/30" />
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
      </div>
      <div
        className="w-full h-[320px] md:h-[500px] rounded-[20px] animate-pulse flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #E3F4F5 0%, #F0F7F4 100%)',
        }}
      >
        <GlobeHemisphereWest size={64} weight="duotone" className="text-[#0FB6BC]/20" />
      </div>
    </section>
  )
}

// ─── Fallback SVG map ────────────────────────────────────────────────────────
// If Mapbox token is not configured, we import the old SVG map as fallback

import { WorldMapSection } from '../world-map-section'

interface InteractiveMapProps {
  destinations: MapDestination[]
  participantId: string
}

export function InteractiveMap({ destinations, participantId }: InteractiveMapProps) {
  const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  if (!hasMapboxToken) {
    // Fallback: convert destinations to the old format
    const legacyDestinations = destinations.map((d) => ({
      id: d.id,
      country: d.country,
      countryCode: d.countryCode,
      title: d.title,
      status: d.status === 'nomadays' ? ('current' as const) : d.status,
      heroPhotoUrl: d.heroPhotoUrl,
      year: d.year,
    }))
    return <WorldMapSection destinations={legacyDestinations} />
  }

  return (
    <MapboxGlobeMap
      destinations={destinations}
      participantId={participantId}
    />
  )
}
