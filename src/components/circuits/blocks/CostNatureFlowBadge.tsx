'use client';

import type { PaymentFlow } from '@/lib/api/types';

/**
 * Small colored dot badge indicating the payment flow of an item.
 * Blue = Fournisseur (booking), Amber = Allowance, Purple = Achat bureau,
 * Green = Salaire, Gray = Manuel / no flow.
 */
export function CostNatureFlowBadge({ paymentFlow }: { paymentFlow?: PaymentFlow | string | null }) {
  if (!paymentFlow || paymentFlow === 'manual') return null;

  let colorClass = 'bg-gray-400';
  let title = 'Manuel';

  switch (paymentFlow) {
    case 'booking':
      colorClass = 'bg-blue-500';
      title = 'Fournisseur';
      break;
    case 'advance':
      colorClass = 'bg-amber-500';
      title = 'Allowance';
      break;
    case 'purchase_order':
      colorClass = 'bg-purple-500';
      title = 'Achat bureau';
      break;
    case 'payroll':
      colorClass = 'bg-emerald-500';
      title = 'Salaire';
      break;
  }

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorClass}`}
      title={title}
    />
  );
}
