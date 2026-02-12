'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, LayoutTemplate, ArrowDownCircle, CheckCircle, XCircle } from 'lucide-react';
import { useTemplateSyncActions } from '@/hooks/useTemplateSync';
import type { TemplateSyncItem } from '@/hooks/useTemplateSync';

interface CircuitSyncReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Items that are out of sync with their templates */
  items: TemplateSyncItem[];
  /** Called after the user has finished reviewing (accepted/rejected all) */
  onComplete?: () => void;
}

const blockTypeLabels: Record<string, string> = {
  activity: 'Activité',
  transport: 'Transport',
  accommodation: 'Hébergement',
  text: 'Texte',
  restaurant: 'Restauration',
  guide: 'Accompagnement',
  service: 'Service',
  roadbook: 'Roadbook',
};

type ItemDecision = 'pending' | 'accepted' | 'rejected';

export default function CircuitSyncReviewDialog({
  isOpen,
  onClose,
  items,
  onComplete,
}: CircuitSyncReviewDialogProps) {
  const { pull } = useTemplateSyncActions();

  // Track decision for each item by formula_id
  const [decisions, setDecisions] = useState<Record<number, ItemDecision>>(() =>
    Object.fromEntries(items.map((item) => [item.formula_id, 'pending' as ItemDecision]))
  );
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const outdatedItems = useMemo(
    () => items.filter((i) => i.status === 'template_updated'),
    [items]
  );

  const allDecided = useMemo(
    () => outdatedItems.every((i) => decisions[i.formula_id] !== 'pending'),
    [outdatedItems, decisions]
  );

  const acceptedCount = useMemo(
    () => outdatedItems.filter((i) => decisions[i.formula_id] === 'accepted').length,
    [outdatedItems, decisions]
  );

  const setDecision = useCallback((formulaId: number, decision: ItemDecision) => {
    setDecisions((prev) => ({ ...prev, [formulaId]: decision }));
  }, []);

  const handleAcceptAll = useCallback(() => {
    setDecisions((prev) => {
      const next = { ...prev };
      outdatedItems.forEach((i) => {
        next[i.formula_id] = 'accepted';
      });
      return next;
    });
  }, [outdatedItems]);

  const handleRejectAll = useCallback(() => {
    setDecisions((prev) => {
      const next = { ...prev };
      outdatedItems.forEach((i) => {
        next[i.formula_id] = 'rejected';
      });
      return next;
    });
  }, [outdatedItems]);

  const handleApply = useCallback(async () => {
    const toUpdate = outdatedItems.filter((i) => decisions[i.formula_id] === 'accepted');
    if (toUpdate.length === 0) {
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onComplete?.();
        onClose();
      }, 1000);
      return;
    }

    setProcessing(true);
    try {
      // Pull updates sequentially to avoid overwhelming the server
      for (const item of toUpdate) {
        await pull(item.formula_id);
      }
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onComplete?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to apply template updates:', err);
    } finally {
      setProcessing(false);
    }
  }, [outdatedItems, decisions, pull, onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Templates mis à jour</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <p className="text-sm text-gray-600">
            {outdatedItems.length} bloc{outdatedItems.length > 1 ? 's' : ''} de ce circuit{' '}
            {outdatedItems.length > 1 ? 'ont' : 'a'} un template mis à jour.
            Choisissez les blocs à mettre à jour.
          </p>
        </div>

        {/* Bulk actions */}
        <div className="px-5 py-2 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAcceptAll}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0FB6BC] bg-[#E6F9FA] hover:bg-[#CCF3F5] rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Tout accepter
          </button>
          <button
            onClick={handleRejectAll}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Tout ignorer
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
          {outdatedItems.map((item) => {
            const decision = decisions[item.formula_id];
            return (
              <div
                key={item.formula_id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  decision === 'accepted'
                    ? 'border-[#CCF3F5] bg-[#E6F9FA]'
                    : decision === 'rejected'
                    ? 'border-gray-200 bg-gray-50 opacity-60'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                {/* Icon + Info */}
                <ArrowDownCircle className={`w-5 h-5 flex-shrink-0 ${
                  decision === 'accepted' ? 'text-[#0FB6BC]' : decision === 'rejected' ? 'text-gray-400' : 'text-amber-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.formula_name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{blockTypeLabels[item.block_type] || item.block_type}</span>
                    {item.day_number && <span>· Jour {item.day_number}</span>}
                    <span>· v{item.source_version ?? '?'} → v{item.template_version}</span>
                  </div>
                </div>

                {/* Accept / Reject buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setDecision(item.formula_id, 'accepted')}
                    disabled={processing}
                    className={`p-1.5 rounded-lg transition-colors ${
                      decision === 'accepted'
                        ? 'bg-[#0FB6BC] text-white'
                        : 'text-gray-400 hover:text-[#0FB6BC] hover:bg-[#E6F9FA]'
                    }`}
                    title="Accepter la mise à jour"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDecision(item.formula_id, 'rejected')}
                    disabled={processing}
                    className={`p-1.5 rounded-lg transition-colors ${
                      decision === 'rejected'
                        ? 'bg-gray-600 text-white'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Ignorer cette mise à jour"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100 flex-shrink-0">
          <div className="text-xs text-gray-500">
            {acceptedCount} / {outdatedItems.length} bloc{outdatedItems.length > 1 ? 's' : ''} à mettre à jour
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleApply}
              disabled={!allDecided || processing}
              className="flex items-center gap-2 px-4 py-2 bg-[#0FB6BC] text-white text-sm rounded-lg hover:bg-[#0C9296] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownCircle className="w-4 h-4" />
              {done ? '✓ Terminé !' : processing ? 'Mise à jour...' : 'Appliquer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
