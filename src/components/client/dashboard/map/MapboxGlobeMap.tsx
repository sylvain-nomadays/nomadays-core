'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useRouter } from 'next/navigation'
import { GlobeHemisphereWest, Plus, MapTrifold } from '@phosphor-icons/react'
import { createMarkerElement, highlightMarkerElement, unhighlightMarkerElement } from './MapMarker'
import { MapPopup } from './MapPopup'
import { MapSidebar } from './MapSidebar'
import { AddWishDialog } from './AddWishDialog'
import { PastTripDialog } from '../past-trip-dialog'
import { deleteTravelerWish } from '@/lib/actions/traveler-wishlists'
import './map-styles.css'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MapDestination {
  id: string
  country: string
  countryCode: string
  title: string
  status: 'visited' | 'nomadays' | 'wishlist'
  heroPhotoUrl?: string | null
  year?: string
  type: 'dossier' | 'wish'
  note?: string | null
  hostName?: string | null
  coordinates: [number, number] // [lng, lat]
}

interface MapboxGlobeMapProps {
  destinations: MapDestination[]
  participantId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeCenter(destinations: MapDestination[]): [number, number] {
  if (destinations.length === 0) return [20, 25] // Default: Africa/Europe center

  let totalLng = 0
  let totalLat = 0
  let count = 0

  for (const d of destinations) {
    if (d.coordinates[0] !== 0 || d.coordinates[1] !== 0) {
      totalLng += d.coordinates[0]
      totalLat += d.coordinates[1]
      count++
    }
  }

  if (count === 0) return [20, 25]
  return [totalLng / count, totalLat / count]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MapboxGlobeMap({ destinations, participantId }: MapboxGlobeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; element: HTMLDivElement }>>(
    new Map()
  )
  const markerClickedRef = useRef(false) // Prevents map click from closing popup immediately after marker click

  const router = useRouter()

  // State
  const [selectedDest, setSelectedDest] = useState<MapDestination | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const [wishDialogOpen, setWishDialogOpen] = useState(false)
  const [pastTripDialogOpen, setPastTripDialogOpen] = useState(false)
  const [localDestinations, setLocalDestinations] = useState(destinations)

  // Sync external destinations prop
  useEffect(() => {
    setLocalDestinations(destinations)
  }, [destinations])

  // ─── Initialize map ──────────────────────────────────────────────────────

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token || !mapContainerRef.current) return

    mapboxgl.accessToken = token

    const center = computeCenter(localDestinations)

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      projection: 'globe',
      center,
      zoom: 1.8,
      maxZoom: 6,
      minZoom: 1.2,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: false,
    })

    mapRef.current = map

    // Navigation controls (zoom only)
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'bottom-right'
    )

    // Apply vintage aquarelle style once loaded
    map.on('style.load', () => {
      // Fog / atmosphere
      map.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(255, 255, 255)',
        'horizon-blend': 0,
        'space-color': '#DD9371',
        'star-intensity': 0,
      })

      // Override water color
      try {
        map.setPaintProperty('water', 'fill-color', '#D4E5ED')
      } catch { /* layer might not exist */ }

      // Override land/background color
      try {
        map.setPaintProperty('land', 'background-color', '#F5EDE3')
      } catch { /* fallback */ }

      // Subtle country boundaries
      try {
        map.setPaintProperty('admin-0-boundary', 'line-color', '#C5B9A8')
        map.setPaintProperty('admin-0-boundary', 'line-opacity', 0.4)
      } catch { /* optional */ }

      // Softer labels
      try {
        map.setPaintProperty('country-label', 'text-color', '#8E8276')
        map.setPaintProperty('country-label', 'text-opacity', 0.7)
      } catch { /* optional */ }
    })

    // Close popup when clicking on empty map area (not on a marker)
    map.on('click', () => {
      // If a marker was just clicked, skip this handler
      if (markerClickedRef.current) {
        markerClickedRef.current = false
        return
      }
      setSelectedDest(null)
      setPopupPosition(null)
    })

    // Cleanup
    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Initialize once

  // ─── Manage markers ──────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Wait for map to load
    const addMarkers = () => {
      // Remove existing markers
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()

      // Add new markers
      for (const dest of localDestinations) {
        if (dest.coordinates[0] === 0 && dest.coordinates[1] === 0) continue

        const el = createMarkerElement(dest, handleMarkerClick)

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat(dest.coordinates)
          .addTo(map)

        markersRef.current.set(dest.id, { marker, element: el })
      }
    }

    if (map.loaded()) {
      addMarkers()
    } else {
      map.on('load', addMarkers)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDestinations])

  // ─── Update popup position on map move ───────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedDest) return

    const updatePosition = () => {
      const point = map.project(selectedDest.coordinates as mapboxgl.LngLatLike)
      setPopupPosition({ x: point.x, y: point.y })
    }

    updatePosition()
    map.on('move', updatePosition)

    return () => {
      map.off('move', updatePosition)
    }
  }, [selectedDest])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleMarkerClick = useCallback((dest: MapDestination) => {
    const map = mapRef.current
    if (!map) return

    // Prevent map click handler from immediately closing popup
    markerClickedRef.current = true

    setSelectedDest(dest)

    // Fly to destination
    map.flyTo({
      center: dest.coordinates,
      zoom: Math.max(map.getZoom(), 3.5),
      duration: 1200,
      essential: true,
    })

    // Position will be updated by the move handler
    const point = map.project(dest.coordinates as mapboxgl.LngLatLike)
    setPopupPosition({ x: point.x, y: point.y })
  }, [])

  const handleSidebarHover = useCallback((dest: MapDestination | null) => {
    const map = mapRef.current
    if (!map) return

    // Unhighlight all
    markersRef.current.forEach(({ element }) => unhighlightMarkerElement(element))

    if (dest) {
      // Highlight the hovered marker
      const entry = markersRef.current.get(dest.id)
      if (entry) {
        highlightMarkerElement(entry.element)
      }
    }
  }, [])

  const handleSidebarClick = useCallback((dest: MapDestination) => {
    if (dest.type === 'dossier') {
      router.push(`/client/voyages/${dest.id}`)
    } else {
      handleMarkerClick(dest)
    }
  }, [router, handleMarkerClick])

  const handleDeleteWish = useCallback(async (wishId: string) => {
    const result = await deleteTravelerWish(wishId)
    if (!result.error) {
      setLocalDestinations((prev) => prev.filter((d) => d.id !== wishId))
      setSelectedDest(null)
      setPopupPosition(null)
    }
  }, [])

  const handleWishAdded = useCallback((countryCode: string) => {
    // The page will revalidate via the server action
    // The new wish will appear after revalidation
    // For immediate feedback, we could add it locally, but revalidation handles it
    router.refresh()
  }, [router])

  const handlePastTripAdded = useCallback(() => {
    router.refresh()
  }, [router])

  const handleClosePopup = useCallback(() => {
    setSelectedDest(null)
    setPopupPosition(null)
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="bg-white px-4 md:px-8 lg:px-10 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-xl text-gray-800 flex items-center gap-2.5">
            <GlobeHemisphereWest size={28} weight="duotone" className="text-[#0FB6BC]" />
            Ma carte du monde
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Vos voyages passés, en cours et vos envies
          </p>
        </div>
        {/* Action buttons — visible on all screens */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPastTripDialogOpen(true)}
            className="px-4 py-2.5 border-2 border-[#8BA080] text-[#8BA080] rounded-[10px] text-sm font-semibold hover:bg-[#8BA080] hover:text-white transition-colors flex items-center gap-2"
          >
            <MapTrifold size={16} weight="duotone" />
            <span className="hidden sm:inline">Ancien voyage</span>
          </button>
          <button
            onClick={() => setWishDialogOpen(true)}
            className="px-4 py-2.5 border-2 border-[#DD9371] text-[#DD9371] rounded-[10px] text-sm font-semibold hover:bg-[#DD9371] hover:text-white transition-colors flex items-center gap-2"
          >
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Ajouter une envie</span>
          </button>
        </div>
      </div>

      {/* Map + Sidebar layout */}
      <div className="relative flex gap-4">
        {/* Sidebar — Desktop only */}
        <MapSidebar
          destinations={localDestinations}
          onHover={handleSidebarHover}
          onClick={handleSidebarClick}
          onAddWish={() => setWishDialogOpen(true)}
          onAddPastTrip={() => setPastTripDialogOpen(true)}
        />

        {/* Map container */}
        <div className="flex-1 relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[320px] md:h-[500px] rounded-[20px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #E3F4F5 0%, #F0F7F4 100%)',
            }}
          />

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 flex gap-4 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-[10px] text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8BA080' }} />
              Effectués
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#0FB6BC' }} />
              En cours
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ border: '2px dashed #DD9371', background: 'transparent' }}
              />
              Envies
            </div>
          </div>

          {/* Popup overlay */}
          {selectedDest && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <MapPopup
                destination={selectedDest}
                position={popupPosition}
                onClose={handleClosePopup}
                onDelete={selectedDest.type === 'wish' ? handleDeleteWish : undefined}
              />
            </div>
          )}

          {/* Mobile floating button */}
          <button
            onClick={() => setWishDialogOpen(true)}
            className="md:hidden absolute bottom-4 right-4 w-12 h-12 rounded-full bg-[#DD9371] text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Ajouter une envie"
          >
            <Plus size={22} weight="bold" />
          </button>
        </div>
      </div>

      {/* Add Wish Dialog */}
      <AddWishDialog
        open={wishDialogOpen}
        onOpenChange={setWishDialogOpen}
        participantId={participantId}
        onWishAdded={handleWishAdded}
      />

      {/* Past Trip Dialog */}
      <PastTripDialog
        open={pastTripDialogOpen}
        onOpenChange={setPastTripDialogOpen}
        participantId={participantId}
        onTripAdded={handlePastTripAdded}
      />
    </section>
  )
}
