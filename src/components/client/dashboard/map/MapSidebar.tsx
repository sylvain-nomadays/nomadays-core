'use client'

import { AirplaneTilt, HeartStraight, Plus, GlobeHemisphereWest, MapTrifold } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCountryByCode } from '@/lib/constants/countries'
import type { MapDestination } from './MapboxGlobeMap'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapSidebarProps {
  destinations: MapDestination[]
  onHover: (dest: MapDestination | null) => void
  onClick: (dest: MapDestination) => void
  onAddWish: () => void
  onAddPastTrip?: () => void
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<MapDestination['status'], string> = {
  visited: '#8BA080',
  nomadays: '#0FB6BC',
  wishlist: '#DD9371',
}

const STATUS_LABEL: Record<MapDestination['status'], string> = {
  visited: 'Effectué',
  nomadays: 'En cours',
  wishlist: 'Envie',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapSidebar({ destinations, onHover, onClick, onAddWish, onAddPastTrip }: MapSidebarProps) {
  const voyages = destinations.filter((d) => d.status === 'visited' || d.status === 'nomadays')
  const envies = destinations.filter((d) => d.status === 'wishlist')

  return (
    <div className="hidden md:flex flex-col w-[280px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <Tabs defaultValue="voyages" className="flex flex-col h-full">
        {/* Tab triggers */}
        <TabsList className="grid w-full grid-cols-2 bg-gray-50 rounded-none border-b border-gray-100 p-1 h-auto">
          <TabsTrigger
            value="voyages"
            className="text-xs font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl gap-1.5"
          >
            <AirplaneTilt size={14} weight="duotone" />
            Mes voyages
            {voyages.length > 0 && (
              <span className="ml-1 bg-[#0FB6BC] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {voyages.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="envies"
            className="text-xs font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl gap-1.5"
          >
            <HeartStraight size={14} weight="duotone" />
            Mes envies
            {envies.length > 0 && (
              <span className="ml-1 bg-[#DD9371] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {envies.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Voyages list */}
        <TabsContent value="voyages" className="flex-1 overflow-y-auto m-0 p-0">
          {voyages.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {voyages.map((dest) => (
                <SidebarItem
                  key={dest.id}
                  dest={dest}
                  onHover={onHover}
                  onClick={onClick}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<GlobeHemisphereWest size={32} weight="duotone" className="text-gray-300" />}
              text="Aucun voyage pour le moment"
            />
          )}

          {/* Add past trip button */}
          {onAddPastTrip && (
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={onAddPastTrip}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-[#8BA080] text-[#8BA080] text-sm font-semibold hover:bg-[#8BA080]/5 transition-colors"
              >
                <MapTrifold size={16} weight="duotone" />
                Ancien voyage
              </button>
            </div>
          )}
        </TabsContent>

        {/* Envies list */}
        <TabsContent value="envies" className="flex-1 overflow-y-auto m-0 p-0">
          {envies.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {envies.map((dest) => (
                <SidebarItem
                  key={dest.id}
                  dest={dest}
                  onHover={onHover}
                  onClick={onClick}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<HeartStraight size={32} weight="duotone" className="text-gray-300" />}
              text="Ajoutez vos envies de voyage !"
            />
          )}

          {/* Add wish button */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={onAddWish}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-[#DD9371] text-[#DD9371] text-sm font-semibold hover:bg-[#DD9371]/5 transition-colors"
            >
              <Plus size={16} weight="bold" />
              Ajouter une envie
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Sidebar Item ────────────────────────────────────────────────────────────

function SidebarItem({
  dest,
  onHover,
  onClick,
}: {
  dest: MapDestination
  onHover: (dest: MapDestination | null) => void
  onClick: (dest: MapDestination) => void
}) {
  const countryInfo = getCountryByCode(dest.countryCode)
  const flag = countryInfo?.flag || ''

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      onMouseEnter={() => onHover(dest)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(dest)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(dest)
      }}
    >
      {/* Photo / flag circle */}
      <div className="flex-shrink-0">
        {dest.heroPhotoUrl && dest.status !== 'wishlist' ? (
          <div
            className="w-10 h-10 rounded-full bg-cover bg-center border-2"
            style={{
              backgroundImage: `url(${dest.heroPhotoUrl})`,
              borderColor: STATUS_DOT[dest.status],
            }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{
              backgroundColor: `${STATUS_DOT[dest.status]}15`,
              border: dest.status === 'wishlist'
                ? `2px dashed ${STATUS_DOT[dest.status]}`
                : `2px solid ${STATUS_DOT[dest.status]}`,
            }}
          >
            {flag || dest.countryCode}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {flag && <span className="text-sm">{flag}</span>}
          <span className="font-display font-bold text-sm text-gray-800 truncate">
            {dest.country}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {dest.status === 'wishlist' && dest.note
            ? dest.note
            : dest.title !== dest.country
              ? dest.title
              : STATUS_LABEL[dest.status]}
        </p>
      </div>

      {/* Status dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: STATUS_DOT[dest.status] }}
      />
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      {icon}
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  )
}
