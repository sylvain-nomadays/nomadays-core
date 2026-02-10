'use client';

import { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Percent,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { EarlyBirdDiscount, CreateEarlyBirdDiscountDTO, AccommodationSeason } from '@/lib/api/types';

// ============================================================================
// Types
// ============================================================================

interface EarlyBirdEditorProps {
  accommodationId: number;
  discounts: EarlyBirdDiscount[];
  seasons: AccommodationSeason[];  // Pour sélectionner les exclusions
  onAdd: (discount: CreateEarlyBirdDiscountDTO) => Promise<void>;
  onUpdate: (id: number, discount: Partial<EarlyBirdDiscount>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
}

interface NewDiscountForm {
  name: string;
  days_in_advance: number;
  discount_percent: number;
}

// ============================================================================
// Presets
// ============================================================================

const PRESETS = [
  { label: '30 jours - 10%', days: 30, percent: 10 },
  { label: '60 jours - 15%', days: 60, percent: 15 },
  { label: '90 jours - 20%', days: 90, percent: 20 },
];

// ============================================================================
// Component
// ============================================================================

export default function EarlyBirdEditor({
  accommodationId,
  discounts,
  seasons,
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
}: EarlyBirdEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDiscount, setNewDiscount] = useState<NewDiscountForm>({
    name: '',
    days_in_advance: 60,
    discount_percent: 15,
  });

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setNewDiscount({
      name: `Early Bird ${preset.days} jours`,
      days_in_advance: preset.days,
      discount_percent: preset.percent,
    });
    setIsAdding(true);
  };

  const handleAdd = async () => {
    if (!newDiscount.name || newDiscount.days_in_advance <= 0 || newDiscount.discount_percent <= 0) {
      return;
    }

    await onAdd({
      accommodation_id: accommodationId,
      name: newDiscount.name,
      days_in_advance: newDiscount.days_in_advance,
      discount_percent: newDiscount.discount_percent,
    });

    setNewDiscount({ name: '', days_in_advance: 60, discount_percent: 15 });
    setIsAdding(false);
  };

  const handleToggleActive = async (discount: EarlyBirdDiscount) => {
    await onUpdate(discount.id, { is_active: !discount.is_active });
  };

  // Sort by days in advance (ascending)
  const sortedDiscounts = [...discounts].sort((a, b) => a.days_in_advance - b.days_in_advance);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Réductions Early Bird
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Réductions automatiques si réservation anticipée
          </p>
        </div>
      </div>

      {/* Existing Discounts */}
      {sortedDiscounts.length > 0 && (
        <div className="space-y-2">
          {sortedDiscounts.map((discount) => (
            <div
              key={discount.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                discount.is_active
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-600">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{discount.days_in_advance}j</span>
                </div>
                <div>
                  <span className="text-gray-600">{discount.name}</span>
                  {/* Show excluded seasons */}
                  {discount.excluded_season_ids && discount.excluded_season_ids.length > 0 && (
                    <span className="ml-2 text-xs text-red-500">
                      (sauf {discount.excluded_season_ids.map(id => {
                        const season = seasons.find(s => s.id === id);
                        return season?.name || `#${id}`;
                      }).join(', ')})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  -{discount.discount_percent}%
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(discount)}
                  className={`px-2 py-1 text-xs rounded ${
                    discount.is_active
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  disabled={loading}
                >
                  {discount.is_active ? 'Actif' : 'Inactif'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(discount.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Form */}
      {isAdding ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={newDiscount.name}
                onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                placeholder="Early Bird 60 jours"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Jours d'avance
              </label>
              <input
                type="number"
                value={newDiscount.days_in_advance}
                onChange={(e) => setNewDiscount({ ...newDiscount, days_in_advance: parseInt(e.target.value) || 0 })}
                min={1}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Réduction (%)
              </label>
              <input
                type="number"
                value={newDiscount.discount_percent}
                onChange={(e) => setNewDiscount({ ...newDiscount, discount_percent: parseFloat(e.target.value) || 0 })}
                min={1}
                max={100}
                step={0.5}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              disabled={loading || !newDiscount.name}
            >
              Ajouter
            </button>
          </div>
        </div>
      ) : (
        /* Presets & Add Button */
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            Cliquez pour ajouter une réduction Early Bird :
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => {
              // Check if this preset is already configured
              const isConfigured = discounts.some(d => d.days_in_advance === preset.days);
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    isConfigured
                      ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-default'
                      : 'bg-gray-50 text-gray-400 border-gray-200 border-dashed hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300'
                  }`}
                  disabled={loading || isConfigured}
                  title={isConfigured ? 'Déjà configuré' : 'Cliquez pour ajouter'}
                >
                  {isConfigured ? '✓ ' : '+ '}{preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 border-dashed flex items-center gap-1"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
              Personnalisé
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      {discounts.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Les réductions sont calculées automatiquement lors de la cotation,
            basées sur le délai entre la date de proposition et la date du séjour.
            Une alerte sera envoyée si le délai passe sous le seuil Early Bird.
          </p>
        </div>
      )}
    </div>
  );
}
