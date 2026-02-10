'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Save,
  X,
  Plus,
  Trash2,
  Info,
  Sun,
  Snowflake,
  Leaf,
  Cloud,
} from 'lucide-react';
import type {
  AccommodationSeason,
  CreateAccommodationSeasonDTO,
  UpdateAccommodationSeasonDTO,
  SeasonType,
  SeasonLevel,
} from '@/lib/api/types';
import { SEASON_LEVEL_LABELS } from '@/lib/api/types';

// ============================================================================
// Constants
// ============================================================================

const SEASON_TYPE_OPTIONS: { value: SeasonType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: 'fixed',
    label: 'Dates fixes',
    description: 'Période avec dates de début et fin spécifiques (ex: 01/10/2024 - 30/04/2025)',
    icon: Calendar,
  },
  {
    value: 'recurring',
    label: 'Récurrent',
    description: 'Se répète chaque année aux mêmes dates (ex: Noël du 20/12 au 05/01)',
    icon: Sun,
  },
  {
    value: 'weekday',
    label: 'Jours de la semaine',
    description: 'Applicable certains jours (ex: tarifs week-end)',
    icon: Cloud,
  },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche', short: 'Dim' },
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
];

const SEASON_PRESETS = [
  { name: 'Haute Saison', code: 'HS', icon: Sun, color: 'text-amber-500', level: 'high' as SeasonLevel },
  { name: 'Basse Saison', code: 'BS', icon: Leaf, color: 'text-emerald-500', level: 'low' as SeasonLevel },
  { name: 'Moyenne Saison', code: 'MS', icon: Cloud, color: 'text-blue-500', level: 'high' as SeasonLevel },
  { name: 'Noël / Nouvel An', code: 'XMAS', icon: Snowflake, color: 'text-sky-500', level: 'peak' as SeasonLevel },
  { name: 'Week-end', code: 'WE', icon: Calendar, color: 'text-purple-500', level: 'high' as SeasonLevel },
];

const SEASON_LEVEL_OPTIONS: { value: SeasonLevel; label: string; description: string; color: string }[] = [
  { value: 'low', label: 'Basse saison', description: 'Tarifs réduits', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'high', label: 'Haute saison', description: 'Tarif de référence par défaut', color: 'bg-amber-100 text-amber-700' },
  { value: 'peak', label: 'Peak / Fêtes', description: 'Noël, Nouvel An, etc.', color: 'bg-red-100 text-red-700' },
];

// ============================================================================
// Types
// ============================================================================

interface SeasonEditorProps {
  accommodationId: number;
  season: AccommodationSeason | null;
  existingSeasons: AccommodationSeason[];
  onSave: (data: CreateAccommodationSeasonDTO | { id: number; data: UpdateAccommodationSeasonDTO }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type FormData = {
  name: string;
  code: string;
  season_type: SeasonType;
  season_level: SeasonLevel;
  start_date: string;
  end_date: string;
  weekdays: number[];
  priority: number;
  is_active: boolean;
};

// ============================================================================
// Helpers
// ============================================================================

function formatDateForRecurring(date: string): string {
  // Convert YYYY-MM-DD to MM-DD for recurring seasons
  if (date.length === 10) {
    return date.substring(5);
  }
  return date;
}

function formatDateForFixed(date: string): string {
  // Ensure date is in YYYY-MM-DD format
  if (date.length === 5) {
    // MM-DD -> YYYY-MM-DD (use current/next year)
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${date}`;
  }
  return date;
}

// ============================================================================
// Component
// ============================================================================

export default function SeasonEditor({
  accommodationId,
  season,
  existingSeasons,
  onSave,
  onCancel,
  loading = false,
}: SeasonEditorProps) {
  const isEditing = !!season;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    season_type: 'fixed',
    season_level: 'high',
    start_date: '',
    end_date: '',
    weekdays: [],
    priority: 1,
    is_active: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Initialize form with season data
  useEffect(() => {
    if (season) {
      // For 'fixed' seasons, ensure dates are in YYYY-MM-DD format
      // For 'recurring' seasons, dates can be in MM-DD format
      let startDate = season.start_date || '';
      let endDate = season.end_date || '';

      if (season.season_type === 'fixed') {
        // If dates are in MM-DD format (length 5), convert them to YYYY-MM-DD
        // using the year from the season or current year
        if (startDate.length === 5) {
          const year = season.year?.split('-')[0] || new Date().getFullYear().toString();
          startDate = `${year}-${startDate}`;
        }
        if (endDate.length === 5) {
          // For end date, use the second year if it's a range (e.g., "2026-2027")
          const yearParts = season.year?.split('-') || [];
          const year = yearParts.length > 1 ? yearParts[1] : (yearParts[0] || new Date().getFullYear().toString());
          endDate = `${year}-${endDate}`;
        }
      }

      setFormData({
        name: season.name || '',
        code: season.code || '',
        season_type: season.season_type || 'fixed',
        season_level: season.season_level || 'high',
        start_date: startDate,
        end_date: endDate,
        weekdays: season.weekdays || [],
        priority: season.priority || 1,
        is_active: season.is_active ?? true,
      });
    } else {
      // Set default priority based on existing seasons
      const maxPriority = Math.max(0, ...existingSeasons.map((s) => s.priority || 0));
      setFormData((prev) => ({ ...prev, priority: maxPriority + 1 }));
    }
  }, [season, existingSeasons]);

  const handleChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePresetClick = (preset: (typeof SEASON_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      code: preset.code,
      season_level: preset.level,
    }));
  };

  const handleDayOfWeekToggle = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day].sort(),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Le code est requis';
    } else {
      const duplicateCode = existingSeasons.find(
        (s) => s.code === formData.code && s.id !== season?.id
      );
      if (duplicateCode) {
        newErrors.code = 'Ce code est déjà utilisé';
      }
    }

    if (formData.season_type === 'weekday') {
      if (formData.weekdays.length === 0) {
        newErrors.weekdays = 'Sélectionnez au moins un jour';
      }
    } else {
      if (!formData.start_date) {
        newErrors.start_date = 'Date de début requise';
      }
      if (!formData.end_date) {
        newErrors.end_date = 'Date de fin requise';
      }
    }

    if (formData.priority < 1) {
      newErrors.priority = 'La priorité doit être supérieure à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    let startDate = formData.start_date;
    let endDate = formData.end_date;
    let year: string | undefined = undefined;

    // Format dates based on season type
    if (formData.season_type === 'recurring') {
      // For recurring seasons, keep MM-DD format, no year
      startDate = formatDateForRecurring(startDate);
      endDate = formatDateForRecurring(endDate);
    } else if (formData.season_type === 'fixed') {
      // For fixed seasons, ensure YYYY-MM-DD and extract year
      startDate = formatDateForFixed(startDate);
      endDate = formatDateForFixed(endDate);

      // Extract year from dates
      const startYear = startDate.substring(0, 4);
      const endYear = endDate.substring(0, 4);

      if (startYear === endYear) {
        year = startYear;
      } else {
        year = `${startYear}-${endYear}`;
      }
    }

    const submitData = {
      accommodation_id: accommodationId,
      name: formData.name,
      code: formData.code,
      season_type: formData.season_type,
      season_level: formData.season_level,
      start_date: formData.season_type !== 'weekday' ? startDate : undefined,
      end_date: formData.season_type !== 'weekday' ? endDate : undefined,
      year: formData.season_type === 'fixed' ? year : undefined,
      weekdays: formData.season_type === 'weekday' ? formData.weekdays : undefined,
      priority: formData.priority,
      is_active: formData.is_active,
    };

    if (isEditing && season) {
      await onSave({ id: season.id, data: submitData as UpdateAccommodationSeasonDTO });
    } else {
      await onSave(submitData as CreateAccommodationSeasonDTO);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Modifier la saison' : 'Nouvelle saison tarifaire'}
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

      {/* Quick Presets */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modèles prédéfinis
          </label>
          <div className="flex flex-wrap gap-2">
            {SEASON_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    formData.code === preset.code
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${preset.color}`} />
                  <span className="text-sm">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-4">
          {/* Name & Code */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la saison *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ex: Haute Saison"
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
                placeholder="HS"
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            </div>
          </div>

          {/* Season Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de saison *
            </label>
            <div className="space-y-2">
              {SEASON_TYPE_OPTIONS.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                      formData.season_type === type.value
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="season_type"
                      value={type.value}
                      checked={formData.season_type === type.value}
                      onChange={() => handleChange('season_type', type.value)}
                      className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{type.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Season Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau tarifaire
              <span className="ml-1 text-gray-400 font-normal">(pour le tarif de référence)</span>
            </label>
            <div className="flex gap-2">
              {SEASON_LEVEL_OPTIONS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleChange('season_level', level.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    formData.season_level === level.value
                      ? `${level.color} border-transparent`
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={level.description}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Le tarif "Haute saison" est utilisé comme référence par défaut.
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorité
              <span className="ml-1 text-gray-400 font-normal">(plus haut = prioritaire)</span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={formData.priority}
              onChange={(e) => handleChange('priority', parseInt(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.priority ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority}</p>}
            <p className="mt-1 text-xs text-gray-500">
              En cas de chevauchement, la saison avec la priorité la plus élevée s'applique.
            </p>
          </div>
        </div>

        {/* Right Column - Dates / Days */}
        <div className="space-y-4">
          {/* Dates for fixed and recurring */}
          {formData.season_type !== 'weekday' && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h4 className="font-medium text-gray-900">
                  {formData.season_type === 'recurring' ? 'Dates récurrentes' : 'Période'}
                </h4>
              </div>

              {formData.season_type === 'recurring' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      Les dates récurrentes se répètent chaque année. Entrez uniquement le mois et
                      le jour (ex: 12-20 pour le 20 décembre).
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date de début *</label>
                  <input
                    type={formData.season_type === 'fixed' ? 'date' : 'text'}
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    placeholder={formData.season_type === 'recurring' ? 'MM-DD' : ''}
                    pattern={formData.season_type === 'recurring' ? '\\d{2}-\\d{2}' : undefined}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.start_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date de fin *</label>
                  <input
                    type={formData.season_type === 'fixed' ? 'date' : 'text'}
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    placeholder={formData.season_type === 'recurring' ? 'MM-DD' : ''}
                    pattern={formData.season_type === 'recurring' ? '\\d{2}-\\d{2}' : undefined}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.end_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Days of Week selector */}
          {formData.season_type === 'weekday' && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h4 className="font-medium text-gray-900">Jours applicables *</h4>
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayOfWeekToggle(day.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.weekdays.includes(day.value)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>

              {errors.weekdays && (
                <p className="mt-2 text-sm text-red-600">{errors.weekdays}</p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                La saison s'appliquera uniquement les jours sélectionnés.
              </p>
            </div>
          )}

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
              Saison {formData.is_active ? 'active' : 'inactive'}
            </span>
          </div>

          {/* Existing seasons summary */}
          {existingSeasons.length > 0 && (
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Saisons existantes</h4>
              <div className="space-y-1 text-sm">
                {existingSeasons
                  .filter((s) => s.id !== season?.id)
                  .slice(0, 5)
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-gray-600">
                      <span>{s.name}</span>
                      <span className="text-gray-400">Priorité: {s.priority}</span>
                    </div>
                  ))}
                {existingSeasons.filter((s) => s.id !== season?.id).length > 5 && (
                  <div className="text-gray-400">
                    +{existingSeasons.filter((s) => s.id !== season?.id).length - 5} autres
                  </div>
                )}
              </div>
            </div>
          )}
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
