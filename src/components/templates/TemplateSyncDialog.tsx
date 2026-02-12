'use client';

import { useState, useCallback } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Unlink, LayoutTemplate } from 'lucide-react';
import { useTemplateSyncActions } from '@/hooks/useTemplateSync';

interface TemplateSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formulaId: number;
  formulaName: string;
  templateSourceId: number;
  sourceVersion: number;
  templateVersion: number;
  onSynced?: () => void;
}

export default function TemplateSyncDialog({
  isOpen,
  onClose,
  formulaId,
  formulaName,
  templateSourceId,
  sourceVersion,
  templateVersion,
  onSynced,
}: TemplateSyncDialogProps) {
  const { push, pushing, pull, pulling, unlink, unlinking } = useTemplateSyncActions();
  const [actionDone, setActionDone] = useState<string | null>(null);

  const isOutOfSync = sourceVersion < templateVersion;

  const handlePush = useCallback(async () => {
    try {
      await push(formulaId);
      setActionDone('push');
      setTimeout(() => {
        setActionDone(null);
        onSynced?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Push to template failed:', err);
    }
  }, [formulaId, push, onSynced, onClose]);

  const handlePull = useCallback(async () => {
    try {
      await pull(formulaId);
      setActionDone('pull');
      setTimeout(() => {
        setActionDone(null);
        onSynced?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Pull from template failed:', err);
    }
  }, [formulaId, pull, onSynced, onClose]);

  const handleUnlink = useCallback(async () => {
    try {
      await unlink(formulaId);
      setActionDone('unlink');
      setTimeout(() => {
        setActionDone(null);
        onSynced?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Unlink from template failed:', err);
    }
  }, [formulaId, unlink, onSynced, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-[#0FB6BC]" />
            <h2 className="text-lg font-semibold text-gray-900">Synchronisation template</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="p-5">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">{formulaName}</div>
            <div className="text-xs text-gray-500 mt-1">
              Votre version : v{sourceVersion} — Template : v{templateVersion}
              {isOutOfSync && (
                <span className="ml-2 text-amber-600 font-medium">⚠ Template mis à jour</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Pull from template */}
            {isOutOfSync && (
              <button
                onClick={handlePull}
                disabled={pulling}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <ArrowDownCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {actionDone === 'pull' ? '✓ Mis à jour !' : pulling ? 'Mise à jour...' : 'Mettre à jour depuis le template'}
                  </div>
                  <div className="text-xs text-gray-500">Remplace vos items par ceux du template (v{templateVersion})</div>
                </div>
              </button>
            )}

            {/* Push to template */}
            <button
              onClick={handlePush}
              disabled={pushing}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#CCF3F5] bg-[#E6F9FA] hover:bg-[#CCF3F5] transition-colors text-left"
            >
              <ArrowUpCircle className="w-5 h-5 text-[#0FB6BC] flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {actionDone === 'push' ? '✓ Template mis à jour !' : pushing ? 'Publication...' : 'Pousser mes modifications vers le template'}
                </div>
                <div className="text-xs text-gray-500">Met à jour le template maître avec vos items locaux</div>
              </div>
            </button>

            {/* Unlink */}
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <Unlink className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-700">
                  {actionDone === 'unlink' ? '✓ Détaché !' : unlinking ? 'Détachement...' : 'Détacher du template'}
                </div>
                <div className="text-xs text-gray-500">Garde les items en place mais ne recevra plus de mises à jour</div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
