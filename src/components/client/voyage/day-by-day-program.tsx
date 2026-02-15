import { MapPin } from '@phosphor-icons/react/dist/ssr';
import { DayCard } from './day-card';
import type { ContinentTheme } from '../continent-theme';
import type { ReactionType, PaceType } from '@/lib/actions/day-feedback';

// ─── Types (matching Supabase query shape) ───────────────────────────────────

interface TripDayData {
  id: number;
  day_number: number;
  day_number_end?: number | null;
  title?: string | null;
  description?: string | null;
  location_from?: string | null;
  location_to?: string | null;
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
  formulas?: Array<{
    id: number;
    name: string;
    block_type?: string | null;
    description_html?: string | null;
    sort_order?: number | null;
    condition_id?: number | null;
    parent_block_id?: number | null;
  }>;
}

interface TripPhotoData {
  day_number?: number | null;
  url_medium?: string | null;
  url_large?: string | null;
  alt_text?: string | null;
  lqip_data_url?: string | null;
  is_hero?: boolean;
}

// ─── Accommodation & condition data types ────────────────────────────────────

export interface AccommodationLookup {
  id: number;
  name: string;
  star_rating?: number | null;
}

export interface RoomCategoryLookup {
  id: number;
  accommodation_id: number;
  name: string;
  available_bed_types?: string[] | null;
  size_sqm?: number | null;
  max_occupancy?: number | null;
}

export interface AccommodationPhotoLookup {
  id: number;
  accommodation_id: number;
  room_category_id?: number | null;
  url: string;
  url_medium?: string | null;
  url_large?: string | null;
  lqip_data_url?: string | null;
  caption?: string | null;
  alt_text?: string | null;
  is_main: boolean;
  sort_order: number;
}

export interface ConditionDataLookup {
  tripConditions: Array<{
    id: number;
    condition_id: number;
    selected_option_id?: number | null;
    is_active: boolean;
  }>;
  conditions: Array<{
    id: number;
    name: string;
  }>;
  conditionOptions: Array<{
    id: number;
    condition_id: number;
    label: string;
    sort_order: number;
  }>;
  itemConditionMap: Record<number, number | null>; // formula_id → condition_option_id
}

export interface FeedbackContext {
  dossierId: string;
  participantId: string;
  participantEmail: string;
  participantName: string;
  advisorEmail: string;
  advisorName: string;
  reactions: Record<number, ReactionType>;
  paces: Record<number, PaceType>;
}

interface DayByDayProgramProps {
  tripDays: TripDayData[];
  photos: TripPhotoData[];
  continentTheme: ContinentTheme;
  startDate?: string | null;
  accommodationsMap?: Record<number, AccommodationLookup>;
  roomCategoriesMap?: Record<number, RoomCategoryLookup[]>;
  accommodationPhotosMap?: Record<number, AccommodationPhotoLookup[]>;
  conditionData?: ConditionDataLookup;
  feedbackContext?: FeedbackContext;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DayByDayProgram({
  tripDays,
  photos,
  continentTheme,
  startDate,
  accommodationsMap,
  roomCategoriesMap,
  accommodationPhotosMap,
  conditionData,
  feedbackContext,
}: DayByDayProgramProps) {
  if (!tripDays || tripDays.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin size={40} weight="duotone" className="mx-auto mb-3 text-gray-200" />
        <p className="text-sm text-gray-500">
          Votre hôte prépare actuellement le programme de votre voyage.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Le détail jour par jour sera bientôt disponible ici.
        </p>
      </div>
    );
  }

  // Build a map of day_number → best photo
  const photosByDay = new Map<number, TripPhotoData>();
  for (const photo of photos) {
    if (photo.day_number && !photo.is_hero) {
      // Keep the first photo per day (already sorted by sort_order)
      if (!photosByDay.has(photo.day_number)) {
        photosByDay.set(photo.day_number, photo);
      }
    }
  }

  // Sort days by day_number
  const sortedDays = [...tripDays].sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="space-y-6">
      {/* Day cards */}
      <div className="space-y-4">
        {sortedDays.map((day) => (
          <DayCard
            key={day.id}
            tripDayId={day.id}
            dayNumber={day.day_number}
            dayNumberEnd={day.day_number_end}
            title={day.title}
            description={day.description}
            locationFrom={day.location_from}
            locationTo={day.location_to}
            breakfastIncluded={day.breakfast_included}
            lunchIncluded={day.lunch_included}
            dinnerIncluded={day.dinner_included}
            formulas={day.formulas ?? []}
            photo={photosByDay.get(day.day_number) ?? null}
            continentTheme={continentTheme}
            startDate={startDate}
            accommodationsMap={accommodationsMap}
            roomCategoriesMap={roomCategoriesMap}
            accommodationPhotosMap={accommodationPhotosMap}
            conditionData={conditionData}
            feedbackContext={feedbackContext ? {
              dossierId: feedbackContext.dossierId,
              participantId: feedbackContext.participantId,
              participantEmail: feedbackContext.participantEmail,
              participantName: feedbackContext.participantName,
              advisorEmail: feedbackContext.advisorEmail,
              advisorName: feedbackContext.advisorName,
              initialReaction: feedbackContext.reactions[day.id] ?? null,
              initialPace: feedbackContext.paces[day.id] ?? 'normal',
            } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
