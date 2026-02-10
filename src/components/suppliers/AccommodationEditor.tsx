'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Star,
  Clock,
  MapPin,
  Mail,
  Phone,
  Save,
  X,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Medal,
  FileText,
} from 'lucide-react';
import GooglePlacesAutocomplete, { PlaceResult } from '@/components/common/GooglePlacesAutocomplete';
import { LocationSelector } from './LocationSelector';
import UrlImportButton from './UrlImportButton';
import type {
  Accommodation,
  CreateAccommodationDTO,
  UpdateAccommodationDTO,
  AccommodationStatus,
} from '@/lib/api/types';

// ============================================================================
// Constants
// ============================================================================

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'piscine', label: 'Piscine' },
  { value: 'spa', label: 'Spa' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'parking', label: 'Parking' },
  { value: 'climatisation', label: 'Climatisation' },
  { value: 'salle_sport', label: 'Salle de sport' },
  { value: 'bar', label: 'Bar' },
  { value: 'room_service', label: 'Room service' },
  { value: 'navette_aeroport', label: 'Navette aéroport' },
  { value: 'concierge', label: 'Conciergerie' },
  { value: 'jardin', label: 'Jardin' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'animaux', label: 'Animaux acceptés' },
];

const STATUS_OPTIONS: { value: AccommodationStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Actif', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'inactive', label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'En attente', color: 'bg-amber-100 text-amber-700' },
];

const EXTERNAL_PROVIDERS = [
  { value: 'manual', label: 'Gestion manuelle' },
  { value: 'ratehawk', label: 'RateHawk' },
  { value: 'hotelbeds', label: 'HotelBeds' },
  { value: 'amadeus', label: 'Amadeus' },
];

// ============================================================================
// Types
// ============================================================================

interface AccommodationEditorProps {
  supplierId: number;
  accommodation: Accommodation | null;
  onSave: (data: CreateAccommodationDTO | UpdateAccommodationDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// Type pour les données importées depuis URL
interface ImportedAccommodationData {
  name?: string;
  description?: string;
  star_rating?: number;
  address?: string;
  city?: string;
  country_code?: string;
  check_in_time?: string;
  check_out_time?: string;
  amenities?: string[];
  reservation_email?: string;
  reservation_phone?: string;
  website_url?: string;
  room_categories?: Array<{
    name: string;
    description?: string;
    max_occupancy?: number;
  }>;
  photo_urls?: string[];
  source_url: string;
}

// Options pour la priorité interne
const PRIORITY_OPTIONS = [
  { value: 1, label: 'Prioritaire', description: 'Fournisseur principal', color: 'bg-emerald-100 text-emerald-700 ring-emerald-300' },
  { value: 2, label: 'Secondaire', description: 'Alternative de qualité', color: 'bg-blue-100 text-blue-700 ring-blue-300' },
  { value: 3, label: 'Backup', description: 'En cas de non-disponibilité', color: 'bg-amber-100 text-amber-700 ring-amber-300' },
  { value: 4, label: 'Occasionnel', description: 'Usage ponctuel', color: 'bg-gray-100 text-gray-700 ring-gray-300' },
];

type FormData = {
  name: string;
  description: string;
  star_rating: number | null;
  internal_priority: number | null;
  internal_notes: string;
  check_in_time: string;
  check_out_time: string;
  // Location (destination interne pour filtrage)
  location_id: number | null;
  // Adresse Google Maps (géolocalisation précise)
  address: string;
  city: string;
  country_code: string;
  lat: number | null;
  lng: number | null;
  google_place_id: string;
  amenities: string[];
  reservation_email: string;
  reservation_phone: string;
  // Entité de facturation (pour la logistique)
  billing_entity_name: string;
  billing_entity_note: string;
  external_provider: string;
  external_id: string;
  status: AccommodationStatus;
};

// ============================================================================
// Component
// ============================================================================

export default function AccommodationEditor({
  supplierId,
  accommodation,
  onSave,
  onCancel,
  loading = false,
}: AccommodationEditorProps) {
  const isEditing = !!accommodation;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    star_rating: null,
    internal_priority: null,
    internal_notes: '',
    check_in_time: '14:00',
    check_out_time: '11:00',
    // Location
    location_id: null,
    // Adresse
    address: '',
    city: '',
    country_code: '',
    lat: null,
    lng: null,
    google_place_id: '',
    amenities: [],
    reservation_email: '',
    reservation_phone: '',
    // Entité de facturation
    billing_entity_name: '',
    billing_entity_note: '',
    external_provider: 'manual',
    external_id: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Initialize form with accommodation data
  useEffect(() => {
    if (accommodation) {
      setFormData({
        name: accommodation.name || '',
        description: accommodation.description || '',
        star_rating: accommodation.star_rating || null,
        internal_priority: accommodation.internal_priority || null,
        internal_notes: accommodation.internal_notes || '',
        check_in_time: accommodation.check_in_time || '14:00',
        check_out_time: accommodation.check_out_time || '11:00',
        // Location
        location_id: accommodation.location_id || null,
        // Adresse
        address: accommodation.address || '',
        city: accommodation.city || '',
        country_code: accommodation.country_code || '',
        lat: accommodation.lat || null,
        lng: accommodation.lng || null,
        google_place_id: accommodation.google_place_id || '',
        amenities: accommodation.amenities || [],
        reservation_email: accommodation.reservation_email || '',
        reservation_phone: accommodation.reservation_phone || '',
        // Entité de facturation
        billing_entity_name: accommodation.billing_entity_name || '',
        billing_entity_note: accommodation.billing_entity_note || '',
        external_provider: accommodation.external_provider || 'manual',
        external_id: accommodation.external_id || '',
        status: accommodation.status || 'active',
      });
    }
  }, [accommodation]);

  // Handle URL import data
  const handleUrlImport = (importedData: ImportedAccommodationData) => {
    setFormData((prev) => ({
      ...prev,
      // Only update fields that are empty or if the imported data exists
      name: prev.name || importedData.name || '',
      description: prev.description || importedData.description || '',
      star_rating: importedData.star_rating || prev.star_rating,
      check_in_time: importedData.check_in_time || prev.check_in_time,
      check_out_time: importedData.check_out_time || prev.check_out_time,
      address: importedData.address || prev.address,
      city: importedData.city || prev.city,
      country_code: importedData.country_code || prev.country_code,
      amenities: importedData.amenities && importedData.amenities.length > 0
        ? importedData.amenities
        : prev.amenities,
      reservation_email: importedData.reservation_email || prev.reservation_email,
      reservation_phone: importedData.reservation_phone || prev.reservation_phone,
    }));
  };

  // Handle Google Places selection
  const handlePlaceSelect = (place: PlaceResult | null) => {
    if (place) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || place.name, // Only set name if empty
        address: place.formatted_address,
        city: place.city || '',
        country_code: place.country_code || '',
        lat: place.geometry?.location.lat || null,
        lng: place.geometry?.location.lng || null,
        google_place_id: place.place_id,
      }));
    } else {
      // Clear location data
      setFormData((prev) => ({
        ...prev,
        address: '',
        city: '',
        country_code: '',
        lat: null,
        lng: null,
        google_place_id: '',
      }));
    }
  };

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (formData.reservation_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reservation_email)) {
      newErrors.reservation_email = 'Email invalide';
    }

    if (formData.external_provider !== 'manual' && !formData.external_id) {
      newErrors.external_id = 'ID externe requis pour ce fournisseur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = isEditing
      ? ({
          name: formData.name,
          description: formData.description || undefined,
          star_rating: formData.star_rating || undefined,
          internal_priority: formData.internal_priority || undefined,
          internal_notes: formData.internal_notes || undefined,
          check_in_time: formData.check_in_time || undefined,
          check_out_time: formData.check_out_time || undefined,
          // Location (destination interne)
          location_id: formData.location_id || undefined,
          // Adresse Google Maps
          address: formData.address || undefined,
          city: formData.city || undefined,
          country_code: formData.country_code || undefined,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          google_place_id: formData.google_place_id || undefined,
          amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
          reservation_email: formData.reservation_email || undefined,
          reservation_phone: formData.reservation_phone || undefined,
          // Entité de facturation
          billing_entity_name: formData.billing_entity_name || undefined,
          billing_entity_note: formData.billing_entity_note || undefined,
          external_provider: formData.external_provider,
          external_id: formData.external_id || undefined,
          status: formData.status,
        } as UpdateAccommodationDTO)
      : ({
          supplier_id: supplierId,
          name: formData.name,
          description: formData.description || undefined,
          star_rating: formData.star_rating || undefined,
          internal_priority: formData.internal_priority || undefined,
          internal_notes: formData.internal_notes || undefined,
          check_in_time: formData.check_in_time || undefined,
          check_out_time: formData.check_out_time || undefined,
          // Location (destination interne)
          location_id: formData.location_id || undefined,
          // Adresse Google Maps
          address: formData.address || undefined,
          city: formData.city || undefined,
          country_code: formData.country_code || undefined,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          google_place_id: formData.google_place_id || undefined,
          amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
          reservation_email: formData.reservation_email || undefined,
          reservation_phone: formData.reservation_phone || undefined,
          // Entité de facturation
          billing_entity_name: formData.billing_entity_name || undefined,
          billing_entity_note: formData.billing_entity_note || undefined,
          external_provider: formData.external_provider,
          external_id: formData.external_id || undefined,
        } as CreateAccommodationDTO);

    await onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Modifier l'hébergement" : 'Nouvel hébergement'}
        </h3>
        <div className="flex items-center gap-3">
          {/* URL Import Button - Only show for new accommodations */}
          {!isEditing && (
            <UrlImportButton onImport={handleUrlImport} disabled={loading} />
          )}
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'hébergement *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Riad Jnane Mogador"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Location (destination interne pour filtrage) */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1 text-blue-600" />
                Destination (pour filtrage)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Associez cet hébergement à une destination (Chiang Mai, Bangkok, etc.)
              </p>
              <LocationSelector
                value={formData.location_id}
                onChange={(locationId) => handleChange('location_id', locationId)}
                countryCode={formData.country_code || undefined}
                placeholder="Sélectionner une destination..."
                allowCreate
                disabled={loading}
              />
            </div>
          </div>

          {/* Classifications Section */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Classifications</h4>

            {/* Star Rating (Official) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Star className="w-4 h-4 inline mr-1 text-amber-500" />
                Classification officielle (étoiles)
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleChange('star_rating', formData.star_rating === rating ? null : rating)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        formData.star_rating && rating <= formData.star_rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {formData.star_rating && (
                  <button
                    type="button"
                    onClick={() => handleChange('star_rating', null)}
                    className="ml-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Internal Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Medal className="w-4 h-4 inline mr-1 text-emerald-600" />
                Priorité interne
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Pour aider les vendeurs à choisir le bon prestataire
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange(
                      'internal_priority',
                      formData.internal_priority === option.value ? null : option.value
                    )}
                    className={`px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      formData.internal_priority === option.value
                        ? `${option.color} ring-2 ring-offset-1`
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="block text-xs opacity-75">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes internes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📝 Notes internes (vendeurs)
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => handleChange('internal_notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                placeholder="Ex: Pas de chambre twin disponible, lit supplémentaire = matelas au sol, Hollywood beds..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Ces notes sont visibles uniquement par les vendeurs
              </p>
            </div>
          </div>

          {/* Check-in / Check-out */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.check_in_time}
                  onChange={(e) => handleChange('check_in_time', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.check_out_time}
                  onChange={(e) => handleChange('check_out_time', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Address with Google Places */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher l'hébergement (adresse précise)
            </label>
            <GooglePlacesAutocomplete
              value={formData.address}
              placeholder="Tapez le nom de l'hôtel ou l'adresse..."
              onPlaceSelect={handlePlaceSelect}
              types={['lodging']}
              disabled={loading}
            />
            {formData.google_place_id && (
              <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Adresse validée via Google Maps
              </p>
            )}
          </div>

          {/* City & Country (Read-only if from Google) */}
          {(formData.city || formData.country_code) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                  placeholder="Ville"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <input
                  type="text"
                  value={formData.country_code}
                  onChange={(e) => handleChange('country_code', e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 uppercase"
                  placeholder="FR"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Description de l'établissement"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Contact Reservation & Facturation */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Contact réservation</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.reservation_email}
                  onChange={(e) => handleChange('reservation_email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.reservation_email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="reservation@hotel.com"
                />
              </div>
              {errors.reservation_email && (
                <p className="mt-1 text-sm text-red-600">{errors.reservation_email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.reservation_phone}
                  onChange={(e) => handleChange('reservation_phone', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+212 524 123 456"
                />
              </div>
            </div>
          </div>

          {/* External Provider */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Source des disponibilités</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <select
                value={formData.external_provider}
                onChange={(e) => handleChange('external_provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {EXTERNAL_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.external_provider !== 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID externe</label>
                <input
                  type="text"
                  value={formData.external_id}
                  onChange={(e) => handleChange('external_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.external_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="ID du fournisseur externe"
                />
                {errors.external_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.external_id}</p>
                )}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleChange('status', status.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.status === status.value
                      ? status.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Équipements & Services
            </label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <button
                  key={amenity.value}
                  type="button"
                  onClick={() => handleAmenityToggle(amenity.value)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                    formData.amenities.includes(amenity.value)
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {formData.amenities.includes(amenity.value) && (
                    <Check className="w-3 h-3" />
                  )}
                  {amenity.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEditing ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
