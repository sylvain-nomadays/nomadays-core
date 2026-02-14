'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  CircleDashed,
  BedDouble,
  Bus,
  Compass,
  UtensilsCrossed,
  UserCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useBookableItems } from '@/hooks/useBookings';
import type { BookableItem } from '@/hooks/useBookings';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

// ─── Status mapping ──────────────────────────────────────────────────────────

type SimplifiedStatus = 'not_booked' | 'pending' | 'confirmed' | 'problem';

function getSimplifiedStatus(item: BookableItem): SimplifiedStatus {
  if (!item.already_booked) return 'not_booked';
  if (item.booking_status === 'confirmed') return 'confirmed';
  if (item.booking_status === 'pending' || item.booking_status === 'sent') return 'pending';
  // declined, cancelled, modified, pending_cancellation
  return 'problem';
}

const STATUS_CONFIG: Record<SimplifiedStatus, {
  label: string;
  icon: typeof Clock;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  not_booked: {
    label: 'Non réservé',
    icon: CircleDashed,
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
    borderClass: 'border-gray-200',
  },
  pending: {
    label: 'En demande',
    icon: Clock,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  confirmed: {
    label: 'Confirmé',
    icon: CheckCircle,
    bgClass: 'bg-[#F4F7F3]',
    textClass: 'text-[#5A6E52]',
    borderClass: 'border-[#D3DFCF]',
  },
  problem: {
    label: 'Problème',
    icon: XCircle,
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
};

// ─── Category mapping ────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, {
  label: string;
  icon: typeof BedDouble;
  order: number;
}> = {
  HTL: { label: 'Hébergement', icon: BedDouble, order: 1 },
  TRS: { label: 'Transport', icon: Bus, order: 2 },
  ACT: { label: 'Activité', icon: Compass, order: 3 },
  RES: { label: 'Restauration', icon: UtensilsCrossed, order: 4 },
  GDE: { label: 'Guide / Équipe', icon: UserCheck, order: 5 },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface BookingStatusBoardProps {
  tripId: number;
}

export default function BookingStatusBoard({ tripId }: BookingStatusBoardProps) {
  const { bookableItems, isLoading, refetch } = useBookableItems(tripId);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [savingAlternative, setSavingAlternative] = useState<number | null>(null);

  // Group items by cost_nature_code (only known categories)
  const groupedItems = useMemo(() => {
    const groups: Record<string, BookableItem[]> = {};
    for (const item of bookableItems) {
      const code = item.cost_nature_code;
      if (!code || !CATEGORY_CONFIG[code]) continue;
      if (!groups[code]) groups[code] = [];
      groups[code].push(item);
    }
    return groups;
  }, [bookableItems]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<SimplifiedStatus, number> = {
      not_booked: 0,
      pending: 0,
      confirmed: 0,
      problem: 0,
    };
    for (const item of bookableItems) {
      const code = item.cost_nature_code;
      if (!code || !CATEGORY_CONFIG[code]) continue;
      counts[getSimplifiedStatus(item)]++;
    }
    return counts;
  }, [bookableItems]);

  const totalItems = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const toggleCategory = useCallback((code: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const handleSaveAlternative = useCallback(async (bookingId: number, value: string) => {
    setSavingAlternative(bookingId);
    try {
      await apiClient.patch(`/bookings/${bookingId}`, { logistics_alternative: value });
      toast.success('Alternative enregistrée');
      refetch();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingAlternative(null);
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#0FB6BC] animate-spin" />
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <CircleDashed className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">Aucune prestation à réserver pour ce circuit</p>
        <p className="text-xs text-gray-400 mt-1">
          Les items apparaissent ici dès qu&apos;un fournisseur est associé
        </p>
      </div>
    );
  }

  // Sort categories by order
  const sortedCategories = Object.entries(groupedItems)
    .sort(([a], [b]) => (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with status summary */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          État des réservations
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as SimplifiedStatus[]).map(status => {
            const config = STATUS_CONFIG[status];
            const count = statusCounts[status];
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.bgClass} ${config.textClass} ${config.borderClass}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {count} {config.label.toLowerCase()}{count > 1 ? 's' : ''}
              </span>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="divide-y divide-gray-100">
        {sortedCategories.map(([code, items]) => {
          const catConfig = CATEGORY_CONFIG[code];
          if (!catConfig) return null;
          const isCollapsed = collapsedCategories.has(code);
          const CatIcon = catConfig.icon;

          return (
            <div key={code}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(code)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
                <CatIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {catConfig.label}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  ({items.length})
                </span>
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="pb-1">
                  {items.map(item => (
                    <BookingItemRow
                      key={item.item_id}
                      item={item}
                      onSaveAlternative={handleSaveAlternative}
                      savingAlternative={savingAlternative}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Item Row ────────────────────────────────────────────────────────────────

function BookingItemRow({
  item,
  onSaveAlternative,
  savingAlternative,
}: {
  item: BookableItem;
  onSaveAlternative: (bookingId: number, value: string) => void;
  savingAlternative: number | null;
}) {
  const status = getSimplifiedStatus(item);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const [alternativeValue, setAlternativeValue] = useState(item.logistics_alternative || '');

  const handleBlur = () => {
    if (item.booking_id && alternativeValue !== (item.logistics_alternative || '')) {
      onSaveAlternative(item.booking_id, alternativeValue);
    }
  };

  return (
    <div className="mx-3 mb-1.5 rounded-lg border border-gray-100 bg-white">
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">
              {item.item_name}
            </span>
            {item.day_number && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                J{item.day_number}
              </span>
            )}
          </div>
          {item.supplier_name && (
            <p className="text-xs text-gray-500 truncate">
              {item.supplier_name}
            </p>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.bgClass} ${config.textClass} ${config.borderClass} flex-shrink-0`}
        >
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {/* Problem details (supplier response note + logistics alternative) */}
      {status === 'problem' && item.booking_id && (
        <div className="px-3 pb-2.5 space-y-2">
          {/* Supplier response note */}
          {item.supplier_response_note && (
            <div className="flex items-start gap-2 px-2.5 py-2 bg-red-50/50 rounded border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{item.supplier_response_note}</p>
            </div>
          )}

          {/* Logistics alternative input */}
          <div className="relative">
            <textarea
              value={alternativeValue}
              onChange={(e) => setAlternativeValue(e.target.value)}
              onBlur={handleBlur}
              placeholder="Proposition alternative de la logistique..."
              className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-2 resize-none focus:ring-1 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] min-h-[52px] bg-white"
              rows={2}
            />
            {savingAlternative === item.booking_id && (
              <div className="absolute right-2 top-2">
                <Loader2 className="w-3.5 h-3.5 text-[#0FB6BC] animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
