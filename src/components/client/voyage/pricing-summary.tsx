import {
  Banknote,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { ContinentTheme } from '../continent-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  paid_amount: number | null;
}

interface PricingSummaryProps {
  totalSell: number | null;
  currency: string;
  pricePerAdult: number | null;
  pricePerChild: number | null;
  adultsCount: number;
  childrenCount: number;
  payments: PaymentItem[];
  continentTheme: ContinentTheme;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPaymentLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Acompte',
    balance: 'Solde',
    extra: 'Supplément',
    refund: 'Remboursement',
    full: 'Paiement intégral',
  };
  return labels[type] || 'Paiement';
}

function getPaymentStatusInfo(status: string, dueDate: string | null) {
  if (status === 'completed' || status === 'paid') {
    return {
      icon: CheckCircle,
      label: 'Payé',
      color: '#16a34a',
      bgColor: '#f0fdf4',
    };
  }

  // Check if overdue
  if (dueDate && new Date(dueDate) < new Date()) {
    return {
      icon: AlertTriangle,
      label: 'En retard',
      color: '#dc2626',
      bgColor: '#fef2f2',
    };
  }

  return {
    icon: Clock,
    label: 'En attente',
    color: '#d97706',
    bgColor: '#fffbeb',
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PricingSummary({
  totalSell,
  currency,
  pricePerAdult,
  pricePerChild,
  adultsCount,
  childrenCount,
  payments,
  continentTheme,
}: PricingSummaryProps) {
  // Don't render if no pricing data
  if (!totalSell || totalSell <= 0) return null;

  const curr = currency || 'EUR';

  // Calculate payment progress
  const totalPaid = payments
    .filter((p) => p.status === 'completed' || p.status === 'paid')
    .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);

  const progressPercent = totalSell > 0 ? Math.min(Math.round((totalPaid / totalSell) * 100), 100) : 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${continentTheme.primary}15` }}
          >
            <Banknote className="h-4 w-4" style={{ color: continentTheme.primary }} />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Résumé financier</h2>
        </div>
      </div>

      {/* Pricing breakdown */}
      <div className="px-5 py-4 space-y-3">
        {/* Total price */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Prix total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(totalSell, curr)}
          </span>
        </div>

        {/* Per person */}
        {pricePerAdult && pricePerAdult > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Par adulte
              {adultsCount > 0 && ` (x${adultsCount})`}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {formatCurrency(pricePerAdult, curr)}
            </span>
          </div>
        )}

        {pricePerChild && pricePerChild > 0 && childrenCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Par enfant (x{childrenCount})
            </span>
            <span className="text-sm font-medium text-gray-700">
              {formatCurrency(pricePerChild, curr)}
            </span>
          </div>
        )}

        {/* Payments section */}
        {payments.length > 0 && (
          <>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Paiements
              </p>

              <div className="space-y-2.5">
                {payments.map((payment) => {
                  const statusInfo = getPaymentStatusInfo(payment.status, payment.due_date);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ backgroundColor: `${statusInfo.bgColor}` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <StatusIcon
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: statusInfo.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {getPaymentLabel(payment.type)}
                          </p>
                          {payment.due_date && payment.status !== 'completed' && payment.status !== 'paid' && (
                            <p className="text-xs text-gray-500">
                              Échéance : {new Date(payment.due_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                          {(payment.status === 'completed' || payment.status === 'paid') && payment.paid_at && (
                            <p className="text-xs text-gray-500">
                              Payé le {new Date(payment.paid_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {formatCurrency(payment.paid_amount || payment.amount, payment.currency || curr)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Progression</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: continentTheme.primary }}
                >
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: continentTheme.primary,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
