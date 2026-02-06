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
} from 'lucide-react';
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

type FormData = {
  name: string;
  description: string;
  star_rating: number | null;
  check_in_time: string;
  check_out_time: string;
  address: string;
  lat: number | null;
  lng: number | null;
  amenities: string[];
  reservation_email: string;
  reservation_phone: string;
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
    check_in_time: '14:00',
    check_out_time: '11:00',
    address: '',
    lat: null,
    lng: null,
    amenities: [],
    reservation_email: '',
    reservation_phone: '',
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
        check_in_time: accommodation.check_in_time || '14:00',
        check_out_time: accommodation.check_out_time || '11:00',
        address: accommodation.address || '',
        lat: accommodation.lat || null,
        lng: accommodation.lng || null,
        amenities: accommodation.amenities || [],
        reservation_email: accommodation.reservation_email || '',
        reservation_phone: accommodation.reservation_phone || '',
        external_provider: accommodation.external_provider || 'manual',
        external_id: accommodation.external_id || '',
        status: accommodation.status || 'active',
      });
    }
  }, [accommodation]);

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
          check_in_time: formData.check_in_time || undefined,
          check_out_time: formData.check_out_time || undefined,
          address: formData.address || undefined,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
          reservation_email: formData.reservation_email || undefined,
          reservation_phone: formData.reservation_phone || undefined,
          external_provider: formData.external_provider,
          external_id: formData.external_id || undefined,
          status: formData.status,
        } as UpdateAccommodationDTO)
      : ({
          supplier_id: supplierId,
          name: formData.name,
          description: formData.description || undefined,
          star_rating: formData.star_rating || undefined,
          check_in_time: formData.check_in_time || undefined,
          check_out_time: formData.check_out_time || undefined,
          address: formData.address || undefined,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
          reservation_email: formData.reservation_email || undefined,
          reservation_phone: formData.reservation_phone || undefined,
          external_provider: formData.external_provider,
          external_id: formData.external_id || undefined,
          status: formData.status,
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            disabled={loading}
          >
            <X className="w-4 h-4" />
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

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
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

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Adresse complète"
              />
            </div>
          </div>

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
          {/* Contact Reservation */}
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
