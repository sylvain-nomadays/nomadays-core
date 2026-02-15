import Image from 'next/image'
import {
  Bed,
  Star,
  Coffee,
  ForkKnife,
  Moon,
} from '@phosphor-icons/react/dist/ssr'
import type { ContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccommodationMeta {
  accommodation_id?: number
  selected_room_category_id?: number
  nights?: number
  breakfast_included?: boolean
  lunch_included?: boolean
  dinner_included?: boolean
}

interface AccommodationsSummaryProps {
  tripDays: any[]
  accommodationsMap: Record<number, any>
  roomCategoriesMap: Record<number, any[]>
  accommodationPhotosMap: Record<number, any[]>
  continentTheme: ContinentTheme
}

// ─── Bed type labels ─────────────────────────────────────────────────────────

const BED_TYPE_LABELS: Record<string, string> = {
  DBL: 'Double',
  TWN: 'Twin',
  SGL: 'Single',
  TRP: 'Triple',
  QUD: 'Quadruple',
  KNG: 'King',
  QUE: 'Queen',
  FTN: 'Futon',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAccommodationMeta(descriptionHtml: string | null | undefined): AccommodationMeta {
  if (!descriptionHtml) return {}
  try {
    return JSON.parse(descriptionHtml)
  } catch {
    return {}
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AccommodationsSummary({
  tripDays,
  accommodationsMap,
  roomCategoriesMap,
  accommodationPhotosMap,
  continentTheme,
}: AccommodationsSummaryProps) {
  // Collect all accommodation blocks from all days
  const accommodationEntries: Array<{
    dayNumber: number
    dayNumberEnd?: number
    locationFrom: string | null
    meta: AccommodationMeta
    formulaName: string
  }> = []

  for (const day of tripDays) {
    const formulas = day.formulas || []
    for (const formula of formulas) {
      if (formula.block_type === 'accommodation') {
        const meta = parseAccommodationMeta(formula.description_html)
        if (meta.accommodation_id) {
          accommodationEntries.push({
            dayNumber: day.day_number,
            dayNumberEnd: day.day_number_end,
            locationFrom: day.location_from || day.location_to,
            meta,
            formulaName: formula.name,
          })
        }
      }
    }
  }

  // Deduplicate — group consecutive stays at the same accommodation
  const groupedStays: Array<{
    accommodationId: number
    dayFrom: number
    dayTo: number
    totalNights: number
    location: string | null
    meta: AccommodationMeta
    formulaName: string
  }> = []

  for (const entry of accommodationEntries) {
    const last = groupedStays[groupedStays.length - 1]
    if (
      last &&
      last.accommodationId === entry.meta.accommodation_id &&
      last.meta.selected_room_category_id === entry.meta.selected_room_category_id
    ) {
      // Extend the stay
      last.dayTo = entry.dayNumberEnd || entry.dayNumber
      last.totalNights += entry.meta.nights || 1
    } else {
      groupedStays.push({
        accommodationId: entry.meta.accommodation_id!,
        dayFrom: entry.dayNumber,
        dayTo: entry.dayNumberEnd || entry.dayNumber,
        totalNights: entry.meta.nights || 1,
        location: entry.locationFrom,
        meta: entry.meta,
        formulaName: entry.formulaName,
      })
    }
  }

  if (groupedStays.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Bed size={24} weight="duotone" className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-500">
          Aucun hébergement n&apos;a encore été défini pour ce circuit.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${continentTheme.primary}15` }}
        >
          <Bed size={16} weight="duotone" style={{ color: continentTheme.primary }} />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">
          Vos hébergements ({groupedStays.length})
        </h2>
      </div>

      <div className="grid gap-4">
        {groupedStays.map((stay, idx) => {
          const accommodation = accommodationsMap[stay.accommodationId]
          const roomCategories = roomCategoriesMap[stay.accommodationId] || []
          const selectedRoom = roomCategories.find(
            (rc: any) => rc.id === stay.meta.selected_room_category_id
          )
          const allPhotos = accommodationPhotosMap[stay.accommodationId] || []

          // Photo priority: room photos first, then hotel-level
          const roomPhotos = allPhotos.filter(
            (p: any) => p.room_category_id === stay.meta.selected_room_category_id
          )
          const hotelPhotos = allPhotos.filter((p: any) => !p.room_category_id)
          const displayPhotos = [...roomPhotos, ...hotelPhotos]
          const mainPhoto = displayPhotos.find((p: any) => p.is_main) || displayPhotos[0]

          const bedTypes = selectedRoom?.available_bed_types
            ?.map((bt: string) => BED_TYPE_LABELS[bt] || bt)
            .join(' / ')

          return (
            <div
              key={`${stay.accommodationId}-${stay.dayFrom}-${idx}`}
              className="flex gap-4 rounded-xl border border-gray-100 bg-white overflow-hidden hover:border-gray-200 transition-colors"
            >
              {/* Photo */}
              <div className="relative w-[140px] min-h-[120px] flex-shrink-0">
                {mainPhoto ? (
                  <Image
                    src={mainPhoto.url_medium || mainPhoto.url_large || mainPhoto.url}
                    alt={mainPhoto.alt_text || accommodation?.name || 'Hébergement'}
                    fill
                    className="object-cover"
                    sizes="140px"
                    placeholder={mainPhoto.lqip_data_url ? 'blur' : 'empty'}
                    blurDataURL={mainPhoto.lqip_data_url ?? undefined}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: `${continentTheme.primary}10` }}
                  >
                    <Bed size={32} weight="duotone" style={{ color: continentTheme.primary }} className="opacity-30" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 py-3.5 pr-4 min-w-0">
                {/* Header: name + stars */}
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">
                    {accommodation?.name || stay.formulaName}
                  </h3>
                  {accommodation?.star_rating > 0 && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {Array.from({ length: accommodation.star_rating }, (_, i) => (
                        <Star key={i} size={11} weight="fill" className="text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Location + days */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  {stay.location && (
                    <span>{stay.location}</span>
                  )}
                  <span className="font-medium" style={{ color: continentTheme.primary }}>
                    {stay.totalNights} nuit{stay.totalNights > 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400">
                    Jour{stay.dayFrom !== stay.dayTo ? `s ${stay.dayFrom}–${stay.dayTo}` : ` ${stay.dayFrom}`}
                  </span>
                </div>

                {/* Room category */}
                {selectedRoom && (
                  <div className="text-xs text-gray-600 mb-2">
                    <span className="font-medium">{selectedRoom.name}</span>
                    {bedTypes && <span className="text-gray-400"> · {bedTypes}</span>}
                    {selectedRoom.size_sqm && <span className="text-gray-400"> · {selectedRoom.size_sqm}m²</span>}
                  </div>
                )}

                {/* Meals */}
                <div className="flex items-center gap-3">
                  {stay.meta.breakfast_included && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <Coffee size={12} weight="duotone" className="text-amber-500" />
                      Petit-déj
                    </span>
                  )}
                  {stay.meta.lunch_included && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <ForkKnife size={12} weight="duotone" className="text-orange-500" />
                      Déjeuner
                    </span>
                  )}
                  {stay.meta.dinner_included && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <Moon size={12} weight="duotone" className="text-indigo-400" />
                      Dîner
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total nights summary */}
      <div className="text-center pt-2">
        <span className="text-xs text-gray-400">
          {groupedStays.reduce((sum, s) => sum + s.totalNights, 0)} nuits au total · {groupedStays.length} hébergement{groupedStays.length > 1 ? 's' : ''} différent{groupedStays.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
