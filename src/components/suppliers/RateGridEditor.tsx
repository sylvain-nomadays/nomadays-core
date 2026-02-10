'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Save,
  X,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Copy,
  Sparkles,
  Calendar,
} from 'lucide-react';
import type {
  RoomCategory,
  AccommodationSeason,
  RoomRate,
  RoomBedType,
  MealPlan,
  CreateRoomRateDTO,
  UpdateRoomRateDTO,
} from '@/lib/api/types';
import { MEAL_PLAN_LABELS } from '@/lib/api/types';

// ============================================================================
// Constants
// ============================================================================

const BED_TYPE_LABELS: Record<RoomBedType, string> = {
  SGL: 'Simple',
  DBL: 'Double',
  TWN: 'Twin',
  TPL: 'Triple',
  FAM: 'Familiale',
  EXB: 'Lit supplémentaire',
  CNT: 'Lit enfant',
};

const MEAL_PLANS: MealPlan[] = ['RO', 'BB', 'HB', 'FB', 'AI'];

const DEFAULT_CURRENCY = 'EUR';

// ============================================================================
// Types
// ============================================================================

interface RateGridEditorProps {
  accommodationId: number;
  roomCategories: RoomCategory[];
  seasons: AccommodationSeason[];
  rates: RoomRate[];
  currency?: string;
  contractNotes?: string | null;       // Manual notes from contract
  contractWarnings?: string[] | null;  // AI-extracted warnings from contract
  onSaveRate: (data: CreateRoomRateDTO | { id: number; data: UpdateRoomRateDTO }) => Promise<void>;
  onDeleteRate: (id: number) => Promise<void>;
  onDeleteSeason?: (seasonId: number) => Promise<void>;
  onBulkSaveRates?: (rates: CreateRoomRateDTO[]) => Promise<void>;
  loading?: boolean;
}

// Cell key format: categoryId-bedType-seasonId-mealPlan
type CellKey = string;

interface EditingCell {
  key: CellKey;
  categoryId: number;
  bedType: RoomBedType;
  seasonId: number | null;
  mealPlan: MealPlan;
  cost: number;
  singleSupplement?: number;
  extraAdult?: number;
  extraChild?: number;
  existingRateId?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCellKey(
  categoryId: number,
  bedType: RoomBedType,
  seasonId: number | null,
  mealPlan: MealPlan
): CellKey {
  return `${categoryId}-${bedType}-${seasonId ?? 'default'}-${mealPlan}`;
}

function findRate(
  rates: RoomRate[],
  categoryId: number,
  bedType: RoomBedType,
  seasonId: number | null,
  mealPlan: MealPlan
): RoomRate | undefined {
  return rates.find(
    (r) =>
      r.room_category_id === categoryId &&
      r.bed_type === bedType &&
      (r.season_id === seasonId || (seasonId === null && !r.season_id)) &&
      r.meal_plan === mealPlan
  );
}

/**
 * Determine if a season is expired.
 * - Recurring seasons (season_type === 'recurring') never expire
 * - Fixed seasons expire when end_date is in the past
 *
 * Date formats handled:
 * - end_date: "MM-DD" (recurring) or "YYYY-MM-DD" (fixed)
 * - year: "2025" or "2025-2026" (for fixed seasons)
 */
function isSeasonExpired(season: AccommodationSeason): boolean {
  // Recurring seasons never expire
  if (season.season_type === 'recurring') {
    return false;
  }

  // Weekday-based seasons don't expire by date
  if (season.season_type === 'weekday') {
    return false;
  }

  // For fixed seasons, check if end_date is in the past
  if (season.end_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let endDateStr = season.end_date;

    // If end_date is in MM-DD format (5 chars), we need to add the year
    if (endDateStr.length === 5 && endDateStr.includes('-')) {
      // Get the year from the season.year field
      let endYear: number;

      if (season.year) {
        // year can be "2025" or "2025-2026"
        const yearParts = season.year.split('-');
        // Use the last year in the range (for seasons spanning two years like "2025-2026")
        const lastYearPart = yearParts[yearParts.length - 1];
        endYear = parseInt(lastYearPart || '0', 10);
      } else {
        // No year specified - treat as recurring (not expired)
        return false;
      }

      // Convert MM-DD to YYYY-MM-DD
      endDateStr = `${endYear}-${endDateStr}`;
    }

    const endDate = new Date(endDateStr);

    // Check if date is valid
    if (isNaN(endDate.getTime())) {
      return false; // Can't determine expiration, assume not expired
    }

    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  return false;
}

// ============================================================================
// Component
// ============================================================================

export default function RateGridEditor({
  accommodationId,
  roomCategories,
  seasons,
  rates,
  currency = DEFAULT_CURRENCY,
  contractNotes,
  contractWarnings,
  onSaveRate,
  onDeleteRate,
  onDeleteSeason,
  onBulkSaveRates,
  loading = false,
}: RateGridEditorProps) {
  // Calculate the first meal plan that has rates
  const defaultMealPlan = useMemo(() => {
    // Count rates per meal plan
    const rateCountByMealPlan: Record<MealPlan, number> = {
      RO: 0, BB: 0, HB: 0, FB: 0, AI: 0
    };

    rates.forEach(rate => {
      if (rate.meal_plan in rateCountByMealPlan) {
        rateCountByMealPlan[rate.meal_plan as MealPlan]++;
      }
    });

    // Find the first meal plan with rates (in order: RO, BB, HB, FB, AI)
    for (const mp of MEAL_PLANS) {
      if (rateCountByMealPlan[mp] > 0) {
        return mp;
      }
    }

    // Default to BB if no rates exist
    return 'BB' as MealPlan;
  }, [rates]);

  // State
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan>(defaultMealPlan);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showSupplements, setShowSupplements] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<CellKey, Partial<EditingCell>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRow, setDeletingRow] = useState<string | null>(null); // categoryId-bedType
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<string | null>(null);
  const [confirmDeleteSeason, setConfirmDeleteSeason] = useState<number | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<number | null>(null);

  // Update selected meal plan when rates change (e.g., after import)
  useEffect(() => {
    // Only update if the current selection has no rates and there's a better option
    const currentRatesCount = rates.filter(r => r.meal_plan === selectedMealPlan).length;
    if (currentRatesCount === 0 && defaultMealPlan !== selectedMealPlan) {
      const defaultRatesCount = rates.filter(r => r.meal_plan === defaultMealPlan).length;
      if (defaultRatesCount > 0) {
        setSelectedMealPlan(defaultMealPlan);
      }
    }
  }, [rates, defaultMealPlan, selectedMealPlan]);

  // Initialize expanded categories
  useEffect(() => {
    setExpandedCategories(new Set(roomCategories.map((c) => c.id)));
  }, [roomCategories]);

  // Sorted seasons: by year (most recent first), then by start_date
  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => {
      // 1. Sort by year (descending: 2026-2027 before 2025-2026)
      const yearA = a.year || '0000';
      const yearB = b.year || '0000';

      if (yearA !== yearB) {
        // Extract last year from range (e.g., "2025-2026" → "2026")
        const lastYearA = yearA.split('-').pop() || '0000';
        const lastYearB = yearB.split('-').pop() || '0000';
        const yearCompare = lastYearB.localeCompare(lastYearA);
        if (yearCompare !== 0) return yearCompare;
      }

      // 2. Then by season_level (peak first, then high, then low)
      const levelOrder: Record<string, number> = { peak: 0, high: 1, low: 2 };
      const levelA = levelOrder[a.season_level || 'high'] ?? 1;
      const levelB = levelOrder[b.season_level || 'high'] ?? 1;
      if (levelA !== levelB) return levelA - levelB;

      // 3. Then by start_date (ascending within same year)
      const startA = a.start_date || '';
      const startB = b.start_date || '';
      return startA.localeCompare(startB);
    });
  }, [seasons]);

  // Find the reference season (high season) for default rates
  const referenceSeason = useMemo(() => {
    // First, try to find a season with level "high"
    const highSeason = seasons.find(s => s.season_level === 'high');
    if (highSeason) return highSeason;

    // Fallback: find by code (HS) or name containing "haute"
    const byCode = seasons.find(s => s.code?.toUpperCase() === 'HS');
    if (byCode) return byCode;

    const byName = seasons.find(s => s.name.toLowerCase().includes('haute'));
    if (byName) return byName;

    // Last resort: return the first season
    return seasons[0] || null;
  }, [seasons]);

  // Get all rows (category + bed type combinations)
  const rows = useMemo(() => {
    const result: { category: RoomCategory; bedType: RoomBedType }[] = [];
    roomCategories.forEach((category) => {
      category.available_bed_types.forEach((bedType) => {
        result.push({ category, bedType });
      });
    });
    return result;
  }, [roomCategories]);

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Get rate for a specific cell
  // For "default" rates (seasonId = null), use the reference season (high season) rates
  const getRate = (
    categoryId: number,
    bedType: RoomBedType,
    seasonId: number | null
  ): RoomRate | undefined => {
    // First, try to find an explicit rate for this season
    const explicitRate = findRate(rates, categoryId, bedType, seasonId, selectedMealPlan);
    if (explicitRate) return explicitRate;

    // If seasonId is null (default column) and no explicit default rate exists,
    // use the reference season (high season) rate
    if (seasonId === null && referenceSeason) {
      return findRate(rates, categoryId, bedType, referenceSeason.id, selectedMealPlan);
    }

    return undefined;
  };

  // Check if a rate is from the reference season (displayed in default column)
  const isReferenceRate = (
    categoryId: number,
    bedType: RoomBedType,
    seasonId: number | null
  ): boolean => {
    if (seasonId !== null) return false;
    // Check if there's an explicit default rate
    const explicitDefault = findRate(rates, categoryId, bedType, null, selectedMealPlan);
    if (explicitDefault) return false;
    // If we're showing reference season rate in default column
    return referenceSeason !== null && !!findRate(rates, categoryId, bedType, referenceSeason.id, selectedMealPlan);
  };

  // Handle cell click to edit
  const handleCellClick = (
    categoryId: number,
    bedType: RoomBedType,
    seasonId: number | null
  ) => {
    // Get the displayed rate (may be inherited from reference season)
    const displayedRate = getRate(categoryId, bedType, seasonId);
    const key = getCellKey(categoryId, bedType, seasonId, selectedMealPlan);
    const pending = pendingChanges.get(key);

    // Check if this is an inherited rate (from reference season)
    // If so, we should NOT use its ID - we want to create a NEW rate
    const isInherited = isReferenceRate(categoryId, bedType, seasonId);

    // For explicit rates (not inherited), get the actual rate for this exact season
    const explicitRate = isInherited ? undefined : findRate(rates, categoryId, bedType, seasonId, selectedMealPlan);

    setEditingCell({
      key,
      categoryId,
      bedType,
      seasonId,
      mealPlan: selectedMealPlan,
      // Use displayed rate value for pre-fill, but only use existingRateId if not inherited
      cost: pending?.cost ?? displayedRate?.cost ?? 0,
      singleSupplement: pending?.singleSupplement ?? displayedRate?.single_supplement,
      extraAdult: pending?.extraAdult ?? displayedRate?.extra_adult,
      extraChild: pending?.extraChild ?? displayedRate?.extra_child,
      existingRateId: explicitRate?.id,  // undefined if inherited - will create new rate
    });
  };

  // Handle cell value change
  const handleCellChange = (value: number) => {
    if (!editingCell) return;

    setEditingCell((prev) => prev && { ...prev, cost: value });
  };

  // Save single cell
  const handleCellSave = async () => {
    if (!editingCell) return;

    const { categoryId, bedType, seasonId, mealPlan, cost, existingRateId } = editingCell;

    // Update pending changes for visual feedback
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(editingCell.key, { cost });
      return next;
    });

    setEditingCell(null);

    try {
      if (existingRateId) {
        await onSaveRate({
          id: existingRateId,
          data: {
            cost,
            single_supplement: editingCell.singleSupplement,
            extra_adult: editingCell.extraAdult,
            extra_child: editingCell.extraChild,
          },
        });
      } else {
        await onSaveRate({
          accommodation_id: accommodationId,
          room_category_id: categoryId,
          season_id: seasonId ?? undefined,
          bed_type: bedType,
          cost,
          currency,
          meal_plan: mealPlan,
          single_supplement: editingCell.singleSupplement,
          extra_adult: editingCell.extraAdult,
          extra_child: editingCell.extraChild,
        });
      }

      // Clear pending change after successful save
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.delete(editingCell.key);
        return next;
      });
    } catch (error) {
      console.error('Failed to save rate:', error);
      // Keep pending change to show error state
    }
  };

  // Cancel editing
  const handleCellCancel = () => {
    setEditingCell(null);
  };

  // Delete rate
  const handleDeleteRate = async (rateId: number) => {
    try {
      await onDeleteRate(rateId);
    } catch (error) {
      console.error('Failed to delete rate:', error);
    }
  };

  // Delete all rates for a row (category + bedType combination)
  const handleDeleteRow = async (categoryId: number, bedType: RoomBedType) => {
    const rowKey = `${categoryId}-${bedType}`;
    setDeletingRow(rowKey);
    try {
      // Find all rates for this category + bedType + current meal plan
      const rowRates = rates.filter(
        (r) => r.room_category_id === categoryId && r.bed_type === bedType && r.meal_plan === selectedMealPlan
      );

      // Delete each rate
      for (const rate of rowRates) {
        await onDeleteRate(rate.id);
      }
      setConfirmDeleteRow(null);
    } catch (error) {
      console.error('Failed to delete row rates:', error);
    } finally {
      setDeletingRow(null);
    }
  };

  // Handle season deletion (expired seasons)
  const handleDeleteSeason = async (seasonId: number) => {
    if (!onDeleteSeason) return;

    setDeletingSeason(seasonId);
    try {
      await onDeleteSeason(seasonId);
      setConfirmDeleteSeason(null);
    } catch (error) {
      console.error('Failed to delete season:', error);
    } finally {
      setDeletingSeason(null);
    }
  };

  // Copy rates from one season to another
  const handleCopyRates = async (fromSeasonId: number | null, toSeasonId: number | null) => {
    if (!onBulkSaveRates) return;

    const ratesToCopy = rates.filter(
      (r) =>
        (r.season_id === fromSeasonId || (fromSeasonId === null && !r.season_id)) &&
        r.meal_plan === selectedMealPlan
    );

    const newRates: CreateRoomRateDTO[] = ratesToCopy.map((r) => ({
      accommodation_id: accommodationId,
      room_category_id: r.room_category_id,
      season_id: toSeasonId ?? undefined,
      bed_type: r.bed_type,
      cost: r.cost,
      currency: r.currency,
      meal_plan: r.meal_plan,
      single_supplement: r.single_supplement,
      extra_adult: r.extra_adult,
      extra_child: r.extra_child,
    }));

    if (newRates.length > 0) {
      setIsSaving(true);
      try {
        await onBulkSaveRates(newRates);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Check if we have enough data to show the grid
  if (roomCategories.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
        <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">
          Ajoutez d'abord des catégories de chambres pour configurer les tarifs.
        </p>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
        <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">
          Ajoutez d'abord des saisons tarifaires pour configurer les tarifs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contract Notes Section - Important info for sales team */}
      {(contractWarnings && contractWarnings.length > 0) || contractNotes ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 mb-2">Notes du contrat</h4>

              {/* AI-extracted warnings */}
              {contractWarnings && contractWarnings.length > 0 && (
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  {contractWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}

              {/* Manual notes */}
              {contractNotes && (
                <p className="text-sm text-amber-800 mt-2 whitespace-pre-wrap">
                  {contractNotes}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Header with meal plan selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Grille tarifaire</h3>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {MEAL_PLANS.map((mp) => {
              const rateCount = rates.filter(r => r.meal_plan === mp).length;
              return (
                <button
                  key={mp}
                  onClick={() => setSelectedMealPlan(mp)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    selectedMealPlan === mp
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mp}
                  {rateCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      selectedMealPlan === mp
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {rateCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupplements(!showSupplements)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              showSupplements
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            Suppléments
          </button>
          <span className="text-sm text-gray-500">
            Devise: <span className="font-medium">{currency}</span>
          </span>
        </div>
      </div>

      {/* Meal Plan description */}
      <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
        Tarifs en <strong>{MEAL_PLAN_LABELS[selectedMealPlan]}</strong> ({selectedMealPlan})
      </div>

      {/* Rate Grid Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-700 border-r border-gray-200 min-w-[200px]">
                Catégorie / Type de lit
              </th>
              {/* Default rates column - uses reference season (high) */}
              <th className="text-center px-3 py-3 font-medium text-gray-700 border-r border-gray-200 min-w-[120px] bg-amber-50">
                <div className="flex flex-col items-center">
                  <span>Par défaut</span>
                  <span className="text-xs text-amber-600 font-normal">
                    {referenceSeason ? `= ${referenceSeason.name}` : 'Référence'}
                  </span>
                </div>
              </th>
              {/* Season columns */}
              {sortedSeasons.map((season) => {
                const isReference = season.id === referenceSeason?.id;
                const isExpired = isSeasonExpired(season);
                const isConfirmingDelete = confirmDeleteSeason === season.id;
                const isDeleting = deletingSeason === season.id;

                // Expired seasons get red styling, otherwise use level-based colors
                const levelColor = isExpired ? 'bg-red-50' :
                                   season.season_level === 'peak' ? 'bg-orange-50' :
                                   season.season_level === 'low' ? 'bg-emerald-50' :
                                   season.season_level === 'high' ? 'bg-amber-50' : '';
                const textColor = isExpired ? 'text-red-700' : 'text-gray-700';

                return (
                  <th
                    key={season.id}
                    className={`text-center px-3 py-3 font-medium border-r border-gray-200 min-w-[100px] last:border-r-0 ${levelColor} ${textColor}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span>{season.name}</span>
                        {isReference && (
                          <span className="text-[10px] px-1 py-0.5 bg-amber-200 text-amber-800 rounded">REF</span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] px-1 py-0.5 bg-red-200 text-red-700 rounded">EXPIRÉ</span>
                        )}
                      </div>
                      <span className={`text-xs font-normal ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                        {season.code}
                        {season.end_date && (
                          <span className="ml-1">→ {new Date(season.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        )}
                      </span>

                      {/* Delete button for expired seasons */}
                      {isExpired && onDeleteSeason && (
                        <div className="mt-1">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteSeason(season.id)}
                                disabled={isDeleting}
                                className="px-2 py-0.5 text-[10px] bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
                              >
                                {isDeleting ? '...' : 'Confirmer'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSeason(null)}
                                className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteSeason(season.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Supprimer cette saison expirée et ses tarifs"
                            >
                              <Trash2 className="w-3 h-3" />
                              Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {roomCategories.map((category) => (
              <React.Fragment key={`category-group-${category.id}`}>
                {/* Category header row */}
                <tr
                  className="bg-gray-100 cursor-pointer hover:bg-gray-150"
                  onClick={() => toggleCategory(category.id)}
                >
                  <td
                    colSpan={sortedSeasons.length + 2}
                    className="px-4 py-2 font-medium text-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(category.id) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{category.name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded font-mono">
                        {category.code}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Bed type rows for this category */}
                {expandedCategories.has(category.id) &&
                  category.available_bed_types.map((bedType) => {
                    const rowKey = `${category.id}-${bedType}`;
                    const rowRatesCount = rates.filter(
                      (r) => r.room_category_id === category.id && r.bed_type === bedType && r.meal_plan === selectedMealPlan
                    ).length;
                    const isDeleting = deletingRow === rowKey;
                    const isConfirming = confirmDeleteRow === rowKey;

                    return (
                      <tr key={rowKey} className="border-t border-gray-100 hover:bg-gray-50 group/row">
                        <td className="px-4 py-2 text-gray-700 border-r border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 pl-6">
                              <span>{BED_TYPE_LABELS[bedType] || bedType}</span>
                              <span className="text-xs text-gray-400">({bedType})</span>
                            </div>
                            {/* Delete row button */}
                            {rowRatesCount > 0 && (
                              <div className="flex items-center gap-1">
                                {isConfirming ? (
                                  <>
                                    <button
                                      onClick={() => handleDeleteRow(category.id, bedType)}
                                      disabled={isDeleting}
                                      className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                                    >
                                      {isDeleting ? 'Suppression...' : `Supprimer ${rowRatesCount} tarif${rowRatesCount > 1 ? 's' : ''}`}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteRow(null)}
                                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteRow(rowKey)}
                                    className="opacity-0 group-hover/row:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                    title="Supprimer tous les tarifs de cette ligne"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Default rate cell - shows reference season rate */}
                        <RateCell
                          rate={getRate(category.id, bedType, null)}
                          isEditing={
                            editingCell?.key ===
                            getCellKey(category.id, bedType, null, selectedMealPlan)
                          }
                          editingValue={editingCell?.cost}
                          pendingChange={pendingChanges.get(
                            getCellKey(category.id, bedType, null, selectedMealPlan)
                          )}
                          currency={currency}
                          onClick={() => handleCellClick(category.id, bedType, null)}
                          onChange={handleCellChange}
                          onSave={handleCellSave}
                          onCancel={handleCellCancel}
                          onDelete={handleDeleteRate}
                          loading={loading}
                          isReferenceColumn
                          isFromReferenceSeason={isReferenceRate(category.id, bedType, null)}
                        />

                        {/* Season rate cells */}
                        {sortedSeasons.map((season) => (
                          <RateCell
                            key={season.id}
                            rate={getRate(category.id, bedType, season.id)}
                            isEditing={
                              editingCell?.key ===
                              getCellKey(category.id, bedType, season.id, selectedMealPlan)
                            }
                            editingValue={editingCell?.cost}
                            pendingChange={pendingChanges.get(
                              getCellKey(category.id, bedType, season.id, selectedMealPlan)
                            )}
                            currency={currency}
                            onClick={() => handleCellClick(category.id, bedType, season.id)}
                            onChange={handleCellChange}
                            onSave={handleCellSave}
                            onCancel={handleCellCancel}
                            onDelete={handleDeleteRate}
                            loading={loading}
                            isExpired={isSeasonExpired(season)}
                          />
                        ))}
                      </tr>
                    );
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span>Pas de tarif</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded"></div>
          <span>Tarif configuré</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
          <span>Tarif par défaut (référence)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span>Saison expirée</span>
        </div>
      </div>

      {/* Supplements Panel */}
      {showSupplements && editingCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Suppléments tarifaires
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplément single ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editingCell.singleSupplement ?? ''}
                  onChange={(e) =>
                    setEditingCell((prev) =>
                      prev && {
                        ...prev,
                        singleSupplement: e.target.value ? parseFloat(e.target.value) : undefined,
                      }
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adulte supplémentaire ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editingCell.extraAdult ?? ''}
                  onChange={(e) =>
                    setEditingCell((prev) =>
                      prev && {
                        ...prev,
                        extraAdult: e.target.value ? parseFloat(e.target.value) : undefined,
                      }
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enfant supplémentaire ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editingCell.extraChild ?? ''}
                  onChange={(e) =>
                    setEditingCell((prev) =>
                      prev && {
                        ...prev,
                        extraChild: e.target.value ? parseFloat(e.target.value) : undefined,
                      }
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSupplements(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  handleCellSave();
                  setShowSupplements(false);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Rate Cell Component
// ============================================================================

interface RateCellProps {
  rate?: RoomRate;
  isEditing: boolean;
  editingValue?: number;
  pendingChange?: Partial<EditingCell>;
  currency: string;
  onClick: () => void;
  onChange: (value: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
  loading?: boolean;
  isReferenceColumn?: boolean;  // Is this the "Par défaut" column?
  isFromReferenceSeason?: boolean;  // Is the displayed rate inherited from reference season?
  isExpired?: boolean;  // Is this season expired?
}

function RateCell({
  rate,
  isEditing,
  editingValue,
  pendingChange,
  currency,
  onClick,
  onChange,
  onSave,
  onCancel,
  onDelete,
  loading,
  isReferenceColumn = false,
  isFromReferenceSeason = false,
  isExpired = false,
}: RateCellProps) {
  const hasRate = !!rate;
  const hasPending = !!pendingChange;
  const displayValue = pendingChange?.cost ?? rate?.cost;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isEditing) {
    return (
      <td className="px-2 py-1 border-r border-gray-200 last:border-r-0">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={0.01}
            value={editingValue ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="w-20 px-2 py-1 text-sm border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onSave}
            disabled={loading}
            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    );
  }

  // Determine cell background color
  const getCellBackground = () => {
    // Expired season cells are red
    if (isExpired) {
      if (hasRate) return 'bg-red-50 hover:bg-red-100';
      return 'bg-red-50/50 hover:bg-red-50';
    }
    if (hasPending) return 'bg-amber-50';
    if (isReferenceColumn) {
      // Reference column has amber tint (showing default/reference rate)
      if (hasRate) return 'bg-amber-100 hover:bg-amber-200';
      return 'bg-amber-50 hover:bg-amber-100';
    }
    if (hasRate) return 'bg-emerald-50 hover:bg-emerald-100';
    return 'bg-gray-50 hover:bg-gray-100';
  };

  return (
    <td
      className={`px-2 py-1 border-r border-gray-200 last:border-r-0 cursor-pointer transition-colors group ${getCellBackground()}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-1">
          <span
            className={`font-medium ${
              hasRate || hasPending ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {displayValue !== undefined ? formatCurrency(displayValue) : '-'}
          </span>
          {/* Indicator when showing inherited reference rate */}
          {isFromReferenceSeason && hasRate && (
            <span className="text-[9px] text-amber-600" title="Tarif hérité de la haute saison">
              (HS)
            </span>
          )}
        </div>

        {rate && !isFromReferenceSeason && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(rate.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Show supplements indicator if any */}
      {rate && (rate.single_supplement || rate.extra_adult || rate.extra_child) && (
        <div className="text-[10px] text-gray-400 mt-0.5">
          {rate.single_supplement && <span>+{rate.single_supplement} SGL</span>}
        </div>
      )}
    </td>
  );
}
