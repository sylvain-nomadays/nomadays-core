'use client';

import { useState, useEffect } from 'react';
import {
  Bed,
  Users,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  Camera,
  Maximize2,
  GripVertical,
} from 'lucide-react';
import type {
  RoomCategory,
  CreateRoomCategoryDTO,
  UpdateRoomCategoryDTO,
} from '@/lib/api/types';

// ============================================================================
// Constants
// ============================================================================

const BED_TYPE_OPTIONS = [
  { value: 'SGL', label: 'Simple (SGL)' },
  { value: 'DBL', label: 'Double (DBL)' },
  { value: 'TWN', label: 'Twin (TWN)' },
  { value: 'TPL', label: 'Triple (TPL)' },
  { value: 'QUAD', label: 'Quadruple (QUAD)' },
  { value: 'FAM', label: 'Familiale (FAM)' },
  { value: 'KING', label: 'King (KING)' },
  { value: 'QUEEN', label: 'Queen (QUEEN)' },
  { value: 'SUITE', label: 'Suite (SUITE)' },
];

const ROOM_AMENITY_OPTIONS = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'climatisation', label: 'Climatisation' },
  { value: 'coffre', label: 'Coffre-fort' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'tv', label: 'TV' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'balcon', label: 'Balcon' },
  { value: 'vue_mer', label: 'Vue mer' },
  { value: 'vue_jardin', label: 'Vue jardin' },
  { value: 'vue_piscine', label: 'Vue piscine' },
  { value: 'baignoire', label: 'Baignoire' },
  { value: 'douche_italienne', label: 'Douche italienne' },
  { value: 'jacuzzi', label: 'Jacuzzi' },
  { value: 'cheminee', label: 'Cheminée' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'salon', label: 'Salon' },
];

// ============================================================================
// Types
// ============================================================================

interface RoomCategoryEditorProps {
  accommodationId: number;
  category: RoomCategory | null;
  existingCategories: RoomCategory[];
  onSave: (data: CreateRoomCategoryDTO | { id: number; data: UpdateRoomCategoryDTO }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type FormData = {
  name: string;
  code: string;
  description: string;
  min_occupancy: number;
  max_occupancy: number;
  max_adults: number;
  max_children: number;
  available_bed_types: string[];
  size_sqm: number | null;
  amenities: string[];
  is_active: boolean;
};

// ============================================================================
// Component
// ============================================================================

export default function RoomCategoryEditor({
  accommodationId,
  category,
  existingCategories,
  onSave,
  onCancel,
  loading = false,
}: RoomCategoryEditorProps) {
  const isEditing = !!category;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    min_occupancy: 1,
    max_occupancy: 2,
    max_adults: 2,
    max_children: 1,
    available_bed_types: ['DBL'],
    size_sqm: null,
    amenities: [],
    is_active: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Initialize form with category data
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        code: category.code || '',
        description: category.description || '',
        min_occupancy: category.min_occupancy || 1,
        max_occupancy: category.max_occupancy || 2,
        max_adults: category.max_adults || 2,
        max_children: category.max_children ?? 1,
        available_bed_types: category.available_bed_types || ['DBL'],
        size_sqm: category.size_sqm || null,
        amenities: category.amenities || [],
        is_active: category.is_active ?? true,
      });
    }
  }, [category]);

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBedTypeToggle = (bedType: string) => {
    const newBedTypes = formData.available_bed_types.includes(bedType)
      ? formData.available_bed_types.filter((bt) => bt !== bedType)
      : [...formData.available_bed_types, bedType];

    setFormData((prev) => ({
      ...prev,
      available_bed_types: newBedTypes,
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const generateCode = (name: string): string => {
    // Generate a 3-letter code from the name
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return name.substring(0, 3).toUpperCase();
    }
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Le code est requis';
    } else {
      // Check for duplicate codes
      const duplicateCode = existingCategories.find(
        (c) => c.code === formData.code && c.id !== category?.id
      );
      if (duplicateCode) {
        newErrors.code = 'Ce code est déjà utilisé';
      }
    }

    if (formData.min_occupancy > formData.max_occupancy) {
      newErrors.min_occupancy = 'Doit être inférieur ou égal au maximum';
    }

    if (formData.max_adults > formData.max_occupancy) {
      newErrors.max_adults = 'Ne peut pas dépasser la capacité max';
    }

    if (formData.available_bed_types.length === 0) {
      newErrors.available_bed_types = 'Au moins un type de lit requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      accommodation_id: accommodationId,
      name: formData.name,
      code: formData.code,
      description: formData.description || undefined,
      min_occupancy: formData.min_occupancy,
      max_occupancy: formData.max_occupancy,
      max_adults: formData.max_adults,
      max_children: formData.max_children,
      available_bed_types: formData.available_bed_types,
      size_sqm: formData.size_sqm || undefined,
      amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
      is_active: formData.is_active,
    };

    if (isEditing && category) {
      await onSave({ id: category.id, data: submitData as UpdateRoomCategoryDTO });
    } else {
      await onSave(submitData as CreateRoomCategoryDTO);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie de chambre'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-4">
          {/* Name & Code */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  handleChange('name', e.target.value);
                  // Auto-generate code if it's empty
                  if (!formData.code && e.target.value) {
                    handleChange('code', generateCode(e.target.value));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ex: Suite Junior"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                maxLength={6}
                className={`w-full px-3 py-2 border rounded-lg font-mono text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="JRS"
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Description de la catégorie de chambre"
            />
          </div>

          {/* Occupancy */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Capacité</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Occupation min</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.min_occupancy}
                  onChange={(e) => handleChange('min_occupancy', parseInt(e.target.value) || 1)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.min_occupancy ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Occupation max</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_occupancy}
                  onChange={(e) => handleChange('max_occupancy', parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Adultes max</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_adults}
                  onChange={(e) => handleChange('max_adults', parseInt(e.target.value) || 2)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.max_adults ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Enfants max</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={formData.max_children}
                  onChange={(e) => handleChange('max_children', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {(errors.min_occupancy || errors.max_adults) && (
              <p className="mt-2 text-sm text-red-600">
                {errors.min_occupancy || errors.max_adults}
              </p>
            )}
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Maximize2 className="w-4 h-4 inline mr-1" />
              Surface (m²)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.size_sqm || ''}
              onChange={(e) => handleChange('size_sqm', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ex: 35"
            />
          </div>
        </div>

        {/* Right Column - Bed Types & Amenities */}
        <div className="space-y-4">
          {/* Bed Types */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Bed className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Types de lit disponibles *</h4>
            </div>

            <div className="space-y-2">
              {BED_TYPE_OPTIONS.map((bedType) => (
                <label
                  key={bedType.value}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    formData.available_bed_types.includes(bedType.value)
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.available_bed_types.includes(bedType.value)}
                    onChange={() => handleBedTypeToggle(bedType.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="flex-1 text-sm text-gray-700">{bedType.label}</span>
                </label>
              ))}
            </div>

            {errors.available_bed_types && (
              <p className="mt-2 text-sm text-red-600">{errors.available_bed_types}</p>
            )}
          </div>

          {/* Room Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Équipements de la chambre
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {ROOM_AMENITY_OPTIONS.map((amenity) => (
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

          {/* Active Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">
              Catégorie {formData.is_active ? 'active' : 'inactive'}
            </span>
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
