'use client';

import { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useTenantConditions } from '@/hooks/useConditions';
import type { Condition, ConditionOption, ConditionScope } from '@/lib/api/types';

const SCOPE_LABELS: Record<ConditionScope, string> = {
  all: 'Toutes',
  accommodation: 'Hébergement',
  service: 'Services',
  accompaniment: 'Accompagnement',
};

const SCOPE_COLORS: Record<ConditionScope, string> = {
  all: 'bg-gray-100 text-gray-600 border-gray-200',
  accommodation: 'bg-blue-50 text-blue-700 border-blue-200',
  service: 'bg-purple-50 text-purple-700 border-purple-200',
  accompaniment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ─── Inline option editor ─────────────────────────────────────────

function OptionRow({
  option,
  conditionId,
  onUpdate,
  onDelete,
}: {
  option: ConditionOption;
  conditionId: number;
  onUpdate: (args: { conditionId: number; optionId: number; data: { label?: string; sort_order?: number } }) => void;
  onDelete: (args: { conditionId: number; optionId: number }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(option.label);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = () => {
    if (label.trim() && label !== option.label) {
      onUpdate({ conditionId, optionId: option.id, data: { label: label.trim() } });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (isDeleting) {
      onDelete({ conditionId, optionId: option.id });
      setIsDeleting(false);
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 group/option hover:bg-gray-100 transition-colors">
      <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 px-2 py-0.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setLabel(option.label); setIsEditing(false); }
            }}
          />
          <button onClick={handleSave} className="p-0.5 text-green-600 hover:text-green-700">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setLabel(option.label); setIsEditing(false); }} className="p-0.5 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm text-gray-700 flex-1">{option.label}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="p-0.5 text-gray-300 hover:text-gray-500 opacity-0 group-hover/option:opacity-100 transition-opacity"
            title="Modifier"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className={`p-0.5 rounded transition-colors ${
              isDeleting
                ? 'text-red-600 bg-red-50 opacity-100'
                : 'text-gray-300 hover:text-red-500 opacity-0 group-hover/option:opacity-100'
            }`}
            title={isDeleting ? 'Cliquer pour confirmer' : 'Supprimer'}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Condition card ────────────────────────────────────────────────

function ConditionCard({
  condition,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  condition: Condition;
  onUpdate: (args: { conditionId: number; data: { name?: string; description?: string; applies_to?: string } }) => void;
  onDelete: (conditionId: number) => void;
  onAddOption: (args: { conditionId: number; data: { label: string; sort_order?: number } }) => void;
  onUpdateOption: (args: { conditionId: number; optionId: number; data: { label?: string; sort_order?: number } }) => void;
  onDeleteOption: (args: { conditionId: number; optionId: number }) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(condition.name);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [showAddOption, setShowAddOption] = useState(false);

  const handleSaveName = () => {
    if (name.trim() && name !== condition.name) {
      onUpdate({ conditionId: condition.id, data: { name: name.trim() } });
    }
    setIsEditingName(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Supprimer la condition "${condition.name}" et toutes ses options ?`)) {
      onDelete(condition.id);
    }
  };

  const handleAddOption = () => {
    if (newOptionLabel.trim()) {
      onAddOption({
        conditionId: condition.id,
        data: {
          label: newOptionLabel.trim(),
          sort_order: (condition.options?.length || 0) + 1,
        },
      });
      setNewOptionLabel('');
      setShowAddOption(false);
    }
  };

  const sortedOptions = [...(condition.options || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <SlidersHorizontal className="w-5 h-5 text-amber-600 flex-shrink-0" />

        {isEditingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-2 py-1 text-sm font-semibold border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') { setName(condition.name); setIsEditingName(false); }
              }}
            />
            <button onClick={handleSaveName} className="p-1 text-green-600 hover:text-green-700">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setName(condition.name); setIsEditingName(false); }} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-display font-semibold text-sm text-gray-800 truncate">
              {condition.name}
            </span>
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              {sortedOptions.length} option{sortedOptions.length !== 1 ? 's' : ''}
            </span>
            {/* Scope selector */}
            <select
              value={condition.applies_to || 'all'}
              onChange={(e) => onUpdate({
                conditionId: condition.id,
                data: { applies_to: e.target.value },
              })}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border cursor-pointer appearance-none text-center transition-colors ${
                SCOPE_COLORS[(condition.applies_to as ConditionScope) || 'all']
              }`}
              title="Portée : sur quels types de blocs cette condition s'applique"
            >
              {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {!isEditingName && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsEditingName(true)}
              className="p-1.5 text-gray-300 hover:text-gray-500 rounded transition-colors"
              title="Modifier le nom"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded transition-colors text-gray-300 hover:text-red-500"
              title="Supprimer la condition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Options list */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3 space-y-1">
            {sortedOptions.length === 0 && !showAddOption ? (
              <p className="text-sm text-gray-400 text-center py-3">
                Aucune option. Ajoutez des valeurs possibles pour cette condition.
              </p>
            ) : (
              sortedOptions.map((opt) => (
                <OptionRow
                  key={opt.id}
                  option={opt}
                  conditionId={condition.id}
                  onUpdate={onUpdateOption}
                  onDelete={onDeleteOption}
                />
              ))
            )}

            {/* Add option form */}
            {showAddOption ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200">
                <input
                  type="text"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="Nom de l'option..."
                  className="flex-1 px-2 py-0.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddOption();
                    if (e.key === 'Escape') { setNewOptionLabel(''); setShowAddOption(false); }
                  }}
                />
                <button
                  onClick={handleAddOption}
                  disabled={!newOptionLabel.trim()}
                  className="p-1 text-amber-600 hover:text-amber-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setNewOptionLabel(''); setShowAddOption(false); }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddOption(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une option
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────

export default function ConditionsSettingsPage() {
  const {
    conditions,
    isLoading,
    refetch,
    create,
    creating,
    update,
    remove,
    addOption,
    updateOption,
    deleteOption,
  } = useTenantConditions();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionOptions, setNewConditionOptions] = useState('');
  const [newConditionScope, setNewConditionScope] = useState<ConditionScope>('all');

  const handleCreate = async () => {
    if (!newConditionName.trim()) return;
    try {
      const options = newConditionOptions
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(label => ({ label }));

      await create({
        name: newConditionName.trim(),
        applies_to: newConditionScope,
        options: options.length > 0 ? options : undefined,
      });
      setNewConditionName('');
      setNewConditionOptions('');
      setNewConditionScope('all');
      setShowCreateForm(false);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const handleUpdate = async (args: { conditionId: number; data: { name?: string; description?: string; applies_to?: string } }) => {
    try {
      await update(args);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const handleDelete = async (conditionId: number) => {
    try {
      await remove(conditionId);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const handleAddOption = async (args: { conditionId: number; data: { label: string; sort_order?: number } }) => {
    try {
      await addOption(args);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const handleUpdateOption = async (args: { conditionId: number; optionId: number; data: { label?: string; sort_order?: number } }) => {
    try {
      await updateOption(args);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const handleDeleteOption = async (args: { conditionId: number; optionId: number }) => {
    try {
      await deleteOption(args);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      {/* Back link + Header */}
      <div className="mb-6">
        <Link
          href="/admin/configuration"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Configuration
        </Link>
        <div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <SlidersHorizontal className="w-7 h-7 text-amber-600 flex-shrink-0" />
              Conditions
            </h1>
            <button
              onClick={() => setShowCreateForm(true)}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nouvelle condition
            </button>
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Gérez les conditions globales et leurs options pour filtrer les formules dans la cotation.
          </p>
        </div>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 mb-6">
          <h3 className="font-display font-semibold text-sm text-gray-800 mb-3">Créer une condition</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la condition</label>
              <input
                type="text"
                value={newConditionName}
                onChange={(e) => setNewConditionName(e.target.value)}
                placeholder="Ex: Langue guide, Cuisinier, Type véhicule..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setShowCreateForm(false); setNewConditionName(''); setNewConditionOptions(''); setNewConditionScope('all'); }
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Options initiales <span className="text-gray-400">(séparées par des virgules)</span>
              </label>
              <input
                type="text"
                value={newConditionOptions}
                onChange={(e) => setNewConditionOptions(e.target.value)}
                placeholder="Ex: Français, Anglais, Allemand, Espagnol"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setShowCreateForm(false); setNewConditionName(''); setNewConditionOptions(''); setNewConditionScope('all'); }
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Portée</label>
              <div className="flex items-center gap-2">
                {(Object.entries(SCOPE_LABELS) as [ConditionScope, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewConditionScope(value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      newConditionScope === value
                        ? SCOPE_COLORS[value] + ' ring-1 ring-offset-1 ring-gray-300'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                « Toutes » = utilisable partout · « Hébergement » = variantes d&apos;hôtels · « Accompagnement » = guide, chauffeur… · « Services » = prestations transversales
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setShowCreateForm(false); setNewConditionName(''); setNewConditionOptions(''); setNewConditionScope('all'); }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!newConditionName.trim() || creating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditions list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : conditions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <SlidersHorizontal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">Aucune condition configurée</p>
          <p className="text-sm text-gray-400 mb-4">
            Les conditions permettent de filtrer les formules dans la cotation selon des critères personnalisables.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer votre première condition
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {conditions.map((condition) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
            />
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-display font-semibold text-sm text-gray-700 mb-2">Comment fonctionnent les conditions ?</h3>
        <ul className="text-sm text-gray-500 space-y-1.5">
          <li>
            <strong className="text-gray-600">1.</strong> Créez une condition globale avec ses options (ex: &quot;Langue guide&quot; → Français, Anglais, Allemand)
          </li>
          <li>
            <strong className="text-gray-600">2.</strong> Sur un circuit, activez la condition et choisissez la valeur (ex: &quot;Français&quot;)
          </li>
          <li>
            <strong className="text-gray-600">3.</strong> Sur les formules transversales, associez chaque formule à une option (ex: formule &quot;Guide FR&quot; → option &quot;Français&quot;)
          </li>
          <li>
            <strong className="text-gray-600">4.</strong> Le moteur de cotation inclut uniquement les formules dont l&apos;option correspond au choix du circuit
          </li>
        </ul>
      </div>
    </div>
  );
}
