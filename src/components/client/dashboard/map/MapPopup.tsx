'use client'

import Link from 'next/link'
import { X, AirplaneTilt, ChatCircle, Trash } from '@phosphor-icons/react'
import type { MapDestination } from './MapboxGlobeMap'
import { getCountryByCode } from '@/lib/constants/countries'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapPopupProps {
  destination: MapDestination
  position: { x: number; y: number } | null
  onClose: () => void
  onDelete?: (wishId: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapPopup({ destination, position, onClose, onDelete }: MapPopupProps) {
  if (!position) return null

  const countryInfo = getCountryByCode(destination.countryCode)
  const flag = countryInfo?.flag || ''

  // Position the popup above the marker
  const style: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y - 12, // offset above marker
    transform: 'translate(-50%, -100%)',
    zIndex: 50,
  }

  return (
    <div style={style} className="pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-[260px] relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
          aria-label="Fermer"
        >
          <X size={14} weight="bold" className="text-gray-500" />
        </button>

        {/* Hero image for visited/nomadays */}
        {destination.status !== 'wishlist' && destination.heroPhotoUrl && (
          <div
            className="h-28 bg-cover bg-center"
            style={{ backgroundImage: `url(${destination.heroPhotoUrl})` }}
          />
        )}

        {/* Content */}
        <div className="p-4">
          {/* Country header */}
          <div className="flex items-center gap-2 mb-1.5">
            {flag && <span className="text-lg">{flag}</span>}
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {destination.country}
            </span>
            {destination.year && (
              <span className="text-xs text-gray-400 ml-auto">{destination.year}</span>
            )}
          </div>

          {/* Title */}
          <h4 className="font-display font-bold text-sm text-gray-800 leading-snug mb-1">
            {destination.title}
          </h4>

          {/* Note for wishlists */}
          {destination.status === 'wishlist' && destination.note && (
            <p className="text-xs text-gray-500 italic leading-relaxed mb-3">
              &laquo; {destination.note} &raquo;
            </p>
          )}

          {/* Host name for dossiers */}
          {destination.status !== 'wishlist' && destination.hostName && (
            <p className="text-xs text-gray-500 mb-3">
              Votre h&ocirc;te : {destination.hostName}
            </p>
          )}

          {/* CTA */}
          {destination.status !== 'wishlist' ? (
            <Link
              href={`/client/voyages/${destination.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#0FB6BC' }}
            >
              <AirplaneTilt size={16} weight="duotone" />
              Voir mon voyage
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/client/aide"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#DD9371' }}
              >
                <ChatCircle size={16} weight="duotone" />
                Discuter avec un h&ocirc;te
              </Link>
              {onDelete && (
                <button
                  onClick={() => onDelete(destination.id)}
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
                >
                  <Trash size={13} weight="duotone" />
                  Supprimer l&apos;envie
                </button>
              )}
            </div>
          )}
        </div>

        {/* Arrow pointing down */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100"
        />
      </div>
    </div>
  )
}
