'use client';

import { X } from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/common/GooglePlacesAutocomplete';
import LocationMapPicker from '@/components/common/LocationMapPicker';
import type { PlaceResult } from '@/components/common/GooglePlacesAutocomplete';
import type { RoadbookLocation } from '@/components/circuits/blocks/roadbook-categories';

// ─── Types ──────────────────────────────────────────────────────────

interface LocationPickerProps {
  location: RoadbookLocation | null;
  onLocationChange: (location: RoadbookLocation | null) => void;
  compact?: boolean;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function LocationPicker({
  location,
  onLocationChange,
  compact = false,
  className = '',
}: LocationPickerProps) {
  const handlePlaceSelect = (place: PlaceResult | null) => {
    if (!place || !place.geometry?.location) {
      // Don't clear if we already have a location (user just cleared search text)
      // Only clear if explicitly no place
      if (!place) {
        onLocationChange(null);
      }
      return;
    }

    onLocationChange({
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      name: place.name,
      address: place.formatted_address,
      place_id: place.place_id,
    });
  };

  const handlePositionChange = (lat: number, lng: number) => {
    if (!location) return;
    onLocationChange({
      ...location,
      lat,
      lng,
    });
  };

  const handleClear = () => {
    onLocationChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search bar + clear button */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <GooglePlacesAutocomplete
            value={location?.name || location?.address || ''}
            placeholder="Rechercher un lieu de rendez-vous..."
            onPlaceSelect={handlePlaceSelect}
            types={['establishment', 'geocode']}
          />
        </div>
        {location && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
            title="Supprimer la localisation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Interactive map for fine-tuning */}
      {location && (
        <LocationMapPicker
          lat={location.lat}
          lng={location.lng}
          onPositionChange={handlePositionChange}
          zoom={15}
          height={compact ? '150px' : '200px'}
        />
      )}
    </div>
  );
}
