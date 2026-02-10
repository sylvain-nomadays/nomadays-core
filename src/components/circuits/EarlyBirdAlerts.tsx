'use client';

import { useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import type { Trip, Item, EarlyBirdDiscount, Accommodation } from '@/lib/api/types';

// ============================================================================
// Types
// ============================================================================

interface EarlyBirdAlert {
  type: 'expired' | 'warning_15' | 'warning_30' | 'active';
  accommodationName: string;
  discountName: string;
  discountPercent: number;
  daysInAdvance: number;
  daysRemaining: number;
  itemName?: string;
}

interface EarlyBirdAlertsProps {
  tripStartDate?: string;        // Date de début du voyage (YYYY-MM-DD)
  proposalDate?: string;         // Date de proposition (si différente d'aujourd'hui)
  items: Item[];                 // Les prestations du circuit
  accommodations: Map<number, { accommodation: Accommodation; discounts: EarlyBirdDiscount[] }>;
  compact?: boolean;             // Affichage compact ou détaillé
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysRemaining(targetDate: string, fromDate?: string): number {
  const from = fromDate ? new Date(fromDate) : new Date();
  const target = new Date(targetDate);

  // Réinitialiser les heures pour comparer uniquement les jours
  from.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - from.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getAlertType(daysRemaining: number, discountDaysInAdvance: number): EarlyBirdAlert['type'] {
  if (daysRemaining < discountDaysInAdvance) {
    return 'expired';
  }

  const margin = daysRemaining - discountDaysInAdvance;

  if (margin <= 15) {
    return 'warning_15';
  }
  if (margin <= 30) {
    return 'warning_30';
  }

  return 'active';
}

// ============================================================================
// Alert Badge Component
// ============================================================================

function AlertBadge({ alert }: { alert: EarlyBirdAlert }) {
  switch (alert.type) {
    case 'expired':
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-800">
              Early Bird expiré - {alert.accommodationName}
            </p>
            <p className="text-xs text-red-600">
              {alert.discountName} ({alert.discountPercent}%) - requis {alert.daysInAdvance}j avant, reste {alert.daysRemaining}j
            </p>
          </div>
        </div>
      );

    case 'warning_15':
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-orange-800">
              ⚠️ Urgent ! {alert.accommodationName}
            </p>
            <p className="text-xs text-orange-600">
              {alert.discountName} ({alert.discountPercent}%) - expire dans {alert.daysRemaining - alert.daysInAdvance}j
            </p>
          </div>
        </div>
      );

    case 'warning_30':
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Attention - {alert.accommodationName}
            </p>
            <p className="text-xs text-amber-600">
              {alert.discountName} ({alert.discountPercent}%) - expire dans {alert.daysRemaining - alert.daysInAdvance}j
            </p>
          </div>
        </div>
      );

    case 'active':
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-800">
              Early Bird actif - {alert.accommodationName}
            </p>
            <p className="text-xs text-emerald-600">
              {alert.discountName} ({alert.discountPercent}%) - marge de {alert.daysRemaining - alert.daysInAdvance}j
            </p>
          </div>
        </div>
      );
  }
}

// ============================================================================
// Compact Alert Badge (for inline display)
// ============================================================================

function CompactAlertBadge({ alert }: { alert: EarlyBirdAlert }) {
  switch (alert.type) {
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          <XCircle className="w-3 h-3" />
          Early Bird expiré
        </span>
      );

    case 'warning_15':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Expire dans {alert.daysRemaining - alert.daysInAdvance}j
        </span>
      );

    case 'warning_30':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
          <Clock className="w-3 h-3" />
          Expire dans {alert.daysRemaining - alert.daysInAdvance}j
        </span>
      );

    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
          <CheckCircle className="w-3 h-3" />
          -{alert.discountPercent}%
        </span>
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function EarlyBirdAlerts({
  tripStartDate,
  proposalDate,
  items,
  accommodations,
  compact = false,
}: EarlyBirdAlertsProps) {
  // Calculer toutes les alertes
  const alerts = useMemo(() => {
    if (!tripStartDate) return [];

    const result: EarlyBirdAlert[] = [];
    const daysRemaining = calculateDaysRemaining(tripStartDate, proposalDate);

    // Pour chaque item du circuit
    for (const item of items) {
      if (!item.supplier_id) continue;

      // Récupérer les données d'hébergement pour ce fournisseur
      const accData = accommodations.get(item.supplier_id);
      if (!accData) continue;

      const { accommodation, discounts } = accData;

      // Pour chaque discount Early Bird actif
      for (const discount of discounts) {
        if (!discount.is_active) continue;

        // TODO: Vérifier si la saison du voyage est exclue
        // Pour l'instant on ignore excluded_season_ids

        const alertType = getAlertType(daysRemaining, discount.days_in_advance);

        result.push({
          type: alertType,
          accommodationName: accommodation.name,
          discountName: discount.name,
          discountPercent: discount.discount_percent,
          daysInAdvance: discount.days_in_advance,
          daysRemaining,
          itemName: item.name,
        });
      }
    }

    // Trier: expired d'abord, puis warning_15, warning_30, et active en dernier
    const priority = { expired: 0, warning_15: 1, warning_30: 2, active: 3 };
    result.sort((a, b) => priority[a.type] - priority[b.type]);

    return result;
  }, [tripStartDate, proposalDate, items, accommodations]);

  // Filtrer pour n'afficher que les alertes importantes (pas 'active' sauf en mode détaillé)
  const visibleAlerts = useMemo(() => {
    if (compact) {
      return alerts.filter(a => a.type !== 'active');
    }
    return alerts;
  }, [alerts, compact]);

  if (visibleAlerts.length === 0) {
    if (!tripStartDate) {
      return null;
    }

    // Afficher un message si tout est OK
    if (!compact && alerts.some(a => a.type === 'active')) {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-emerald-700">
            Tous les Early Bird sont actifs pour ce circuit
          </p>
        </div>
      );
    }

    return null;
  }

  // Mode compact (inline)
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {visibleAlerts.map((alert, idx) => (
          <CompactAlertBadge key={idx} alert={alert} />
        ))}
      </div>
    );
  }

  // Mode détaillé (liste)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-700">Alertes Early Bird</h4>
        <span className="text-xs text-gray-500">
          ({calculateDaysRemaining(tripStartDate!, proposalDate)}j avant départ)
        </span>
      </div>

      <div className="space-y-2">
        {visibleAlerts.map((alert, idx) => (
          <AlertBadge key={idx} alert={alert} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { calculateDaysRemaining, getAlertType };
export type { EarlyBirdAlert, EarlyBirdAlertsProps };
