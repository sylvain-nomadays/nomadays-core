import type { DossierStatus, DossierOrigin, TripType, ServiceType, MarketingSource, LostReason, CustomerStatus } from '@/lib/supabase/database.types'

// Dossier status configuration
export const DOSSIER_STATUSES: {
  value: DossierStatus
  label: string
  color: string
  bgColor: string
  description: string
}[] = [
  {
    value: 'ignored',
    label: 'Rejeté',
    color: '#9CA3AF',
    bgColor: 'bg-gray-100 border-gray-300',
    description: 'Demande non qualifiée',
  },
  {
    value: 'lead',
    label: 'Nouveau lead',
    color: '#3B82F6',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Demande entrante à qualifier',
  },
  {
    value: 'quote_in_progress',
    label: 'Devis en cours',
    color: '#F59E0B',
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Devis en préparation',
  },
  {
    value: 'quote_sent',
    label: 'Devis envoyé',
    color: '#8B5CF6',
    bgColor: 'bg-purple-50 border-purple-200',
    description: 'En attente de réponse client',
  },
  {
    value: 'negotiation',
    label: 'Négociation',
    color: '#EA580C',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Discussion en cours',
  },
  {
    value: 'non_reactive',
    label: 'Non réactif',
    color: '#9CA3AF',
    bgColor: 'bg-gray-100 border-gray-300',
    description: 'Client ne répond pas, relance nécessaire',
  },
  {
    value: 'option',
    label: 'Option',
    color: '#0FB6BC',
    bgColor: 'bg-cyan-50 border-cyan-200',
    description: 'Circuit sélectionné, en attente de règlement',
  },
  {
    value: 'confirmed',
    label: 'Confirmé',
    color: '#10B981',
    bgColor: 'bg-emerald-50 border-emerald-200',
    description: 'Acompte reçu, voyage confirmé',
  },
  {
    value: 'deposit_paid',
    label: 'Acompte reçu',
    color: '#14B8A6',
    bgColor: 'bg-teal-50 border-teal-200',
    description: 'Acompte encaissé',
  },
  {
    value: 'fully_paid',
    label: 'Soldé',
    color: '#22C55E',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Paiement complet reçu',
  },
  {
    value: 'in_trip',
    label: 'En voyage',
    color: '#DD9371',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Voyage en cours',
  },
  {
    value: 'completed',
    label: 'Terminé',
    color: '#8BA080',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Voyage terminé',
  },
  {
    value: 'lost',
    label: 'Perdu',
    color: '#EF4444',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Dossier perdu',
  },
  {
    value: 'cancelled',
    label: 'Annulé',
    color: '#DC2626',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Dossier annulé',
  },
  {
    value: 'archived',
    label: 'Archivé',
    color: '#6B7280',
    bgColor: 'bg-gray-50 border-gray-200',
    description: 'Dossier archivé',
  },
]

// Active statuses for filters (exclude archived)
export const ACTIVE_STATUSES = DOSSIER_STATUSES.filter((s) =>
  !['archived'].includes(s.value)
)

// Pipeline statuses for Kanban view
export const PIPELINE_STATUSES = DOSSIER_STATUSES.filter((s) =>
  ['lead', 'quote_in_progress', 'quote_sent', 'negotiation', 'non_reactive', 'option', 'confirmed', 'deposit_paid', 'fully_paid'].includes(s.value)
)

// Lost reasons
export const LOST_REASONS: { value: LostReason; label: string }[] = [
  { value: 'no_response', label: 'Pas de nouvelles' },
  { value: 'other_agency', label: 'Autre agence' },
  { value: 'changed_destination', label: 'Changé de destination' },
  { value: 'project_abandoned', label: 'Projet abandonné' },
  { value: 'budget_issue', label: 'Problème de budget' },
  { value: 'other', label: 'Autre' },
]

// Marketing sources
export const MARKETING_SOURCES: { value: MarketingSource; label: string }[] = [
  { value: 'organic', label: 'Naturel' },
  { value: 'adwords', label: 'Google Ads' },
  { value: 'meta', label: 'Meta (FB/IG)' },
  { value: 'affiliate', label: 'Affilié' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'repeat_client', label: 'Client fidèle' },
  { value: 'partner', label: 'Partenaire B2B' },
  { value: 'other', label: 'Autre' },
]

// Languages / Sites
export const LANGUAGES: { value: string; label: string; flag: string }[] = [
  { value: 'FR', label: 'France', flag: '🇫🇷' },
  { value: 'GB', label: 'UK', flag: '🇬🇧' },
  { value: 'ES', label: 'Espagne', flag: '🇪🇸' },
  { value: 'IT', label: 'Italie', flag: '🇮🇹' },
  { value: 'DE', label: 'Allemagne', flag: '🇩🇪' },
  { value: 'US', label: 'USA', flag: '🇺🇸' },
  { value: 'NL', label: 'Pays-Bas', flag: '🇳🇱' },
  { value: 'BE', label: 'Belgique', flag: '🇧🇪' },
  { value: 'CH', label: 'Suisse', flag: '🇨🇭' },
]

export const DOSSIER_ORIGINS: { value: DossierOrigin; label: string }[] = [
  { value: 'website_b2c', label: 'Site web B2C' },
  { value: 'agency_b2b', label: 'Agence B2B' },
  { value: 'referral', label: 'Parrainage' },
  { value: 'repeat_client', label: 'Client fidèle' },
  { value: 'other', label: 'Autre' },
]

export const TRIP_TYPES: { value: TripType; label: string; description: string }[] = [
  { value: 'fit', label: 'FIT', description: 'Voyage individuel sur mesure' },
  { value: 'gir', label: 'GIR', description: 'Départ garanti groupe' },
  { value: 'group', label: 'Groupe', description: 'Groupe privé' },
]

export const SERVICE_TYPES: { value: ServiceType; label: string; icon: string }[] = [
  { value: 'accommodation', label: 'Hébergement', icon: '🏨' },
  { value: 'transport', label: 'Transport', icon: '🚐' },
  { value: 'activity', label: 'Activité', icon: '🎯' },
  { value: 'guide', label: 'Guide', icon: '🧭' },
  { value: 'meal', label: 'Repas', icon: '🍽️' },
  { value: 'transfer', label: 'Transfert', icon: '🚗' },
  { value: 'flight', label: 'Vol', icon: '✈️' },
  { value: 'insurance', label: 'Assurance', icon: '🛡️' },
  { value: 'visa', label: 'Visa', icon: '📋' },
  { value: 'other', label: 'Autre', icon: '📦' },
]

// Helper functions
export function getStatusConfig(status: DossierStatus) {
  return DOSSIER_STATUSES.find((s) => s.value === status) || DOSSIER_STATUSES[1]
}

export function getOriginLabel(origin: DossierOrigin) {
  return DOSSIER_ORIGINS.find((o) => o.value === origin)?.label || origin
}

export function getTripTypeLabel(tripType: TripType) {
  return TRIP_TYPES.find((t) => t.value === tripType)?.label || tripType
}

export function getMarketingSourceLabel(source: MarketingSource) {
  return MARKETING_SOURCES.find((s) => s.value === source)?.label || source
}

export function getLostReasonLabel(reason: LostReason) {
  return LOST_REASONS.find((r) => r.value === reason)?.label || reason
}

export function getLanguageConfig(code: string) {
  return LANGUAGES.find((l) => l.value === code) || { value: code, label: code, flag: '🌍' }
}

// Customer statuses
export const CUSTOMER_STATUSES: { value: CustomerStatus; label: string; color: string; icon: string }[] = [
  { value: 'new_customer', label: 'Nouveau voyageur', color: '#3B82F6', icon: '🆕' },
  { value: 'returning', label: 'Client de retour', color: '#8B5CF6', icon: '🔄' },
  { value: 'loyal', label: 'Client fidèle', color: '#F59E0B', icon: '⭐' },
]

export function getCustomerStatusConfig(status: CustomerStatus) {
  return CUSTOMER_STATUSES.find((s) => s.value === status) || CUSTOMER_STATUSES[0]
}

// Room types
export const ROOM_TYPES: { value: string; label: string; abbr: string }[] = [
  { value: 'DBL', label: 'Double', abbr: 'DBL' },
  { value: 'TWN', label: 'Twin', abbr: 'TWN' },
  { value: 'SGL', label: 'Single', abbr: 'SGL' },
  { value: 'TPL', label: 'Triple', abbr: 'TPL' },
  { value: 'FAM', label: 'Chambre familiale', abbr: 'FAM' },
  { value: 'EXB', label: 'Extra bed', abbr: 'EXB' },
]

// Traveler age categories
export const TRAVELER_TYPES: { value: string; label: string; ageRange: string }[] = [
  { value: 'adult', label: 'Adulte', ageRange: '18+' },
  { value: 'teen', label: 'Adolescent', ageRange: '12-17' },
  { value: 'child', label: 'Enfant', ageRange: '2-11' },
  { value: 'infant', label: 'Bébé', ageRange: '0-2' },
]
