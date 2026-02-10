'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useTripConditions, useTenantConditions } from '@/hooks/useConditions';
import type { TripCondition, Condition } from '@/lib/api/types';

// ─── Types ──────────────────────────────────────────────────────────
interface ConditionsPanelProps {
  tripId: number;
  onConditionsChanged?: () => void;
}

// ─── TripConditionRow ───────────────────────────────────────────────

function TripConditionRow({
  tripCondition,
  onUpdate,
  onDeactivate,
}: {
  tripCondition: TripCondition;
  onUpdate: (tripConditionId: number, data: { is_active?: boolean; selected_option_id?: number | null }) => void;
  onDeactivate: (tripConditionId: number) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleToggle = () => {
    onUpdate(tripCondition.id, { is_active: !tripCondition.is_active });
  };

  const handleOptionChange = (optionId: string) => {
    onUpdate(tripCondition.id, {
      selected_option_id: optionId ? parseInt(optionId) : null,
    });
  };

  const handleRemove = () => {
    if (isRemoving) {
      onDeactivate(tripCondition.id);
      setIsRemoving(false);
    } else {
      setIsRemoving(true);
      setTimeout(() => setIsRemoving(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-100 group/condition hover:border-gray-200 transition-colors">
      {/* Toggle is_active */}
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          tripCondition.is_active ? 'bg-sage-500' : 'bg-gray-300'
        }`}
        title={tripCondition.is_active ? 'Active — cliquer pour désactiver' : 'Inactive — cliquer pour activer'}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            tripCondition.is_active ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>

      {/* Condition name */}
      <span
        className={`text-sm font-medium truncate ${
          tripCondition.is_active ? 'text-gray-700' : 'text-gray-400'
        }`}
      >
        {tripCondition.condition_name}
      </span>

      {/* Option selector dropdown */}
      <select
        value={tripCondition.selected_option_id ?? ''}
        onChange={(e) => handleOptionChange(e.target.value)}
        disabled={!tripCondition.is_active}
        className={`flex-shrink-0 text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
          tripCondition.is_active
            ? 'border-gray-300 bg-white text-gray-700'
            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
      >
        <option value="">— Choisir —</option>
        {(tripCondition.options || []).map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Remove button */}
      <button
        onClick={handleRemove}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          isRemoving
            ? 'text-red-600 bg-red-50 hover:bg-red-100 opacity-100'
            : 'text-gray-300 hover:text-red-500 opacity-0 group-hover/condition:opacity-100'
        }`}
        title={isRemoving ? 'Cliquer pour confirmer' : 'Retirer cette condition'}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── ConditionsPanel ────────────────────────────────────────────────

export function ConditionsPanel({
  tripId,
  onConditionsChanged,
}: ConditionsPanelProps) {
  const {
    tripConditions,
    isLoading,
    refetch,
    activate,
    activating,
    update,
    deactivate,
  } = useTripConditions(tripId);

  // Load all tenant-level conditions (for "add" dropdown)
  const {
    conditions: tenantConditions,
    isLoading: loadingTenantConditions,
  } = useTenantConditions();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const activeCount = tripConditions.filter(tc => tc.is_active).length;

  // Conditions not yet activated on this trip
  const availableConditions = tenantConditions.filter(
    (c) => !tripConditions.some((tc) => tc.condition_id === c.id)
  );

  const handleActivate = async (condition: Condition) => {
    try {
      const firstOption = condition.options?.[0];
      await activate({
        condition_id: condition.id,
        selected_option_id: firstOption?.id,
      });
      setShowAddDropdown(false);
      await refetch();
      onConditionsChanged?.();
    } catch {
      // handled by hook
    }
  };

  const handleUpdate = async (tripConditionId: number, data: { is_active?: boolean; selected_option_id?: number | null }) => {
    try {
      await update({ tripConditionId, data });
      await refetch();
      onConditionsChanged?.();
    } catch {
      // handled by hook
    }
  };

  const handleDeactivate = async (tripConditionId: number) => {
    try {
      await deactivate(tripConditionId);
      await refetch();
      onConditionsChanged?.();
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-secondary-500" />
          <span className="font-display font-semibold text-sm text-gray-800">
            Conditions
          </span>
          {tripConditions.length > 0 && (
            <span className="bg-secondary-100 text-secondary-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {activeCount}/{tripConditions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content — collapsible */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : tripConditions.length === 0 && !showAddDropdown ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Aucune condition activée. Les conditions permettent de sélectionner les prestations à inclure dans la cotation.
              </p>
              <button
                onClick={() => setShowAddDropdown(true)}
                disabled={activating || availableConditions.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-secondary-600 bg-secondary-50 hover:bg-secondary-100 rounded-md transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter une condition
              </button>
              {availableConditions.length === 0 && !loadingTenantConditions && (
                <p className="text-xs text-gray-400 mt-2">
                  Aucune condition globale créée. Créez-en dans Paramètres.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              {/* Trip condition rows */}
              {tripConditions.map((tc) => (
                <TripConditionRow
                  key={tc.id}
                  tripCondition={tc}
                  onUpdate={handleUpdate}
                  onDeactivate={handleDeactivate}
                />
              ))}

              {/* Add condition dropdown */}
              {showAddDropdown && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary-50 border border-secondary-200">
                  <select
                    autoFocus
                    onChange={(e) => {
                      const condId = parseInt(e.target.value);
                      const cond = tenantConditions.find(c => c.id === condId);
                      if (cond) handleActivate(cond);
                    }}
                    defaultValue=""
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-secondary-500 focus:border-secondary-500 bg-white"
                  >
                    <option value="" disabled>Choisir une condition...</option>
                    {availableConditions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.options?.length || 0} options)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddDropdown(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                    title="Annuler"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              )}

              {/* Add button — below list */}
              {!showAddDropdown && availableConditions.length > 0 && (
                <button
                  onClick={() => setShowAddDropdown(true)}
                  disabled={activating}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-md transition-colors mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une condition
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
