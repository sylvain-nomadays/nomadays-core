'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { CotationPaxConfig } from '@/lib/api/types';

interface PaxRangeConfigProps {
  minPax: number;
  maxPax: number;
  paxConfigs: CotationPaxConfig[];
  onMinPaxChange: (value: number) => void;
  onMaxPaxChange: (value: number) => void;
  onRegenerate: () => void;
  regenerating?: boolean;
  /** If true, hide range controls (custom mode = fixed composition) */
  isCustomMode?: boolean;
}

// ─── Column definitions ──────────────────────────────────────────────────────
// Base columns always shown
const BASE_COLUMNS = [
  { key: 'label', label: 'Pax', align: 'left' as const },
  { key: 'adult', label: 'Adultes', align: 'center' as const },
];

// Optional traveller columns (shown only if any config has value > 0)
const OPTIONAL_PAX_COLUMNS = [
  { key: 'teen', label: 'Ados', align: 'center' as const, color: 'text-indigo-600' },
  { key: 'child', label: 'Enfants', align: 'center' as const, color: 'text-pink-600' },
  { key: 'baby', label: 'Bébés', align: 'center' as const, color: 'text-rose-400' },
];

// Staff columns (always shown)
const STAFF_COLUMNS = [
  { key: 'guide', label: 'Guide', align: 'center' as const, color: 'text-purple-600' },
  { key: 'driver', label: 'Chauffeur', align: 'center' as const, color: 'text-orange-600' },
];

// Optional staff columns
const OPTIONAL_STAFF_COLUMNS = [
  { key: 'tour_leader', label: 'TL', align: 'center' as const, color: 'text-cyan-600' },
  { key: 'cook', label: 'Cuisinier', align: 'center' as const, color: 'text-amber-600' },
];

// Room columns (shown dynamically based on data)
const ROOM_COLUMNS = [
  { key: 'dbl', label: 'DBL', align: 'center' as const, color: 'text-blue-600' },
  { key: 'sgl', label: 'SGL', align: 'center' as const, color: 'text-blue-600' },
  { key: 'twn', label: 'TWN', align: 'center' as const, color: 'text-blue-600' },
  { key: 'tpl', label: 'TPL', align: 'center' as const, color: 'text-blue-600' },
  { key: 'fam', label: 'FAM', align: 'center' as const, color: 'text-blue-600' },
  { key: 'exb', label: 'EXB', align: 'center' as const, color: 'text-blue-500' },
  { key: 'cnt', label: 'CNT', align: 'center' as const, color: 'text-blue-400' },
];

// Total column
const TOTAL_COLUMN = { key: 'total_pax', label: 'Total', align: 'center' as const };

export default function PaxRangeConfig({
  minPax,
  maxPax,
  paxConfigs,
  onMinPaxChange,
  onMaxPaxChange,
  onRegenerate,
  regenerating,
  isCustomMode,
}: PaxRangeConfigProps) {
  const [expanded, setExpanded] = useState(false);

  // Helper: get a value from a pax config by string key
  const getConfigValue = (config: CotationPaxConfig, key: string): unknown => {
    return (config as unknown as Record<string, unknown>)[key];
  };

  // Compute which optional columns to show based on config data
  const visibleColumns = useMemo(() => {
    const hasValue = (key: string) =>
      paxConfigs.some(c => {
        const v = getConfigValue(c, key);
        return v != null && Number(v) > 0;
      });

    const columns: { key: string; label: string; align: 'left' | 'center'; color?: string }[] = [
      ...BASE_COLUMNS,
    ];

    // Optional pax categories
    for (const col of OPTIONAL_PAX_COLUMNS) {
      if (hasValue(col.key)) columns.push(col);
    }

    // Staff (always show guide + driver)
    columns.push(...STAFF_COLUMNS);

    // Optional staff
    for (const col of OPTIONAL_STAFF_COLUMNS) {
      if (hasValue(col.key)) columns.push(col);
    }

    // Room columns: show dbl/sgl always (for range mode), others only if present
    const dblCol = ROOM_COLUMNS.find(c => c.key === 'dbl')!;
    const sglCol = ROOM_COLUMNS.find(c => c.key === 'sgl')!;
    if (hasValue('dbl')) columns.push(dblCol);
    if (hasValue('sgl')) columns.push(sglCol);

    // Other room types: only show if present
    for (const col of ROOM_COLUMNS.filter(c => c.key !== 'dbl' && c.key !== 'sgl')) {
      if (hasValue(col.key)) columns.push(col);
    }

    // Total
    columns.push(TOTAL_COLUMN);

    return columns;
  }, [paxConfigs]);

  return (
    <div className="space-y-3">
      {/* Range controls (hidden in custom mode) */}
      {!isCustomMode && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">De</span>
            <input
              type="number"
              value={minPax}
              onChange={(e) => onMinPaxChange(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={maxPax}
              className="w-14 px-2 py-1 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-gray-600">à</span>
            <input
              type="number"
              value={maxPax}
              onChange={(e) => onMaxPaxChange(Math.max(minPax, parseInt(e.target.value) || 10))}
              min={minPax}
              max={20}
              className="w-14 px-2 py-1 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-gray-400">participants</span>
          </div>

          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-500 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Régénérer
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto"
          >
            {paxConfigs.length} configs
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Custom mode: always show config (no range controls), with toggle */}
      {isCustomMode && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {paxConfigs.length === 1 ? paxConfigs[0]?.label : `${paxConfigs.length} configs`}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            Détails
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Expandable pax configs table */}
      {expanded && paxConfigs.length > 0 && (
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                {visibleColumns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-gray-500 font-medium ${
                      col.align === 'left' ? 'text-left' : 'text-center'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paxConfigs.map((config, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                  {visibleColumns.map(col => {
                    const rawValue = getConfigValue(config, col.key);
                    const displayValue = col.key === 'label'
                      ? String(rawValue ?? '')
                      : (rawValue != null ? Number(rawValue) : 0);
                    const colorClass = col.key === 'label'
                      ? 'font-medium text-gray-700'
                      : col.key === 'total_pax'
                      ? 'font-medium text-gray-800'
                      : col.color || 'text-gray-600';

                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-1.5 ${
                          col.align === 'left' ? 'text-left' : 'text-center'
                        } ${colorClass}`}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
