'use client';

import { useMemo } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Formula, Item, QuotationResult, MarginType, PaxConfig } from '@/lib/api/types';

interface PriceGridProps {
  formula: Formula;
  paxConfigs: PaxConfig[];
  marginPct: number;
  marginType: MarginType;
  currency: string;
  minMarginPct?: number;
  onPaxSelect?: (pax: number) => void;
  selectedPax?: number;
}

interface PaxQuotation extends QuotationResult {
  isValid: boolean;
  marginWarning: boolean;
}

export default function PriceGrid({
  formula,
  paxConfigs,
  marginPct,
  marginType,
  currency,
  minMarginPct = 20,
  onPaxSelect,
  selectedPax,
}: PriceGridProps) {
  // Calculate quotation for each pax config
  const quotations = useMemo(() => {
    return paxConfigs.map(config => {
      let totalCost = 0;

      formula.items?.forEach(item => {
        let itemCost = item.unit_cost * item.quantity;

        switch (item.ratio_rule) {
          case 'per_person':
            itemCost *= config.pax;
            break;
          case 'per_room':
            itemCost *= config.rooms;
            break;
          case 'per_vehicle':
            itemCost *= Math.ceil(config.pax / 4);
            break;
          case 'per_group':
            // No multiplication
            break;
        }

        totalCost += itemCost;
      });

      // Apply margin
      let sellingPrice: number;
      if (marginType === 'margin') {
        sellingPrice = totalCost / (1 - marginPct / 100);
      } else {
        sellingPrice = totalCost * (1 + marginPct / 100);
      }

      const pricePerPerson = sellingPrice / config.pax;
      const marginAmount = sellingPrice - totalCost;
      const actualMarginPct = (marginAmount / sellingPrice) * 100;

      const quotation: PaxQuotation = {
        formula_id: formula.id,
        pax: config.pax,
        rooms: config.rooms,
        total_cost: totalCost,
        total_selling: sellingPrice,
        margin_amount: marginAmount,
        margin_pct: actualMarginPct,
        price_per_person: pricePerPerson,
        currency,
        breakdown: [],
        isValid: totalCost > 0,
        marginWarning: actualMarginPct < minMarginPct,
      };

      return quotation;
    });
  }, [formula, paxConfigs, marginPct, marginType, currency, minMarginPct]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Grille tarifaire - {formula.name}</h3>
        <p className="text-sm text-gray-500 mt-1">
          Marge appliquée: {marginPct}% ({marginType === 'margin' ? 'sur PV' : 'markup'})
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">PAX</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Coût</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Marge</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">/ Pers.</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotations.map((q, index) => (
              <tr
                key={q.pax}
                onClick={() => onPaxSelect?.(q.pax)}
                className={`
                  ${onPaxSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
                  ${selectedPax === q.pax ? 'bg-emerald-50' : ''}
                `}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${selectedPax === q.pax ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}
                    `}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold">{q.pax}</span>
                      <span className="text-gray-500 text-sm ml-1">({q.rooms} chb)</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">
                  {formatCurrency(q.total_cost)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium
                    ${q.marginWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                  `}>
                    <TrendingUp className="w-3 h-3" />
                    {q.margin_pct.toFixed(1)}%
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(q.total_selling)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(q.price_per_person)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {q.marginWarning ? (
                    <span className="inline-flex items-center gap-1 text-amber-600" title="Marge inférieure au seuil">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600" title="OK">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {quotations.filter(q => q.marginWarning).length > 0 && (
              <span className="text-amber-600">
                ⚠️ {quotations.filter(q => q.marginWarning).length} config(s) sous le seuil de marge ({minMarginPct}%)
              </span>
            )}
          </span>
          <span className="text-gray-500">
            Prix de {formatCurrency(Math.min(...quotations.map(q => q.price_per_person)))}
            {' à '}
            {formatCurrency(Math.max(...quotations.map(q => q.price_per_person)))} / pers.
          </span>
        </div>
      </div>
    </div>
  );
}
