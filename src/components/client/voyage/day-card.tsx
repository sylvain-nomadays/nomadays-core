import Image from 'next/image';
import {
  Compass,
  Bed,
  Car,
  FileText,
  Coffee,
  ForkKnife,
  MoonStars,
  MapPin,
  Clock,
  Ruler,
  AirplaneTilt,
  Train,
  Boat,
  PersonSimpleWalk,
  Horse,
  Bicycle,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ClientAccommodationTabs } from './client-accommodation-tabs';
import { DayFeedbackPanel } from './day-feedback-panel';
import type { ContinentTheme } from '../continent-theme';
import type { ReactionType, PaceType } from '@/lib/actions/day-feedback';
import type {
  AccommodationLookup,
  RoomCategoryLookup,
  AccommodationPhotoLookup,
  ConditionDataLookup,
} from './day-by-day-program';
import { formatTripDayLabel } from '@/lib/formatTripDate';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormulaBlock {
  id: number;
  name: string;
  block_type?: string | null;
  description_html?: string | null;
  sort_order?: number | null;
  condition_id?: number | null;
  parent_block_id?: number | null;
}

interface DayPhoto {
  url_medium?: string | null;
  url_large?: string | null;
  alt_text?: string | null;
  lqip_data_url?: string | null;
}

interface DayCardProps {
  tripDayId: number;
  dayNumber: number;
  dayNumberEnd?: number | null;
  title?: string | null;
  description?: string | null;
  locationFrom?: string | null;
  locationTo?: string | null;
  breakfastIncluded?: boolean;
  lunchIncluded?: boolean;
  dinnerIncluded?: boolean;
  formulas: FormulaBlock[];
  photo?: DayPhoto | null;
  continentTheme: ContinentTheme;
  startDate?: string | null;
  accommodationsMap?: Record<number, AccommodationLookup>;
  roomCategoriesMap?: Record<number, RoomCategoryLookup[]>;
  accommodationPhotosMap?: Record<number, AccommodationPhotoLookup[]>;
  conditionData?: ConditionDataLookup;
  feedbackContext?: {
    dossierId: string;
    participantId: string;
    participantEmail: string;
    participantName: string;
    advisorEmail: string;
    advisorName: string;
    initialReaction: ReactionType | null;
    initialPace: PaceType;
  };
}

// ─── Block type icons ────────────────────────────────────────────────────────

const BLOCK_TYPE_CONFIG: Record<string, { icon: PhosphorIcon; label: string }> = {
  activity: { icon: Compass, label: 'Activité' },
  text: { icon: FileText, label: 'Note' },
  service: { icon: Compass, label: 'Service' },
};

const DEFAULT_BLOCK_CONFIG = { icon: FileText as PhosphorIcon, label: 'Note' };

// ─── Generic block names to hide ─────────────────────────────────────────────

const GENERIC_BLOCK_NAMES = new Set([
  'Déplacement',
  'Nouvelle activité',
  'Texte',
  'Texte libre',
  'Hébergement',
  'Hébergement non défini',
  'Service',
  'Note',
  'Nouveau bloc',
]);

// ─── Transport helpers ───────────────────────────────────────────────────────

interface TransportMeta {
  travel_mode: string;
  location_from_name?: string;
  location_to_name?: string;
  distance_km?: number;
  duration_minutes?: number;
  narrative_text?: string;
}

const TRANSPORT_MODE_CONFIG: Record<string, { icon: PhosphorIcon; label: string }> = {
  driving: { icon: Car, label: 'Route' },
  flight: { icon: AirplaneTilt, label: 'Vol' },
  transit: { icon: Train, label: 'Train' },
  boat: { icon: Boat, label: 'Bateau' },
  walking: { icon: PersonSimpleWalk, label: 'Trek' },
  horse: { icon: Horse, label: 'Cheval' },
  camel: { icon: Horse, label: 'Chameau' },
  bicycle: { icon: Bicycle, label: 'Vélo' },
  kayak: { icon: Boat, label: 'Kayak' },
};

const DEFAULT_TRANSPORT_CONFIG = { icon: Car as PhosphorIcon, label: 'Transport' };

function parseTransportMeta(descriptionHtml?: string | null): TransportMeta | null {
  if (!descriptionHtml) return null;
  try {
    const parsed = JSON.parse(descriptionHtml);
    if (parsed && typeof parsed === 'object' && parsed.travel_mode) {
      return parsed as TransportMeta;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// ─── Accommodation helpers ───────────────────────────────────────────────────

interface AccommodationMeta {
  accommodation_id?: number;
  selected_room_category_id?: number;
  nights?: number;
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
}

function parseAccommodationMeta(descriptionHtml?: string | null): AccommodationMeta | null {
  if (!descriptionHtml) return null;
  try {
    const parsed = JSON.parse(descriptionHtml);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* not JSON */
  }
  return null;
}

const BED_TYPE_LABELS: Record<string, string> = {
  DBL: 'Double',
  TWN: 'Twin',
  SGL: 'Single',
  TPL: 'Triple',
  FAM: 'Familiale',
  EXB: 'Lit supplémentaire',
  CNT: 'Lit enfant',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DayCard({
  tripDayId,
  dayNumber,
  dayNumberEnd,
  title,
  description,
  locationFrom,
  locationTo,
  breakfastIncluded,
  lunchIncluded,
  dinnerIncluded,
  formulas,
  photo,
  continentTheme,
  startDate,
  accommodationsMap,
  roomCategoriesMap,
  accommodationPhotosMap,
  conditionData,
  feedbackContext,
}: DayCardProps) {
  const { dayLabel, dateLabel } = formatTripDayLabel(dayNumber, dayNumberEnd, startDate);
  const fullDayLabel = dateLabel ? `${dayLabel} – ${dateLabel}` : dayLabel;

  const hasLocation = locationFrom || locationTo;

  // ── Split formulas by type ──
  const allVisible = formulas
    .filter((f) => f.block_type !== 'roadbook') // 4.1: hide roadbook
    .filter((f) => f.name || f.description_html)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const regularFormulas = allVisible.filter(
    (f) => f.block_type !== 'accommodation' && f.block_type !== 'transport'
  );
  const transportFormulas = allVisible.filter((f) => f.block_type === 'transport');
  const accommodationFormulas = allVisible.filter((f) => f.block_type === 'accommodation');

  // ── Aggregate meals from day-level + accommodation blocks ──
  let aggregatedBreakfast = breakfastIncluded || false;
  let aggregatedLunch = lunchIncluded || false;
  let aggregatedDinner = dinnerIncluded || false;

  for (const formula of accommodationFormulas) {
    const meta = parseAccommodationMeta(formula.description_html);
    if (meta) {
      if (meta.breakfast_included) aggregatedBreakfast = true;
      if (meta.lunch_included) aggregatedLunch = true;
      if (meta.dinner_included) aggregatedDinner = true;
    }
  }

  const hasMeals = aggregatedBreakfast || aggregatedLunch || aggregatedDinner;

  // ── Group accommodation variants by condition_id ──
  const standaloneAccommodations: FormulaBlock[] = [];
  const variantGroups = new Map<number, FormulaBlock[]>();

  for (const formula of accommodationFormulas) {
    if (formula.condition_id) {
      const group = variantGroups.get(formula.condition_id) || [];
      group.push(formula);
      variantGroups.set(formula.condition_id, group);
    } else {
      standaloneAccommodations.push(formula);
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-5 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
      {/* Photo section */}
      {photo && (photo.url_large || photo.url_medium) ? (
        <div className="md:w-[280px] flex-shrink-0 relative h-[200px] md:h-auto">
          <Image
            src={photo.url_large ?? photo.url_medium ?? ''}
            alt={photo.alt_text ?? title ?? `Jour ${dayNumber}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 280px"
            placeholder={photo.lqip_data_url ? 'blur' : 'empty'}
            blurDataURL={photo.lqip_data_url ?? undefined}
          />
          <div
            className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: continentTheme.primary }}
          >
            <span className="text-sm font-bold">{dayLabel}</span>
            {dateLabel && (
              <span className="text-xs font-medium opacity-90 ml-1.5">– {dateLabel}</span>
            )}
          </div>
        </div>
      ) : null}

      {/* Content section */}
      <div className="flex-1 p-5">
        {/* Day badge (only if no photo) */}
        {(!photo || (!photo.url_large && !photo.url_medium)) && (
          <span
            className="inline-block px-3 py-1 rounded-lg text-white mb-3"
            style={{ backgroundColor: continentTheme.primary }}
          >
            <span className="text-sm font-bold">{dayLabel}</span>
            {dateLabel && (
              <span className="text-xs font-medium opacity-90 ml-1.5">– {dateLabel}</span>
            )}
          </span>
        )}

        {/* Title */}
        {title && <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>}

        {/* Location */}
        {hasLocation && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <MapPin size={14} weight="duotone" className="flex-shrink-0" />
            {locationFrom && locationTo && locationFrom !== locationTo ? (
              <span>
                {locationFrom} → {locationTo}
              </span>
            ) : (
              <span>{locationFrom || locationTo}</span>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{description}</p>
        )}

        {/* ── Transport blocks (enriched) ── */}
        {transportFormulas.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {transportFormulas.map((formula) => {
              const meta = parseTransportMeta(formula.description_html);
              const transportConfig = meta ? TRANSPORT_MODE_CONFIG[meta.travel_mode] || DEFAULT_TRANSPORT_CONFIG : DEFAULT_TRANSPORT_CONFIG;
              const TransportIcon = transportConfig.icon;
              const hasRoute = meta?.location_from_name && meta?.location_to_name;
              const modeLabel = transportConfig.label;

              return (
                <div key={formula.id} className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${continentTheme.primary}10` }}
                  >
                    <TransportIcon size={16} weight="duotone" style={{ color: continentTheme.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {hasRoute ? (
                      <p className="text-sm font-medium text-gray-800">
                        {meta!.location_from_name} → {meta!.location_to_name}
                      </p>
                    ) : !GENERIC_BLOCK_NAMES.has(formula.name) ? (
                      <p className="text-sm font-medium text-gray-800">{formula.name}</p>
                    ) : (
                      <p className="text-sm font-medium text-gray-800">{modeLabel}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {meta?.duration_minutes && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} weight="duotone" />
                          {formatDuration(meta.duration_minutes)}
                        </span>
                      )}
                      {meta?.distance_km && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Ruler size={12} weight="duotone" />
                          {meta.distance_km} km
                        </span>
                      )}
                    </div>
                    {meta?.narrative_text && (
                      <div
                        className="text-xs text-gray-500 mt-0.5 line-clamp-2 [&>p]:m-0"
                        dangerouslySetInnerHTML={{ __html: meta.narrative_text }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Regular formula blocks (activity, text, service) ── */}
        {regularFormulas.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {regularFormulas.map((formula) => {
              const config =
                BLOCK_TYPE_CONFIG[formula.block_type ?? 'text'] ?? DEFAULT_BLOCK_CONFIG;
              const Icon = config.icon;
              const showName = !GENERIC_BLOCK_NAMES.has(formula.name);

              // For activity blocks, try to extract description from meals metadata prefix
              let descHtml = formula.description_html;
              if (formula.block_type === 'activity' && descHtml) {
                // Strip <!--meals:{...}--> prefix
                descHtml = descHtml.replace(/<!--meals:\{[^}]*\}-->/, '');
              }

              return (
                <div key={formula.id} className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${continentTheme.primary}10` }}
                  >
                    <Icon size={14} weight="duotone" style={{ color: continentTheme.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {showName && (
                      <p className="text-sm font-medium text-gray-800">{formula.name}</p>
                    )}
                    {descHtml && descHtml.trim() && (
                      <div
                        className="text-xs text-gray-500 mt-0.5 line-clamp-2 [&>p]:m-0"
                        dangerouslySetInnerHTML={{ __html: descHtml }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Accommodation section (bottom of day) ── */}
        {(standaloneAccommodations.length > 0 || variantGroups.size > 0) && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            {/* Standalone accommodations (no variants) */}
            {standaloneAccommodations.map((formula) => (
              <AccommodationCard
                key={formula.id}
                formula={formula}
                continentTheme={continentTheme}
                accommodationsMap={accommodationsMap}
                roomCategoriesMap={roomCategoriesMap}
                accommodationPhotosMap={accommodationPhotosMap}
              />
            ))}

            {/* Variant groups (tabs) */}
            {Array.from(variantGroups.entries()).map(([conditionId, variants]) => {
              // Build tabs metadata
              const tc = conditionData?.tripConditions.find(
                (t) => t.condition_id === conditionId
              );
              const activeOptionId = tc?.selected_option_id ?? null;

              const tabs = variants
                .map((v) => {
                  const formulaOptionId =
                    conditionData?.itemConditionMap[v.id] ?? null;
                  const option = formulaOptionId
                    ? conditionData?.conditionOptions.find((o) => o.id === formulaOptionId)
                    : null;
                  return {
                    formulaId: v.id,
                    label: option?.label || v.name || 'Option',
                    isDefault: formulaOptionId === activeOptionId,
                    sortOrder: option?.sort_order ?? 999,
                  };
                })
                .sort((a, b) => a.sortOrder - b.sortOrder);

              return (
                <ClientAccommodationTabs
                  key={conditionId}
                  variants={tabs}
                  continentTheme={continentTheme}
                >
                  {tabs.map((tab) => {
                    const formula = variants.find((v) => v.id === tab.formulaId)!;
                    return (
                      <div key={tab.formulaId} className="p-3">
                        <AccommodationCard
                          formula={formula}
                          continentTheme={continentTheme}
                          accommodationsMap={accommodationsMap}
                          roomCategoriesMap={roomCategoriesMap}
                          accommodationPhotosMap={accommodationPhotosMap}
                        />
                      </div>
                    );
                  })}
                </ClientAccommodationTabs>
              );
            })}
          </div>
        )}

        {/* ── Meals — "Repas inclus" ── */}
        {hasMeals && (
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100 mt-4">
            <span className="text-xs font-semibold text-gray-600">Repas inclus</span>
            {aggregatedBreakfast && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${continentTheme.primary}12`,
                  color: continentTheme.primary,
                }}
              >
                <Coffee size={12} weight="duotone" />
                Petit-déjeuner
              </span>
            )}
            {aggregatedLunch && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${continentTheme.primary}12`,
                  color: continentTheme.primary,
                }}
              >
                <ForkKnife size={12} weight="duotone" />
                Déjeuner
              </span>
            )}
            {aggregatedDinner && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${continentTheme.primary}12`,
                  color: continentTheme.primary,
                }}
              >
                <MoonStars size={12} weight="duotone" />
                Dîner
              </span>
            )}
          </div>
        )}

        {/* ── Feedback panel (reactions + comment + pace) ── */}
        {feedbackContext && (
          <DayFeedbackPanel
            tripDayId={tripDayId}
            dayNumber={dayNumber}
            dayTitle={title ?? null}
            dossierId={feedbackContext.dossierId}
            participantId={feedbackContext.participantId}
            participantEmail={feedbackContext.participantEmail}
            participantName={feedbackContext.participantName}
            advisorEmail={feedbackContext.advisorEmail}
            advisorName={feedbackContext.advisorName}
            initialReaction={feedbackContext.initialReaction}
            initialPace={feedbackContext.initialPace}
            continentTheme={continentTheme}
          />
        )}
      </div>
    </div>
  );
}

// ─── AccommodationCard sub-component ─────────────────────────────────────────

function AccommodationCard({
  formula,
  continentTheme,
  accommodationsMap,
  roomCategoriesMap,
  accommodationPhotosMap,
}: {
  formula: FormulaBlock;
  continentTheme: ContinentTheme;
  accommodationsMap?: Record<number, AccommodationLookup>;
  roomCategoriesMap?: Record<number, RoomCategoryLookup[]>;
  accommodationPhotosMap?: Record<number, AccommodationPhotoLookup[]>;
}) {
  const meta = parseAccommodationMeta(formula.description_html);
  if (!meta?.accommodation_id) {
    // Fallback: show generic name
    if (!GENERIC_BLOCK_NAMES.has(formula.name)) {
      return (
        <div className="flex items-center gap-2">
          <Bed size={16} weight="duotone" style={{ color: continentTheme.primary }} />
          <span className="text-sm text-gray-700">{formula.name}</span>
        </div>
      );
    }
    return null;
  }

  const accommodation = accommodationsMap?.[meta.accommodation_id];
  if (!accommodation) return null;

  const roomCategories = roomCategoriesMap?.[meta.accommodation_id] || [];
  const selectedRoom = meta.selected_room_category_id
    ? roomCategories.find((rc) => rc.id === meta.selected_room_category_id)
    : null;

  // Photos: hotel-level + selected room photos
  const allPhotos = accommodationPhotosMap?.[meta.accommodation_id] || [];
  const hotelPhotos = allPhotos.filter((p) => !p.room_category_id);
  const roomPhotos = meta.selected_room_category_id
    ? allPhotos.filter((p) => p.room_category_id === meta.selected_room_category_id)
    : [];
  const displayPhotos = [...roomPhotos, ...hotelPhotos]; // room photos first
  const mainPhoto = displayPhotos.find((p) => p.is_main) || displayPhotos[0];

  // Room bed type label
  const bedTypeLabel =
    selectedRoom?.available_bed_types && selectedRoom.available_bed_types.length > 0
      ? selectedRoom.available_bed_types
          .map((bt) => BED_TYPE_LABELS[bt] || bt)
          .join(' / ')
      : null;

  return (
    <div className="flex items-start gap-3">
      {/* Photo thumbnail */}
      {mainPhoto && (
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
          <Image
            src={mainPhoto.url_medium || mainPhoto.url_large || mainPhoto.url}
            alt={mainPhoto.alt_text || accommodation.name}
            fill
            className="object-cover"
            sizes="80px"
            placeholder={mainPhoto.lqip_data_url ? 'blur' : 'empty'}
            blurDataURL={mainPhoto.lqip_data_url ?? undefined}
          />
        </div>
      )}
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Bed size={14} weight="duotone" className="flex-shrink-0" style={{ color: continentTheme.primary }} />
          <p className="text-sm font-medium text-gray-800 truncate">{accommodation.name}</p>
          {accommodation.star_rating && accommodation.star_rating > 0 && (
            <span className="text-amber-400 text-xs flex-shrink-0">
              {'★'.repeat(accommodation.star_rating)}
            </span>
          )}
        </div>
        {selectedRoom && (
          <p className="text-xs text-gray-500 mt-0.5">
            Chambre {selectedRoom.name}
            {bedTypeLabel && ` · ${bedTypeLabel}`}
            {selectedRoom.size_sqm && ` · ${selectedRoom.size_sqm}m²`}
          </p>
        )}
        {meta.nights && meta.nights > 1 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {meta.nights} nuit{meta.nights > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
