'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Save, Loader2, Calculator, Plus, Trash2,
  TrendingUp, ArrowRight, AlertTriangle, Info, Users,
  CalendarClock, X, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useTarification } from '@/hooks/useTarification';
import type {
  TripCotation,
  TripType,
  TarificationMode,
  TarificationData,
  TarificationEntry,
  RangeWebEntry,
  PerPersonEntry,
  PerGroupEntry,
  ServiceListEntry,
  EnumerationEntry,
  TarificationComputeResult,
  TarificationComputedLine,
  CotationPaxResult,
  CotationSupplement,
} from '@/lib/api/types';

// ============================================================================
// TarificationPanel — pricing module with reverse margin calculation
// ============================================================================

interface TarificationPanelProps {
  cotation: TripCotation;
  currency: string;
  localCurrency?: string;
  exchangeRate?: number; // 1 localCurrency = X baseCurrency (engine format)
  tripType?: TripType;
  selectedCotationId?: number | null;
  conditionLabels?: { name: string; value: string }[];
  onSaved?: () => void;
}

const MODE_LABELS: Record<TarificationMode, string> = {
  range_web: 'Prix / tranche',
  per_person: 'Prix / personne',
  per_group: 'Prix / groupe',
  service_list: 'Multi-groupes',
  enumeration: 'Détail prestations',
};

const MODE_DESCRIPTIONS: Record<TarificationMode, string> = {
  range_web: 'Grille de prix par tranche de participants (circuits en ligne / GIR)',
  per_person: 'Un prix unique par personne × nombre de participants',
  per_group: 'Un prix global forfaitaire pour le groupe',
  service_list: 'Quand au sein d\'un même groupe, les prestations diffèrent. Les pax s\'additionnent (ex : 2 pers du 3-7 fév + 2 pers du 3-10 fév = 4 pax)',
  enumeration: 'Détail de prestations pour les mêmes personnes — les pax ne s\'additionnent pas (ex : circuit + extension pour 2 pers)',
};

// Helpers
function fmt(val: number, decimals = 0): string {
  return val.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(val: number): string {
  return val.toFixed(1) + '%';
}

// ─────────────────────────────────────────────────────────────────────────────
// PaxGroupSwitcher — interactive group size selector (range_web mode only)
// ─────────────────────────────────────────────────────────────────────────────

function PaxGroupSwitcher({
  paxValues,
  selectedPax,
  onSelect,
  costPerPerson,
  currency,
}: {
  paxValues: number[];
  selectedPax: number | null;
  onSelect: (pax: number) => void;
  costPerPerson: Record<number, number>;
  currency: string;
}) {
  if (paxValues.length === 0) return null;

  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 mb-2">Taille du groupe</label>
      <div className="flex flex-wrap gap-2">
        {paxValues.map(pax => {
          const isSelected = selectedPax === pax;
          const cost = costPerPerson[pax];
          return (
            <button
              key={pax}
              onClick={() => onSelect(pax)}
              className={`flex flex-col items-center min-w-[56px] px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                isSelected
                  ? 'bg-primary text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{pax}</span>
              </div>
              {cost != null && cost > 0 && (
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                  {fmt(cost)} {currency}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PriceHeroCard — prominent price display for selected group
// ─────────────────────────────────────────────────────────────────────────────

function PriceHeroCard({
  line,
  currency,
  paxLabel,
  argsLabel,
}: {
  line: TarificationComputedLine | null;
  currency: string;
  paxLabel?: string;
  argsLabel?: string;
}) {
  if (!line) {
    return (
      <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
        <Calculator className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Saisissez un prix pour voir le résultat</p>
      </div>
    );
  }

  const sellingPP = line.selling_price_per_person ?? line.price_per_person ?? 0;
  const netPct = line.selling_price > 0 ? (line.margin_nette / line.selling_price) * 100 : 0;
  const netColor = netMarginColor(netPct);
  const netBg = netMarginBg(netPct);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-primary/30 p-6 sticky top-4">
      {/* Pax info */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-600">
          {paxLabel || (() => {
            const paxCount = line.paying_pax || line.pax || 0;
            return paxCount > 0
              ? `${paxCount} participant${paxCount > 1 ? 's' : ''}`
              : '';
          })()}
        </div>
        {argsLabel && (
          <div className="text-xs text-gray-400 mt-0.5">{argsLabel}</div>
        )}
      </div>

      {/* Hero price per person */}
      {sellingPP > 0 && (
        <div className="text-center mb-3">
          <div className="text-4xl font-display font-extrabold text-primary tracking-tight">
            {fmt(sellingPP)} {currency}
          </div>
          <div className="text-sm text-gray-500 mt-1">par personne</div>
        </div>
      )}

      {/* Total price */}
      <div className="text-center mb-4">
        <div className="text-lg text-gray-600">
          Total : <span className="font-semibold text-gray-900">{fmt(line.selling_price)} {currency}</span>
        </div>
      </div>

      {/* Net margin badge */}
      <div className={`${netBg} rounded-lg px-3 py-2 text-center`}>
        <span className={`text-sm font-bold ${netColor}`}>
          Marge nette : {fmt(line.margin_nette)} {currency} ({fmtPct(netPct)})
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode editors — one per tarification mode
// ─────────────────────────────────────────────────────────────────────────────

interface ModeEditorProps {
  entries: TarificationEntry[];
  onChange: (entries: TarificationEntry[]) => void;
  paxConfigs: CotationPaxResult[];
  currency: string;
}

function RangeWebEditor({ entries, onChange, paxConfigs, currency }: ModeEditorProps) {
  const rangeEntries = entries as RangeWebEntry[];

  // Build default entries from pax configs if none yet
  useEffect(() => {
    if (rangeEntries.length === 0 && paxConfigs.length > 0) {
      // Build smart default ranges: 2, 3, 4-6, 7-10
      const defaults: RangeWebEntry[] = [
        { pax_label: '2', pax_min: 2, pax_max: 2, selling_price: 0 },
        { pax_label: '3', pax_min: 3, pax_max: 3, selling_price: 0 },
        { pax_label: '4-6', pax_min: 4, pax_max: 6, selling_price: 0 },
        { pax_label: '7-10', pax_min: 7, pax_max: 10, selling_price: 0 },
      ];
      // Pre-fill prices from pax configs if matching
      for (const d of defaults) {
        const pc = paxConfigs.find(p => p.total_pax === d.pax_min);
        if (pc) {
          d.selling_price = Math.round(pc.price_per_paying_person || pc.price_per_person || 0);
        }
      }
      onChange(defaults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxConfigs.length]);

  // Auto-compute pax_label from min/max
  const buildLabel = (min: number, max: number): string => {
    return min === max ? String(min) : `${min}-${max}`;
  };

  const updateEntry = (idx: number, field: keyof RangeWebEntry, value: string | number) => {
    const updated = rangeEntries.map((e, i) => {
      if (i !== idx) return e;
      const next = { ...e, [field]: value } as RangeWebEntry;
      // Auto-update label when min/max changes
      if (field === 'pax_min' || field === 'pax_max') {
        next.pax_label = buildLabel(
          field === 'pax_min' ? (value as number) : next.pax_min,
          field === 'pax_max' ? (value as number) : next.pax_max
        );
      }
      return next;
    });
    onChange(updated);
  };

  const addEntry = () => {
    const last = rangeEntries[rangeEntries.length - 1];
    const lastMax = last ? last.pax_max : 1;
    const newMin = lastMax + 1;
    const newMax = newMin + 2;
    onChange([...rangeEntries, {
      pax_label: buildLabel(newMin, newMax),
      pax_min: newMin,
      pax_max: newMax,
      selling_price: 0,
    } as RangeWebEntry]);
  };

  const removeEntry = (idx: number) => {
    onChange(rangeEntries.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[60px_10px_60px_1fr_32px] gap-2 text-xs text-gray-500 font-medium px-1">
        <span>De</span>
        <span />
        <span>À</span>
        <span>Prix / pers ({currency})</span>
        <span />
      </div>
      {rangeEntries.map((entry, idx) => (
        <div key={idx} className="grid grid-cols-[60px_10px_60px_1fr_32px] gap-2 items-center">
          <input
            type="number"
            value={entry.pax_min || ''}
            onChange={(e) => updateEntry(idx, 'pax_min', parseInt(e.target.value) || 1)}
            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
            min={1}
          />
          <span className="text-center text-gray-400 text-sm">→</span>
          <input
            type="number"
            value={entry.pax_max || ''}
            onChange={(e) => updateEntry(idx, 'pax_max', parseInt(e.target.value) || entry.pax_min)}
            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
            min={entry.pax_min}
          />
          <input
            type="number"
            value={entry.selling_price || ''}
            onChange={(e) => updateEntry(idx, 'selling_price', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
          <button
            onClick={() => removeEntry(idx)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter une tranche
      </button>
    </div>
  );
}

function PerPersonEditor({ entries, onChange, paxConfigs, currency }: ModeEditorProps) {
  const ppEntries = entries as PerPersonEntry[];

  useEffect(() => {
    if (ppEntries.length === 0) {
      const defaultPax = paxConfigs[0]?.total_pax || 2;
      const defaultPrice = paxConfigs[0]?.price_per_paying_person || paxConfigs[0]?.price_per_person || 0;
      onChange([{ price_per_person: Math.round(defaultPrice), total_pax: defaultPax }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxConfigs.length]);

  const updateEntry = (field: keyof PerPersonEntry, value: number) => {
    const current = ppEntries[0] || { price_per_person: 0, total_pax: 2 };
    onChange([{ ...current, [field]: value } as PerPersonEntry]);
  };

  const entry = ppEntries[0] || { price_per_person: 0, total_pax: 2 };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Prix par personne ({currency})</label>
        <input
          type="number"
          value={entry.price_per_person || ''}
          onChange={(e) => updateEntry('price_per_person', parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de personnes</label>
        <input
          type="number"
          value={entry.total_pax || ''}
          onChange={(e) => updateEntry('total_pax', parseInt(e.target.value) || 2)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
          min={1}
        />
      </div>
    </div>
  );
}

function PerGroupEditor({ entries, onChange, paxConfigs, currency }: ModeEditorProps) {
  const grpEntries = entries as PerGroupEntry[];

  useEffect(() => {
    if (grpEntries.length === 0) {
      const defaultPax = paxConfigs[0]?.total_pax || 2;
      const defaultPrice = paxConfigs[0]?.total_price || 0;
      onChange([{ group_price: Math.round(defaultPrice), total_pax: defaultPax }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxConfigs.length]);

  const updateEntry = (field: keyof PerGroupEntry, value: number) => {
    const current = grpEntries[0] || { group_price: 0, total_pax: 2 };
    onChange([{ ...current, [field]: value } as PerGroupEntry]);
  };

  const entry = grpEntries[0] || { group_price: 0, total_pax: 2 };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Prix du groupe ({currency})</label>
        <input
          type="number"
          value={entry.group_price || ''}
          onChange={(e) => updateEntry('group_price', parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de personnes</label>
        <input
          type="number"
          value={entry.total_pax || ''}
          onChange={(e) => updateEntry('total_pax', parseInt(e.target.value) || 2)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
          min={1}
        />
      </div>
    </div>
  );
}

function ServiceListEditor({ entries, onChange, currency }: ModeEditorProps) {
  const slEntries = entries as ServiceListEntry[];

  useEffect(() => {
    if (slEntries.length === 0) {
      onChange([{ label: 'Prestation', pax: 2, price_per_person: 0 }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEntry = (idx: number, field: keyof ServiceListEntry, value: string | number) => {
    const updated = slEntries.map((e, i) =>
      i === idx ? { ...e, [field]: value } as ServiceListEntry : e
    );
    onChange(updated);
  };

  const addEntry = () => {
    onChange([...slEntries, { label: '', pax: 2, price_per_person: 0 } as ServiceListEntry]);
  };

  const removeEntry = (idx: number) => {
    onChange(slEntries.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_80px_120px_32px] gap-2 text-xs text-gray-500 font-medium px-1">
        <span>Description</span>
        <span>Pax</span>
        <span>Prix/pers ({currency})</span>
        <span />
      </div>
      {slEntries.map((entry, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_80px_120px_32px] gap-2 items-center">
          <input
            type="text"
            value={entry.label}
            onChange={(e) => updateEntry(idx, 'label', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Prestation du 3 au 7 Février"
          />
          <input
            type="number"
            value={entry.pax || ''}
            onChange={(e) => updateEntry(idx, 'pax', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
            min={1}
          />
          <input
            type="number"
            value={entry.price_per_person || ''}
            onChange={(e) => updateEntry(idx, 'price_per_person', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
          <button
            onClick={() => removeEntry(idx)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter une ligne
      </button>
    </div>
  );
}

function EnumerationEditor({ entries, onChange, currency }: ModeEditorProps) {
  const enumEntries = entries as EnumerationEntry[];

  useEffect(() => {
    if (enumEntries.length === 0) {
      onChange([{ label: '', unit_price: 0, quantity: 1 }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEntry = (idx: number, field: keyof EnumerationEntry, value: string | number) => {
    const updated = enumEntries.map((e, i) =>
      i === idx ? { ...e, [field]: value } as EnumerationEntry : e
    );
    onChange(updated);
  };

  const addEntry = () => {
    onChange([...enumEntries, { label: '', unit_price: 0, quantity: 1 } as EnumerationEntry]);
  };

  const removeEntry = (idx: number) => {
    onChange(enumEntries.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_120px_80px_32px] gap-2 text-xs text-gray-500 font-medium px-1">
        <span>Libellé</span>
        <span>Prix unit. ({currency})</span>
        <span>Qté</span>
        <span />
      </div>
      {enumEntries.map((entry, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_120px_80px_32px] gap-2 items-center">
          <input
            type="text"
            value={entry.label}
            onChange={(e) => updateEntry(idx, 'label', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Circuit en groupe du 3 au 15 janvier"
          />
          <input
            type="number"
            value={entry.unit_price || ''}
            onChange={(e) => updateEntry(idx, 'unit_price', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
          <input
            type="number"
            value={entry.quantity || ''}
            onChange={(e) => updateEntry(idx, 'quantity', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
            min={1}
          />
          <button
            onClick={() => removeEntry(idx)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter une ligne
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Margin results display
// ─────────────────────────────────────────────────────────────────────────────

function netMarginColor(netPct: number): string {
  return netPct >= 25 ? 'text-nomadays-sage' :
         netPct >= 15 ? 'text-secondary' :
         netPct >= 0 ? 'text-orange-600' :
         'text-red-600';
}

function netMarginBg(netPct: number): string {
  return netPct >= 25 ? 'bg-nomadays-sage-light' :
         netPct >= 15 ? 'bg-nomadays-terracotta-light' :
         netPct >= 0 ? 'bg-orange-50' :
         'bg-red-50';
}

function MarginLine({
  line,
  currency,
  isTotal,
  isSelected,
  onClick,
  isRangeMode,
}: {
  line: TarificationComputedLine;
  currency: string;
  isTotal?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  isRangeMode?: boolean;
}) {
  const marginColor = line.margin_pct >= 30 ? 'text-nomadays-sage' :
                       line.margin_pct >= 20 ? 'text-secondary' :
                       line.margin_pct >= 0 ? 'text-orange-600' :
                       'text-red-600';

  const netPct = line.selling_price > 0 ? (line.margin_nette / line.selling_price) * 100 : 0;
  const netColor = netMarginColor(netPct);
  const netBg = netMarginBg(netPct);

  const hasPP = (line.selling_price_per_person != null || line.price_per_person != null) && !isTotal;
  const sellingPP = line.selling_price_per_person ?? line.price_per_person ?? 0;
  const costPP = line.cost_per_person ?? 0;

  const clickable = isRangeMode && !isTotal && onClick;

  return (
    <div
      className={`py-2.5 px-3 text-sm transition-colors ${
        isTotal ? 'bg-gray-50 font-semibold rounded-lg mt-1' :
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary border-b border-gray-100' :
        'border-b border-gray-100'
      } ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      {/* Main row */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center">
        <div className="truncate text-gray-700 min-w-[80px]">
          {line.label || '—'}
          {line.paying_pax && !isTotal && (
            <span className="text-xs text-gray-400 ml-1">({line.paying_pax} pax)</span>
          )}
        </div>
        <div className="text-right text-gray-900 min-w-[80px]">
          {fmt(line.selling_price)} {currency}
        </div>
        <div className="text-right text-gray-500 min-w-[80px]">
          {fmt(line.total_cost)} {currency}
        </div>
        <div className={`text-right font-medium min-w-[80px] ${marginColor}`}>
          {fmt(line.margin_total)} {currency}
          <span className="text-xs ml-1">({fmtPct(line.margin_pct)})</span>
        </div>
        <div className="text-right text-gray-500 min-w-[60px]">
          {line.commission_amount > 0 ? `-${fmt(line.commission_amount)}` : '—'}
        </div>
        {/* MARGE NETTE — Hero column */}
        <div className={`text-right min-w-[120px] px-2 py-1 rounded-md ${netBg}`}>
          <span className={`font-bold ${netColor}`}>
            {fmt(line.margin_nette)} {currency}
          </span>
          {line.selling_price > 0 && (
            <span className={`text-sm font-semibold ml-1.5 ${netColor}`}>
              {fmtPct(netPct)}
            </span>
          )}
        </div>
      </div>
      {/* Per-person sub-row */}
      {hasPP && sellingPP > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center mt-0.5">
          <div className="text-xs text-gray-400 italic">/ pers</div>
          <div className="text-right text-xs text-gray-400 min-w-[80px]">{fmt(sellingPP)}</div>
          <div className="text-right text-xs text-gray-400 min-w-[80px]">{costPP > 0 ? fmt(costPP) : '—'}</div>
          <div className="text-right text-xs text-gray-400 min-w-[80px]">
            {costPP > 0 ? fmt(sellingPP - costPP) : '—'}
          </div>
          <div className="min-w-[60px]" />
          <div className="min-w-[120px]" />
        </div>
      )}
    </div>
  );
}

/** Group lines by range_label for visual grouping */
function groupLinesByRange(lines: TarificationComputedLine[]): { label: string | null; lines: TarificationComputedLine[] }[] {
  const groups: { label: string | null; lines: TarificationComputedLine[] }[] = [];
  let currentLabel: string | null | undefined = undefined;

  for (const line of lines) {
    const rl = line.range_label ?? null;
    if (rl !== currentLabel) {
      groups.push({ label: rl, lines: [line] });
      currentLabel = rl;
    } else {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup) lastGroup.lines.push(line);
    }
  }

  return groups;
}

function MarginResultsTable({
  result,
  currency,
  isRangeMode,
  selectedLineIdx,
  onLineSelect,
}: {
  result: TarificationComputeResult;
  currency: string;
  isRangeMode?: boolean;
  selectedLineIdx?: number | null;
  onLineSelect?: (idx: number) => void;
}) {
  const hasRangeGroups = result.lines.some(l => l.range_label != null);
  const groups = hasRangeGroups ? groupLinesByRange(result.lines) : null;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 text-xs text-gray-500 font-medium px-3 py-2 border-b border-gray-200">
        <div>{isRangeMode ? 'Scénario' : 'Ligne'}</div>
        <div className="text-right min-w-[80px]">Prix vente</div>
        <div className="text-right min-w-[80px]">Coût total</div>
        <div className="text-right min-w-[80px]">Marge brute</div>
        <div className="text-right min-w-[60px]">Commission</div>
        <div className="text-right min-w-[120px] font-semibold text-gray-700">Marge nette</div>
      </div>

      {/* Lines — grouped or flat */}
      {groups ? (
        (() => {
          let globalIdx = 0;
          return groups.map((group, gIdx) => {
            const startIdx = globalIdx;
            globalIdx += group.lines.length;
            return (
              <div key={gIdx}>
                {/* Range group header (only for multi-pax ranges) */}
                {group.label && group.lines.length > 1 && (
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 mt-1 first:mt-0">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tranche {group.label} pax
                    </span>
                  </div>
                )}
                {group.lines.map((line, idx) => {
                  const lineIdx = startIdx + idx;
                  return (
                    <MarginLine
                      key={`${gIdx}-${idx}`}
                      line={line}
                      currency={currency}
                      isRangeMode={isRangeMode}
                      isSelected={selectedLineIdx === lineIdx}
                      onClick={() => onLineSelect?.(lineIdx)}
                    />
                  );
                })}
              </div>
            );
          });
        })()
      ) : (
        result.lines.map((line, idx) => (
          <MarginLine
            key={idx}
            line={line}
            currency={currency}
            isRangeMode={isRangeMode}
            isSelected={selectedLineIdx === idx}
            onClick={() => onLineSelect?.(idx)}
          />
        ))
      )}

      {/* Totals — only for non-range modes (cumulative lines) */}
      {!isRangeMode && result.lines.length > 1 && (
        <MarginLine line={result.totals} currency={currency} isTotal />
      )}
    </div>
  );
}

function MarginSummaryBlock({
  data,
  currency,
  localCurrency,
  exchangeRate,
  title,
  subtitle,
}: {
  data: TarificationComputedLine;
  currency: string;
  localCurrency?: string;
  exchangeRate?: number; // 1 localCurrency = X baseCurrency
  title?: string;
  subtitle?: string;
}) {
  const [currencyTab, setCurrencyTab] = useState<'selling' | 'local'>('selling');

  const marginColor = data.margin_pct >= 30 ? 'text-nomadays-sage' :
                       data.margin_pct >= 20 ? 'text-secondary' :
                       data.margin_pct >= 0 ? 'text-orange-600' :
                       'text-red-600';

  const netPct = data.selling_price > 0
    ? (data.margin_nette / data.selling_price) * 100
    : 0;
  const netColor = netMarginColor(netPct);
  const netBg = netMarginBg(netPct);
  const netBorder = netPct >= 25 ? 'border-nomadays-sage/30' :
                    netPct >= 15 ? 'border-secondary/30' :
                    netPct >= 0 ? 'border-orange-200' :
                    'border-red-200';

  // Currency conversion: show amounts in local currency
  const hasLocalCurrency = localCurrency && localCurrency !== currency && exchangeRate && exchangeRate > 0;
  const showingLocal = currencyTab === 'local' && hasLocalCurrency;
  const displayCurrency = showingLocal ? localCurrency : currency;
  // exchangeRate is: 1 localCurrency = X baseCurrency
  // To convert baseCurrency → localCurrency: divide by rate
  const toLocal = (amount: number) => hasLocalCurrency ? amount / exchangeRate : amount;
  const fmtAmount = (amount: number) => showingLocal ? fmt(toLocal(amount)) : fmt(amount);

  // Commission decomposition
  const hasPrimaryCommission = (data.primary_commission_amount ?? 0) > 0;
  const hasSecondaryCommission = (data.secondary_commission_amount ?? 0) > 0;
  const hasBothCommissions = hasPrimaryCommission && hasSecondaryCommission;

  return (
    <div className="space-y-3">
      {/* HERO: Marge nette finale */}
      <div className={`${netBg} rounded-xl p-5 border-2 ${netBorder}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {title || 'Marge nette finale'}
            </h4>
            <p className="text-xs text-gray-400">{subtitle || 'Après commission et TVA'}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-display font-extrabold tracking-tight ${netColor}`}>
              {fmtAmount(data.margin_nette)} {displayCurrency}
            </div>
            <div className={`text-lg font-bold ${netColor} mt-0.5`}>
              {fmtPct(netPct)}
            </div>
          </div>
        </div>
      </div>

      {/* Detail breakdown */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Décomposition</h4>
          {/* Currency tab switcher */}
          {hasLocalCurrency && (
            <div className="flex rounded-lg bg-gray-200/60 p-0.5">
              <button
                onClick={() => setCurrencyTab('selling')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  currencyTab === 'selling'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {currency}
              </button>
              <button
                onClick={() => setCurrencyTab('local')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  currencyTab === 'local'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {localCurrency}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          {/* Prix de vente total */}
          <div className="flex justify-between">
            <span className="text-gray-600">Prix de vente total</span>
            <span className="font-semibold text-gray-900">{fmtAmount(data.selling_price)} {displayCurrency}</span>
          </div>

          {/* Coût total */}
          <div className="flex justify-between">
            <span className="text-gray-600">Coût total</span>
            <span className="text-gray-700">{fmtAmount(data.total_cost)} {displayCurrency}</span>
          </div>

          {/* Marge brute */}
          <div className="flex justify-between">
            <span className="text-gray-600">Marge brute</span>
            <span className={`font-semibold ${marginColor}`}>
              {fmtAmount(data.margin_total)} {displayCurrency}
              <span className="text-xs ml-1">({fmtPct(data.margin_pct)})</span>
            </span>
          </div>

          {/* Commissions — show decomposition if both exist */}
          {hasBothCommissions ? (
            <>
              <div className="flex justify-between text-gray-500">
                <span className="text-gray-500 pl-2">• Commission principale</span>
                <span>-{fmtAmount(data.primary_commission_amount || 0)} {displayCurrency}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span className="text-gray-500 pl-2">• Commission secondaire</span>
                <span>-{fmtAmount(data.secondary_commission_amount || 0)} {displayCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Commission totale</span>
                <span className="text-gray-700">-{fmtAmount(data.commission_amount)} {displayCurrency}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-600">Commission</span>
              <span className="text-gray-700">-{fmtAmount(data.commission_amount)} {displayCurrency}</span>
            </div>
          )}

          {/* Prix de vente Agence */}
          {data.commission_amount > 0 && (
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-gray-700 font-medium">Prix de vente Agence</span>
              <span className="font-semibold text-primary">
                {fmtAmount(data.agency_selling_price ?? (data.selling_price - data.commission_amount))} {displayCurrency}
              </span>
            </div>
          )}

          {/* Marge après commission */}
          <div className="flex justify-between">
            <span className="text-gray-600">Marge après commission</span>
            <span className="font-medium text-gray-900">
              {fmtAmount(data.margin_after_commission)} {displayCurrency}
              {data.selling_price > 0 && (
                <span className="text-xs ml-1">({fmtPct(data.margin_after_commission / data.selling_price * 100)})</span>
              )}
            </span>
          </div>

          {/* TVA */}
          {data.vat_forecast > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Prévision TVA</span>
              <span className="text-gray-700">-{fmtAmount(data.vat_forecast)} {displayCurrency}</span>
            </div>
          )}

          {data.vat_recoverable > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">TVA récupérable</span>
              <span className="text-nomadays-sage">+{fmtAmount(data.vat_recoverable)} {displayCurrency}</span>
            </div>
          )}
          {data.net_vat > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">TVA nette</span>
              <span className="text-gray-700">-{fmtAmount(data.net_vat)} {displayCurrency}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ClientPublicationSection — toggle publication + label + description + supplements
// ─────────────────────────────────────────────────────────────────────────────

interface ClientPublicationSectionProps {
  cotation: TripCotation;
  currency: string;
  selectedCotationId?: number | null;
  onSaved?: () => void;
}

function ClientPublicationSection({ cotation, currency, selectedCotationId, onSaved }: ClientPublicationSectionProps) {
  const [isPublished, setIsPublished] = useState(cotation.is_published_client ?? false);
  const [clientLabel, setClientLabel] = useState(cotation.client_label || cotation.name || '');
  const [clientDescription, setClientDescription] = useState(cotation.client_description || '');
  const [supplements, setSupplements] = useState<CotationSupplement[]>(
    cotation.supplements_json || []
  );
  const [pubSaving, setPubSaving] = useState(false);
  const [pubHasChanges, setPubHasChanges] = useState(false);

  // Resync when cotation changes externally
  useEffect(() => {
    setIsPublished(cotation.is_published_client ?? false);
    setClientLabel(cotation.client_label || cotation.name || '');
    setClientDescription(cotation.client_description || '');
    setSupplements(cotation.supplements_json || []);
    setPubHasChanges(false);
  }, [cotation.id, cotation.is_published_client, cotation.client_label, cotation.client_description, cotation.supplements_json, cotation.name]);

  // Save publication fields via PATCH /cotations/{id}
  const savePublication = useCallback(async (overrides?: {
    is_published_client?: boolean;
    client_label?: string;
    client_description?: string;
    supplements_json?: CotationSupplement[];
  }) => {
    setPubSaving(true);
    try {
      await apiClient.patch(`/cotations/${cotation.id}`, {
        is_published_client: overrides?.is_published_client ?? isPublished,
        client_label: (overrides?.client_label ?? clientLabel) || null,
        client_description: (overrides?.client_description ?? clientDescription) || null,
        supplements_json: (overrides?.supplements_json ?? supplements).length > 0
          ? (overrides?.supplements_json ?? supplements)
          : null,
      });
      setPubHasChanges(false);
      onSaved?.();
    } catch (err) {
      console.error('[ClientPublicationSection] Save error:', err);
    } finally {
      setPubSaving(false);
    }
  }, [cotation.id, isPublished, clientLabel, clientDescription, supplements, onSaved]);

  // Auto-save debounce (1500ms) for text changes
  useEffect(() => {
    if (!pubHasChanges) return;
    const timer = setTimeout(() => {
      savePublication();
    }, 1500);
    return () => clearTimeout(timer);
  }, [pubHasChanges, clientLabel, clientDescription, supplements, savePublication]);

  // Toggle published — save immediately
  const handleTogglePublish = useCallback(() => {
    const next = !isPublished;
    setIsPublished(next);
    savePublication({ is_published_client: next });
  }, [isPublished, savePublication]);

  // Supplement helpers
  const addSupplement = () => {
    const updated = [...supplements, { label: '', price: 0, per_person: true }];
    setSupplements(updated);
    setPubHasChanges(true);
  };

  const updateSupplement = (idx: number, field: keyof CotationSupplement, value: string | number | boolean) => {
    const updated = supplements.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    setSupplements(updated);
    setPubHasChanges(true);
  };

  const removeSupplement = (idx: number) => {
    const updated = supplements.filter((_, i) => i !== idx);
    setSupplements(updated);
    setPubHasChanges(true);
  };

  return (
    <div className="border-t-2 border-primary/20 mt-6 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-display font-semibold text-gray-700">Publication client</h4>
        </div>
        <div className="flex items-center gap-2">
          {pubSaving && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sauvegarde...
            </span>
          )}
          {!pubSaving && !pubHasChanges && isPublished && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Save className="w-3 h-3" />
              Sauvegardé
            </span>
          )}
        </div>
      </div>

      {/* Selected cotation banner */}
      {selectedCotationId != null && cotation.id === selectedCotationId && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-700">Option retenue par le client</span>
        </div>
      )}

      {/* Toggle publish */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-gray-700">Visible dans l&apos;espace voyageur</div>
          <div className="text-xs text-gray-400 mt-0.5">
            Le client verra cette option tarifaire dans sa proposition
          </div>
        </div>
        <button
          onClick={handleTogglePublish}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            isPublished ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isPublished ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Publication details — show when published */}
      {isPublished && (
        <div className="space-y-4 bg-primary/5 rounded-lg p-4">
          {/* Client label */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nom affiché au client
            </label>
            <input
              type="text"
              value={clientLabel}
              onChange={(e) => { setClientLabel(e.target.value); setPubHasChanges(true); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex : Classique, Deluxe, Budget..."
              maxLength={100}
            />
            <p className="text-xs text-gray-400 mt-1">
              Laissez vide pour utiliser le nom de la cotation : « {cotation.name} »
            </p>
          </div>

          {/* Client description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description pour le client
            </label>
            <textarea
              value={clientDescription}
              onChange={(e) => { setClientDescription(e.target.value); setPubHasChanges(true); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              placeholder="Expliquez les particularités de cette option (hébergements, niveau de confort, inclusions spéciales...)"
            />
          </div>

          {/* Supplements */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Suppléments optionnels
            </label>
            {supplements.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="grid grid-cols-[1fr_100px_80px_32px] gap-2 text-xs text-gray-500 font-medium px-1">
                  <span>Libellé</span>
                  <span>Prix ({currency})</span>
                  <span className="text-center">/pers</span>
                  <span />
                </div>
                {supplements.map((sup, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_80px_32px] gap-2 items-center">
                    <input
                      type="text"
                      value={sup.label}
                      onChange={(e) => updateSupplement(idx, 'label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      placeholder="Guide francophone"
                    />
                    <input
                      type="number"
                      value={sup.price || ''}
                      onChange={(e) => updateSupplement(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      placeholder="0"
                    />
                    <div className="flex justify-center">
                      <button
                        onClick={() => updateSupplement(idx, 'per_person', !sup.per_person)}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          sup.per_person
                            ? 'bg-primary/20 text-primary'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title={sup.per_person ? 'Prix par personne' : 'Prix forfaitaire'}
                      >
                        {sup.per_person ? '/pers' : 'forfait'}
                      </button>
                    </div>
                    <button
                      onClick={() => removeSupplement(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={addSupplement}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un supplément
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TarificationPanel component
// ─────────────────────────────────────────────────────────────────────────────

export default function TarificationPanel({ cotation, currency, localCurrency, exchangeRate, tripType, selectedCotationId, conditionLabels, onSaved }: TarificationPanelProps) {
  const { save, saving, compute, computing, computeResult } = useTarification();

  // Local state
  const [mode, setMode] = useState<TarificationMode>(
    cotation.tarification_json?.mode || 'range_web'
  );
  const [entries, setEntries] = useState<TarificationEntry[]>(
    cotation.tarification_json?.entries || []
  );
  const [localResult, setLocalResult] = useState<TarificationComputeResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState<number | null>(null);
  const [selectedPaxValue, setSelectedPaxValue] = useState<number | null>(null);
  const [validityDate, setValidityDate] = useState<string>(
    cotation.tarification_json?.validity_date || ''
  );

  // Pax configs from cotation results
  const paxConfigs = useMemo(
    () => cotation.results_json?.pax_configs || [],
    [cotation.results_json]
  );

  // Build pax values and cost map for PaxGroupSwitcher
  const paxValues = useMemo(() => {
    return [...new Set(paxConfigs.map(p => p.total_pax))].filter(Boolean).sort((a, b) => a - b);
  }, [paxConfigs]);

  const costPerPerson = useMemo(() => {
    const map: Record<number, number> = {};
    for (const pc of paxConfigs) {
      if (pc.total_pax && pc.cost_per_person) {
        map[pc.total_pax] = pc.cost_per_person;
      }
    }
    return map;
  }, [paxConfigs]);

  // When cotation changes externally, re-sync
  useEffect(() => {
    setMode(cotation.tarification_json?.mode || 'range_web');
    setEntries(cotation.tarification_json?.entries || []);
    setValidityDate(cotation.tarification_json?.validity_date || '');
    setLocalResult(null);
    setHasChanges(false);
    setSelectedLineIdx(null);
    setSelectedPaxValue(null);
  }, [cotation.id, cotation.tarification_json]);

  // Track changes — only mark as changed if entries already exist
  // (skip the initial auto-fill from mode editors)
  const handleEntriesChange = useCallback((newEntries: TarificationEntry[]) => {
    setEntries(prev => {
      if (prev.length > 0) setHasChanges(true);
      return newEntries;
    });
  }, []);

  const handleModeChange = useCallback((newMode: TarificationMode) => {
    setMode(newMode);
    setEntries([]);
    setLocalResult(null);
    setHasChanges(true);
    setSelectedLineIdx(null);
    setSelectedPaxValue(null);
  }, []);

  // Compute
  const handleCompute = useCallback(async () => {
    try {
      const result = await compute({
        cotationId: cotation.id,
        data: { mode, entries },
      });
      if (result) {
        setLocalResult(result);
      }
    } catch (err) {
      console.error('[TarificationPanel] Compute error:', err);
    }
  }, [compute, cotation.id, mode, entries]);

  // Use computeResult from hook as fallback
  const displayResult = localResult || computeResult;

  // Save
  const handleSave = useCallback(async () => {
    try {
      await save({
        cotationId: cotation.id,
        data: { mode, entries, validity_date: validityDate || null },
      });
      setHasChanges(false);
      onSaved?.();
    } catch (err) {
      console.error('[TarificationPanel] Save error:', err);
    }
  }, [save, cotation.id, mode, entries, validityDate, onSaved]);

  // Auto-compute when entries change (debounced)
  useEffect(() => {
    if (entries.length === 0) return;
    // Check entries have at least one price > 0
    const hasPrice = entries.some((e) => {
      if ('selling_price' in e) return (e as RangeWebEntry).selling_price > 0;
      if ('price_per_person' in e) return (e as PerPersonEntry).price_per_person > 0;
      if ('group_price' in e) return (e as PerGroupEntry).group_price > 0;
      if ('unit_price' in e) return (e as EnumerationEntry).unit_price > 0;
      return false;
    });
    if (!hasPrice) return;

    const timer = setTimeout(() => {
      handleCompute();
    }, 600);
    return () => clearTimeout(timer);
  }, [entries, mode, handleCompute]);

  // Auto-save when entries change (debounced, longer delay)
  useEffect(() => {
    if (!hasChanges || entries.length === 0) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [hasChanges, entries, mode, handleSave]);

  // Sync pax switcher selection with result line selection
  const handlePaxSelect = useCallback((pax: number) => {
    setSelectedPaxValue(pax);
    // Find the result line that matches this pax value
    if (displayResult) {
      const lineIdx = displayResult.lines.findIndex(l => l.paying_pax === pax || l.pax === pax);
      if (lineIdx >= 0) {
        setSelectedLineIdx(lineIdx);
      }
    }
  }, [displayResult]);

  // Determine active line for HeroCard
  const isRange = mode === 'range_web';
  // In range_web mode, hide right column (HeroCard + MarginSummary) for online/custom/template trips
  // GIR trips benefit from the right column (fixed tariff, margin evolves with inscriptions)
  const showRightColumn = !isRange || tripType === 'gir';
  const activeIdx = isRange ? (selectedLineIdx ?? 0) : null;
  const activeLine = displayResult && displayResult.lines.length > 0
    ? (activeIdx != null ? displayResult.lines[activeIdx] : null)
    : null;

  // For non-range modes, use first line (keeps paying_pax/price_per_person)
  // or totals if multiple lines
  const heroLine = isRange
    ? activeLine
    : displayResult
      ? (displayResult.lines.length === 1 ? displayResult.lines[0] : displayResult.totals)
      : null;

  const hasResults = !!cotation.results_json;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-display font-medium text-gray-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Tarification — {cotation.name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {saving && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Sauvegarde...</span>
            </>
          )}
          {!saving && !hasChanges && entries.length > 0 && (
            <>
              <Save className="w-3 h-3" />
              <span>Sauvegardé</span>
            </>
          )}
        </div>
      </div>

      {/* Condition labels — read-only summary of cotation conditions */}
      {conditionLabels && conditionLabels.length > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2">
          {conditionLabels.map((cond, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-gray-600"
            >
              <span className="text-gray-400">{cond.name} :</span>
              <span className="font-medium text-gray-700">{cond.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Validity date alert banner */}
      {(() => {
        if (!validityDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(validityDate + 'T00:00:00');
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          return (
            <div className="mx-4 mt-3 flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-700">
                <span className="font-semibold">Tarif expiré</span> depuis le {new Date(validityDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                {' '}Attention : le tarif proposé par votre agence locale n&apos;est plus valide. Recontactez le client pour mettre à jour votre tarif.
              </div>
            </div>
          );
        }
        if (diffDays <= 14) {
          return (
            <div className="mx-4 mt-3 flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700">
                <span className="font-semibold">Tarif valide encore {diffDays} jour{diffDays > 1 ? 's' : ''}</span> (jusqu&apos;au {new Date(validityDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}).
                {' '}Attention : le tarif proposé par votre agence locale n&apos;est bientôt plus valide. Recontactez le client prochainement pour confirmer son circuit, ou mettre à jour le tarif.
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="p-4 space-y-4">
        {/* Validity date picker — optional */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Validité du tarif</span>
          </div>
          <input
            type="date"
            value={validityDate}
            onChange={(e) => { setValidityDate(e.target.value); setHasChanges(true); }}
            className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="Optionnel"
          />
          {validityDate && (
            <button
              onClick={() => { setValidityDate(''); setHasChanges(true); }}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
              title="Retirer la date de validité"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mode selector — compact */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MODE_LABELS) as TarificationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                title={MODE_DESCRIPTIONS[m]}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-1.5 mt-2 p-2 bg-gray-50 rounded-lg">
            <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">{MODE_DESCRIPTIONS[mode]}</p>
          </div>
        </div>

        {/* Info banner when cotation not calculated */}
        {!hasResults && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700">
              <span className="font-semibold">Cotation non calculée</span> — Vous pouvez saisir les prix de vente ci-dessous.
              {' '}Le calcul des marges ne sera disponible qu&apos;après avoir lancé la cotation dans l&apos;onglet « Cotations ».
            </div>
          </div>
        )}

        {/* 2-column layout: editor (left) + hero card (right) — or full-width if right column hidden */}
        <div className={`grid ${showRightColumn && hasResults ? 'grid-cols-12' : 'grid-cols-1'} gap-6`}>
          {/* Left column — editor + results table */}
          <div className={`${showRightColumn && hasResults ? 'col-span-7' : ''} space-y-4`}>
            {/* PaxGroupSwitcher — only in range_web mode when results available */}
            {hasResults && isRange && paxValues.length > 0 && (
              <PaxGroupSwitcher
                paxValues={paxValues}
                selectedPax={selectedPaxValue}
                onSelect={handlePaxSelect}
                costPerPerson={costPerPerson}
                currency={currency}
              />
            )}

            {/* Mode editor */}
            <div className="bg-gray-50 rounded-lg p-4">
              {mode === 'range_web' && (
                <RangeWebEditor
                  entries={entries}
                  onChange={handleEntriesChange}
                  paxConfigs={paxConfigs}
                  currency={currency}
                />
              )}
              {mode === 'per_person' && (
                <PerPersonEditor
                  entries={entries}
                  onChange={handleEntriesChange}
                  paxConfigs={paxConfigs}
                  currency={currency}
                />
              )}
              {mode === 'per_group' && (
                <PerGroupEditor
                  entries={entries}
                  onChange={handleEntriesChange}
                  paxConfigs={paxConfigs}
                  currency={currency}
                />
              )}
              {mode === 'service_list' && (
                <ServiceListEditor
                  entries={entries}
                  onChange={handleEntriesChange}
                  paxConfigs={paxConfigs}
                  currency={currency}
                />
              )}
              {mode === 'enumeration' && (
                <EnumerationEditor
                  entries={entries}
                  onChange={handleEntriesChange}
                  paxConfigs={paxConfigs}
                  currency={currency}
                />
              )}
            </div>

            {/* Compute button + results — only when cotation has been calculated */}
            {hasResults && (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCompute}
                    disabled={computing || entries.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {computing
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Calculator className="w-4 h-4" />
                    }
                    Calculer les marges
                  </button>
                  {computing && (
                    <span className="text-xs text-gray-400">Calcul en cours...</span>
                  )}
                </div>

                {/* Results table */}
                {displayResult && displayResult.lines.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      {isRange ? 'Analyse par scénario' : 'Détail par ligne'}
                    </h4>
                    {isRange && (
                      <p className="text-xs text-gray-400 mb-2">
                        Cliquez sur un scénario pour voir le détail de la marge
                      </p>
                    )}
                    <MarginResultsTable
                      result={displayResult}
                      currency={currency}
                      isRangeMode={isRange}
                      selectedLineIdx={activeIdx}
                      onLineSelect={isRange ? (idx: number) => {
                        setSelectedLineIdx(idx);
                        // Sync pax switcher
                        const line = displayResult.lines[idx];
                        if (line && (line.paying_pax || line.pax)) {
                          setSelectedPaxValue(line.paying_pax || line.pax || null);
                        }
                      } : undefined}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column — hero price + summary (only when results available) */}
          {showRightColumn && hasResults && (
            <div className="col-span-5 space-y-4">
              <PriceHeroCard
                line={heroLine ?? null}
                currency={currency}
                paxLabel={
                  isRange && activeLine
                    ? `${activeLine.paying_pax || '?'} participant${(activeLine.paying_pax || 0) > 1 ? 's' : ''}`
                    : undefined
                }
                argsLabel={
                  isRange && activeLine
                    ? activeLine.label || undefined
                    : undefined
                }
              />

              {/* Summary — adapts to mode */}
              {displayResult && displayResult.lines.length > 0 && (
                <>
                  {isRange && activeLine ? (
                    <MarginSummaryBlock
                      data={activeLine}
                      currency={currency}
                      localCurrency={localCurrency}
                      exchangeRate={exchangeRate}
                      title={`Marge nette — ${activeLine.label || 'Scénario'}`}
                      subtitle={`Pour ${activeLine.paying_pax || '?'} participant${(activeLine.paying_pax || 0) > 1 ? 's' : ''}`}
                    />
                  ) : !isRange ? (
                    <MarginSummaryBlock
                      data={displayResult.totals}
                      currency={currency}
                      localCurrency={localCurrency}
                      exchangeRate={exchangeRate}
                    />
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {/* Client Publication Section — visible when tarification has entries */}
        {entries.length > 0 && (
          <ClientPublicationSection
            cotation={cotation}
            currency={currency}
            selectedCotationId={selectedCotationId}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
