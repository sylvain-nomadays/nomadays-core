/**
 * API Types for the quotation system
 */

// Trip types (categories)
// - online: Circuits publiés sur le site web (masters)
// - gir: Départs groupés avec date fixe (liés à un circuit online)
// - template: Bibliothèque de templates internes
// - custom: Circuits sur mesure pour clients
export type TripType = 'online' | 'gir' | 'template' | 'custom';
export type TripStatus = 'draft' | 'quoted' | 'sent' | 'confirmed' | 'operating' | 'completed' | 'cancelled';
export type MarginType = 'margin' | 'markup';
export type VatCalculationMode = 'on_margin' | 'on_selling_price';
export type ExchangeRateMode = 'manual' | 'kantox';

// Dossier types
export type DossierStatus =
  | 'lead'
  | 'quote_in_progress'
  | 'quote_sent'
  | 'negotiation'
  | 'confirmed'
  | 'deposit_paid'
  | 'fully_paid'
  | 'in_trip'
  | 'completed'
  | 'lost'
  | 'cancelled'
  | 'archived';

export interface Trip {
  id: number;
  tenant_id: string;
  name: string;
  reference?: string;
  type: TripType;
  template_id?: number;
  master_trip_id?: number;  // Pour les GIR: référence au circuit online master
  is_published?: boolean;   // Pour les circuits online: publié sur le site
  client_name?: string;
  client_email?: string;
  start_date?: string;
  end_date?: string;
  duration_days: number;
  destination_country?: string;
  destination_countries?: string[];
  default_currency: string;
  margin_pct: number;
  margin_type: MarginType;
  vat_pct?: number;
  vat_calculation_mode?: VatCalculationMode;
  // Commissions
  primary_commission_pct?: number;
  primary_commission_label?: string;
  secondary_commission_pct?: number;
  secondary_commission_label?: string;
  // Exchange rates
  exchange_rate_mode?: ExchangeRateMode;
  currency_rates_json?: CurrencyRates;
  // Characteristics
  comfort_level?: number;
  difficulty_level?: number;
  // Dossier link
  dossier_id?: string;
  dossier?: Dossier;
  // Themes
  themes?: TravelTheme[];
  status: TripStatus;
  version?: number;
  created_at: string;
  updated_at: string;
  locations_summary?: string[];
  days?: TripDay[];
  pax_configs?: TripPaxConfig[];
  formulas?: Formula[];
  // Presentation fields
  description_short?: string;
  description_tone?: DescriptionTone;
  highlights?: TripHighlight[];
  inclusions?: InclusionItem[];
  exclusions?: InclusionItem[];
  info_general?: string;
  info_formalities?: string;
  info_booking_conditions?: string;
  info_cancellation_policy?: string;
  info_additional?: string;
  map_config?: Record<string, unknown>;
  // Translation fields
  language?: string;
  source_trip_id?: number;
}

export interface TripDay {
  id: number;
  trip_id: number;
  day_number: number;
  day_number_end?: number | null;
  title?: string;
  description?: string;
  location_from?: string;
  location_to?: string;
  location_id?: number | null;
  location_name?: string | null;
  overnight_city?: string | null;
  sort_order?: number;
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
  formulas?: Formula[];
  photos?: TripPhoto[];
}

/**
 * Photo de circuit (générée par IA ou uploadée manuellement)
 * Organisée par: Destination / Type / Attraction / nom-seo.avif
 */
export interface TripPhoto {
  id: number;
  trip_id: number;
  trip_day_id?: number;
  day_number?: number;

  // SEO nomenclature
  destination?: string;
  attraction_type?: string;
  attraction_slug?: string;
  seo_filename?: string;

  // URLs
  url: string;
  thumbnail_url?: string;
  storage_path?: string;

  // Optimized variants
  url_avif?: string;
  url_webp?: string;
  url_medium?: string;
  url_large?: string;
  url_hero?: string;
  srcset_json?: SrcsetEntry[];
  lqip_data_url?: string;

  // Metadata
  width?: number;
  height?: number;
  alt_text?: string;
  alt_text_json?: Record<string, string>;
  caption_json?: Record<string, string>;

  // AI generation
  ai_prompt?: string;
  ai_model?: string;
  ai_generated_at?: string;

  // Flags
  is_hero: boolean;
  is_ai_generated: boolean;
  is_processed: boolean;
  sort_order: number;
}

export interface SrcsetEntry {
  url: string;
  width: number;
  height?: number;
  format: 'avif' | 'webp';
  size: string;
  file_size?: number;
}

export interface TripPaxConfig {
  id: number;
  trip_id: number;
  label: string;
  total_pax: number;
  args_json?: Record<string, number>;
  margin_override_pct?: number;
  total_cost?: number;
  total_price?: number;
  total_profit?: number;
  cost_per_person?: number;
  price_per_person?: number;
}

// Formula and Item types
export type BlockType = 'text' | 'activity' | 'accommodation' | 'transport' | 'service';

/** Modes de déplacement pour les blocs transport */
export type TransportMode =
  | 'driving'   // Route / Transfert
  | 'flight'    // Vol
  | 'transit'   // Train
  | 'boat'      // Bateau
  | 'walking'   // Trek / Randonnée
  | 'horse'     // Cheval
  | 'camel'     // Chameau
  | 'bicycle'   // Vélo
  | 'kayak';    // Kayak

/** Métadonnées transport (stockées en JSON dans description_html) */
export interface TransportMeta {
  travel_mode: TransportMode;
  narrative_text?: string;
  location_from_name?: string;
  location_to_name?: string;
  location_from_place_id?: string;
  location_to_place_id?: string;
  from_location_id?: number;
  to_location_id?: number;
  distance_km?: number;
  duration_minutes?: number;
}

/** Liaison transport template entre 2 destinations */
export interface LocationLink {
  id: number;
  from_location_id: number;
  to_location_id: number;
  from_location_name?: string;
  to_location_name?: string;
  travel_mode: TransportMode;
  duration_minutes?: number;
  distance_km?: number;
  narrative_text?: string;
}

export interface Formula {
  id: number;
  trip_id?: number;
  trip_day_id?: number;
  is_transversal?: boolean;
  name: string;
  description?: string;
  description_html?: string;
  is_default?: boolean;
  service_day_start?: number | null;
  service_day_end?: number | null;
  sort_order?: number;
  block_type?: BlockType;
  parent_block_id?: number | null;
  condition_id?: number | null;
  children?: Formula[];
  items?: Item[];
}

// Condition system: tenant-level conditions with options
export interface ConditionOption {
  id: number;
  condition_id: number;
  label: string;
  sort_order: number;
}

export type ConditionScope = 'all' | 'accommodation' | 'service' | 'accompaniment';

export interface Condition {
  id: number;
  name: string;
  description?: string | null;
  applies_to: ConditionScope;
  options: ConditionOption[];
}

export interface TripCondition {
  id: number;
  trip_id: number;
  condition_id: number;
  condition_name: string;
  applies_to: ConditionScope;
  selected_option_id?: number | null;
  selected_option_label?: string | null;
  is_active: boolean;
  options: ConditionOption[];
}

export type PricingMethod = 'quotation' | 'margin' | 'markup' | 'amount' | 'fixed';
export type RatioType = 'ratio' | 'set';
export type TimesType = 'service_days' | 'total' | 'fixed';
export type RatioRule = 'per_person' | 'per_room' | 'per_vehicle' | 'per_group';

export type PaymentFlow = 'booking' | 'advance' | 'purchase_order' | 'payroll' | 'manual';

export interface Item {
  id: number;
  formula_id: number;
  name: string;
  cost_nature_id?: number;
  cost_nature_code?: string;  // local only — used by ItemEditor for pre-selection (code is always unique)
  payment_flow?: PaymentFlow;
  supplier_id?: number | null;
  location_id?: number | null;    // Référence à Location
  rate_catalog_id?: number;
  contract_rate_id?: number;
  currency?: string;
  unit_cost: number;
  quantity: number;
  pricing_method?: PricingMethod;
  pricing_value?: number;
  ratio_rule: RatioRule;
  ratio_categories?: string;
  ratio_per?: number;
  ratio_type?: RatioType;
  times_type?: TimesType;
  times_value?: number;
  day_start?: number;
  day_end?: number;
  condition_option_id?: number | null;
  /** Whether this item's unit_cost includes VAT (TTC=true, HT=false) */
  price_includes_vat?: boolean;
  /** Which pax categories count for selecting the price tier (comma-separated, null = use ratio_categories) */
  tier_categories?: string;
  sort_order?: number;
  notes?: string;
  cost_nature?: CostNature;
  seasons?: ItemSeason[];
  price_tiers?: ItemPriceTier[];
  location?: Location;            // Relation optionnelle
}

export interface ItemSeason {
  id: number;
  item_id: number;
  season_name: string;
  valid_from?: string;
  valid_to?: string;
  cost_multiplier?: number;
  cost_override?: number;
}

export interface ItemPriceTier {
  id?: number;
  pax_min: number;
  pax_max: number;
  unit_cost: number;
  /** Category-specific % adjustments, e.g. {"child": -10, "baby": -100} */
  category_adjustments_json?: Record<string, number>;
  sort_order?: number;
}

export type PaxGroupType = 'tourist' | 'staff' | 'leader';

export interface PaxCategory {
  id: number;
  code: string;
  label: string;
  group_type: PaxGroupType;
  age_min?: number;
  age_max?: number;
  counts_for_pricing: boolean;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

// Supplier types
export type SupplierType = 'accommodation' | 'activity' | 'transport' | 'restaurant' | 'guide' | 'other';
export type SupplierStatus = 'active' | 'inactive' | 'pending';

// Statut du contrat agrégé (calculé côté backend)
export type ContractValidityStatus =
  | 'valid'              // Contrat actif et valide
  | 'expiring_soon'      // Contrat expire dans les 30 jours
  | 'expired'            // Contrat expiré
  | 'no_contract'        // Pas de contrat
  | 'contract_requested' // Contrat demandé, en attente
  | 'dynamic_pricing'    // Pas de contrat nécessaire, tarif dynamique
  | 'ota_only';          // Réservation OTA uniquement (Booking, Expedia...)

// Statut du workflow contrat (géré par l'utilisateur)
export type ContractWorkflowStatus =
  | 'needs_contract'     // Par défaut: a besoin d'un contrat
  | 'contract_requested' // Logistique a demandé le contrat
  | 'dynamic_pricing'    // Pas de contrat nécessaire, tarifs au cas par cas
  | 'ota_only';          // Pas de contrat, réservation uniquement via OTA

// ============================================================================
// Payment Terms Types (Conditions de paiement fournisseur)
// ============================================================================

/**
 * Type de référence pour calculer la date d'échéance
 * - 'confirmation': Date de confirmation du dossier
 * - 'departure': Date de départ du voyage
 * - 'service': Date du service/prestation
 * - 'return': Date de retour du voyage
 * - 'invoice': Date de facturation
 */
export type PaymentDueDateReference =
  | 'confirmation'   // À la confirmation du dossier
  | 'departure'      // Par rapport à la date de départ
  | 'service'        // Par rapport à la date de la prestation
  | 'return'         // Par rapport à la date de retour
  | 'invoice';       // Par rapport à la date de facture

/**
 * Une échéance de paiement (une ligne dans le planning)
 */
export interface PaymentInstallment {
  id?: number;
  percentage: number;                    // % du montant total (ex: 30)
  reference: PaymentDueDateReference;    // Point de référence
  days_offset: number;                   // Jours avant (-) ou après (+) la référence
                                         // Ex: -14 = 14 jours AVANT le départ
  label?: string;                        // Description (ex: "Acompte à la confirmation")
}

/**
 * Conditions de paiement complètes pour un fournisseur
 * Permet de définir plusieurs échéances
 */
export interface PaymentTerms {
  id?: number;
  supplier_id?: number;
  name: string;                          // Ex: "Standard 30/70", "Prépaiement total"
  description?: string;
  installments: PaymentInstallment[];    // Les différentes échéances
  is_default?: boolean;                  // Conditions par défaut pour ce fournisseur
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Exemples de PaymentTerms:
 *
 * 1. "30% confirmation / 70% 14j avant départ"
 * {
 *   name: "Standard 30/70",
 *   installments: [
 *     { percentage: 30, reference: 'confirmation', days_offset: 0, label: "Acompte" },
 *     { percentage: 70, reference: 'departure', days_offset: -14, label: "Solde" }
 *   ]
 * }
 *
 * 2. "100% à 30 jours du départ"
 * {
 *   name: "Prépaiement total J-30",
 *   installments: [
 *     { percentage: 100, reference: 'departure', days_offset: -30, label: "Paiement intégral" }
 *   ]
 * }
 *
 * 3. "50% réservation / 50% 15j après service"
 * {
 *   name: "50/50 post-service",
 *   installments: [
 *     { percentage: 50, reference: 'confirmation', days_offset: 0, label: "Acompte" },
 *     { percentage: 50, reference: 'service', days_offset: 15, label: "Solde" }
 *   ]
 * }
 */

/**
 * Échéance de paiement calculée pour un booking spécifique
 * Utilisé pour générer les alertes et le suivi des flux
 */
export interface CalculatedPaymentDue {
  booking_id: number;
  supplier_id: number;
  supplier_name: string;
  installment_number: number;            // 1, 2, 3...
  installment_label?: string;
  percentage: number;
  amount: number;
  currency: string;
  due_date: string;                      // Date calculée
  reference_date: string;                // Date de référence utilisée
  reference_type: PaymentDueDateReference;
  status: 'pending' | 'due' | 'overdue' | 'paid';
  days_until_due: number;                // Négatif si overdue
  paid_at?: string;
  paid_amount?: number;
}

/**
 * Alerte de paiement fournisseur
 */
export interface SupplierPaymentAlert {
  id: number;
  booking_id: number;
  supplier_id: number;
  supplier_name: string;
  dossier_reference?: string;
  client_name?: string;
  service_date?: string;
  installment_label?: string;
  amount_due: number;
  currency: string;
  due_date: string;
  days_until_due: number;
  alert_type: 'upcoming' | 'due_today' | 'overdue';
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Langue préférée pour les communications
 */
export type CommunicationLanguage = 'fr' | 'en' | 'es' | 'th' | 'vi' | 'km' | 'lo' | 'my' | 'id';

/**
 * Mode de communication préféré avec le fournisseur
 */
export type CommunicationChannel = 'email' | 'whatsapp' | 'phone' | 'portal';

export interface Supplier {
  id: number;
  tenant_id: string;
  name: string;
  types: SupplierType[];                // Types du fournisseur (ex: ['accommodation', 'activity'])
  type: SupplierType;                   // Type PRINCIPAL (premier du tableau) - pour rétrocompatibilité
  status: SupplierStatus;

  // ===== Services proposés =====
  // Un fournisseur peut proposer des services de types différents de son type principal
  // Ex: Un hôtel (type=accommodation) peut proposer des activités et des transfers
  additional_service_types?: SupplierType[];  // Types de services additionnels (legacy)
  services?: SupplierService[];               // Détail des services proposés (relation)

  // ===== Contact principal =====
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;

  // ===== Contacts de réservation (pour emails automatiques) =====
  reservation_email?: string;           // Email dédié réservations (si différent du contact)
  reservation_phone?: string;           // Téléphone réservations
  reservation_contact_name?: string;    // Nom du contact réservations
  reservation_cc_emails?: string[];     // Emails en copie (CC) pour les réservations

  // ===== Préférences de communication =====
  preferred_language?: CommunicationLanguage;  // Langue pour les emails (défaut: 'en')
  preferred_channel?: CommunicationChannel;    // Canal préféré (défaut: 'email')
  custom_email_template_id?: number;           // Template personnalisé (optionnel)
  expected_response_hours?: number;            // Délai de réponse habituel (pour alertes)

  // ===== Informations de facturation =====
  billing_email?: string;
  billing_contact_name?: string;
  billing_address?: string;

  // ===== Localisation =====
  location_id?: number | null;        // Location principale (pour recherches)
  location?: Location;                // Relation
  country_code?: string;              // Déduit de location ou saisi manuellement
  city?: string;                      // Déduit de location ou saisi manuellement
  address?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;           // ID Google Places pour validation adresse

  // ===== Classification (pour hébergements) =====
  star_rating?: number;               // 1-5 étoiles

  // ===== Informations commerciales =====
  tax_id?: string;
  is_vat_registered?: boolean;          // Assujetti TVA = TVA récupérable sur factures
  default_currency?: string;

  // ===== Entité de facturation (pour la logistique) =====
  billing_entity_name?: string;         // Nom alternatif si différent du fournisseur
  billing_entity_note?: string;         // Note pour la logistique

  // ===== Conditions de paiement =====
  payment_terms_text?: string;        // Ex: "Net 30" (description simple)
  default_payment_terms_id?: number;  // ID des conditions par défaut
  default_payment_terms?: PaymentTerms;  // Relation
  payment_terms_options?: PaymentTerms[];  // Toutes les options configurées

  // ===== Notes internes =====
  internal_notes?: string;            // Commentaires équipe commerciale
  logistics_notes?: string;           // Commentaires équipe logistique
  quality_notes?: string;             // Retours qualité

  // ===== Tags =====
  tags?: string[];                    // ['boutique', 'famille', 'luxe', 'eco', ...]

  // ===== Workflow Contrat (géré par l'utilisateur) =====
  contract_workflow_status?: ContractWorkflowStatus;

  // ===== Statut Contrat (calculé depuis les contrats) =====
  active_contract_id?: number | null;
  active_contract_name?: string;
  contract_valid_from?: string;
  contract_valid_to?: string;
  contract_validity_status?: ContractValidityStatus;
  days_until_contract_expiry?: number;

  // ===== Meta =====
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Service proposé par un fournisseur
 *
 * Permet de modéliser les services additionnels qu'un fournisseur peut proposer
 * en plus de son activité principale.
 *
 * Exemples:
 * - Hôtel (type principal: accommodation) qui propose:
 *   - Transfer aéroport (service_type: transport)
 *   - Cours de cuisine (service_type: activity)
 *   - Massage/Spa (service_type: activity)
 * - Agence de transport qui propose aussi des excursions
 */
export interface SupplierService {
  id: number;
  supplier_id: number;
  tenant_id: string;

  // ===== Type et identification =====
  service_type: SupplierType;           // Type du service (peut différer du type principal du fournisseur)
  name: string;                         // Nom du service (ex: "Transfer aéroport", "Cours de cuisine")
  description?: string;
  description_html?: string;

  // ===== Localisation (si différente du fournisseur) =====
  location_id?: number;                 // Si le service a lieu ailleurs que chez le fournisseur
  location?: Location;

  // ===== Tarification par défaut =====
  default_unit_cost?: number;
  default_currency?: string;
  pricing_notes?: string;               // Ex: "Par véhicule jusqu'à 4 personnes"

  // ===== Disponibilité =====
  requires_advance_booking_hours?: number;  // Délai minimum de réservation
  available_days?: string[];            // Jours disponibles ['monday', 'tuesday', ...]
  available_from_time?: string;         // Heure de début disponibilité (HH:MM)
  available_to_time?: string;           // Heure de fin disponibilité (HH:MM)

  // ===== Contact spécifique (si différent du contact principal) =====
  service_contact_name?: string;
  service_contact_email?: string;
  service_contact_phone?: string;

  // ===== Meta =====
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Alerte de quotation liée au contrat
 * Générée quand on utilise un fournisseur avec contrat expiré/bientôt expiré
 */
export interface ContractQuotationAlert {
  supplier_id: number;
  supplier_name: string;
  alert_type: 'expired' | 'expiring_soon' | 'no_contract';
  contract_id?: number;
  contract_name?: string;
  contract_valid_to?: string;
  days_until_expiry?: number;
  message: string;
  severity: 'warning' | 'critical';
}

// ============================================================================
// Service Booking Types (Réservations fournisseurs)
// ============================================================================

/**
 * Statut d'une réservation de service auprès d'un fournisseur
 *
 * Workflow typique:
 * draft -> pending_request -> request_sent -> confirmed -> service_completed
 *
 * Cas alternatifs:
 * - request_sent -> pending_response (si besoin de relance)
 * - request_sent -> declined (si refusé par fournisseur)
 * - confirmed -> modified (si changement après confirmation)
 * - confirmed -> cancelled
 */
export type ServiceBookingStatus =
  | 'draft'              // Brouillon, pas encore envoyé
  | 'pending_request'    // En attente d'envoi (ex: en attente validation interne)
  | 'request_sent'       // Demande envoyée au fournisseur
  | 'pending_response'   // En attente de réponse (relance possible)
  | 'confirmed'          // Confirmé par le fournisseur
  | 'declined'           // Refusé par le fournisseur
  | 'modified'           // Modifié après confirmation
  | 'cancelled'          // Annulé
  | 'service_completed'; // Service effectué

/**
 * Type de message dans le fil de discussion avec le fournisseur
 */
export type ServiceBookingMessageType =
  | 'booking_request'    // Demande de réservation initiale
  | 'confirmation'       // Confirmation du fournisseur
  | 'modification'       // Demande de modification
  | 'cancellation'       // Annulation
  | 'reminder'           // Relance
  | 'info_request'       // Demande d'information
  | 'general'            // Message général
  | 'system';            // Message système automatique

/**
 * Direction du message (entrant/sortant)
 */
export type MessageDirection = 'outbound' | 'inbound';

/**
 * Réservation d'un service auprès d'un fournisseur
 * Généré à partir d'un Item/Formula d'un circuit confirmé
 */
export interface ServiceBooking {
  id: number;
  tenant_id: string;

  // ===== Liens vers le dossier/circuit =====
  dossier_id: string;               // Référence du dossier
  trip_id: number;                  // Circuit associé
  trip_day_id?: number;             // Jour du circuit (si applicable)
  formula_id?: number;              // Formule source
  item_id?: number;                 // Item source

  // ===== Fournisseur =====
  supplier_id: number;
  supplier?: Supplier;              // Relation

  // ===== Détails de la réservation =====
  service_type: SupplierType;       // Type de service (hébergement, activité, etc.)
  service_name: string;             // Nom du service réservé
  service_description?: string;     // Description/détails

  // ===== Dates et horaires =====
  service_date: string;             // Date du service (YYYY-MM-DD)
  service_end_date?: string;        // Date de fin (pour hébergement multi-nuits)
  service_time?: string;            // Heure (HH:MM) si applicable
  duration_hours?: number;          // Durée en heures

  // ===== Participants =====
  pax_adults: number;               // Nombre d'adultes
  pax_children?: number;            // Nombre d'enfants
  pax_infants?: number;             // Nombre de bébés
  participant_names?: string[];     // Noms des participants (si connus)

  // ===== Hébergement spécifique =====
  room_category_id?: number;        // Catégorie de chambre
  room_category_name?: string;      // Nom catégorie (dénormalisé)
  rooms_count?: number;             // Nombre de chambres
  bed_configuration?: string;       // Configuration lits demandée
  meal_plan?: string;               // Plan repas (BB, HB, FB, AI)
  special_requests?: string;        // Demandes spéciales (étage haut, vue, etc.)

  // ===== Transport spécifique =====
  pickup_location?: string;         // Lieu de prise en charge
  dropoff_location?: string;        // Lieu de dépose
  vehicle_type?: string;            // Type de véhicule
  flight_info?: string;             // Info vol si transfer aéroport

  // ===== Tarification =====
  unit_cost: number;                // Coût unitaire
  quantity: number;                 // Quantité (nuits, personnes, véhicules...)
  total_cost: number;               // Coût total = unit_cost * quantity
  currency: string;                 // Devise

  // ===== Statut et workflow =====
  status: ServiceBookingStatus;
  confirmation_number?: string;     // N° de confirmation fournisseur
  confirmed_at?: string;            // Date de confirmation
  confirmed_by?: string;            // Nom de la personne qui a confirmé côté fournisseur

  // ===== Communication =====
  last_message_at?: string;         // Dernier message échangé
  last_message_direction?: MessageDirection;
  awaiting_response?: boolean;      // En attente de réponse fournisseur
  response_overdue?: boolean;       // Délai de réponse dépassé
  reminder_count?: number;          // Nombre de relances envoyées

  // ===== Notes =====
  internal_notes?: string;          // Notes internes (non visibles par fournisseur)
  supplier_notes?: string;          // Notes du fournisseur

  // ===== Meta =====
  created_at: string;
  updated_at: string;
  created_by?: string;              // User ID qui a créé
}

/**
 * Message dans le fil de discussion d'une réservation
 */
export interface ServiceBookingMessage {
  id: number;
  service_booking_id: number;
  tenant_id: string;

  // ===== Type et direction =====
  message_type: ServiceBookingMessageType;
  direction: MessageDirection;

  // ===== Contenu =====
  subject?: string;                 // Sujet (si email)
  body_text: string;                // Corps du message (texte)
  body_html?: string;               // Corps du message (HTML)

  // ===== Expéditeur/Destinataire =====
  from_email?: string;
  from_name?: string;
  to_emails?: string[];
  cc_emails?: string[];

  // ===== Pièces jointes =====
  attachments?: ServiceBookingAttachment[];

  // ===== Email tracking =====
  email_message_id?: string;        // Message-ID de l'email
  email_thread_id?: string;         // Thread ID pour grouper les réponses
  email_sent_at?: string;           // Date/heure d'envoi
  email_delivered_at?: string;      // Date/heure de délivrance
  email_opened_at?: string;         // Date/heure d'ouverture (si tracking)
  email_status?: 'pending' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';

  // ===== Meta =====
  is_system_generated?: boolean;    // Généré automatiquement
  created_at: string;
  created_by?: string;              // User ID (null si système ou fournisseur)
}

/**
 * Pièce jointe à un message
 */
export interface ServiceBookingAttachment {
  id: number;
  message_id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_url: string;              // URL de stockage (S3, etc.)
  created_at: string;
}

/**
 * Résumé des réservations pour un dossier (pour dashboard)
 */
export interface DossierBookingSummary {
  dossier_id: string;
  total_bookings: number;
  by_status: Record<ServiceBookingStatus, number>;
  by_type: Record<SupplierType, number>;
  pending_responses: number;        // En attente de réponse
  overdue_responses: number;        // Réponses en retard
  confirmed: number;
  issues: number;                   // Refusés ou problèmes
}

/**
 * Alerte de réservation fournisseur
 */
export interface ServiceBookingAlert {
  id: number;
  service_booking_id: number;
  dossier_id: string;
  supplier_id: number;
  supplier_name: string;
  service_name: string;
  service_date: string;
  alert_type: 'no_response' | 'response_overdue' | 'confirmation_needed' | 'modification_pending' | 'service_tomorrow';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  dismissed_at?: string;
}

// Contract types
export type ContractStatus = 'draft' | 'active' | 'pending' | 'expired' | 'renewed' | 'archived';

export interface Contract {
  id: number;
  tenant_id: string;
  supplier_id: number;
  name: string;
  reference?: string;
  valid_from: string;
  valid_to: string;
  status: ContractStatus;
  currency?: string;
  notes?: string | null;
  ai_warnings?: string[] | null;  // AI-extracted warnings from PDF contract
  created_at: string;
  updated_at: string;
  rates?: ContractRate[];
}

export interface ContractRate {
  id: number;
  contract_id: number;
  name: string;
  unit_type: string;
  unit_cost: number;
  currency: string;
  valid_from?: string;
  valid_to?: string;
  meta_json?: Record<string, unknown>;
}

// Pax Configuration
export interface PaxConfig {
  pax: number;
  rooms: number;
}

// Simplified Quotation result for frontend
export interface QuotationResult {
  formula_id: number;
  pax: number;
  rooms: number;
  total_cost: number;
  total_selling: number;
  margin_amount: number;
  margin_pct: number;
  price_per_person: number;
  currency: string;
  breakdown: ItemCostDetail[];
}

// Full Quotation result types (from API)
export interface FullQuotationResult {
  trip_id: number;
  trip_name: string;
  currency: string;
  margin_type: MarginType;
  default_margin_pct: number;
  vat_calculation_mode: VatCalculationMode;
  primary_commission_pct: number;
  secondary_commission_pct?: number;
  pax_configs: PaxConfigResult[];
  warnings: string[];
  missing_exchange_rates: string[];
}

export interface PaxConfigResult {
  pax_config_id: number;
  label: string;
  total_pax: number;
  args: Record<string, number>;
  days: DayCostDetail[];
  total_cost: number;
  total_price: number;
  total_profit: number;
  cost_per_person: number;
  price_per_person: number;
  margin_pct: number;
  // New: VAT and commission details
  vat?: VatDetail;
  commissions?: CommissionDetail;
  price_ttc: number;
}

export interface DayCostDetail {
  day_id: number;
  day_number: number;
  title?: string;
  formulas: FormulaCostDetail[];
  total_cost: number;
  total_price: number;
}

export interface FormulaCostDetail {
  formula_id: number;
  formula_name: string;
  items: ItemCostDetail[];
  total_cost: number;
  total_price: number;
}

export interface ItemCostDetail {
  item_id: number;
  item_name: string;
  unit_cost_local: number;
  unit_cost: number;
  quantity: number;
  subtotal_cost_local: number;
  subtotal_cost: number;
  unit_price: number;
  subtotal_price: number;
  margin_applied: number;
  pricing_method: PricingMethod;
  item_currency: string;
  exchange_rate: number;
  vat_recoverable: number;
}

// Cost Nature
export interface CostNature {
  id: number;
  code: string;
  label: string;
  name?: string; // alias for backward compatibility
  generates_booking: boolean;
  generates_purchase_order: boolean;
  generates_payroll: boolean;
  generates_advance: boolean;
  vat_recoverable_default?: boolean;
  accounting_code?: string;
  is_system?: boolean;
}

/** @deprecated Use PaymentFlow on Item instead */
export type CostNatureFlow = PaymentFlow;

// Dossier (client travel inquiry)
export interface Dossier {
  id: string; // UUID
  tenant_id: string;
  reference: string;
  status: DossierStatus;
  // Client info
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_address?: string;
  // Travel dates
  departure_date_from?: string;
  departure_date_to?: string;
  // Budget
  budget_min?: number;
  budget_max?: number;
  budget_currency: string;
  // Pax
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  // Destination
  destination_countries?: string[];
  // Marketing
  marketing_source?: string;
  marketing_campaign?: string;
  // Partner Agency (B2B)
  partner_agency_id?: number;
  partner_agency?: PartnerAgency;
  // Notes
  internal_notes?: string;
  lost_reason?: string;
  lost_comment?: string;
  // Priority
  is_hot: boolean;
  priority: number;
  // Ownership
  created_by_id?: string;
  assigned_to_id?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  trips?: Trip[];
}

// Travel Theme
export interface TravelTheme {
  id: number;
  tenant_id?: string;
  code: string;
  label: string;
  label_en?: string;
  icon?: string;
  color?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

// Currency Rates
export interface ExchangeRateEntry {
  rate: number;
  source: 'manual' | 'kantox';
  locked_at?: string;
  kantox_reference?: string;
}

export interface CurrencyRates {
  rates: Record<string, ExchangeRateEntry>;
  base_currency: string;
  kantox_reference?: string;
}

// VAT Details (from quotation response)
export interface VatDetail {
  margin: number;
  vat_base: number;
  vat_amount: number;
  vat_recoverable: number;
  net_vat: number;
  price_ttc: number;
}

// Commission Details (from quotation response)
export interface CommissionDetail {
  gross_price: number;
  primary_commission: number;
  primary_commission_label: string;
  secondary_commission: number;
  secondary_commission_label: string;
  total_commissions: number;
  net_price: number;
}

// Dashboard stats
export interface DashboardStats {
  total_trips: number;
  template_count: number;
  client_trips_count: number;
  draft_trips: number;
  confirmed_trips: number;
  total_suppliers: number;
  active_suppliers: number;
  total_contracts: number;
  expiring_soon_contracts: number;
  pending_bookings: number;
  confirmed_bookings: number;
  total_booking_value: number;
  unacknowledged_alerts: number;
  critical_alerts: number;
}

// AI Alert
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AIAlert {
  id: number;
  item_id: number;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  expected_value?: number;
  actual_value?: number;
  deviation_pct?: number;
  acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

// API Response wrappers
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Create/Update DTOs
export interface CreateTripDTO {
  name: string;
  type: TripType;
  duration_days: number;
  destination_country?: string;
  destination_countries?: string[];
  default_currency?: string;
  margin_pct?: number;
  margin_type?: MarginType;
  vat_pct?: number;
  vat_calculation_mode?: VatCalculationMode;
  // Commissions
  primary_commission_pct?: number;
  primary_commission_label?: string;
  secondary_commission_pct?: number;
  secondary_commission_label?: string;
  // Exchange rates
  exchange_rate_mode?: ExchangeRateMode;
  currency_rates_json?: CurrencyRates;
  // Characteristics
  comfort_level?: number;
  difficulty_level?: number;
  theme_ids?: number[];
  // Dossier
  dossier_id?: string;
  // Client info
  client_name?: string;
  client_email?: string;
  start_date?: string;
  end_date?: string;
  // Presentation fields
  description_short?: string;
  description_tone?: DescriptionTone;
  highlights?: TripHighlight[];
  inclusions?: InclusionItem[];
  exclusions?: InclusionItem[];
  info_general?: string;
  info_formalities?: string;
  info_booking_conditions?: string;
  info_cancellation_policy?: string;
  info_additional?: string;
}

export interface UpdateTripDTO extends Partial<CreateTripDTO> {
  status?: TripStatus;
}

// Dossier DTOs
export interface CreateDossierDTO {
  reference?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_address?: string;
  departure_date_from?: string;
  departure_date_to?: string;
  budget_min?: number;
  budget_max?: number;
  budget_currency?: string;
  pax_adults?: number;
  pax_children?: number;
  pax_infants?: number;
  destination_countries?: string[];
  marketing_source?: string;
  marketing_campaign?: string;
  partner_agency_id?: number;
  internal_notes?: string;
  is_hot?: boolean;
  priority?: number;
  assigned_to_id?: string;
}

export interface UpdateDossierDTO extends Partial<CreateDossierDTO> {
  status?: DossierStatus;
  lost_reason?: string;
  lost_comment?: string;
}

// Travel Theme DTOs
export interface CreateTravelThemeDTO {
  code: string;
  label: string;
  label_en?: string;
  icon?: string;
  color?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateTravelThemeDTO extends Partial<CreateTravelThemeDTO> {}

export interface CreateSupplierDTO {
  name: string;
  types?: SupplierType[];  // Array of types (new)
  type?: SupplierType;     // Legacy single type (for backwards compatibility)

  // ===== Contact principal =====
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;

  // ===== Contacts de réservation =====
  reservation_email?: string;
  reservation_phone?: string;
  reservation_contact_name?: string;
  reservation_cc_emails?: string[];

  // ===== Préférences de communication =====
  preferred_language?: CommunicationLanguage;
  preferred_channel?: CommunicationChannel;
  custom_email_template_id?: number;
  expected_response_hours?: number;

  // ===== Facturation =====
  billing_email?: string;
  billing_contact_name?: string;
  billing_address?: string;

  // ===== Localisation =====
  location_id?: number;
  country_code?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;

  // ===== Classification =====
  star_rating?: number;

  // ===== Commercial =====
  tax_id?: string;
  is_vat_registered?: boolean;          // Assujetti TVA = TVA récupérable
  default_currency?: string;

  // ===== Entité de facturation =====
  billing_entity_name?: string;
  billing_entity_note?: string;

  // ===== Conditions de paiement =====
  payment_terms_text?: string;
  default_payment_terms_id?: number;

  // ===== Notes internes =====
  internal_notes?: string;
  logistics_notes?: string;
  quality_notes?: string;

  // ===== Tags =====
  tags?: string[];

  // ===== Services additionnels =====
  additional_service_types?: SupplierType[];
}

export interface UpdateSupplierDTO extends Partial<CreateSupplierDTO> {
  status?: SupplierStatus;
  is_active?: boolean;
  contract_workflow_status?: ContractWorkflowStatus;
}

// ============================================================================
// Supplier Service DTOs
// ============================================================================

/**
 * DTO pour créer un service proposé par un fournisseur
 *
 * Exemple: Ajouter un service "Transfer aéroport" à un hôtel
 */
export interface CreateSupplierServiceDTO {
  supplier_id: number;
  service_type: SupplierType;           // Type du service (ex: 'transport' pour un transfer)
  name: string;                         // Ex: "Transfer aéroport Suvarnabhumi"
  description?: string;
  description_html?: string;

  // Localisation (si différente du fournisseur)
  location_id?: number;

  // Tarification
  default_unit_cost?: number;
  default_currency?: string;
  pricing_notes?: string;

  // Disponibilité
  requires_advance_booking_hours?: number;
  available_days?: string[];
  available_from_time?: string;
  available_to_time?: string;

  // Contact spécifique
  service_contact_name?: string;
  service_contact_email?: string;
  service_contact_phone?: string;
}

export interface UpdateSupplierServiceDTO extends Partial<Omit<CreateSupplierServiceDTO, 'supplier_id'>> {
  is_active?: boolean;
  sort_order?: number;
}

// ============================================================================
// Payment Terms DTOs
// ============================================================================

export interface CreatePaymentInstallmentDTO {
  percentage: number;
  reference: PaymentDueDateReference;
  days_offset: number;
  label?: string;
}

export interface CreatePaymentTermsDTO {
  supplier_id: number;
  name: string;
  description?: string;
  installments: CreatePaymentInstallmentDTO[];
  is_default?: boolean;
}

export interface UpdatePaymentTermsDTO extends Partial<Omit<CreatePaymentTermsDTO, 'supplier_id'>> {
  is_active?: boolean;
}

/**
 * Templates prédéfinis de conditions de paiement
 * À utiliser comme point de départ lors de la création
 */
export const PAYMENT_TERMS_PRESETS: Record<string, { name: string; description: string; installments: CreatePaymentInstallmentDTO[] }> = {
  '30_70_departure': {
    name: '30% confirmation / 70% J-14',
    description: 'Acompte 30% à la confirmation, solde 14 jours avant départ',
    installments: [
      { percentage: 30, reference: 'confirmation', days_offset: 0, label: 'Acompte' },
      { percentage: 70, reference: 'departure', days_offset: -14, label: 'Solde' },
    ],
  },
  '50_50_departure': {
    name: '50% confirmation / 50% J-30',
    description: 'Moitié à la confirmation, moitié 30 jours avant départ',
    installments: [
      { percentage: 50, reference: 'confirmation', days_offset: 0, label: 'Premier versement' },
      { percentage: 50, reference: 'departure', days_offset: -30, label: 'Second versement' },
    ],
  },
  '100_departure_30': {
    name: '100% à J-30',
    description: 'Paiement intégral 30 jours avant le départ',
    installments: [
      { percentage: 100, reference: 'departure', days_offset: -30, label: 'Paiement intégral' },
    ],
  },
  '100_confirmation': {
    name: '100% à la confirmation',
    description: 'Paiement intégral à la confirmation',
    installments: [
      { percentage: 100, reference: 'confirmation', days_offset: 0, label: 'Paiement intégral' },
    ],
  },
  '50_50_post_service': {
    name: '50% réservation / 50% après service',
    description: 'Moitié à la réservation, moitié 15 jours après la prestation',
    installments: [
      { percentage: 50, reference: 'confirmation', days_offset: 0, label: 'Acompte' },
      { percentage: 50, reference: 'service', days_offset: 15, label: 'Solde post-service' },
    ],
  },
  'net_30': {
    name: 'Net 30 après facture',
    description: 'Paiement intégral 30 jours après réception de la facture',
    installments: [
      { percentage: 100, reference: 'invoice', days_offset: 30, label: 'Paiement à 30 jours' },
    ],
  },
};

// ============================================================================
// Service Booking DTOs
// ============================================================================

export interface CreateServiceBookingDTO {
  dossier_id: string;
  trip_id: number;
  trip_day_id?: number;
  formula_id?: number;
  item_id?: number;
  supplier_id: number;

  // Service details
  service_type: SupplierType;
  service_name: string;
  service_description?: string;
  service_date: string;
  service_end_date?: string;
  service_time?: string;
  duration_hours?: number;

  // Participants
  pax_adults: number;
  pax_children?: number;
  pax_infants?: number;
  participant_names?: string[];

  // Accommodation specific
  room_category_id?: number;
  room_category_name?: string;
  rooms_count?: number;
  bed_configuration?: string;
  meal_plan?: string;
  special_requests?: string;

  // Transport specific
  pickup_location?: string;
  dropoff_location?: string;
  vehicle_type?: string;
  flight_info?: string;

  // Pricing
  unit_cost: number;
  quantity: number;
  total_cost: number;
  currency: string;

  // Notes
  internal_notes?: string;
}

export interface UpdateServiceBookingDTO extends Partial<CreateServiceBookingDTO> {
  status?: ServiceBookingStatus;
  confirmation_number?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  supplier_notes?: string;
}

export interface SendBookingRequestDTO {
  service_booking_id: number;
  // Option de personnalisation du message
  custom_subject?: string;
  custom_message?: string;
  // Emails additionnels à inclure
  additional_cc?: string[];
  // Pièces jointes
  attachment_ids?: number[];
}

export interface CreateServiceBookingMessageDTO {
  service_booking_id: number;
  message_type: ServiceBookingMessageType;
  direction: MessageDirection;
  subject?: string;
  body_text: string;
  body_html?: string;
  to_emails?: string[];
  cc_emails?: string[];
  // Pour lier à un email entrant
  email_message_id?: string;
  email_thread_id?: string;
}

/**
 * Paramètres pour générer les réservations à partir d'un circuit confirmé
 */
export interface GenerateBookingsFromTripDTO {
  trip_id: number;
  dossier_id: string;
  // Optionnel: ne générer que pour certains jours/formules
  trip_day_ids?: number[];
  formula_ids?: number[];
  // Optionnel: envoyer automatiquement les demandes
  auto_send_requests?: boolean;
}

export interface CreateItemDTO {
  name: string;
  cost_nature_id?: number;
  supplier_id?: number;
  currency?: string;
  unit_cost: number;
  pricing_method?: PricingMethod;
  pricing_value?: number;
  ratio_categories?: string;
  ratio_per?: number;
  ratio_type?: RatioType;
  times_type?: TimesType;
  times_value?: number;
  price_includes_vat?: boolean;
}

// ============================================================================
// Trip Presentation Types
// ============================================================================

export type DescriptionTone = 'marketing_emotionnel' | 'aventure' | 'familial' | 'factuel';
export type TripLocationType = 'overnight' | 'waypoint' | 'poi' | 'activity';
export type TravelMode = 'driving' | 'walking' | 'transit' | 'flight' | 'boat';
export type TemplateType = 'inclusions' | 'exclusions' | 'formalities' | 'booking_conditions' | 'cancellation_policy' | 'general_info';

// Trip highlight (point fort)
export interface TripHighlight {
  title: string;
  icon?: string;
}

// Inclusion/Exclusion item
export interface InclusionItem {
  text: string;
  default?: boolean;
}

// Extended Trip interface with presentation fields
export interface TripPresentation {
  description_short?: string;
  description_tone?: DescriptionTone;
  highlights?: TripHighlight[];
  inclusions?: InclusionItem[];
  exclusions?: InclusionItem[];
  info_general?: string;
  info_formalities?: string;
  info_booking_conditions?: string;
  info_cancellation_policy?: string;
  info_additional?: string;
  map_config?: Record<string, unknown>;
}

// ============================================================================
// Trip Location Types
// ============================================================================

export interface TripLocation {
  id: number;
  trip_id: number;
  name: string;
  place_id?: string;
  lat?: number;
  lng?: number;
  address?: string;
  country_code?: string;
  region?: string;
  day_number?: number;
  location_type: TripLocationType;
  description?: string;
  sort_order: number;
}

export interface CreateTripLocationDTO {
  name: string;
  place_id?: string;
  lat?: number;
  lng?: number;
  address?: string;
  country_code?: string;
  region?: string;
  day_number?: number;
  location_type?: TripLocationType;
  description?: string;
  sort_order?: number;
}

export interface UpdateTripLocationDTO extends Partial<CreateTripLocationDTO> {}

export interface TripRoute {
  id: number;
  from_location_id: number;
  to_location_id: number;
  distance_km?: number;
  duration_minutes?: number;
  duration_formatted: string;
  polyline?: string;
  travel_mode: TravelMode;
}

export interface TripMapData {
  locations: TripLocation[];
  routes: TripRoute[];
}

// ============================================================================
// Places Autocomplete Types (Google Maps)
// ============================================================================

export interface PlaceAutocompleteResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface GeocodeResult {
  place_id: string;
  name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  country_code?: string;
  region?: string;
}

// ============================================================================
// Country Template Types
// ============================================================================

export interface CountryTemplate {
  id: number;
  country_code?: string;
  country_name?: string;
  template_type: TemplateType;
  content: InclusionItem[] | { content: string; variables?: string[] };
  is_active: boolean;
  sort_order: number;
}

export interface TemplatesForCountry {
  country_code?: string;
  inclusions?: InclusionItem[];
  exclusions?: InclusionItem[];
  formalities?: string;
  booking_conditions?: string;
  cancellation_policy?: string;
  general_info?: string;
}

export interface CreateCountryTemplateDTO {
  country_code?: string;
  country_name?: string;
  template_type: TemplateType;
  content: unknown;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateCountryTemplateDTO extends Partial<CreateCountryTemplateDTO> {}

// ============================================================================
// Update Trip interface with presentation fields
// ============================================================================

// Extend the Trip interface with presentation fields
export interface TripWithPresentation extends Trip, TripPresentation {
  locations?: TripLocation[];
}

// Update DTO for presentation fields
export interface UpdateTripPresentationDTO {
  description_short?: string;
  description_tone?: DescriptionTone;
  highlights?: TripHighlight[];
  inclusions?: InclusionItem[];
  exclusions?: InclusionItem[];
  info_general?: string;
  info_formalities?: string;
  info_booking_conditions?: string;
  info_cancellation_policy?: string;
  info_additional?: string;
  map_config?: Record<string, unknown>;
}

// ============================================================================
// Partner Agency Types (B2B White-label)
// ============================================================================

export type PdfStyle = 'modern' | 'classic' | 'minimal';

export interface PartnerAgencyBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  pdf_style: PdfStyle;
  pdf_header_html?: string;
  pdf_footer_html?: string;
}

export interface PartnerAgencyTemplates {
  booking_conditions?: string;
  cancellation_policy?: string;
  general_info?: string;
  legal_mentions?: string;
}

export interface PartnerAgency {
  id: number;
  tenant_id: string;
  name: string;
  code?: string;
  is_active: boolean;
  // Contact
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  // Branding
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  pdf_style: PdfStyle;
  pdf_header_html?: string;
  pdf_footer_html?: string;
  // Templates (stored as JSON with content + variables)
  template_booking_conditions?: { content: string; variables?: string[] };
  template_cancellation_policy?: { content: string; variables?: string[] };
  template_general_info?: { content: string; variables?: string[] };
  template_legal_mentions?: { content: string; variables?: string[] };
  // Meta
  notes?: string;
  sort_order: number;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerAgencyDTO {
  name: string;
  code?: string;
  is_active?: boolean;
  // Contact
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  // Branding
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  pdf_style?: PdfStyle;
  pdf_header_html?: string;
  pdf_footer_html?: string;
  // Templates
  template_booking_conditions?: { content: string; variables?: string[] };
  template_cancellation_policy?: { content: string; variables?: string[] };
  template_general_info?: { content: string; variables?: string[] };
  template_legal_mentions?: { content: string; variables?: string[] };
  // Meta
  notes?: string;
  sort_order?: number;
}

export interface UpdatePartnerAgencyDTO extends Partial<CreatePartnerAgencyDTO> {}

// ============================================================================
// Location Types (indépendant des trips - pour filtrage et organisation)
// Représente des destinations géographiques : Chiang Mai, Bangkok, Marrakech, etc.
// ============================================================================

export type LocationType = 'city' | 'region' | 'country' | 'area' | 'neighborhood';

export interface Location {
  id: number;
  tenant_id: string;
  name: string;
  slug?: string;                    // URL-friendly
  location_type: LocationType;      // city, region, country, area, neighborhood
  parent_id?: number;               // Hiérarchie optionnelle
  country_code?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;         // Google Place ID
  description?: string;
  content_id?: number;              // Lien futur vers article de contenu
  sort_order: number;
  is_active: boolean;
  // Statistiques
  accommodation_count?: number;     // Nombre d'hébergements dans cette location
  created_at?: string;
  updated_at?: string;
}

export interface CreateLocationDTO {
  name: string;
  slug?: string;
  location_type?: LocationType;     // Défaut: 'city'
  parent_id?: number;
  country_code?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateLocationDTO extends Partial<CreateLocationDTO> {
  is_active?: boolean;
}

// ============================================================================
// Service Template Types (Journées types et Formules types)
// ============================================================================

// Catégorie de formule (aligné avec SupplierType pour cohérence)
export type FormulaCategory = 'accommodation' | 'activity' | 'transport' | 'restaurant' | 'guide' | 'other';

export const FORMULA_CATEGORY_LABELS: Record<FormulaCategory, { label: string; icon: string }> = {
  accommodation: { label: 'Hébergement', icon: '🏨' },
  activity: { label: 'Activité', icon: '🎯' },
  transport: { label: 'Transport', icon: '🚐' },
  restaurant: { label: 'Restauration', icon: '🍽️' },
  guide: { label: 'Accompagnement', icon: '👤' },
  other: { label: 'Autre', icon: '📦' },
};

// Template de journée (contient plusieurs formules)
export interface DayTemplate {
  id: number;
  tenant_id: string;
  name: string;
  description?: string;
  country_code?: string;
  location_id?: number;
  location?: Location;
  duration_hours?: number;
  tags?: string[];
  formulas: FormulaTemplate[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Template de formule (une ou plusieurs prestations du même fournisseur)
export interface FormulaTemplate {
  id: number;
  tenant_id: string;
  day_template_id?: number;     // NULL si template indépendant

  // Identification
  name: string;
  description?: string;
  description_html?: string;

  // Classification (pour recherche et filtrage)
  category: FormulaCategory;          // Type: hébergement, activité, transport, etc.
  tags?: string[];                    // Tags additionnels: ['famille', 'aventure', 'luxe', ...]

  // Localisation (pour recherche géographique)
  country_code?: string;
  location_id?: number;
  location?: Location;

  // Fournisseur associé (une formule = un seul fournisseur)
  supplier_id?: number;
  supplier?: Supplier;

  // Items (prestations du fournisseur)
  items: ItemTemplate[];

  // Meta
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Template d'item (prestation)
export interface ItemTemplate {
  id: number;
  formula_template_id: number;
  name: string;
  cost_nature_id?: number;
  cost_nature?: CostNature;
  supplier_id?: number;
  supplier?: Supplier;
  location_id?: number;
  location?: Location;
  unit_cost: number;
  currency?: string;
  ratio_rule: RatioRule;
  notes?: string;
  sort_order: number;
}

// DTOs pour les templates
export interface CreateDayTemplateDTO {
  name: string;
  description?: string;
  country_code?: string;
  location_id?: number;
  duration_hours?: number;
  tags?: string[];
}

export interface UpdateDayTemplateDTO extends Partial<CreateDayTemplateDTO> {
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateFormulaTemplateDTO {
  name: string;
  category: FormulaCategory;          // Type de prestation (obligatoire)
  description?: string;
  description_html?: string;
  tags?: string[];
  day_template_id?: number;
  country_code?: string;
  location_id?: number;
  supplier_id?: number;
}

export interface UpdateFormulaTemplateDTO extends Partial<CreateFormulaTemplateDTO> {
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateItemTemplateDTO {
  formula_template_id: number;
  name: string;
  cost_nature_id?: number;
  supplier_id?: number;
  location_id?: number;
  unit_cost: number;
  currency?: string;
  ratio_rule?: RatioRule;
  notes?: string;
  sort_order?: number;
}

export interface UpdateItemTemplateDTO extends Partial<Omit<CreateItemTemplateDTO, 'formula_template_id'>> {}

// ============================================================================
// Accommodation Types (Hébergements avancés)
// ============================================================================

// Types de lit standards
export type RoomBedType = 'DBL' | 'TWN' | 'SGL' | 'TPL' | 'FAM' | 'EXB' | 'CNT';

export const ROOM_BED_TYPE_LABELS: Record<RoomBedType, string> = {
  DBL: 'Double',
  TWN: 'Twin',
  SGL: 'Single',
  TPL: 'Triple',
  FAM: 'Familiale',
  EXB: 'Lit supplémentaire',
  CNT: 'Communicante',
};

// Type de saison pour les tarifs
export type SeasonType = 'fixed' | 'recurring' | 'weekday';

// Niveau de saison pour le tarif de référence
// low = basse saison, high = haute saison (référence par défaut), peak = peak/fêtes
export type SeasonLevel = 'low' | 'high' | 'peak';

// Labels pour les niveaux de saison
export const SEASON_LEVEL_LABELS: Record<SeasonLevel, string> = {
  low: 'Basse saison',
  high: 'Haute saison',
  peak: 'Peak / Fêtes',
};

// Statut d'un hébergement
export type AccommodationStatus = 'active' | 'inactive' | 'pending' | 'archived';

/**
 * Hébergement (hôtel, riad, lodge, etc.)
 * Étend le Supplier de type 'accommodation'
 */
export interface Accommodation {
  id: number;
  tenant_id: string;
  supplier_id: number;           // Référence au Supplier parent
  supplier?: Supplier;

  // Informations de base
  name: string;
  description?: string;
  description_html?: string;
  star_rating?: number;          // 1-5 étoiles (classification officielle)
  internal_priority?: number;    // Priorité interne (1=primaire, 2=secondaire, etc.)
  internal_notes?: string;       // Notes internes pour les vendeurs (ex: "pas de twin", "lit supp = matelas")
  check_in_time?: string;        // "14:00"
  check_out_time?: string;       // "11:00"

  // Localisation
  location_id?: number;
  location?: Location;
  address?: string;
  city?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;      // ID Google Places pour validation

  // Équipements et services
  amenities?: string[];          // ['wifi', 'pool', 'spa', 'parking', ...]

  // Contact spécifique réservation
  reservation_email?: string;
  reservation_phone?: string;

  // Site web
  website_url?: string;

  // Entité de facturation (pour la logistique)
  billing_entity_name?: string;    // Nom alternatif si différent du fournisseur parent
  billing_entity_note?: string;    // Note pour la logistique

  // Intégration externe (RateHawk, HotelBeds, etc.)
  external_provider?: 'ratehawk' | 'hotelbeds' | 'amadeus' | 'manual';
  external_id?: string;          // ID chez le fournisseur externe

  // Lien vers article de contenu (fiche descriptive)
  content_id?: number;

  // Conditions de paiement (override optionnel - si null, utilise supplier.default_payment_terms)
  payment_terms_id?: number;
  payment_terms?: PaymentTerms;

  // Photos générales
  photos?: AccommodationPhoto[];

  // Catégories de chambres
  room_categories?: RoomCategory[];

  // Saisons tarifaires
  seasons?: AccommodationSeason[];

  // Early Bird Discounts
  early_bird_discounts?: EarlyBirdDiscount[];

  // Meta
  status: AccommodationStatus;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Photo d'hébergement ou de chambre
 */
export interface AccommodationPhoto {
  id: number;
  accommodation_id: number;
  room_category_id?: number;     // NULL = photo générale de l'hôtel

  // URLs
  url: string;                   // URL principale
  thumbnail_url?: string;        // Miniature (150px)
  storage_path?: string;         // Chemin Supabase Storage

  // Variants optimisés (générés par le worker)
  url_avif?: string;             // Version AVIF optimisée
  url_webp?: string;             // Version WebP fallback
  url_medium?: string;           // 800px pour articles
  url_large?: string;            // 1920px pour hero
  srcset_json?: string;          // JSON srcset pour responsive
  lqip_data_url?: string;        // Base64 blur placeholder

  // Metadata
  original_filename?: string;
  file_size?: number;            // Bytes
  mime_type?: string;
  width?: number;
  height?: number;
  caption?: string;
  alt_text?: string;

  // Flags
  is_main: boolean;
  is_processed: boolean;         // true si variants générés
  sort_order: number;

  created_at?: string;
  updated_at?: string;
}

/**
 * DTO pour créer une photo
 */
export interface CreateAccommodationPhotoDTO {
  room_category_id?: number;
  caption?: string;
  alt_text?: string;
  is_main?: boolean;
}

/**
 * DTO pour mettre à jour une photo
 */
export interface UpdateAccommodationPhotoDTO {
  caption?: string;
  alt_text?: string;
  is_main?: boolean;
  sort_order?: number;
}

/**
 * Catégorie de chambre personnalisée par hôtel
 * Ex: "Standard", "Supérieure", "Suite Bord de Mer", "Villa Jardin"
 */
export interface RoomCategory {
  id: number;
  accommodation_id: number;

  // Informations
  name: string;                  // "Suite Bord de Mer"
  code?: string;                 // "SBM" (pour les contrats)
  description?: string;

  // Capacité
  min_occupancy: number;         // Min personnes
  max_occupancy: number;         // Max personnes
  max_adults: number;
  max_children: number;

  // Types de lit disponibles pour cette catégorie
  available_bed_types: RoomBedType[];  // ['DBL', 'TWN']

  // Surface
  size_sqm?: number;             // Surface en m²

  // Équipements spécifiques à la chambre
  amenities?: string[];          // ['balcon', 'vue mer', 'baignoire', ...]

  // Photos
  photos?: AccommodationPhoto[];

  // Meta
  is_active: boolean;
  sort_order: number;
}

/**
 * Saison tarifaire pour un hébergement
 */
export interface AccommodationSeason {
  id: number;
  accommodation_id: number;

  // Identification
  name: string;                  // "Haute Saison Noël", "Basse Saison"
  code?: string;                 // "HS_NOEL", "BS"

  // Type de saison
  season_type: SeasonType;       // 'fixed', 'recurring', 'weekday'

  // Dates (pour fixed et recurring)
  // Si recurring = true, les années sont ignorées
  start_date?: string;           // "2025-12-24" ou "12-24" (recurring)
  end_date?: string;             // "2026-01-02" ou "01-02" (recurring)

  // Jours de la semaine (pour weekday)
  // 0 = Dimanche, 1 = Lundi, ... 6 = Samedi
  weekdays?: number[];           // [5, 6] = Vendredi et Samedi

  // Année (null = toutes les années / récurrent)
  // Peut être "2024" ou "2024-2025" pour les plages
  year?: string | null;

  // Priorité (en cas de chevauchement, la plus haute gagne)
  priority: number;

  // Niveau de saison pour le tarif de référence
  // low = basse saison, high = haute saison (référence), peak = peak/fêtes
  season_level: SeasonLevel;

  // Multiplicateur ou override
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tarif d'une chambre pour une saison donnée
 * Matrice : Catégorie × Type de lit × Saison × Occupation
 */
export interface RoomRate {
  id: number;
  accommodation_id: number;
  room_category_id: number;
  season_id?: number;            // NULL = tarif par défaut

  // Type de lit concerné
  bed_type: RoomBedType;

  // Base d'occupation pour ce tarif
  base_occupancy: number;        // Ex: 2 personnes

  // Tarifs
  rate_type: 'per_night' | 'per_person_per_night';
  cost: number;                  // Coût d'achat
  currency: string;

  // Suppléments
  single_supplement?: number;    // Supplément single
  extra_adult?: number;          // Coût adulte supplémentaire
  extra_child?: number;          // Coût enfant supplémentaire

  // Repas inclus
  meal_plan: MealPlan;

  // Validité
  valid_from?: string;
  valid_to?: string;

  // Notes (conditions, restrictions)
  notes?: string;

  is_active: boolean;
}

export type MealPlan = 'RO' | 'BB' | 'HB' | 'FB' | 'AI';

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  RO: 'Room Only',
  BB: 'Bed & Breakfast',
  HB: 'Half Board',
  FB: 'Full Board',
  AI: 'All Inclusive',
};

/**
 * Early Bird Discount - Réduction pour réservation anticipée
 * Ex: -15% si réservé 60 jours à l'avance
 */
export interface EarlyBirdDiscount {
  id: number;
  accommodation_id: number;
  name: string;                  // "Early Bird 60 jours"
  days_in_advance: number;       // 60
  discount_percent: number;      // 15.00 pour 15%
  discount_amount?: number;      // Alternative: montant fixe
  discount_currency?: string;
  valid_from?: string;           // Période de validité
  valid_to?: string;
  season_ids?: number[];         // Applicable à certaines saisons seulement (inclusion)
  excluded_season_ids?: number[]; // Exclure certaines saisons (ex: Noël, Haute saison)
  is_cumulative: boolean;        // Cumulable avec autres réductions?
  priority: number;              // Priorité si plusieurs réductions
  is_active: boolean;
}

export interface CreateEarlyBirdDiscountDTO {
  accommodation_id: number;
  name: string;
  days_in_advance: number;
  discount_percent: number;
  discount_amount?: number;
  discount_currency?: string;
  valid_from?: string;
  valid_to?: string;
  season_ids?: number[];
  excluded_season_ids?: number[]; // Exclure certaines saisons (ex: Noël)
  is_cumulative?: boolean;
  priority?: number;
}

export interface UpdateEarlyBirdDiscountDTO extends Partial<Omit<CreateEarlyBirdDiscountDTO, 'accommodation_id'>> {
  is_active?: boolean;
}

// ============================================================================
// Accommodation Extras (Optional Supplements)
// ============================================================================

/**
 * Type de supplément optionnel
 */
export type ExtraType = 'meal' | 'transfer' | 'activity' | 'service' | 'other';

export const EXTRA_TYPE_LABELS: Record<ExtraType, string> = {
  meal: 'Repas',
  transfer: 'Transfert',
  activity: 'Activité',
  service: 'Service',
  other: 'Autre',
};

/**
 * Modèle de tarification pour les extras
 */
export type ExtraPricingModel =
  | 'per_person_per_night'  // Par personne par nuit (ex: petit-déjeuner)
  | 'per_room_per_night'    // Par chambre par nuit (ex: parking)
  | 'per_person'            // Par personne (ex: transfert aller simple)
  | 'per_unit'              // Par unité (ex: transfert A/R, spa)
  | 'flat';                 // Forfait unique (ex: late checkout)

export const PRICING_MODEL_LABELS: Record<ExtraPricingModel, string> = {
  per_person_per_night: 'Par personne / nuit',
  per_room_per_night: 'Par chambre / nuit',
  per_person: 'Par personne',
  per_unit: 'Par unité',
  flat: 'Forfait unique',
};

/**
 * Supplément optionnel pour un hébergement
 * Ex: Petit-déjeuner, Transfert aéroport, Accès spa, etc.
 */
export interface AccommodationExtra {
  id: number;
  accommodation_id: number;
  name: string;                    // "Petit-déjeuner", "Transfert aéroport"
  code?: string;                   // "BRK", "TRF"
  description?: string;
  extra_type: ExtraType;           // meal, transfer, activity, service, other
  unit_cost: number;               // Prix unitaire
  currency: string;                // EUR, THB, USD...
  pricing_model: ExtraPricingModel; // Comment calculer le coût total
  season_id?: number;              // Optionnel: tarif saisonnier
  valid_from?: string;             // Période de validité
  valid_to?: string;
  is_included: boolean;            // Inclus dans le tarif de base?
  is_mandatory: boolean;           // Obligatoire pour toute réservation?
  sort_order: number;
  is_active: boolean;
}

export interface CreateAccommodationExtraDTO {
  name: string;
  code?: string;
  description?: string;
  extra_type?: ExtraType;
  unit_cost: number;
  currency?: string;
  pricing_model?: ExtraPricingModel;
  season_id?: number;
  valid_from?: string;
  valid_to?: string;
  is_included?: boolean;
  is_mandatory?: boolean;
  sort_order?: number;
}

export interface UpdateAccommodationExtraDTO extends Partial<CreateAccommodationExtraDTO> {
  is_active?: boolean;
}

// ============================================================================
// Accommodation DTOs
// ============================================================================

export interface CreateAccommodationDTO {
  supplier_id: number;
  name: string;
  description?: string;
  star_rating?: number;
  internal_priority?: number;    // Priorité interne (1=primaire, 2=secondaire, etc.)
  internal_notes?: string;       // Notes internes pour les vendeurs
  location_id?: number;
  address?: string;
  city?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  check_in_time?: string;
  check_out_time?: string;
  amenities?: string[];
  reservation_email?: string;
  reservation_phone?: string;
  website_url?: string;
  // Entité de facturation (pour la logistique)
  billing_entity_name?: string;
  billing_entity_note?: string;
  external_provider?: 'ratehawk' | 'hotelbeds' | 'amadeus' | 'manual';
  external_id?: string;
}

export interface UpdateAccommodationDTO extends Partial<CreateAccommodationDTO> {
  status?: AccommodationStatus;
  is_active?: boolean;
}

export interface CreateRoomCategoryDTO {
  accommodation_id: number;
  name: string;
  code?: string;
  description?: string;
  min_occupancy?: number;
  max_occupancy?: number;
  max_adults?: number;
  max_children?: number;
  available_bed_types: RoomBedType[];
  size_sqm?: number;
  amenities?: string[];
}

export interface UpdateRoomCategoryDTO extends Partial<Omit<CreateRoomCategoryDTO, 'accommodation_id'>> {
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateAccommodationSeasonDTO {
  accommodation_id: number;
  name: string;
  code?: string;
  season_type: SeasonType;
  season_level?: SeasonLevel;  // low, high (default reference), peak
  start_date?: string;
  end_date?: string;
  weekdays?: number[];
  year?: string | null;  // Can be "2024" or "2024-2025" for ranges
  priority?: number;
}

export interface UpdateAccommodationSeasonDTO extends Partial<Omit<CreateAccommodationSeasonDTO, 'accommodation_id'>> {
  is_active?: boolean;
}

export interface CreateRoomRateDTO {
  accommodation_id: number;
  room_category_id: number;
  season_id?: number;
  bed_type: RoomBedType;
  base_occupancy?: number;
  rate_type?: 'per_night' | 'per_person_per_night';
  cost: number;
  currency?: string;
  single_supplement?: number;
  extra_adult?: number;
  extra_child?: number;
  meal_plan?: MealPlan;
  valid_from?: string;
  valid_to?: string;
  notes?: string;
}

export interface UpdateRoomRateDTO extends Partial<Omit<CreateRoomRateDTO, 'accommodation_id' | 'room_category_id'>> {
  is_active?: boolean;
}

// ============================================================================
// External Availability API Types (RateHawk, HotelBeds, etc.)
// ============================================================================

export interface AvailabilitySearchParams {
  accommodation_id?: number;     // Recherche pour un hôtel spécifique
  location_id?: number;          // Ou recherche par zone
  check_in: string;              // "2025-12-24"
  check_out: string;             // "2025-12-27"
  rooms: AvailabilityRoomRequest[];
  currency?: string;
}

export interface AvailabilityRoomRequest {
  adults: number;
  children?: number;
  children_ages?: number[];
}

export interface AvailabilityResult {
  provider: 'ratehawk' | 'hotelbeds' | 'amadeus' | 'contract';
  accommodation_id?: number;     // Si lié à notre base
  external_id: string;
  name: string;
  star_rating?: number;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  rooms: AvailableRoom[];
  lowest_rate?: number;
  currency: string;
  cached_at?: string;
}

export interface AvailableRoom {
  room_id: string;
  room_name: string;
  bed_type?: string;
  meal_plan: MealPlan;
  rate_per_night: number;
  total_rate: number;
  currency: string;
  cancellation_policy?: string;
  is_refundable: boolean;
  // Comparaison avec tarif contrat
  contract_rate?: number;        // Notre tarif au contrat
  rate_difference?: number;      // Différence (+ = plus cher que contrat)
  rate_difference_pct?: number;
}

// ============================================================================
// Content Article System - Fiches descriptives multilingues
// ============================================================================

/**
 * Types de contenu disponibles
 */
export type ContentEntityType =
  | 'attraction'     // Point d'intérêt, monument, site
  | 'destination'    // Ville, village
  | 'activity'       // Activité (randonnée, cours de cuisine, etc.)
  | 'accommodation'  // Hébergement (lié au système fournisseurs)
  | 'eating'         // Restaurant, café
  | 'region';        // Région géographique

/**
 * Statut de publication du contenu
 */
export type ContentStatus =
  | 'draft'          // En cours de rédaction
  | 'review'         // En attente de validation
  | 'published'      // Publié sur le site
  | 'archived';      // Archivé (conservé mais masqué)

/**
 * Types de relations entre entités de contenu
 */
export type ContentRelationType =
  | 'part_of'        // L'attraction fait partie de la destination
  | 'near'           // À proximité
  | 'related'        // Contenu associé
  | 'see_also'       // Voir aussi
  | 'includes';      // La région inclut des destinations

/**
 * Statut de génération IA
 */
export type AIGenerationStatus =
  | 'pending'        // En attente
  | 'in_progress'    // En cours
  | 'completed'      // Terminé
  | 'failed'         // Échec
  | 'reviewed';      // Validé par un humain

/**
 * Langues supportées pour le contenu
 */
export type SupportedLanguage = 'fr' | 'en' | 'it' | 'es' | 'de';

/**
 * Entité de contenu principale
 */
export interface ContentEntity {
  id: string;                    // UUID
  tenant_id: string;
  entity_type: ContentEntityType;
  status: ContentStatus;

  // Location géographique
  location_id?: number;
  location?: Location;           // Relation populée
  lat?: number;
  lng?: number;
  google_place_id?: string;
  address?: string;

  // Hiérarchie
  parent_id?: string;            // UUID de l'entité parente
  parent?: ContentEntity;        // Relation populée
  children?: ContentEntity[];    // Enfants

  // Entités liées (cross-references)
  supplier_id?: number;          // Pour accommodation/eating
  accommodation_id?: number;     // Lien vers Accommodation

  // Notation
  rating?: number;               // 0.0 à 5.0
  rating_count: number;
  internal_priority: number;     // Pour le tri (1 = top)

  // SEO
  canonical_url?: string;
  meta_robots: string;
  structured_data_json?: Record<string, unknown>;

  // Image de couverture
  cover_image_url?: string;
  cover_image_alt?: string;

  // IA
  ai_generation_status?: AIGenerationStatus;
  ai_generated_at?: string;
  ai_model_used?: string;

  // Flags
  is_featured: boolean;
  view_count: number;

  // Relations
  translations?: ContentTranslation[];
  photos?: ContentPhoto[];
  tags?: ContentTag[];
  relations?: ContentRelation[];

  // Meta
  created_by?: string;
  updated_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Traduction d'une entité de contenu (par langue)
 */
export interface ContentTranslation {
  id: string;                    // UUID
  entity_id: string;
  language_code: SupportedLanguage;

  // SEO - champs critiques
  title: string;
  slug: string;                  // URL-friendly, unique par tenant+langue
  meta_title?: string;           // Max 60 chars
  meta_description?: string;     // Max 160 chars

  // Contenu
  excerpt?: string;              // 150-200 chars pour les cards
  content_markdown?: string;     // Contenu complet en Markdown
  content_html?: string;         // HTML rendu (cache)

  // IA
  ai_generation_status?: AIGenerationStatus;
  ai_generated_at?: string;
  ai_reviewed_by?: string;
  ai_reviewed_at?: string;

  // Flags
  is_primary: boolean;           // Langue principale de l'entité
  word_count?: number;
  reading_time_minutes?: number;

  created_at: string;
  updated_at: string;
}

/**
 * Photo associée à une entité de contenu
 */
export interface ContentPhoto {
  id: string;                    // UUID
  entity_id: string;
  url: string;
  thumbnail_url?: string;
  storage_path?: string;

  // Variants optimisés
  url_avif?: string;
  url_webp?: string;
  url_medium?: string;           // 800px
  url_large?: string;            // 1920px
  srcset_json?: Record<string, string>;
  lqip_data_url?: string;        // Base64 blur placeholder

  // Metadata
  original_filename?: string;
  file_size?: number;
  width?: number;
  height?: number;

  // Multilingue
  caption_json?: Record<SupportedLanguage, string>;
  alt_text_json?: Record<SupportedLanguage, string>;

  // Flags
  is_cover: boolean;
  is_processed: boolean;
  sort_order: number;

  created_at?: string;
  updated_at?: string;
}

/**
 * Tag de contenu avec traductions
 */
export interface ContentTag {
  id: string;                    // UUID
  tenant_id: string;
  slug: string;
  parent_id?: string;            // Pour tags hiérarchiques
  color?: string;                // Couleur hex pour UI
  icon?: string;                 // Nom d'icône lucide-react
  sort_order: number;
  is_active: boolean;

  // Traductions des labels
  labels: Record<SupportedLanguage, string>;
  descriptions?: Record<SupportedLanguage, string>;

  created_at?: string;
  updated_at?: string;
}

/**
 * Relation entre deux entités de contenu
 */
export interface ContentRelation {
  id: string;                    // UUID
  source_entity_id: string;
  target_entity_id: string;
  relation_type: ContentRelationType;
  sort_order: number;
  is_bidirectional: boolean;

  // Entité cible populée
  target?: ContentEntity;

  created_at?: string;
}

// ============================================================================
// Content DTOs
// ============================================================================

/**
 * DTO pour créer une entité de contenu
 */
export interface CreateContentEntityDTO {
  entity_type: ContentEntityType;
  location_id?: number;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  address?: string;
  parent_id?: string;
  supplier_id?: number;
  accommodation_id?: number;
  rating?: number;
  is_featured?: boolean;

  // Traduction initiale (obligatoire)
  initial_translation: {
    language_code: SupportedLanguage;
    title: string;
    slug?: string;               // Auto-généré si non fourni
    excerpt?: string;
    content_markdown?: string;
  };

  // Tags optionnels
  tag_ids?: string[];
}

/**
 * DTO pour mettre à jour une entité de contenu
 */
export interface UpdateContentEntityDTO {
  status?: ContentStatus;
  location_id?: number;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  address?: string;
  parent_id?: string;
  supplier_id?: number;
  accommodation_id?: number;
  rating?: number;
  is_featured?: boolean;
  cover_image_url?: string;
  cover_image_alt?: string;
  canonical_url?: string;
  meta_robots?: string;
}

/**
 * DTO pour créer une traduction
 */
export interface CreateContentTranslationDTO {
  entity_id: string;
  language_code: SupportedLanguage;
  title: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  excerpt?: string;
  content_markdown?: string;
  is_primary?: boolean;
}

/**
 * DTO pour mettre à jour une traduction
 */
export interface UpdateContentTranslationDTO {
  title?: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  excerpt?: string;
  content_markdown?: string;
  is_primary?: boolean;
}

/**
 * DTO pour la génération IA de contenu
 */
export interface AIGenerateContentDTO {
  entity_id: string;
  language_codes: SupportedLanguage[];
  prompt_context?: {
    tone?: 'marketing' | 'informative' | 'adventure' | 'luxury' | 'family';
    target_audience?: string;
    key_points?: string[];
    word_count_target?: number;
  };
  regenerate_existing?: boolean;
}

/**
 * Résultat de génération IA
 */
export interface AIGenerationResult {
  entity_id: string;
  language_code: SupportedLanguage;
  status: 'success' | 'failed';
  generated_content?: {
    title: string;
    meta_title: string;
    meta_description: string;
    excerpt: string;
    content_markdown: string;
  };
  error?: string;
  tokens_used?: number;
}

/**
 * Filtres pour rechercher des entités de contenu
 */
export interface ContentEntityFilters {
  entity_type?: ContentEntityType;
  status?: ContentStatus;
  language_code?: SupportedLanguage;
  location_id?: number;
  parent_id?: string;
  tag_ids?: string[];
  is_featured?: boolean;
  has_ai_content?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'rating' | 'view_count';
  sort_order?: 'asc' | 'desc';
}

/**
 * Réponse paginée générique
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
