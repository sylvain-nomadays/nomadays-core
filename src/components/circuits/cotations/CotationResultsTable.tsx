'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  ChevronDown, ChevronRight, Calendar, Layers,
  AlertTriangle, AlertCircle, Info, Ban, DollarSign, RefreshCw,
} from 'lucide-react';
import type {
  CotationResults,
  CotationPaxResult,
  CotationDayDetail,
  CotationFormulaDetail,
  CotationItemDetail,
} from '@/lib/api/types';


// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

type CurrencyTotal = { currency: string; total: number };

/** Item enriched with its parent day number (for ByType breakdown) */
type ItemWithDay = CotationItemDetail & { day_number?: number; is_transversal?: boolean };

/** Currency code → display symbol */
function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'EUR': return '\u20ac';     // €
    case 'USD': return '$';
    case 'THB': return '\u0e3f';     // ฿
    case 'VND': return '\u20ab';     // ₫
    case 'GBP': return '\u00a3';     // £
    case 'JPY': return '\u00a5';     // ¥
    case 'KHR': return '\u17db';     // ៛
    case 'LAK': return '\u20ad';     // ₭
    case 'MMK': return 'K';
    case 'IDR': return 'Rp';
    case 'MYR': return 'RM';
    case 'PHP': return '\u20b1';     // ₱
    default: return currency;
  }
}

/** Group items by item_currency and sum subtotal_cost_local per currency */
function aggregateByCurrency(items: CotationItemDetail[]): CurrencyTotal[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const cur = item.item_currency || 'EUR';
    map[cur] = (map[cur] || 0) + item.subtotal_cost_local;
  }
  return Object.entries(map)
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

/** Format multi-currency totals: "45 000 ฿ + 320 $" */
function formatCurrencyTotals(
  totals: CurrencyTotal[],
  fmtAmount: (n: number) => string,
): string {
  if (totals.length === 0) return '—';
  return totals
    .map(({ currency, total }) => `${fmtAmount(total)} ${getCurrencySymbol(currency)}`)
    .join(' + ');
}

/** Flatten all items from a day's formulas */
function collectDayItems(day: CotationDayDetail): CotationItemDetail[] {
  return day.formulas.flatMap(f => f.items);
}

/** Collect all items by cost nature code, annotated with day_number */
function collectItemsByNatureWithDay(
  config: CotationPaxResult,
  natureCode: string,
): ItemWithDay[] {
  const result: ItemWithDay[] = [];
  for (const day of config.days) {
    for (const formula of day.formulas) {
      for (const item of formula.items) {
        if ((item.cost_nature_code || 'MIS') === natureCode) {
          result.push({ ...item, day_number: day.day_number });
        }
      }
    }
  }
  for (const formula of config.transversal_formulas || []) {
    for (const item of formula.items) {
      if ((item.cost_nature_code || 'MIS') === natureCode) {
        result.push({ ...item, is_transversal: true });
      }
    }
  }
  return result;
}

// --- Nature helpers (shared) ---

function getNatureLabel(code: string): string {
  switch (code) {
    case 'HTL': return 'Hébergement';
    case 'GDE': return 'Guide';
    case 'TRS': return 'Transport';
    case 'ACT': return 'Activité';
    case 'RES': return 'Restauration';
    default: return 'Divers';
  }
}

function getNatureBadgeColor(code: string): string {
  switch (code) {
    case 'HTL': return 'text-blue-600 bg-blue-50';
    case 'GDE': return 'text-purple-600 bg-purple-50';
    case 'TRS': return 'text-orange-600 bg-orange-50';
    case 'ACT': return 'text-emerald-600 bg-emerald-50';
    case 'RES': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function getNatureDotColor(code: string): string {
  switch (code) {
    case 'HTL': return 'bg-blue-500';
    case 'GDE': return 'bg-purple-500';
    case 'TRS': return 'bg-orange-500';
    case 'ACT': return 'bg-emerald-500';
    case 'RES': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CotationResultsTableProps {
  results: CotationResults;
  currency: string;
}

type ViewMode = 'summary' | 'by-day' | 'by-type';

export default function CotationResultsTable({
  results,
  currency,
}: CotationResultsTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const currencySymbol = getCurrencySymbol(currency);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!results.pax_configs || results.pax_configs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">Aucun résultat disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('summary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
            viewMode === 'summary'
              ? 'bg-white text-emerald-700 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Résumé
        </button>
        <button
          onClick={() => setViewMode('by-day')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
            viewMode === 'by-day'
              ? 'bg-white text-emerald-700 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Par jour
        </button>
        <button
          onClick={() => setViewMode('by-type')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
            viewMode === 'by-type'
              ? 'bg-white text-emerald-700 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
          Par unité
        </button>
      </div>

      {/* Summary table */}
      {viewMode === 'summary' && (
        <SummaryView
          paxConfigs={results.pax_configs}
          currencySymbol={currencySymbol}
          sellingCurrency={currency}
          formatAmount={formatAmount}
          expandedRow={expandedRow}
          onToggleExpand={(idx) => setExpandedRow(expandedRow === idx ? null : idx)}
        />
      )}

      {/* By day view */}
      {viewMode === 'by-day' && (
        <ByDayView
          paxConfigs={results.pax_configs}
          currencySymbol={currencySymbol}
          sellingCurrency={currency}
          formatAmount={formatAmount}
        />
      )}

      {/* By type view */}
      {viewMode === 'by-type' && (
        <ByTypeView
          paxConfigs={results.pax_configs}
          currencySymbol={currencySymbol}
          sellingCurrency={currency}
          formatAmount={formatAmount}
        />
      )}

      {/* Smart Alerts */}
      <CotationAlerts results={results} />
    </div>
  );
}


// ---------------------------------------------------------------------------
// Summary View (main table)
// ---------------------------------------------------------------------------

function SummaryView({
  paxConfigs,
  currencySymbol,
  sellingCurrency,
  formatAmount,
  expandedRow,
  onToggleExpand,
}: {
  paxConfigs: CotationPaxResult[];
  currencySymbol: string;
  sellingCurrency: string;
  formatAmount: (n: number) => string;
  expandedRow: number | null;
  onToggleExpand: (idx: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-8"></th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Nom</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Args</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Marge par défaut</th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500" colSpan={3}>
              <div className="text-center">Total</div>
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500" colSpan={2}>
              <div className="text-center">Par personne</div>
            </th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-1" colSpan={4}></th>
            <th className="px-3 py-1 text-right text-xs text-gray-400">Coût</th>
            <th className="px-3 py-1 text-right text-xs text-gray-400">Prix</th>
            <th className="px-3 py-1 text-right text-xs text-gray-400">Profit</th>
            <th className="px-3 py-1 text-right text-xs text-gray-400">Coût</th>
            <th className="px-3 py-1 text-right text-xs text-gray-400">Prix</th>
          </tr>
        </thead>
        <tbody>
          {paxConfigs.map((config, idx) => (
            <Fragment key={idx}>
              <tr
                onClick={() => onToggleExpand(idx)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5 text-gray-400">
                  {expandedRow === idx
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />
                  }
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900">{config.label}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{config.args_label}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="text-gray-500">{config.margin_default}%</span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                  {formatAmount(config.total_cost)} {currencySymbol}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-400">({Math.round(config.margin_pct)}%)</span>
                  {' '}
                  <span className="font-medium">{formatAmount(config.total_price)} {currencySymbol}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-400">({Math.round(config.margin_pct)}%)</span>
                  {' '}
                  <span className="font-medium text-emerald-600">{formatAmount(config.total_profit)} {currencySymbol}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {formatAmount(config.cost_per_person)} {currencySymbol}
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                  {formatAmount(config.price_per_person)} {currencySymbol}
                </td>
              </tr>
              {expandedRow === idx && (
                <tr>
                  <td colSpan={9} className="px-4 py-3 bg-gray-50">
                    <ExpandedPaxDetail config={config} currencySymbol={currencySymbol} sellingCurrency={sellingCurrency} formatAmount={formatAmount} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Expanded detail for a pax row (Summary view)
// ---------------------------------------------------------------------------

function ExpandedPaxDetail({
  config,
  currencySymbol,
  sellingCurrency,
  formatAmount,
}: {
  config: CotationPaxResult;
  currencySymbol: string;
  sellingCurrency: string;
  formatAmount: (n: number) => string;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const toggleDay = (dayNumber: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {/* Transversal formulas */}
      {config.transversal_formulas && config.transversal_formulas.length > 0 && (
        <>
          <div
            className="flex items-center justify-between text-xs py-1.5 cursor-pointer hover:bg-purple-50/50 rounded px-1 -mx-1 transition-colors"
            onClick={() => toggleDay(-1)}
          >
            <div className="flex items-center gap-1.5">
              {expandedDays.has(-1)
                ? <ChevronDown className="w-3 h-3 text-purple-400 flex-shrink-0" />
                : <ChevronRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
              }
              <span className="font-medium text-purple-700">↔ Services transversaux</span>
              <span className="text-purple-400 text-[11px] ml-1">
                {formatCurrencyTotals(
                  aggregateByCurrency(
                    (config.transversal_formulas || []).flatMap(f => f.items)
                  ),
                  formatAmount,
                )}
              </span>
            </div>
            <span className="text-gray-600">
              {formatAmount((config.transversal_formulas || []).reduce((s, f) => s + f.total_cost, 0))} {currencySymbol}
            </span>
          </div>
          {expandedDays.has(-1) && (
            <div className="ml-4 mb-2">
              <ItemsBreakdownTable
                items={(config.transversal_formulas || []).flatMap(f => f.items)}
                sellingCurrency={sellingCurrency}
                currencySymbol={currencySymbol}
                formatAmount={formatAmount}
              />
            </div>
          )}
        </>
      )}

      {/* Day breakdown */}
      {config.days.map(day => {
        const dayItems = collectDayItems(day);
        const localTotals = aggregateByCurrency(dayItems);
        const isExpanded = expandedDays.has(day.day_number);

        return (
          <Fragment key={day.day_id}>
            <div
              className="flex items-center justify-between text-xs py-1.5 cursor-pointer hover:bg-gray-100/50 rounded px-1 -mx-1 transition-colors"
              onClick={() => toggleDay(day.day_number)}
            >
              <div className="flex items-center gap-1.5">
                {isExpanded
                  ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                }
                <span className="font-medium text-gray-700">J{day.day_number}</span>
                {localTotals.length > 0 && (
                  <span className="text-gray-400 text-[11px] ml-1">
                    {formatCurrencyTotals(localTotals, formatAmount)}
                  </span>
                )}
              </div>
              <span className="text-gray-600">{formatAmount(day.total_cost)} {currencySymbol}</span>
            </div>
            {isExpanded && (
              <div className="ml-4 mb-2">
                <ItemsBreakdownTable
                  items={dayItems}
                  sellingCurrency={sellingCurrency}
                  currencySymbol={currencySymbol}
                  formatAmount={formatAmount}
                />
              </div>
            )}
          </Fragment>
        );
      })}

      {/* Cost nature breakdown */}
      <div className="pt-2 border-t border-gray-200 mt-2">
        <p className="text-xs font-medium text-gray-500 mb-1">Par type de coût :</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(
            [...(config.days.flatMap(d => d.formulas.flatMap(f => f.items))),
             ...(config.transversal_formulas?.flatMap(f => f.items) || [])]
              .reduce<Record<string, number>>((acc, item) => {
                const code = item.cost_nature_code || 'MIS';
                acc[code] = (acc[code] || 0) + item.subtotal_cost;
                return acc;
              }, {})
          ).map(([code, total]) => (
            <div key={code} className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${getNatureDotColor(code)}`} />
              <span className="text-gray-600">{code}</span>
              <span className="font-medium">{formatAmount(total)} {currencySymbol}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// By Day View — with collapsible item breakdown
// ---------------------------------------------------------------------------

function ByDayView({
  paxConfigs,
  currencySymbol,
  sellingCurrency,
  formatAmount,
}: {
  paxConfigs: CotationPaxResult[];
  currencySymbol: string;
  sellingCurrency: string;
  formatAmount: (n: number) => string;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  if (paxConfigs.length === 0) return null;

  const firstConfig = paxConfigs[0]!;

  const toggleDay = (dayNumber: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  const colCount = 1 + paxConfigs.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-gray-500 font-medium min-w-[260px]">Jour</th>
            {paxConfigs.map((config, idx) => (
              <th key={idx} className="px-3 py-2 text-right text-gray-500 font-medium min-w-[90px]">
                {config.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Transversal services */}
          {firstConfig.transversal_formulas && firstConfig.transversal_formulas.length > 0 && (
            <Fragment>
              <tr
                className="border-b border-gray-100 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => toggleDay(-1)}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {expandedDays.has(-1)
                      ? <ChevronDown className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    }
                    <span className="font-medium text-purple-700">↔ Services transversaux</span>
                    <span className="text-purple-400 text-[11px] ml-1">
                      {formatCurrencyTotals(
                        aggregateByCurrency(
                          (firstConfig.transversal_formulas || []).flatMap(f => f.items)
                        ),
                        formatAmount,
                      )}
                    </span>
                  </div>
                </td>
                {paxConfigs.map((config, idx) => {
                  const total = (config.transversal_formulas || []).reduce((s, f) => s + f.total_cost, 0);
                  return (
                    <td key={idx} className="px-3 py-2 text-right font-medium text-purple-700">
                      {formatAmount(total)} {currencySymbol}
                    </td>
                  );
                })}
              </tr>
              {expandedDays.has(-1) && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-3 bg-purple-50/50 border-b border-gray-100">
                    <ItemsBreakdownTable
                      items={(firstConfig.transversal_formulas || []).flatMap(f => f.items)}
                      sellingCurrency={sellingCurrency}
                      currencySymbol={currencySymbol}
                      formatAmount={formatAmount}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          )}

          {/* Day rows */}
          {firstConfig.days.map((day, dayIdx) => {
            const dayItems = collectDayItems(firstConfig.days[dayIdx]!);
            const localTotals = aggregateByCurrency(dayItems);
            const isExpanded = expandedDays.has(day.day_number);

            return (
              <Fragment key={day.day_id}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleDay(day.day_number)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      }
                      <span className="font-medium text-gray-700">J{day.day_number}</span>
                      {localTotals.length > 0 && (
                        <span className="text-gray-400 text-[11px] ml-1">
                          {formatCurrencyTotals(localTotals, formatAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  {paxConfigs.map((config, idx) => (
                    <td key={idx} className="px-3 py-2 text-right text-gray-700">
                      {formatAmount(config.days[dayIdx]?.total_cost || 0)} {currencySymbol}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                      <ItemsBreakdownTable
                        items={dayItems}
                        sellingCurrency={sellingCurrency}
                        currencySymbol={currencySymbol}
                        formatAmount={formatAmount}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}

          {/* Totals */}
          <tr className="bg-gray-50 border-t-2 border-gray-300 font-medium">
            <td className="px-3 py-2 text-gray-700">Total coût</td>
            {paxConfigs.map((config, idx) => (
              <td key={idx} className="px-3 py-2 text-right text-gray-900">
                {formatAmount(config.total_cost)} {currencySymbol}
              </td>
            ))}
          </tr>
          <tr className="bg-emerald-50 font-medium">
            <td className="px-3 py-2 text-emerald-700">Prix de vente</td>
            {paxConfigs.map((config, idx) => (
              <td key={idx} className="px-3 py-2 text-right text-emerald-700">
                {formatAmount(config.total_price)} {currencySymbol}
              </td>
            ))}
          </tr>
          <tr className="font-medium">
            <td className="px-3 py-2 text-gray-600">Par personne</td>
            {paxConfigs.map((config, idx) => (
              <td key={idx} className="px-3 py-2 text-right text-gray-900">
                {formatAmount(config.price_per_person)} {currencySymbol}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ---------------------------------------------------------------------------
// By Type View — with collapsible item breakdown
// ---------------------------------------------------------------------------

function ByTypeView({
  paxConfigs,
  currencySymbol,
  sellingCurrency,
  formatAmount,
}: {
  paxConfigs: CotationPaxResult[];
  currencySymbol: string;
  sellingCurrency: string;
  formatAmount: (n: number) => string;
}) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  if (paxConfigs.length === 0) return null;

  const firstPax = paxConfigs[0]!;

  const toggleType = (code: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Collect all cost nature codes
  const allItems = firstPax.days.flatMap(d => d.formulas.flatMap(f => f.items));
  const transversalItems = firstPax.transversal_formulas?.flatMap(f => f.items) || [];
  const allCombined = [...allItems, ...transversalItems];
  const natureCodesSet = new Set(allCombined.map(i => i.cost_nature_code || 'MIS'));
  const natureCodes = ['HTL', 'GDE', 'TRS', 'ACT', 'RES', 'MIS'].filter(c => natureCodesSet.has(c));

  const colCount = 1 + paxConfigs.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-gray-500 font-medium min-w-[260px]">Type de coût</th>
            {paxConfigs.map((config, idx) => (
              <th key={idx} className="px-3 py-2 text-right text-gray-500 font-medium min-w-[90px]">
                {config.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {natureCodes.map(code => {
            const isExpanded = expandedTypes.has(code);
            const itemsWithDay = collectItemsByNatureWithDay(firstPax, code);
            const localTotals = aggregateByCurrency(itemsWithDay);

            return (
              <Fragment key={code}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleType(code)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      }
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${getNatureBadgeColor(code)}`}>
                        {getNatureLabel(code)}
                      </span>
                      {localTotals.length > 0 && (
                        <span className="text-gray-400 text-[11px] ml-1">
                          {formatCurrencyTotals(localTotals, formatAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  {paxConfigs.map((config, idx) => {
                    const dayItems = config.days.flatMap(d => d.formulas.flatMap(f => f.items));
                    const tItems = config.transversal_formulas?.flatMap(f => f.items) || [];
                    const total = [...dayItems, ...tItems]
                      .filter(i => (i.cost_nature_code || 'MIS') === code)
                      .reduce((s, i) => s + i.subtotal_cost, 0);
                    return (
                      <td key={idx} className="px-3 py-2 text-right text-gray-700">
                        {formatAmount(total)} {currencySymbol}
                      </td>
                    );
                  })}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                      <TypeItemsBreakdownTable
                        items={itemsWithDay}
                        sellingCurrency={sellingCurrency}
                        currencySymbol={currencySymbol}
                        formatAmount={formatAmount}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}

          {/* Totals */}
          <tr className="bg-gray-50 border-t-2 border-gray-300 font-medium">
            <td className="px-3 py-2 text-gray-700">Total coût</td>
            {paxConfigs.map((config, idx) => (
              <td key={idx} className="px-3 py-2 text-right text-gray-900">
                {formatAmount(config.total_cost)} {currencySymbol}
              </td>
            ))}
          </tr>
          <tr className="bg-emerald-50 font-medium">
            <td className="px-3 py-2 text-emerald-700">Prix de vente</td>
            {paxConfigs.map((config, idx) => (
              <td key={idx} className="px-3 py-2 text-right text-emerald-700">
                {formatAmount(config.total_price)} {currencySymbol}
              </td>
            ))}
          </tr>
          <tr className="font-medium">
            <td className="px-3 py-2 text-gray-600">Par personne</td>
            {paxConfigs.map((config, idx) => (
              <td key={idx} className="px-3 py-2 text-right text-gray-900">
                {formatAmount(config.price_per_person)} {currencySymbol}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Shared item breakdown table (used by ByDay)
// ---------------------------------------------------------------------------

function ItemsBreakdownTable({
  items,
  sellingCurrency,
  currencySymbol,
  formatAmount,
}: {
  items: CotationItemDetail[];
  sellingCurrency: string;
  currencySymbol: string;
  formatAmount: (n: number) => string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-400 italic">Aucun item</p>;
  }

  const totalSelling = items.reduce((s, i) => s + i.subtotal_cost, 0);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400">
          <th className="text-left py-1 pr-3 font-normal">Item</th>
          <th className="text-left py-1 pr-3 font-normal">Type</th>
          <th className="text-right py-1 pr-3 font-normal">Qté</th>
          <th className="text-right py-1 pr-3 font-normal">P.U. local</th>
          <th className="text-right py-1 pr-3 font-normal">Sous-total local</th>
          <th className="text-right py-1 font-normal">Sous-total {currencySymbol}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={`${item.item_id}-${i}`} className="border-t border-gray-100">
            <td className="py-1.5 pr-3 text-gray-700">{item.item_name}</td>
            <td className="py-1.5 pr-3">
              <span className="inline-flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getNatureDotColor(item.cost_nature_code)}`} />
                <span className="text-gray-500">{item.cost_nature_code || 'MIS'}</span>
              </span>
            </td>
            <td className="py-1.5 pr-3 text-right text-gray-600">{item.quantity}</td>
            <td className="py-1.5 pr-3 text-right text-gray-600">
              {formatAmount(item.unit_cost_local)} {getCurrencySymbol(item.item_currency)}
            </td>
            <td className="py-1.5 pr-3 text-right font-medium text-gray-700">
              {formatAmount(item.subtotal_cost_local)} {getCurrencySymbol(item.item_currency)}
            </td>
            <td className="py-1.5 text-right text-gray-500">
              {item.item_currency !== sellingCurrency
                ? `${formatAmount(item.subtotal_cost)} ${currencySymbol}`
                : '—'
              }
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-200">
          <td colSpan={4} className="py-1.5 text-right text-gray-500 font-medium">
            Total :
          </td>
          <td className="py-1.5 pr-3 text-right font-medium text-gray-700">
            {formatCurrencyTotals(aggregateByCurrency(items), formatAmount)}
          </td>
          <td className="py-1.5 text-right font-medium text-gray-700">
            {formatAmount(totalSelling)} {currencySymbol}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}


// ---------------------------------------------------------------------------
// Type items breakdown table (used by ByType) — includes Jour column
// ---------------------------------------------------------------------------

function TypeItemsBreakdownTable({
  items,
  sellingCurrency,
  currencySymbol,
  formatAmount,
}: {
  items: ItemWithDay[];
  sellingCurrency: string;
  currencySymbol: string;
  formatAmount: (n: number) => string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-400 italic">Aucun item de ce type</p>;
  }

  const totalSelling = items.reduce((s, i) => s + i.subtotal_cost, 0);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400">
          <th className="text-left py-1 pr-3 font-normal w-10">Jour</th>
          <th className="text-left py-1 pr-3 font-normal">Item</th>
          <th className="text-right py-1 pr-3 font-normal">Qté</th>
          <th className="text-right py-1 pr-3 font-normal">P.U. local</th>
          <th className="text-right py-1 pr-3 font-normal">Sous-total local</th>
          <th className="text-right py-1 font-normal">Sous-total {currencySymbol}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={`${item.item_id}-${i}`} className="border-t border-gray-100">
            <td className="py-1.5 pr-3 text-gray-400">
              {item.is_transversal ? '↔' : `J${item.day_number}`}
            </td>
            <td className="py-1.5 pr-3 text-gray-700">{item.item_name}</td>
            <td className="py-1.5 pr-3 text-right text-gray-600">{item.quantity}</td>
            <td className="py-1.5 pr-3 text-right text-gray-600">
              {formatAmount(item.unit_cost_local)} {getCurrencySymbol(item.item_currency)}
            </td>
            <td className="py-1.5 pr-3 text-right font-medium text-gray-700">
              {formatAmount(item.subtotal_cost_local)} {getCurrencySymbol(item.item_currency)}
            </td>
            <td className="py-1.5 text-right text-gray-500">
              {item.item_currency !== sellingCurrency
                ? `${formatAmount(item.subtotal_cost)} ${currencySymbol}`
                : '—'
              }
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-200">
          <td colSpan={4} className="py-1.5 text-right text-gray-500 font-medium">
            Total :
          </td>
          <td className="py-1.5 pr-3 text-right font-medium text-gray-700">
            {formatCurrencyTotals(aggregateByCurrency(items), formatAmount)}
          </td>
          <td className="py-1.5 text-right font-medium text-gray-700">
            {formatAmount(totalSelling)} {currencySymbol}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}


// ---------------------------------------------------------------------------
// CotationAlerts — smart categorized alerts replacing basic warnings
// ---------------------------------------------------------------------------

type AlertSeverity = 'error' | 'warning' | 'info';

interface CotationAlert {
  severity: AlertSeverity;
  category: string;
  message: string;
  icon: typeof AlertCircle;
}

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; text: string; badge: string }> = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-800' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-800' },
  info:    { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-500',   badge: 'bg-gray-100 text-gray-600' },
};

function detectAlerts(results: CotationResults): CotationAlert[] {
  const alerts: CotationAlert[] = [];
  const firstConfig = results.pax_configs?.[0];
  if (!firstConfig) return alerts;

  // Collect all items from all days + transversal
  const allItems: CotationItemDetail[] = [
    ...firstConfig.days.flatMap(d => d.formulas.flatMap(f => f.items)),
    ...(firstConfig.transversal_formulas?.flatMap(f => f.items) || []),
  ];

  // 1. ERREUR — Taux de change manquants
  if (results.missing_exchange_rates?.length > 0) {
    alerts.push({
      severity: 'error',
      category: 'Taux de change',
      message: `Taux manquant pour : ${results.missing_exchange_rates.join(', ')}. Les coûts dans ces devises sont à 0.`,
      icon: DollarSign,
    });
  }

  // 2. WARNING — Items avec coût unitaire à 0 (tarif manquant)
  const zeroCostItems = allItems.filter(i => i.unit_cost_local === 0 && i.quantity > 0);
  if (zeroCostItems.length > 0) {
    const names = zeroCostItems.slice(0, 5).map(i => i.item_name);
    const suffix = zeroCostItems.length > 5 ? ` et ${zeroCostItems.length - 5} autre(s)` : '';
    alerts.push({
      severity: 'warning',
      category: 'Tarif manquant',
      message: `${zeroCostItems.length} item(s) sans tarif : ${names.join(', ')}${suffix}`,
      icon: AlertTriangle,
    });
  }

  // 3. WARNING — Items avec quantité 0 (ratio potentiellement mal configuré)
  const zeroQtyItems = allItems.filter(i => i.quantity === 0);
  if (zeroQtyItems.length > 0) {
    const names = zeroQtyItems.slice(0, 5).map(i => i.item_name);
    const suffix = zeroQtyItems.length > 5 ? ` et ${zeroQtyItems.length - 5} autre(s)` : '';
    alerts.push({
      severity: 'warning',
      category: 'Quantité nulle',
      message: `${zeroQtyItems.length} item(s) avec quantité 0 : ${names.join(', ')}${suffix}`,
      icon: AlertTriangle,
    });
  }

  // 4. WARNING — Backend warnings hors exclusions de conditions (erreurs de palier, ratio, etc.)
  const technicalWarnings = (results.warnings || []).filter(
    w => !w.includes('exclu (option') && !w.includes('exclu (condition')
  );
  for (const w of technicalWarnings) {
    alerts.push({
      severity: 'warning',
      category: 'Calcul',
      message: w,
      icon: AlertTriangle,
    });
  }

  // 5. INFO — Exclusions de conditions (comportement normal, juste informatif)
  const conditionExclusions = (results.warnings || []).filter(
    w => w.includes('exclu (option') || w.includes('exclu (condition')
  );
  if (conditionExclusions.length > 0) {
    alerts.push({
      severity: 'info',
      category: 'Conditions',
      message: `${conditionExclusions.length} item(s) exclus par les conditions sélectionnées`,
      icon: Ban,
    });
  }

  return alerts;
}

function CotationAlerts({ results }: { results: CotationResults }) {
  const [expanded, setExpanded] = useState(false);
  const alerts = useMemo(() => detectAlerts(results), [results]);

  if (alerts.length === 0) return null;

  const errors = alerts.filter(a => a.severity === 'error');
  const warnings = alerts.filter(a => a.severity === 'warning');
  const infos = alerts.filter(a => a.severity === 'info');

  // Show errors + warnings always; infos only when expanded
  const visibleAlerts = expanded ? alerts : [...errors, ...warnings];
  const hiddenCount = expanded ? 0 : infos.length;

  // Overall severity drives the container style
  const topSeverity: AlertSeverity = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info';
  const style = SEVERITY_STYLES[topSeverity];

  return (
    <div className={`mt-3 rounded-lg border ${style.border} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${style.bg}`}>
        <div className="flex items-center gap-2">
          {topSeverity === 'error' && <AlertCircle className={`w-4 h-4 ${style.text}`} />}
          {topSeverity === 'warning' && <AlertTriangle className={`w-4 h-4 ${style.text}`} />}
          {topSeverity === 'info' && <Info className={`w-4 h-4 ${style.text}`} />}
          <span className={`text-xs font-semibold ${style.text}`}>
            {errors.length > 0 && <span className="inline-flex items-center gap-1 mr-2"><span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">{errors.length}</span></span>}
            {warnings.length > 0 && <span className="inline-flex items-center gap-1 mr-2"><span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">{warnings.length}</span></span>}
            {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
          </span>
        </div>
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            +{hiddenCount} info{hiddenCount > 1 ? 's' : ''}
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
        {expanded && infos.length > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            Réduire
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Alert lines */}
      <div className="px-3 py-2 space-y-1.5">
        {visibleAlerts.map((alert, i) => {
          const s = SEVERITY_STYLES[alert.severity];
          const Icon = alert.icon;
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${s.text}`} />
              <div className="flex-1">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${s.badge}`}>
                  {alert.category}
                </span>
                <span className={`${alert.severity === 'info' ? 'text-gray-500' : 'text-gray-700'}`}>
                  {alert.message}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
