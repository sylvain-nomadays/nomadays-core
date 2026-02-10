'use client';

import { useState } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePaxCategories } from '@/hooks/usePaxCategories';
import type { PaxCategory, PaxGroupType } from '@/lib/api/types';

const GROUP_LABELS: Record<PaxGroupType, string> = {
  tourist: 'Touristes',
  staff: 'Equipe',
  leader: 'Accompagnement',
};

const GROUP_COLORS: Record<PaxGroupType, string> = {
  tourist: 'bg-primary-50 text-primary-700 border-primary-200',
  staff: 'bg-purple-50 text-purple-700 border-purple-200',
  leader: 'bg-amber-50 text-amber-700 border-amber-200',
};

const GROUP_ORDER: PaxGroupType[] = ['tourist', 'leader', 'staff'];

// ─── Category row ─────────────────────────────────────────
function CategoryRow({
  cat,
  onUpdate,
  onDelete,
}: {
  cat: PaxCategory;
  onUpdate: (args: { categoryId: number; data: Record<string, unknown> }) => void;
  onDelete: (categoryId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(cat.label);
  const [ageMin, setAgeMin] = useState<string>(cat.age_min?.toString() ?? '');
  const [ageMax, setAgeMax] = useState<string>(cat.age_max?.toString() ?? '');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = () => {
    const data: Record<string, unknown> = {};
    if (label.trim() !== cat.label) data.label = label.trim();
    const newMin = ageMin === '' ? null : parseInt(ageMin);
    const newMax = ageMax === '' ? null : parseInt(ageMax);
    if (newMin !== cat.age_min) data.age_min = newMin;
    if (newMax !== cat.age_max) data.age_max = newMax;

    if (Object.keys(data).length > 0) {
      onUpdate({ categoryId: cat.id, data });
    }
    setIsEditing(false);
  };

  const handleTogglePricing = () => {
    onUpdate({ categoryId: cat.id, data: { counts_for_pricing: !cat.counts_for_pricing } });
  };

  const handleToggleActive = () => {
    onUpdate({ categoryId: cat.id, data: { is_active: !cat.is_active } });
  };

  const handleConfirmDelete = () => {
    onDelete(cat.id);
    setIsDeleting(false);
  };

  const ageLabel =
    cat.age_min != null || cat.age_max != null
      ? cat.age_max != null
        ? `${cat.age_min ?? 0}-${cat.age_max} ans`
        : `${cat.age_min}+ ans`
      : null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
        cat.is_active
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
    >
      {/* Label & age */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-40 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <input
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              placeholder="Min"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-14 text-center"
              type="number"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              placeholder="Max"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-14 text-center"
              type="number"
            />
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{cat.label}</span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              {cat.code}
            </span>
            {ageLabel && (
              <span className="text-xs text-gray-500">({ageLabel})</span>
            )}
            {cat.is_system && (
              <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded">
                système
              </span>
            )}
          </div>
        )}
      </div>

      {/* Counts for pricing toggle */}
      <button
        onClick={handleTogglePricing}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          cat.counts_for_pricing
            ? 'bg-sage-50 text-sage-700 border-sage-200 hover:bg-sage-100'
            : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
        }`}
        title={cat.counts_for_pricing ? 'Compté dans prix/personne' : 'Non compté dans prix/personne'}
      >
        {cat.counts_for_pricing ? (
          <ToggleRight className="w-3.5 h-3.5" />
        ) : (
          <ToggleLeft className="w-3.5 h-3.5" />
        )}
        {cat.counts_for_pricing ? 'Payant' : 'Non payant'}
      </button>

      {/* Active toggle */}
      <button
        onClick={handleToggleActive}
        className={`p-1.5 rounded transition-colors ${
          cat.is_active
            ? 'text-sage-600 hover:bg-sage-50'
            : 'text-gray-300 hover:bg-gray-100'
        }`}
        title={cat.is_active ? 'Actif' : 'Inactif'}
      >
        {cat.is_active ? (
          <Check className="w-4 h-4" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </button>

      {/* Edit — hidden during delete confirmation */}
      {!isEditing && !isDeleting && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete (only custom) */}
      {!cat.is_system && (
        <>
          {isDeleting ? (
            <>
              <button
                onClick={handleConfirmDelete}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                title="Annuler"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="p-1.5 rounded transition-colors text-gray-300 hover:text-red-500 hover:bg-red-50"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Add category inline ─────────────────────────────────
function AddCategoryRow({
  groupType,
  onAdd,
}: {
  groupType: PaxGroupType;
  onAdd: (data: { code: string; label: string; group_type: string; sort_order: number }) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');

  const handleSave = () => {
    if (code.trim() && label.trim()) {
      onAdd({
        code: code.trim().toLowerCase().replace(/\s+/g, '_'),
        label: label.trim(),
        group_type: groupType,
        sort_order: 99,
      });
      setCode('');
      setLabel('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 px-4 py-1.5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter une catégorie
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code (ex: porter)"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:ring-2 focus:ring-primary-500"
        autoFocus
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (ex: Porteur)"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-40 focus:ring-2 focus:ring-primary-500"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsAdding(false);
        }}
      />
      <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setIsAdding(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function PaxCategoriesPage() {
  const {
    data: categories,
    loading,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories,
    isSeeding,
  } = usePaxCategories();

  const handleCreate = async (data: { code: string; label: string; group_type: string; sort_order: number }) => {
    await createCategory(data);
    refetch();
  };

  const handleUpdate = async ({ categoryId, data }: { categoryId: number; data: Record<string, unknown> }) => {
    await updateCategory({ categoryId, data });
    refetch();
  };

  const handleDelete = async (categoryId: number) => {
    await deleteCategory(categoryId);
    refetch();
  };

  const handleSeed = async () => {
    await seedCategories(undefined);
    refetch();
  };

  // Group categories by group_type
  const grouped: Record<PaxGroupType, PaxCategory[]> = {
    tourist: [],
    leader: [],
    staff: [],
  };
  for (const cat of categories || []) {
    const grp = (cat.group_type as PaxGroupType) || 'tourist';
    if (grouped[grp]) {
      grouped[grp].push(cat);
    } else {
      grouped.tourist.push(cat);
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/configuration"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Configuration
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-7 h-7 text-primary-500" />
              Catégories de voyageurs
            </h1>
            <p className="text-gray-500 mt-1">
              Définissez les types de voyageurs et leur rôle dans la cotation
            </p>
          </div>
          {(!categories || categories.length === 0) && !loading && (
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors text-sm"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Initialiser les catégories
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      )}

      {/* Groups */}
      {!loading && (
        <div className="space-y-6">
          {GROUP_ORDER.map((groupType) => {
            const cats = grouped[groupType];
            return (
              <div key={groupType} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Group header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${GROUP_COLORS[groupType]}`}
                    >
                      {GROUP_LABELS[groupType]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {cats.length} catégorie{cats.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Categories list */}
                <div className="p-2 space-y-1">
                  {cats.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      cat={cat}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                  <AddCategoryRow groupType={groupType} onAdd={handleCreate} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Légende
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-sage-50 text-sage-700 border border-sage-200 rounded-full text-[10px] font-medium">
              Payant
            </span>
            <span>Compté dans le prix par personne</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-medium">
              Non payant
            </span>
            <span>Coûts répartis sur les payants</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded">système</span>
            <span>Non supprimable (pré-configuré)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
