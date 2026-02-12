'use client';

import { useState } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';

// ─── Types ──────────────────────────────────────────────────────────

interface MiniMapProps {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  height?: number;
  width?: number;
  markerColor?: string;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function MiniMap({
  lat,
  lng,
  label,
  zoom = 15,
  height = 150,
  width = 400,
  markerColor = '0x0FB6BC',
  className = '',
}: MiniMapProps) {
  const [imgError, setImgError] = useState(false);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  // If no API key or image failed, show fallback
  if (!API_KEY || imgError) {
    return (
      <div className={`relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden ${className}`}>
        <div
          className="flex flex-col items-center justify-center text-gray-400"
          style={{ height: `${height}px` }}
        >
          <span className="text-xs mb-1">📍 {lat.toFixed(4)}, {lng.toFixed(4)}</span>
          {label && <span className="text-xs text-gray-500 mb-2">{label}</span>}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#0FB6BC] hover:text-[#0C9296] transition-colors"
          >
            Ouvrir dans Google Maps
            <ArrowSquareOut weight="duotone" size={12} />
          </a>
        </div>
      </div>
    );
  }

  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&scale=2&markers=color:${markerColor}|${lat},${lng}&style=feature:poi|visibility:off&key=${API_KEY}`;

  return (
    <div className={`relative rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Static Map Image */}
      <img
        src={staticMapUrl}
        alt={label || `Carte ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        width={width}
        height={height}
        className="w-full object-cover"
        style={{ height: `${height}px` }}
        onError={() => setImgError(true)}
        loading="lazy"
      />

      {/* Bottom overlay: label + link */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white font-medium truncate">
            {label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors flex-shrink-0 ml-2"
            title="Ouvrir dans Google Maps"
          >
            <ArrowSquareOut weight="duotone" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
