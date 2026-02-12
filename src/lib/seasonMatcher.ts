/**
 * Season matching and rate resolution utilities for accommodations.
 *
 * Used by AccommodationBlock and AccommodationSelectorDialog to:
 * 1. Determine which season applies for a given trip date
 * 2. Find the best rate for each room category
 */

import type { AccommodationSeason, RoomRate } from '@/lib/api/types';

// ============================================================================
// Season Matching
// ============================================================================

/**
 * Resolve which season applies for a given date.
 * Returns the matching season ID, or null if no season matches (= use default rate).
 *
 * Priority logic:
 * 1. Filter active seasons only
 * 2. Check date against each season type (fixed, recurring, weekday)
 * 3. If multiple match, return highest priority
 */
export function resolveSeasonForDate(
  seasons: AccommodationSeason[],
  date: Date
): number | null {
  if (!seasons?.length) return null;

  const matching = seasons
    .filter((s) => s.is_active && dateMatchesSeason(date, s))
    .sort((a, b) => b.priority - a.priority); // highest priority first

  if (matching.length === 0) return null;
  const best = matching[0];
  return best?.id ?? null;
}

/**
 * Check if a date falls within a season's period.
 */
function dateMatchesSeason(date: Date, season: AccommodationSeason): boolean {
  switch (season.season_type) {
    case 'fixed':
      return dateInFixedSeason(date, season);
    case 'recurring':
      return dateInRecurringSeason(date, season);
    case 'weekday':
      return dateInWeekdaySeason(date, season);
    default:
      return false;
  }
}

/**
 * Fixed season: start_date and end_date are full ISO dates (YYYY-MM-DD).
 * Optional year field can be "2024" or "2024-2025".
 */
function dateInFixedSeason(date: Date, season: AccommodationSeason): boolean {
  if (!season.start_date || !season.end_date) return false;

  const start = new Date(season.start_date + 'T00:00:00');
  const end = new Date(season.end_date + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  const d = stripTime(date);
  return d >= start && d <= end;
}

/**
 * Recurring season: start_date and end_date are MM-DD format.
 * Matches the same month-day range every year.
 */
function dateInRecurringSeason(date: Date, season: AccommodationSeason): boolean {
  if (!season.start_date || !season.end_date) return false;

  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const mmdd = month * 100 + day; // e.g. 1224 for Dec 24

  const [startMonth, startDay] = season.start_date.split('-').map(Number);
  const [endMonth, endDay] = season.end_date.split('-').map(Number);

  if (!startMonth || !startDay || !endMonth || !endDay) return false;

  const startMmdd = startMonth * 100 + startDay;
  const endMmdd = endMonth * 100 + endDay;

  if (startMmdd <= endMmdd) {
    // Normal range: e.g. 03-01 to 06-30
    return mmdd >= startMmdd && mmdd <= endMmdd;
  } else {
    // Wraps around year end: e.g. 11-01 to 02-28
    return mmdd >= startMmdd || mmdd <= endMmdd;
  }
}

/**
 * Weekday season: matches specific days of the week.
 * weekdays array: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
function dateInWeekdaySeason(date: Date, season: AccommodationSeason): boolean {
  if (!season.weekdays?.length) return false;
  return season.weekdays.includes(date.getDay());
}

/**
 * Strip time from a Date, keeping only the date part.
 */
function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ============================================================================
// Rate Resolution
// ============================================================================

/**
 * Build a Map<room_category_id, RoomRate> for quick rate lookup.
 *
 * For each room_category_id, picks the best rate:
 * 1. Exact season match (season_id matches resolved season)
 * 2. Default rate (season_id is null/undefined)
 * 3. Any active rate as fallback
 *
 * Prefers bed_type "DBL" if available.
 */
export function buildRateMap(
  rates: RoomRate[],
  seasonId: number | null,
  preferredBedType: string = 'DBL'
): Map<number, RoomRate> {
  const map = new Map<number, RoomRate>();

  if (!rates?.length) return map;

  // Group rates by room_category_id
  const byRoom = new Map<number, RoomRate[]>();
  for (const rate of rates) {
    if (!rate.is_active) continue;
    const existing = byRoom.get(rate.room_category_id) || [];
    existing.push(rate);
    byRoom.set(rate.room_category_id, existing);
  }

  // For each room, find the best rate
  for (const [roomId, roomRates] of byRoom) {
    const best = pickBestRate(roomRates, seasonId, preferredBedType);
    if (best) {
      map.set(roomId, best);
    }
  }

  return map;
}

/**
 * Build a Map<bed_type, RoomRate> for a specific room category.
 * Returns one rate per bed type (DBL, TWN, SGL, etc.)
 *
 * Used for room allocation: we need prices per bed type, not per room category.
 */
export function buildRateMapByBedType(
  rates: RoomRate[],
  seasonId: number | null,
  roomCategoryId: number
): Map<string, RoomRate> {
  const map = new Map<string, RoomRate>();

  if (!rates?.length) return map;

  // Filter rates for this room category
  const roomRates = rates.filter(
    (r) => r.is_active && r.room_category_id === roomCategoryId
  );

  // Group by bed_type
  const byBedType = new Map<string, RoomRate[]>();
  for (const rate of roomRates) {
    const existing = byBedType.get(rate.bed_type) || [];
    existing.push(rate);
    byBedType.set(rate.bed_type, existing);
  }

  // For each bed type, pick the best rate (exact season > default > any)
  for (const [bedType, bedRates] of byBedType) {
    const best = pickBestRate(bedRates, seasonId, bedType);
    if (best) {
      map.set(bedType, best);
    }
  }

  return map;
}

/**
 * Pick the best rate from a set of rates for a room.
 */
function pickBestRate(
  rates: RoomRate[],
  seasonId: number | null,
  preferredBedType: string
): RoomRate | null {
  if (!rates.length) return null;

  // Score each rate
  const scored = rates.map((rate) => {
    let score = 0;

    // Season match: highest priority
    if (seasonId !== null && rate.season_id === seasonId) {
      score += 100;
    } else if (!rate.season_id) {
      // Default rate (no season) — good fallback
      score += 50;
    }
    // Rates for other seasons get score 0

    // Bed type preference
    if (rate.bed_type === preferredBedType) {
      score += 10;
    }

    return { rate, score };
  });

  // Sort by score descending, return best
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;
  return best.rate;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate the date for a specific day in a trip.
 * @param tripStartDate ISO date string (e.g. "2025-03-15")
 * @param dayNumber 1-based day number
 * @returns Date object for that day, or null if no start date
 */
export function getTripDayDate(
  tripStartDate: string | undefined,
  dayNumber: number
): Date | null {
  if (!tripStartDate) return null;
  const start = new Date(tripStartDate + 'T00:00:00');
  if (isNaN(start.getTime())) return null;
  const result = new Date(start);
  result.setDate(result.getDate() + (dayNumber - 1));
  return result;
}

/**
 * Format a rate for display.
 * @returns e.g. "1 200 THB" or null if no rate
 */
export function formatRate(rate: RoomRate | undefined): string | null {
  if (!rate || rate.cost === 0) return null;
  const formatted = rate.cost.toLocaleString('fr-FR');
  return `${formatted} ${rate.currency || 'THB'}`;
}
