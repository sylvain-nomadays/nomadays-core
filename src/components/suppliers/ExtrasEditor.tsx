'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Coffee,
  Car,
  Sparkles,
  Settings,
  Package,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import {
  AccommodationExtra,
  CreateAccommodationExtraDTO,
  ExtraType,
  ExtraPricingModel,
  EXTRA_TYPE_LABELS,
  PRICING_MODEL_LABELS,
} from '@/lib/api/types';

interface ExtrasEditorProps {
  extras: AccommodationExtra[];
  currency?: string;
  onAdd: (data: CreateAccommodationExtraDTO) => Promise<void>;
  onUpdate: (id: number, data: Partial<AccommodationExtra>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
}

// Icons par type
const TYPE_ICONS: Record<ExtraType, React.ElementType> = {
  meal: Coffee,
  transfer: Car,
  activity: Sparkles,
  service: Settings,
  other: Package,
};

// Couleurs par type
const TYPE_COLORS: Record<ExtraType, string> = {
  meal: 'bg-amber-50 text-amber-600 border-amber-200',
  transfer: 'bg-blue-50 text-blue-600 border-blue-200',
  activity: 'bg-purple-50 text-purple-600 border-purple-200',
  service: 'bg-gray-50 text-gray-600 border-gray-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

// Presets pour création rapide
const PRESETS: { name: string; type: ExtraType; pricingModel: ExtraPricingModel; code: string }[] = [
  { name: 'Petit-déjeuner', type: 'meal', pricingModel: 'per_person_per_night', code: 'BRK' },
  { name: 'Dîner', type: 'meal', pricingModel: 'per_person_per_night', code: 'DIN' },
  { name: 'Demi-pension upgrade', type: 'meal', pricingModel: 'per_person_per_night', code: 'HBU' },
  { name: 'Transfert aéroport (aller)', type: 'transfer', pricingModel: 'per_unit', code: 'TRF1' },
  { name: 'Transfert aéroport (A/R)', type: 'transfer', pricingModel: 'per_unit', code: 'TRF2' },
  { name: 'Late checkout', type: 'service', pricingModel: 'flat', code: 'LCO' },
  { name: 'Parking', type: 'service', pricingModel: 'per_room_per_night', code: 'PRK' },
];

export default function ExtrasEditor({
  extras,
  currency = 'EUR',
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
}: ExtrasEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAccommodationExtraDTO>({
    name: '',
    code: '',
    extra_type: 'meal',
    unit_cost: 0,
    currency: currency,
    pricing_model: 'per_person_per_night',
    is_included: false,
    is_mandatory: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      extra_type: 'meal',
      unit_cost: 0,
      currency: currency,
      pricing_model: 'per_person_per_night',
      is_included: false,
      is_mandatory: false,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setFormData({
      ...formData,
      name: preset.name,
      code: preset.code,
      extra_type: preset.type,
      pricing_model: preset.pricingModel,
    });
    setShowAddForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.unit_cost <= 0) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
      } else {
        await onAdd(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving extra:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (extra: AccommodationExtra) => {
    setFormData({
      name: extra.name,
      code: extra.code || '',
      description: extra.description || '',
      extra_type: extra.extra_type,
      unit_cost: extra.unit_cost,
      currency: extra.currency,
      pricing_model: extra.pricing_model,
      is_included: extra.is_included,
      is_mandatory: extra.is_mandatory,
    });
    setEditingId(extra.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    try {
      await onDelete(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting extra:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (cost: number, pricingModel: ExtraPricingModel) => {
    const suffix = {
      per_person_per_night: '/pers/nuit',
      per_room_per_night: '/ch/nuit',
      per_person: '/pers',
      per_unit: '/unité',
      flat: '',
    }[pricingModel];
    return `${cost.toLocaleString()} ${currency}${suffix}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Suppléments optionnels</h3>
          <p className="text-sm text-gray-500">
            Petit-déjeuner, transferts, et autres services additionnels
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Quick presets */}
      {!showAddForm && extras.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">Ajout rapide :</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const Icon = TYPE_ICONS[preset.type];
              return (
                <button
                  key={preset.code}
                  onClick={() => handlePresetClick(preset)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Modifier le supplément' : 'Nouveau supplément'}
            </h4>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Petit-déjeuner"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: BRK"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.extra_type}
                onChange={(e) => setFormData({ ...formData, extra_type: e.target.value as ExtraType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Object.entries(EXTRA_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarification
              </label>
              <select
                value={formData.pricing_model}
                onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as ExtraPricingModel })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Object.entries(PRICING_MODEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix unitaire ({formData.currency || currency}) *
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.unit_cost || ''}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                value={formData.currency || currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="EUR">EUR</option>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="MAD">MAD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails sur ce supplément..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_included}
                onChange={(e) => setFormData({ ...formData, is_included: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Inclus dans le tarif de base</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Obligatoire</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name || formData.unit_cost <= 0 || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editingId ? 'Mettre à jour' : 'Ajouter'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Extras List */}
      {extras.length > 0 && (
        <div className="space-y-2">
          {extras.map((extra) => {
            const Icon = TYPE_ICONS[extra.extra_type as ExtraType] || Package;
            const colorClass = TYPE_COLORS[extra.extra_type as ExtraType] || TYPE_COLORS.other;

            return (
              <div
                key={extra.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  extra.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Icon badge */}
                  <div className={`p-2 rounded-lg border ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{extra.name}</span>
                      {extra.code && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {extra.code}
                        </span>
                      )}
                      {extra.is_included && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Inclus
                        </span>
                      )}
                      {extra.is_mandatory && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {PRICING_MODEL_LABELS[extra.pricing_model as ExtraPricingModel]}
                      {extra.description && ` • ${extra.description}`}
                    </div>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPrice(extra.unit_cost, extra.pricing_model as ExtraPricingModel)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(extra)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>

                    {deleteConfirmId === extra.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(extra.id)}
                          disabled={isSubmitting}
                          className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          title="Confirmer la suppression"
                        >
                          <Check className="w-4 h-4 text-red-600" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annuler"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(extra.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {extras.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun supplément configuré</p>
          <p className="text-sm">Ajoutez des suppléments optionnels comme le petit-déjeuner ou les transferts</p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      )}
    </div>
  );
}
