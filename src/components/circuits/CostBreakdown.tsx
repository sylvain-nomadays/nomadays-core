'use client';

import { useMemo } from 'react';
import { Bed, MapPin, Car, Activity, Users, Utensils, MoreHorizontal } from 'lucide-react';
import type { Formula, Item } from '@/lib/api/types';

interface CostBreakdownProps {
  formula: Formula;
  pax: number;
  rooms: number;
  currency: string;
}

interface CategoryBreakdown {
  code: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  items: Item[];
  totalCost: number;
  percentage: number;
}

const categoryConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  HTL: { icon: Bed, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  GDE: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  TRS: { icon: Car, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ACT: { icon: Activity, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  RES: { icon: Utensils, color: 'text-red-600', bgColor: 'bg-red-100' },
  MIS: { icon: MoreHorizontal, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export default function CostBreakdown({
  formula,
  pax,
  rooms,
  currency,
}: CostBreakdownProps) {
  const breakdown = useMemo(() => {
    const categories: Record<string, CategoryBreakdown> = {};
    let grandTotal = 0;

    formula.items?.forEach(item => {
      const code = item.cost_nature?.code || 'MIS';
      const name = item.cost_nature?.name || 'Divers';

      if (!categories[code]) {
        const config = categoryConfig[code] ?? categoryConfig.MIS;
        const safeConfig = config ?? { icon: MoreHorizontal, color: 'text-gray-600', bgColor: 'bg-gray-100' };
        categories[code] = {
          code,
          name,
          icon: safeConfig.icon,
          color: safeConfig.color,
          bgColor: safeConfig.bgColor,
          items: [],
          totalCost: 0,
          percentage: 0,
        };
      }

      // Calculate item cost with ratio
      let itemCost = item.unit_cost * item.quantity;
      switch (item.ratio_rule) {
        case 'per_person':
          itemCost *= pax;
          break;
        case 'per_room':
          itemCost *= rooms;
          break;
        case 'per_vehicle':
          itemCost *= Math.ceil(pax / 4);
          break;
        case 'per_group':
          // No multiplication
          break;
      }

      categories[code].items.push({ ...item, unit_cost: itemCost / item.quantity });
      categories[code].totalCost += itemCost;
      grandTotal += itemCost;
    });

    // Calculate percentages
    Object.values(categories).forEach(cat => {
      cat.percentage = grandTotal > 0 ? (cat.totalCost / grandTotal) * 100 : 0;
    });

    // Sort by total cost descending
    const sorted = Object.values(categories).sort((a, b) => b.totalCost - a.totalCost);

    return { categories: sorted, grandTotal };
  }, [formula, pax, rooms]);

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
        <h3 className="font-semibold text-gray-900">Répartition des coûts</h3>
        <p className="text-sm text-gray-500 mt-1">
          Pour {pax} PAX / {rooms} chambre{rooms > 1 ? 's' : ''}
        </p>
      </div>

      {/* Visual breakdown bar */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="h-4 rounded-full overflow-hidden flex">
          {breakdown.categories.map(cat => (
            <div
              key={cat.code}
              className={`${cat.bgColor} transition-all duration-300`}
              style={{ width: `${cat.percentage}%` }}
              title={`${cat.name}: ${cat.percentage.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {breakdown.categories.map(cat => (
            <div key={cat.code} className="flex items-center gap-1.5 text-xs">
              <div className={`w-3 h-3 rounded-full ${cat.bgColor}`} />
              <span className="text-gray-600">{cat.name}</span>
              <span className="font-medium">{cat.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category details */}
      <div className="divide-y divide-gray-100">
        {breakdown.categories.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.code} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${cat.bgColor} ${cat.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    <span className="text-gray-400 text-sm ml-2">({cat.items.length})</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(cat.totalCost)}</div>
                  <div className="text-xs text-gray-500">{cat.percentage.toFixed(1)}%</div>
                </div>
              </div>

              <div className="space-y-1 ml-10">
                {cat.items.map((item, idx) => {
                  let itemTotal = item.unit_cost * item.quantity;
                  switch (item.ratio_rule) {
                    case 'per_person':
                      itemTotal *= pax;
                      break;
                    case 'per_room':
                      itemTotal *= rooms;
                      break;
                    case 'per_vehicle':
                      itemTotal *= Math.ceil(pax / 4);
                      break;
                  }

                  return (
                    <div key={item.id || idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(itemTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Coût total</span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(breakdown.grandTotal)}
          </span>
        </div>
        <div className="text-sm text-gray-500 text-right mt-1">
          {formatCurrency(breakdown.grandTotal / pax)} / personne
        </div>
      </div>
    </div>
  );
}
