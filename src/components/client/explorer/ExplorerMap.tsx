'use client'

import { useRef, useEffect, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import type { DestinationAgency } from '@/lib/types/explorer'
import { EXPLORER_LEGEND } from '@/lib/types/explorer'
import {
  createExplorerMarkerElement,
  highlightExplorerMarker,
  unhighlightExplorerMarker,
} from './ExplorerMarker'
import './explorer-map-styles.css'

const INITIAL_CENTER: [number, number] = [20, 20]
const INITIAL_ZOOM = 2.2

interface ExplorerMapProps {
  agencies: DestinationAgency[]
  filteredIds: Set<string>
  filteredAgencies: DestinationAgency[]
  selectedAgencyId: string | null
  onSelectAgency: (agency: DestinationAgency) => void
}

export default function ExplorerMap({
  agencies,
  filteredIds,
  filteredAgencies,
  selectedAgencyId,
  onSelectAgency,
}: ExplorerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<
    Map<string, { marker: mapboxgl.Marker; element: HTMLDivElement }>
  >(new Map())
  const fitBoundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Handle marker click ─────────────────────────────────────────

  const handleMarkerClick = useCallback(
    (agency: DestinationAgency) => {
      onSelectAgency(agency)

      const map = mapRef.current
      if (map) {
        map.flyTo({
          center: [agency.longitude, agency.latitude],
          zoom: Math.max(map.getZoom(), 4),
          duration: 1200,
          essential: true,
        })
      }
    },
    [onSelectAgency]
  )

  // ─── Initialize map ──────────────────────────────────────────────

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token || !mapContainerRef.current) return

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: 8,
      minZoom: 1.2,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: false,
    })

    mapRef.current = map

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'bottom-right'
    )

    // Style the map
    map.on('style.load', () => {
      try {
        map.setPaintProperty('water', 'fill-color', '#D4E5ED')
      } catch { /* optional */ }
      try {
        map.setPaintProperty('land', 'background-color', '#F5EDE3')
      } catch { /* optional */ }
      try {
        map.setPaintProperty('admin-0-boundary', 'line-color', '#C5B9A8')
        map.setPaintProperty('admin-0-boundary', 'line-opacity', 0.4)
      } catch { /* optional */ }
      try {
        map.setPaintProperty('country-label', 'text-color', '#8E8276')
        map.setPaintProperty('country-label', 'text-opacity', 0.7)
      } catch { /* optional */ }
    })

    // Close selection on empty map click
    map.on('click', () => {
      // Handled by wrapper — no-op here to avoid interfering with marker clicks
    })

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Add markers ─────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const addMarkers = () => {
      // Remove old markers
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()

      for (const agency of agencies) {
        const el = createExplorerMarkerElement(agency, handleMarkerClick)

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([agency.longitude, agency.latitude])
          .addTo(map)

        markersRef.current.set(agency.id, { marker, element: el })
      }
    }

    if (map.loaded()) {
      addMarkers()
    } else {
      map.on('load', addMarkers)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencies, handleMarkerClick])

  // ─── Filter visibility ───────────────────────────────────────────

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      if (filteredIds.has(id)) {
        element.classList.remove('explorer-marker--hidden')
      } else {
        element.classList.add('explorer-marker--hidden')
      }
    })
  }, [filteredIds])

  // ─── Highlight selected ──────────────────────────────────────────

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      if (id === selectedAgencyId) {
        highlightExplorerMarker(element)
      } else {
        unhighlightExplorerMarker(element)
      }
    })
  }, [selectedAgencyId])

  // ─── Auto-fit bounds when filter changes ───────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return

    // Clear previous debounce
    if (fitBoundsTimerRef.current) {
      clearTimeout(fitBoundsTimerRef.current)
    }

    fitBoundsTimerRef.current = setTimeout(() => {
      // If showing all agencies or no filter active, reset to initial view
      if (filteredAgencies.length === 0 || filteredAgencies.length === agencies.length) {
        map.flyTo({
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM,
          duration: 800,
          essential: true,
        })
        return
      }

      // Compute bounding box of filtered agencies
      const bounds = new mapboxgl.LngLatBounds()
      for (const agency of filteredAgencies) {
        bounds.extend([agency.longitude, agency.latitude])
      }

      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 6,
        duration: 800,
      })
    }, 500)

    return () => {
      if (fitBoundsTimerRef.current) {
        clearTimeout(fitBoundsTimerRef.current)
      }
    }
  }, [filteredAgencies, agencies.length])

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #E3F4F5 0%, #F0F7F4 100%)' }}
      />

      {/* Legend */}
      <div className="explorer-legend">
        {EXPLORER_LEGEND.map((item) => (
          <div key={item.continent} className="explorer-legend__item">
            <div
              className="explorer-legend__dot"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
