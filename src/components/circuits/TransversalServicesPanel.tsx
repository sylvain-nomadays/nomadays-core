'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Users,
  SlidersHorizontal,
} from 'lucide-react';
import { useTransversalFormulas } from '@/hooks/useTransversalFormulas';
import { useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useFormulaItems';
import ItemEditor from '@/components/circuits/ItemEditor';

import { mapRatioRule } from '@/lib/ratioUtils';
import type { Formula, Item, CostNature, TripCondition, PaymentFlow } from '@/lib/api/types';
import { useTripConditions } from '@/hooks/useConditions';
import { shouldIncludeItem } from '@/lib/conditionUtils';

/** Compact payment flow options for inline selects */
const PAYMENT_FLOW_OPTIONS: { value: PaymentFlow; label: string; colorClass: string }[] = [
  { value: 'booking', label: 'Fournisseur', colorClass: 'text-blue-600' },
  { value: 'advance', label: 'Allowance', colorClass: 'text-amber-600' },
  { value: 'purchase_order', label: 'Achat bureau', colorClass: 'text-purple-600' },
  { value: 'payroll', label: 'Salaire', colorClass: 'text-emerald-600' },
  { value: 'manual', label: 'Manuel', colorClass: 'text-gray-500' },
];

// ─── Types ──────────────────────────────────────────────────────────
interface TransversalServicesPanelProps {
  tripId: number;
  totalDays: number;
  costNatures: CostNature[];
  onRefetch: () => void;
  conditionsVersion?: number;
}

// ─── TransversalFormulaRow ──────────────────────────────────────────
// Each formula row: inline name, day badge, collapsible items, quick-add
interface TransversalFormulaRowProps {
  formula: Formula;
  onUpdateFormula: (formulaId: number, data: { name?: string; service_day_start?: number | null; service_day_end?: number | null; condition_id?: number | null }) => void;
  onDeleteFormula: (formulaId: number) => void;
  isDeleting: boolean;
  costNatures: CostNature[];
  tripConditions?: TripCondition[];
  tripDays: number;
  onRefetch: () => void;
}

function TransversalFormulaRow({
  formula,
  onUpdateFormula,
  onDeleteFormula,
  isDeleting,
  costNatures,
  tripConditions,
  tripDays,
  onRefetch,
}: TransversalFormulaRowProps) {
  // ─── State ──────────────────────────────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [prestationsOpen, setPrestationsOpen] = useState(false);
  const [editingDayRange, setEditingDayRange] = useState(false);

  // Item management
  const [localItems, setLocalItems] = useState<Item[]>(formula.items || []);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickRatio, setQuickRatio] = useState<'set' | 'per_person'>('set');
  const [quickFlow, setQuickFlow] = useState<PaymentFlow>('booking');
  const [quickTTC, setQuickTTC] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | undefined>();
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  // Item CRUD hooks
  const { mutate: createItem } = useCreateItem();
  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItemMutation } = useDeleteItem();

  // Sync from server
  useEffect(() => {
    setLocalItems(formula.items || []);
  }, [formula.items]);

  // ─── Day range formatting ──────────────────────────────────────
  const dayStart = formula.service_day_start ?? 1;
  const dayEnd = formula.service_day_end ?? dayStart;
  const serviceDays = dayEnd - dayStart + 1;

  // Cost: multiply by service days, but only for items included by condition filter
  const totalCost = localItems
    .filter(item => shouldIncludeItem(item, formula, tripConditions))
    .reduce((s, item) => s + ((item.unit_cost || 0) * serviceDays), 0);

  const dayRangeLabel = formula.service_day_start == null && formula.service_day_end == null
    ? 'Forfait'
    : dayStart === dayEnd
      ? `J${dayStart}`
      : `J${dayStart}→J${dayEnd} (${serviceDays}j)`;

  // ─── Handlers ──────────────────────────────────────────────────

  // Quick add item — optimistic
  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    setAddingItem(true);

    const ratioType = quickRatio === 'set' ? 'set' : 'ratio';
    const newItemData = {
      name: quickName.trim(),
      unit_cost: quickPrice ? parseFloat(quickPrice) : 0,
      currency: 'THB',
      pricing_method: 'quotation',
      ratio_type: ratioType,
      ratio_per: 1,
      ratio_categories: 'adult',
      times_type: 'service_days', // Default for transversal: multiply by formula's day span
      times_value: 1,
      sort_order: localItems.length,
      payment_flow: quickFlow,
      price_includes_vat: quickTTC,
    };

    // 1. Optimistic add
    const tempId = -Date.now();
    const optimisticItem = { id: tempId, formula_id: formula.id, quantity: 1, ...newItemData } as Item;
    setLocalItems(prev => [...prev, optimisticItem]);
    setQuickName('');
    setQuickPrice('');

    try {
      // 2. Background save
      const created = await createItem({
        formulaId: formula.id,
        data: newItemData,
      });
      if (created) {
        setLocalItems(prev => prev.map(item => item.id === tempId ? (created as unknown as Item) : item));
      }
    } catch (err) {
      // Rollback
      setLocalItems(prev => prev.filter(item => item.id !== tempId));
      console.error('Failed to create item:', err);
    } finally {
      setAddingItem(false);
    }
  };

  // Delete item — optimistic
  const handleDeleteItem = async (itemId: number) => {
    const removedItem = localItems.find(i => i.id === itemId);
    setLocalItems(prev => prev.filter(i => i.id !== itemId));
    setDeletingItemId(itemId);

    try {
      await deleteItemMutation(itemId);
    } catch (err) {
      if (removedItem) {
        setLocalItems(prev => [...prev, removedItem]);
      }
      console.error('Failed to delete item:', err);
    } finally {
      setDeletingItemId(null);
    }
  };

  // Edit item via modal
  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowItemEditor(true);
  };

  // Save from ItemEditor modal — optimistic
  const handleItemEditorSave = async (itemData: Partial<Item>) => {
    const ratio = mapRatioRule(itemData.ratio_rule, itemData.ratio_per, itemData.ratio_categories);

    // Close modal immediately
    setShowItemEditor(false);
    setEditingItem(undefined);

    try {
      if (editingItem?.id) {
        const updateData = {
          name: itemData.name,
          cost_nature_id: itemData.cost_nature_id,
          payment_flow: itemData.payment_flow || undefined,
          supplier_id: itemData.supplier_id,
          unit_cost: itemData.unit_cost,
          currency: itemData.currency || 'THB',
          ...ratio,
          times_type: itemData.times_type || 'service_days',
          times_value: itemData.quantity || 1,
          condition_option_id: itemData.condition_option_id !== undefined ? itemData.condition_option_id : undefined,
        };

        // 1. Optimistic update
        setLocalItems(prev => prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                name: updateData.name || item.name,
                unit_cost: updateData.unit_cost ?? item.unit_cost,
                currency: updateData.currency || item.currency,
                quantity: itemData.quantity || 1,
                payment_flow: itemData.payment_flow,
                cost_nature_id: updateData.cost_nature_id ?? item.cost_nature_id,
                cost_nature_code: itemData.cost_nature_code || item.cost_nature_code,
                supplier_id: updateData.supplier_id ?? item.supplier_id,
              } as Item
            : item
        ));

        // 2. Background save
        await updateItem({ itemId: editingItem.id, data: updateData });
      } else {
        // Create new
        const newItemData = {
          name: itemData.name || 'Nouvelle prestation',
          cost_nature_id: itemData.cost_nature_id || undefined,
          payment_flow: itemData.payment_flow || undefined,
          supplier_id: itemData.supplier_id || undefined,
          unit_cost: itemData.unit_cost || 0,
          currency: itemData.currency || 'THB',
          pricing_method: 'quotation',
          ...ratio,
          times_type: itemData.times_type || 'service_days',
          times_value: itemData.quantity || 1,
          condition_option_id: itemData.condition_option_id !== undefined ? itemData.condition_option_id : undefined,
          sort_order: localItems.length,
        };

        // 1. Optimistic add
        const tempId = -Date.now();
        const optimisticItem = { id: tempId, formula_id: formula.id, quantity: itemData.quantity || 1, ...newItemData } as Item;
        setLocalItems(prev => [...prev, optimisticItem]);

        // 2. Background save
        const created = await createItem({ formulaId: formula.id, data: newItemData });
        if (created) {
          setLocalItems(prev => prev.map(item => item.id === tempId ? (created as unknown as Item) : item));
        }
      }
    } catch (err) {
      onRefetch();
      console.error('Failed to save item:', err);
    }
  };

  return (
    <>
      <div className="group border border-gray-200 rounded-lg hover:border-primary-200 transition-colors">
        {/* Formula header row */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Name — inline editable */}
          {isEditingName ? (
            <input
              type="text"
              defaultValue={formula.name}
              autoFocus
              className="flex-1 min-w-0 text-sm font-medium border border-primary-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-primary-500 outline-none"
              onBlur={(e) => {
                if (e.target.value !== formula.name) {
                  onUpdateFormula(formula.id, { name: e.target.value });
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
            />
          ) : (
            <span
              className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate cursor-pointer hover:text-primary-600"
              onClick={() => setIsEditingName(true)}
              title="Cliquer pour renommer"
            >
              {formula.name}
            </span>
          )}

          {/* Day range badge — compact, clickable */}
          {editingDayRange ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <select
                value={dayStart}
                onChange={(e) => {
                  const newStart = parseInt(e.target.value);
                  onUpdateFormula(formula.id, {
                    service_day_start: newStart,
                    service_day_end: Math.max(newStart, dayEnd),
                  });
                }}
                className="w-14 text-xs border border-primary-300 rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-primary-500"
                autoFocus
              >
                {Array.from({ length: tripDays }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>J{d}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">→</span>
              <select
                value={dayEnd}
                onChange={(e) => {
                  onUpdateFormula(formula.id, {
                    service_day_end: parseInt(e.target.value),
                  });
                }}
                className="w-14 text-xs border border-primary-300 rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-primary-500"
              >
                {Array.from({ length: tripDays }, (_, i) => i + 1)
                  .filter(d => d >= dayStart)
                  .map(d => (
                    <option key={d} value={d}>J{d}</option>
                  ))}
              </select>
              <button
                onClick={() => setEditingDayRange(false)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium px-1"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDayRange(true)}
              className="text-xs text-gray-500 bg-gray-100 hover:bg-primary-50 hover:text-primary-600 px-2 py-0.5 rounded-full flex-shrink-0 transition-colors"
              title="Modifier la plage de jours"
            >
              {dayRangeLabel}
            </button>
          )}

          {/* Condition selector — link formula to a condition */}
          {tripConditions && tripConditions.length > 0 && (
            <select
              value={formula.condition_id ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateFormula(formula.id, {
                  condition_id: val ? parseInt(val) : null,
                });
              }}
              className="flex-shrink-0 text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:ring-1 focus:ring-secondary-500 focus:border-secondary-500 max-w-[180px]"
              title="Condition associée"
            >
              <option value="">Sans condition</option>
              {tripConditions.map((tc) => (
                <option key={tc.condition_id} value={tc.condition_id}>
                  {tc.condition_name}
                </option>
              ))}
            </select>
          )}

          {/* Cost display (collapsed) */}
          {!prestationsOpen && totalCost > 0 && (
            <span className="flex-shrink-0 text-xs text-primary-600 font-medium whitespace-nowrap">
              {totalCost.toLocaleString('fr-FR')} THB
            </span>
          )}

          {/* Delete button */}
          <button
            onClick={() => onDeleteFormula(formula.id)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
            title="Supprimer"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* ─── Prestations — collapsible ─────────────────────────────── */}
        <div className="border-t border-gray-100">
          <button
            onClick={() => setPrestationsOpen(!prestationsOpen)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {prestationsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="font-medium">Prestations</span>
            {localItems.length > 0 && (
              <span className="text-gray-400 ml-1">
                ({localItems.length})
              </span>
            )}
            {totalCost > 0 && (
              <span className="text-primary-600 font-medium ml-auto">
                {totalCost.toLocaleString('fr-FR')} THB
              </span>
            )}
          </button>

          {prestationsOpen && (
            <div className="px-3 pb-3 space-y-1.5">
              {/* Existing items */}
              {localItems.map((item) => {
                // Find the condition options available for this formula's condition
                const formulaCondition = formula.condition_id && tripConditions
                  ? tripConditions.find(tc => tc.condition_id === formula.condition_id)
                  : null;
                const conditionOptions = formulaCondition?.options || [];
                const isIncluded = shouldIncludeItem(item, formula, tripConditions);

                return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs group/item transition-opacity ${
                    isIncluded
                      ? 'bg-white border-gray-100'
                      : 'bg-gray-50 border-gray-100 opacity-40'
                  }`}
                >
                  {/* Payment flow inline select */}
                  <select
                    value={item.payment_flow || 'manual'}
                    onChange={async (e) => {
                      const newFlow = e.target.value as PaymentFlow;
                      setLocalItems(prev => prev.map(i =>
                        i.id === item.id ? { ...i, payment_flow: newFlow } as Item : i
                      ));
                      try {
                        await updateItem({ itemId: item.id, data: { payment_flow: newFlow } });
                      } catch {
                        setLocalItems(prev => prev.map(i =>
                          i.id === item.id ? { ...i, payment_flow: item.payment_flow } as Item : i
                        ));
                      }
                    }}
                    className="flex-shrink-0 text-[10px] border rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-primary-400 max-w-[90px] border-gray-200 text-gray-600 cursor-pointer"
                    title="Flux de paiement"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PAYMENT_FLOW_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {/* TTC/HT inline toggle */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newVal = !item.price_includes_vat;
                      setLocalItems(prev => prev.map(i =>
                        i.id === item.id ? { ...i, price_includes_vat: newVal } as Item : i
                      ));
                      try {
                        await updateItem({ itemId: item.id, data: { price_includes_vat: newVal } });
                      } catch {
                        setLocalItems(prev => prev.map(i =>
                          i.id === item.id ? { ...i, price_includes_vat: item.price_includes_vat } as Item : i
                        ));
                      }
                    }}
                    className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                      item.price_includes_vat
                        ? 'bg-sage-50 text-sage-700 border-sage-200 hover:bg-sage-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                    title={item.price_includes_vat ? 'TTC — TVA récupérable' : 'HT — TVA non récupérable'}
                  >
                    {item.price_includes_vat ? 'TTC' : 'HT'}
                  </button>
                  <span className={`font-medium flex-1 truncate ${isIncluded ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{item.name}</span>

                  {/* Inline condition option selector — only when formula has a condition */}
                  {formulaCondition && conditionOptions.length > 0 && (
                    <select
                      value={item.condition_option_id ?? ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const newOptionId = val ? parseInt(val) : null;
                        // Optimistic update
                        setLocalItems(prev => prev.map(i =>
                          i.id === item.id ? { ...i, condition_option_id: newOptionId } as Item : i
                        ));
                        // Persist
                        try {
                          await updateItem({ itemId: item.id, data: { condition_option_id: newOptionId } });
                        } catch (err) {
                          // Rollback
                          setLocalItems(prev => prev.map(i =>
                            i.id === item.id ? { ...i, condition_option_id: item.condition_option_id } as Item : i
                          ));
                          console.error('Failed to update condition option:', err);
                        }
                      }}
                      className={`flex-shrink-0 text-[11px] border rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-sage-500 focus:border-sage-500 max-w-[140px] ${
                        item.condition_option_id
                          ? 'border-sage-300 text-sage-700'
                          : 'border-gray-200 text-gray-400'
                      }`}
                      title={formulaCondition.condition_name}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">— Commun —</option>
                      {conditionOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  <span className="text-primary-600 font-medium whitespace-nowrap">
                    {((item.unit_cost || 0) * serviceDays).toLocaleString('fr-FR')} {item.currency || 'THB'}
                  </span>
                  <button
                    onClick={() => handleEditItem(item as Item)}
                    className="p-0.5 text-gray-300 hover:text-primary-600 opacity-0 group-hover/item:opacity-100 transition-all"
                    title="Modifier"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deletingItemId === item.id}
                    className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deletingItemId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
                );
              })}

              {/* Quick add form */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* Payment flow */}
                <select
                  value={quickFlow}
                  onChange={(e) => setQuickFlow(e.target.value as PaymentFlow)}
                  className="text-[10px] bg-white border border-dashed border-gray-200 rounded px-1 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
                  title="Flux de paiement"
                >
                  {PAYMENT_FLOW_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                {/* TTC/HT toggle */}
                <button
                  type="button"
                  onClick={() => setQuickTTC(!quickTTC)}
                  className={`text-[10px] font-semibold px-1.5 py-1 rounded border transition-colors ${
                    quickTTC
                      ? 'bg-sage-50 text-sage-700 border-sage-200 hover:bg-sage-100'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                  title={quickTTC ? 'TTC — TVA récupérable' : 'HT — TVA non récupérable'}
                >
                  {quickTTC ? 'TTC' : 'HT'}
                </button>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickName.trim()) {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Nom de la prestation..."
                  className="flex-1 min-w-[120px] text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-300 placeholder:text-gray-300"
                />
                <input
                  type="number"
                  value={quickPrice}
                  onChange={(e) => setQuickPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickName.trim()) {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Prix"
                  min={0}
                  step={0.01}
                  className="w-20 text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-300 placeholder:text-gray-300 text-right"
                />
                <select
                  value={quickRatio}
                  onChange={(e) => setQuickRatio(e.target.value as 'set' | 'per_person')}
                  className="text-xs bg-white border border-dashed border-gray-200 rounded px-1.5 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
                  title="Tarification"
                >
                  <option value="set">Forfait</option>
                  <option value="per_person">/ pax</option>
                </select>
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickName.trim() || addingItem}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-1.5 rounded border border-primary-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {addingItem ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Ajouter
                </button>
                {costNatures && costNatures.length > 0 && (
                  <button
                    onClick={() => {
                      setEditingItem({
                        cost_nature_code: 'GDE',
                        times_type: 'service_days',
                      });
                      setShowItemEditor(true);
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded border border-dashed border-gray-300 hover:border-primary-300 transition-colors whitespace-nowrap"
                    title="Ouvrir le formulaire de cotation détaillé"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Détaillé
                  </button>
                )}
              </div>

              {/* Empty state hint */}
              {localItems.length === 0 && !quickName && (
                <p className="text-[10px] text-gray-300 text-center mt-1">
                  Ajoutez des prestations (guide, chauffeur, repas, etc.)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ItemEditor modal */}
      {showItemEditor && costNatures && (
        <ItemEditor
          item={editingItem}
          costNatures={costNatures}
          tripDays={tripDays}
          hideItemDayRange
          serviceDays={serviceDays}
          conditionId={formula.condition_id}
          tripConditions={tripConditions}
          onSave={handleItemEditorSave}
          onCancel={() => {
            setShowItemEditor(false);
            setEditingItem(undefined);
          }}
        />
      )}
    </>
  );
}

// ─── TransversalServicesPanel ───────────────────────────────────────

export function TransversalServicesPanel({
  tripId,
  totalDays,
  costNatures,
  onRefetch,
  conditionsVersion,
}: TransversalServicesPanelProps) {
  // Load trip conditions directly (refreshKey triggers re-fetch when conditions change elsewhere)
  const { tripConditions } = useTripConditions(tripId, conditionsVersion);

  const {
    formulas,
    isLoading,
    refetch,
    create,
    creating,
    update,
    remove,
    removing,
  } = useTransversalFormulas(tripId);

  const [isExpanded, setIsExpanded] = useState(true);

  // Grand total — multiply each item cost by the formula's service days, filtered by conditions
  const grandTotal = formulas.reduce((total, f) => {
    const fStart = f.service_day_start ?? 1;
    const fEnd = f.service_day_end ?? fStart;
    const fDays = fEnd - fStart + 1;
    return total + (f.items || [])
      .filter(i => shouldIncludeItem(i, f, tripConditions))
      .reduce((s, i) => s + ((i.unit_cost || 0) * fDays), 0);
  }, 0);

  const handleCreateFormula = async () => {
    try {
      await create({
        name: 'Nouvelle prestation',
        service_day_start: 1,
        service_day_end: totalDays || 1,
        block_type: 'service',
      });
      await refetch();
      onRefetch();
    } catch {
      // handled by hook
    }
  };

  const handleUpdateFormula = async (formulaId: number, data: { name?: string; service_day_start?: number | null; service_day_end?: number | null; condition_id?: number | null }) => {
    try {
      await update({ formulaId, data });
      await refetch();
      onRefetch();
    } catch {
      // handled by hook
    }
  };

  const handleDeleteFormula = async (formulaId: number) => {
    try {
      await remove(formulaId);
      await refetch();
      onRefetch();
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          <span className="font-display font-semibold text-sm text-gray-800">
            Prestations transversales
          </span>
          {formulas.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {formulas.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {grandTotal > 0 && (
            <span className="text-xs font-medium text-primary-600">
              {grandTotal.toLocaleString('fr-FR')} THB
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content — collapsible */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : formulas.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Aucune prestation transversale configurée.
              </p>
              <button
                onClick={handleCreateFormula}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Ajouter une prestation
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {/* Formula rows */}
              {formulas.map((formula) => (
                <TransversalFormulaRow
                  key={formula.id}
                  formula={formula}
                  onUpdateFormula={handleUpdateFormula}
                  onDeleteFormula={handleDeleteFormula}
                  isDeleting={removing}
                  costNatures={costNatures}
                  tripConditions={tripConditions}
                  tripDays={totalDays}
                  onRefetch={() => { refetch(); onRefetch(); }}
                />
              ))}

              {/* Add button */}
              <button
                onClick={handleCreateFormula}
                disabled={creating}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md border border-dashed border-primary-200 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Ajouter une prestation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
