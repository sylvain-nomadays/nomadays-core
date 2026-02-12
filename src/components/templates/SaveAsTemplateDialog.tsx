'use client';

import { useState, useCallback } from 'react';
import { X, Bookmark, Tag } from 'lucide-react';
import { useFormulaTemplates } from '@/hooks/useFormulaTemplates';
import type { FormulaCategory } from '@/lib/api/types';

interface SaveAsTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formulaId: number;
  defaultName: string;
  defaultCategory: string;
}

const categoryLabels: Record<string, string> = {
  accommodation: 'Hébergement',
  activity: 'Activité',
  transport: 'Transport',
  restaurant: 'Restauration',
  guide: 'Accompagnement',
  service: 'Service',
  text: 'Texte',
  roadbook: 'Roadbook',
  other: 'Autre',
};

export default function SaveAsTemplateDialog({
  isOpen,
  onClose,
  formulaId,
  defaultName,
  defaultCategory,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState(defaultCategory);
  const [tags, setTags] = useState('');
  const [saved, setSaved] = useState(false);

  const { saveAsTemplate, savingAsTemplate } = useFormulaTemplates();

  const handleSave = useCallback(async () => {
    try {
      await saveAsTemplate({
        formulaId,
        name: name.trim() || defaultName,
        category: category || defaultCategory,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to save as template:', err);
    }
  }, [formulaId, name, category, defaultName, defaultCategory, saveAsTemplate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#0FB6BC]" />
            <h2 className="text-lg font-semibold text-gray-900">Sauvegarder comme template</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du template</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Transfert aéroport Bangkok"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC]"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] bg-white"
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tags <span className="text-gray-400 font-normal">(optionnel, séparés par des virgules)</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ex: aéroport, transfert, bangkok"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || savingAsTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0FB6BC] text-white text-sm rounded-lg hover:bg-[#0C9296] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Bookmark className="w-4 h-4" />
            {saved ? '✓ Sauvegardé !' : savingAsTemplate ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
