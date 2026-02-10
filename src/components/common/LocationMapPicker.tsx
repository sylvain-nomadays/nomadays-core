'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Crosshair } from 'lucide-react';
import { loadGoogleMapsScript } from '@/lib/google-maps';

// ============================================================================
// Types
// ============================================================================

interface LocationMapPickerProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  zoom?: number;
  height?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function LocationMapPicker({
  lat,
  lng,
  onPositionChange,
  zoom = 12,
  height = '250px',
  className = '',
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether the position was changed by drag (to avoid re-centering loop)
  const isDraggingRef = useRef(false);

  // Store latest onPositionChange in ref to avoid re-creating marker listener
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;

        const position = { lat, lng };

        // Create map
        const map = new google.maps.Map(mapContainerRef.current, {
          center: position,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        // Create draggable marker
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          animation: google.maps.Animation.DROP,
          title: 'Déplacez le marqueur pour ajuster la position',
        });

        // Listen for drag end
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            isDraggingRef.current = true;
            onPositionChangeRef.current(pos.lat(), pos.lng());
            // Reset drag flag after a short delay to allow state update
            setTimeout(() => {
              isDraggingRef.current = false;
            }, 100);
          }
        });

        mapRef.current = map;
        markerRef.current = marker;
        setIsLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Impossible de charger Google Maps');
          setIsLoading(false);
          console.error('LocationMapPicker load error:', err);
        }
      });

    return () => {
      cancelled = true;
    };
    // Only run on mount — position updates are handled by the next useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync position from props (when user does a new Google Places search)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    // Don't re-center if the change was caused by marker drag
    if (isDraggingRef.current) return;

    const newPosition = { lat, lng };
    markerRef.current.setPosition(newPosition);
    mapRef.current.panTo(newPosition);
  }, [lat, lng]);

  // Recenter button handler
  const handleRecenter = useCallback(() => {
    if (mapRef.current && markerRef.current) {
      const pos = { lat, lng };
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(zoom);
    }
  }, [lat, lng, zoom]);

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-4 text-center ${className}`}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div
          className="flex items-center justify-center bg-gray-100"
          style={{ height }}
        >
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Chargement de la carte...</span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div
        ref={mapContainerRef}
        style={{ height, display: isLoading ? 'none' : 'block' }}
      />

      {/* Coordinates overlay */}
      {!isLoading && (
        <>
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-gray-600 shadow-sm">
            📍 {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>

          {/* Recenter button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-md p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 shadow-sm transition-colors"
            title="Recentrer la carte"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Drag hint */}
          <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-gray-400 shadow-sm">
            Glissez le marqueur pour ajuster
          </div>
        </>
      )}
    </div>
  );
}
