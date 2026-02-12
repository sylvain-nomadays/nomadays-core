import { ClockCountdown, Sparkle, Lightbulb } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// ─── Types ──────────────────────────────────────────────────────────

export type RoadbookCategory = 'practical' | 'experience' | 'tips';

export interface RoadbookLocation {
  lat: number;
  lng: number;
  name?: string;      // "Hall de l'hôtel", "Aéroport Suvarnabhumi"
  address?: string;   // Adresse formatée complète
  place_id?: string;  // Google Place ID
}

export interface RoadbookCategoryConfig {
  code: RoadbookCategory;
  label: string;
  description: string;
  icon: Icon;
  color: string;
  bgColor: string;
  borderColor: string;
  placeholder: string;
}

// ─── Category configurations ────────────────────────────────────────

export const ROADBOOK_CATEGORIES: Record<RoadbookCategory, RoadbookCategoryConfig> = {
  practical: {
    code: 'practical',
    label: 'Infos pratiques',
    description: 'Horaires, rendez-vous, infos logistiques',
    icon: ClockCountdown,
    color: '#0FB6BC',
    bgColor: '#E6F9FA',
    borderColor: 'rgba(15, 182, 188, 0.25)',
    placeholder: 'Rendez-vous à 9h00 à la réception de votre hôtel / Vol TG504 départ 14h30 terminal 2...',
  },
  experience: {
    code: 'experience',
    label: 'Expérience',
    description: 'Moments forts, activités recommandées',
    icon: Sparkle,
    color: '#DD9371',
    bgColor: '#FDF5F2',
    borderColor: 'rgba(221, 147, 113, 0.25)',
    placeholder: 'Consacrez une heure au SPA pour un massage aromathérapie / Ce soir, ne manquez pas un dîner de spécialités locales au restaurant...',
  },
  tips: {
    code: 'tips',
    label: 'Conseils',
    description: 'Conseils pratiques, bons plans',
    icon: Lightbulb,
    color: '#8BA080',
    bgColor: '#F4F7F3',
    borderColor: 'rgba(139, 160, 128, 0.25)',
    placeholder: 'N\'oubliez pas ce matin de prévoir des affaires de rechange / Pendant le trek vous pourrez laisser vos bagages à la réception...',
  },
};

export const CATEGORY_LIST: RoadbookCategoryConfig[] = [
  ROADBOOK_CATEGORIES.practical,
  ROADBOOK_CATEGORIES.experience,
  ROADBOOK_CATEGORIES.tips,
];

export const DEFAULT_CATEGORY: RoadbookCategory = 'practical';

// ─── Parse / Strip / Build helpers ──────────────────────────────────

const META_REGEX = /^<!--ROADBOOK_META:(.*?)-->/;

/**
 * Extract roadbook metadata (category + optional location) from description_html.
 * Returns null if no metadata comment found.
 */
export function parseRoadbookMeta(html?: string): {
  category: RoadbookCategory;
  location?: RoadbookLocation;
} | null {
  if (!html) return null;
  const match = html.match(META_REGEX);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed?.category && parsed.category in ROADBOOK_CATEGORIES) {
      const result: { category: RoadbookCategory; location?: RoadbookLocation } = {
        category: parsed.category as RoadbookCategory,
      };
      // Extract optional location
      if (parsed.location && typeof parsed.location.lat === 'number' && typeof parsed.location.lng === 'number') {
        result.location = parsed.location as RoadbookLocation;
      }
      return result;
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Remove the metadata comment, returning only the HTML content
 * for the RichTextEditor.
 */
export function stripRoadbookMeta(html: string): string {
  return html.replace(META_REGEX, '').trimStart();
}

/**
 * Reconstruct the full description_html with metadata + content.
 * Optionally includes location data in the metadata comment.
 */
export function buildRoadbookHtml(
  content: string,
  category: RoadbookCategory,
  location?: RoadbookLocation | null,
): string {
  const metaObj: Record<string, unknown> = { category };
  if (location) {
    metaObj.location = location;
  }
  const meta = JSON.stringify(metaObj);
  return `<!--ROADBOOK_META:${meta}-->${content}`;
}

/**
 * Get the category config, with fallback to default.
 */
export function getCategoryConfig(html?: string): RoadbookCategoryConfig {
  const meta = parseRoadbookMeta(html);
  return ROADBOOK_CATEGORIES[meta?.category || DEFAULT_CATEGORY];
}
