/**
 * Types for the "Explorer les Destinations" page.
 *
 * Used by the Mapbox flat map, search bar, continent filters,
 * agency panel, and contact CTA.
 */

// ─── Core types ─────────────────────────────────────────────────────────────

export type ExplorerContinent = 'asia' | 'africa' | 'latin-america' | 'europe' | 'oceania'

export interface PopularTrip {
  name: string
  duration_days: number
  theme: string
  price_from: number
  currency: string
  image_url?: string
}

export interface DestinationAgency {
  id: string
  tenant_id: string | null
  name: string
  slug: string
  description: string | null
  tagline: string | null
  country_code: string
  country_name: string
  continent: ExplorerContinent
  latitude: number
  longitude: number
  cover_image_url: string | null
  logo_url: string | null
  languages: string[]
  year_founded: number | null
  location: string | null
  website: string | null
  trips_count: number
  reviews_count: number
  reviews_score: number
  host_name: string | null
  host_avatar_url: string | null
  host_role: string | null
  host_experience_years: number | null
  popular_trips: PopularTrip[]
  is_published: boolean
}

// ─── Filter config ──────────────────────────────────────────────────────────

export interface ContinentFilter {
  value: ExplorerContinent | 'all'
  label: string
  /** Phosphor icon name (used in ExplorerSearchBar to pick the right icon) */
  icon: string
  color: string
}

export const CONTINENT_FILTERS: ContinentFilter[] = [
  { value: 'all', label: 'Tous', icon: 'GlobeSimple', color: '#0FB6BC' },
  { value: 'asia', label: 'Asie', icon: 'GlobeHemisphereEast', color: '#D4A020' },
  { value: 'africa', label: 'Afrique', icon: 'GlobeHemisphereWest', color: '#6B8E4E' },
  { value: 'europe', label: 'Europe', icon: 'Church', color: '#1B7F8E' },
  { value: 'latin-america', label: 'Am\u00e9riques', icon: 'Mountains', color: '#B85C3B' },
  { value: 'oceania', label: 'Oc\u00e9anie', icon: 'Island', color: '#1A9E9E' },
]

// ─── Marker colors per continent (aligned with continent-theme.ts) ──────────

export const EXPLORER_MARKER_COLORS: Record<ExplorerContinent, string> = {
  asia: '#D4A020',          // Safran doux
  africa: '#6B8E4E',        // Vert savane
  'latin-america': '#B85C3B', // Rouge adobe
  europe: '#1B7F8E',        // Bleu ardoise
  oceania: '#1A9E9E',       // Bleu lagon
}

// ─── Legend config ───────────────────────────────────────────────────────────

export const EXPLORER_LEGEND: { continent: ExplorerContinent; label: string; color: string }[] = [
  { continent: 'asia', label: 'Asie', color: '#D4A020' },
  { continent: 'africa', label: 'Afrique', color: '#6B8E4E' },
  { continent: 'europe', label: 'Europe', color: '#1B7F8E' },
  { continent: 'latin-america', label: 'Am\u00e9riques', color: '#B85C3B' },
  { continent: 'oceania', label: 'Oc\u00e9anie', color: '#1A9E9E' },
]
