'use client';

import { useMemo } from 'react';
import { Minus, Plus, X, Bed } from 'lucide-react';
import type { RoomBedType, RoomDemandEntry } from '@/lib/api/types';

// ─── Labels & icons for bed types ────────────────────────────────────
export const BED_TYPE_LABELS: Record<RoomBedType, string> = {
  SGL: 'Single',
  DBL: 'Double',
  TWN: 'Twin',
  TPL: 'Triple',
  FAM: 'Familiale',
  EXB: 'Lit suppl.',
  CNT: 'Lit bébé',
};

export const ALL_BED_TYPES: RoomBedType[] = ['DBL', 'TWN', 'SGL', 'TPL', 'FAM', 'EXB', 'CNT'];

interface RoomDemandEditorProps {
  value: RoomDemandEntry[];
  onChange: (allocation: RoomDemandEntry[]) => void;
  /** Filter to only bed types available in selected room category */
  availableBedTypes?: RoomBedType[];
  /** Compact mode for inside AccommodationBlock */
  compact?: boolean;
  disabled?: boolean;
}

export default function RoomDemandEditor({
  value,
  onChange,
  availableBedTypes,
  compact = false,
  disabled = false,
}: RoomDemandEditorProps) {
  // Bed types already in the allocation
  const usedBedTypes = useMemo(
    () => new Set(value.map((e) => e.bed_type)),
    [value]
  );

  // Available bed types to add (not already used)
  const addableBedTypes = useMemo(() => {
    const pool = availableBedTypes || ALL_BED_TYPES;
    return pool.filter((bt) => !usedBedTypes.has(bt));
  }, [availableBedTypes, usedBedTypes]);

  const handleQtyChange = (bedType: RoomBedType, delta: number) => {
    const updated = value.map((entry) => {
      if (entry.bed_type === bedType) {
        const newQty = Math.max(1, entry.qty + delta);
        return { ...entry, qty: newQty };
      }
      return entry;
    });
    onChange(updated);
  };

  const handleRemove = (bedType: RoomBedType) => {
    onChange(value.filter((e) => e.bed_type !== bedType));
  };

  const handleAdd = (bedType: RoomBedType) => {
    onChange([...value, { bed_type: bedType, qty: 1 }]);
  };

  if (compact) {
    return (
      <div className="space-y-1">
        {value.map((entry) => (
          <div
            key={entry.bed_type}
            className="flex items-center gap-2 text-sm"
          >
            <span className="text-xs font-medium text-gray-600 w-10">
              {entry.bed_type}
            </span>
            <button
              type="button"
              onClick={() => handleQtyChange(entry.bed_type, -1)}
              disabled={disabled || entry.qty <= 1}
              className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-gray-900 w-4 text-center">
              {entry.qty}
            </span>
            <button
              type="button"
              onClick={() => handleQtyChange(entry.bed_type, 1)}
              disabled={disabled}
              className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleRemove(entry.bed_type)}
              disabled={disabled}
              className="text-gray-300 hover:text-red-500 disabled:opacity-30"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {addableBedTypes.length > 0 && !disabled && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAdd(e.target.value as RoomBedType);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="text-xs text-primary-600 border border-dashed border-primary-300 rounded px-2 py-0.5 bg-white cursor-pointer"
          >
            <option value="" disabled>
              + Type
            </option>
            {addableBedTypes.map((bt) => (
              <option key={bt} value={bt}>
                {BED_TYPE_LABELS[bt]}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        <Bed className="w-4 h-4 inline mr-1.5 text-gray-400" />
        Chambres requises
      </label>

      <div className="space-y-1.5">
        {value.map((entry) => {
          const isUnavailable =
            availableBedTypes && !availableBedTypes.includes(entry.bed_type);
          return (
            <div
              key={entry.bed_type}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                isUnavailable
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span
                className={`text-sm font-medium w-20 ${
                  isUnavailable ? 'text-amber-700' : 'text-gray-700'
                }`}
              >
                {BED_TYPE_LABELS[entry.bed_type] || entry.bed_type}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQtyChange(entry.bed_type, -1)}
                  disabled={disabled || entry.qty <= 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-semibold text-gray-900 w-6 text-center">
                  {entry.qty}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(entry.bed_type, 1)}
                  disabled={disabled}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {isUnavailable && (
                <span className="text-[10px] text-amber-600 font-medium">
                  Non dispo
                </span>
              )}

              <button
                type="button"
                onClick={() => handleRemove(entry.bed_type)}
                disabled={disabled}
                className="ml-auto text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {addableBedTypes.length > 0 && !disabled && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleAdd(e.target.value as RoomBedType);
              e.target.value = '';
            }
          }}
          defaultValue=""
          className="text-xs text-primary-600 border border-dashed border-primary-300 rounded-lg px-3 py-1.5 bg-white cursor-pointer hover:border-primary-400 transition-colors"
        >
          <option value="" disabled>
            + Ajouter un type de chambre
          </option>
          {addableBedTypes.map((bt) => (
            <option key={bt} value={bt}>
              {BED_TYPE_LABELS[bt]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
