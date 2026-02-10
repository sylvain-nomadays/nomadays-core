'use client';

import { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  SlidersHorizontal,
  Coffee,
  UtensilsCrossed,
  Soup,
} from 'lucide-react';
import { useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useFormulaItems';
import ItemEditor from '@/components/circuits/ItemEditor';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { Formula, Item, CostNature, PaymentFlow } from '@/lib/api/types';
import { mapRatioRule } from '@/lib/ratioUtils';

/** Compact payment flow options for inline selects */
const PAYMENT_FLOW_OPTIONS: { value: PaymentFlow; label: string; colorClass: string }[] = [
  { value: 'booking', label: 'Fournisseur', colorClass: 'text-blue-600' },
  { value: 'advance', label: 'Allowance', colorClass: 'text-amber-600' },
  { value: 'purchase_order', label: 'Achat bureau', colorClass: 'text-purple-600' },
  { value: 'payroll', label: 'Salaire', colorClass: 'text-emerald-600' },
  { value: 'manual', label: 'Manuel', colorClass: 'text-gray-500' },
];

/** Meals included metadata — stored as JSON prefix in description_html */
interface ActivityMeals {
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
}

function parseActivityMeals(descriptionHtml?: string): { meals: ActivityMeals; text: string } {
  if (!descriptionHtml) return { meals: {}, text: '' };
  // Try to detect JSON metadata prefix: <!--meals:{"breakfast":true}-->
  const mealMatch = descriptionHtml.match(/^<!--meals:(.*?)-->/);
  if (mealMatch && mealMatch[1]) {
    try {
      const meals = JSON.parse(mealMatch[1]) as ActivityMeals;
      const text = descriptionHtml.slice(mealMatch[0].length);
      return { meals, text };
    } catch {
      // parse error
    }
  }
  return { meals: {}, text: descriptionHtml };
}

function serializeActivityMeals(meals: ActivityMeals, text: string): string {
  const hasMeal = meals.breakfast || meals.lunch || meals.dinner;
  if (!hasMeal) return text;
  return `<!--meals:${JSON.stringify(meals)}-->${text}`;
}

interface ActivityBlockProps {
  block: Formula;
  tripId: number;
  onUpdate?: (data: { name?: string; description_html?: string }) => void;
  onDelete?: () => void;
  onRefetch?: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
  /** Cost natures for ItemEditor */
  costNatures?: CostNature[];
  /** Number of trip days for ItemEditor day range */
  tripDays?: number;
  /** Current day number (1-based) for pre-filling day_start/day_end */
  dayNumber?: number;
  /** Called when meal inclusion changes */
  onMealsChanged?: (meals: { breakfast: boolean; lunch: boolean; dinner: boolean }) => void;
}

export function ActivityBlock({
  block,
  tripId,
  onUpdate,
  onDelete,
  onRefetch,
  dragListeners,
  dragAttributes,
  costNatures,
  tripDays,
  dayNumber,
  onMealsChanged,
}: ActivityBlockProps) {
  // Parse meals + text from description_html
  const parsed = parseActivityMeals(block.description_html);
  const [title, setTitle] = useState(block.name || '');
  const [description, setDescription] = useState(parsed.text);
  const [meals, setMeals] = useState<ActivityMeals>(parsed.meals);

  // Sync meals from server
  useEffect(() => {
    const p = parseActivityMeals(block.description_html);
    setMeals(p.meals);
    setDescription(p.text);
  }, [block.description_html]);
  const [prestationsOpen, setPrestationsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Item management state
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

  // ─── Optimistic local items state ─────────────────────────────────
  const [localItems, setLocalItems] = useState(block.items || []);

  // Sync from server when block.items change
  useEffect(() => {
    setLocalItems(block.items || []);
  }, [block.items]);

  const directItems = localItems;
  const totalCost = directItems.reduce((s, item) => s + ((item.unit_cost || 0) * (item.quantity || 1)), 0);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [description]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate?.({ name: value });
    }, 500);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate?.({ description_html: serializeActivityMeals(meals, value) });
    }, 500);
  };

  const handleMealToggle = (meal: 'breakfast' | 'lunch' | 'dinner') => {
    const updatedMeals = { ...meals, [meal]: !meals[meal] };
    setMeals(updatedMeals);
    onUpdate?.({ description_html: serializeActivityMeals(updatedMeals, description) });
    onMealsChanged?.({
      breakfast: updatedMeals.breakfast ?? false,
      lunch: updatedMeals.lunch ?? false,
      dinner: updatedMeals.dinner ?? false,
    });
  };

  // ─── Item handlers (optimistic) ───────────────────────────────────

  // Quick add item — optimistic
  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    setAddingItem(true);

    const ratioType = quickRatio === 'set' ? 'set' : 'ratio';
    const ratioCategories = 'adult';
    const newItemData = {
      name: quickName.trim(),
      unit_cost: quickPrice ? parseFloat(quickPrice) : 0,
      currency: 'THB',
      pricing_method: 'quotation',
      ratio_type: ratioType,
      ratio_per: 1,
      ratio_categories: ratioCategories,
      times_type: 'fixed',
      times_value: 1,
      sort_order: directItems.length,
      payment_flow: quickFlow,
      price_includes_vat: quickTTC,
    };

    // 1. Optimistic: add placeholder
    const tempId = -Date.now();
    const optimisticItem = { id: tempId, formula_id: block.id, quantity: 1, ...newItemData } as Item;
    setLocalItems(prev => [...prev, optimisticItem]);
    setQuickName('');
    setQuickPrice('');

    try {
      // 2. Background save
      const created = await createItem({
        formulaId: block.id,
        data: newItemData,
      });
      if (created) {
        setLocalItems(prev => prev.map(item => item.id === tempId ? (created as unknown as Item) : item));
      }
    } catch (err: unknown) {
      // Rollback
      setLocalItems(prev => prev.filter(item => item.id !== tempId));
      console.error('Failed to create item:', err);
    } finally {
      setAddingItem(false);
    }
  };

  // Delete item — optimistic
  const handleDeleteItem = async (itemId: number) => {
    const removedItem = directItems.find(i => i.id === itemId);
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
          times_type: 'fixed',
          times_value: itemData.quantity || 1,
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
        const newItemData = {
          name: itemData.name || 'Nouvelle prestation',
          cost_nature_id: itemData.cost_nature_id || undefined,
          payment_flow: itemData.payment_flow || undefined,
          supplier_id: itemData.supplier_id || undefined,
          unit_cost: itemData.unit_cost || 0,
          currency: itemData.currency || 'THB',
          pricing_method: 'quotation',
          ...ratio,
          times_type: 'fixed',
          times_value: itemData.quantity || 1,
          sort_order: directItems.length,
        };

        // 1. Optimistic add
        const tempId = -Date.now();
        const optimisticItem = { id: tempId, formula_id: block.id, quantity: itemData.quantity || 1, ...newItemData } as Item;
        setLocalItems(prev => [...prev, optimisticItem]);

        // 2. Background save
        const created = await createItem({ formulaId: block.id, data: newItemData });
        if (created) {
          setLocalItems(prev => prev.map(item => item.id === tempId ? (created as unknown as Item) : item));
        }
      }
    } catch (err) {
      onRefetch?.();
      console.error('Failed to save item:', err);
    }
  };

  return (
    <>
      <div className="group relative rounded-lg border border-blue-200 bg-blue-50/30 hover:border-blue-300 transition-colors">
        {/* Header */}
        <div className="flex items-start gap-2 p-3">
          {/* Drag handle */}
          <div
            className="flex-shrink-0 mt-1 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
            {...dragListeners}
            {...dragAttributes}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Title + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Nom de l'activité..."
                className="flex-1 bg-transparent border-0 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 p-0"
              />
            </div>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Description de l'activité..."
              className="w-full resize-none border-0 bg-transparent text-sm text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-0 p-0"
              rows={2}
            />
          </div>

          {/* Meal inclusion toggles */}
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-1">
            <button
              type="button"
              onClick={() => handleMealToggle('breakfast')}
              className={`p-0.5 rounded transition-colors ${meals.breakfast ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-gray-400'}`}
              title={meals.breakfast ? 'Petit-déjeuner inclus' : 'Petit-déjeuner non inclus'}
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMealToggle('lunch')}
              className={`p-0.5 rounded transition-colors ${meals.lunch ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-gray-400'}`}
              title={meals.lunch ? 'Déjeuner inclus' : 'Déjeuner non inclus'}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMealToggle('dinner')}
              className={`p-0.5 rounded transition-colors ${meals.dinner ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-gray-400'}`}
              title={meals.dinner ? 'Dîner inclus' : 'Dîner non inclus'}
            >
              <Soup className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cost badge (when prestations are collapsed) */}
          {!prestationsOpen && totalCost > 0 && (
            <span className="flex-shrink-0 text-[10px] text-blue-600 font-medium whitespace-nowrap mt-1">
              {totalCost.toLocaleString('fr-FR')} THB
            </span>
          )}

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
            title="Supprimer ce bloc"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* PRESTATIONS — collapsible                                    */}
        {/* ============================================================ */}
        <div className="border-t border-blue-100">
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
            {directItems.length > 0 && (
              <span className="text-gray-400 ml-1">
                ({directItems.length})
              </span>
            )}
            {totalCost > 0 && (
              <span className="text-blue-600 font-medium ml-auto">
                {totalCost.toLocaleString('fr-FR')} THB
              </span>
            )}
          </button>

          {prestationsOpen && (
            <div className="px-3 pb-3 space-y-1.5">
              {/* Existing items */}
              {directItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-gray-100 text-xs group/item"
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
                    className="flex-shrink-0 text-[10px] border rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-blue-400 max-w-[90px] border-gray-200 text-gray-600 cursor-pointer"
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
                  <span className="font-medium text-gray-700 flex-1 truncate">{item.name}</span>
                  <span className="text-blue-600 font-medium whitespace-nowrap">
                    {((item.unit_cost || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} {item.currency || 'THB'}
                  </span>
                  <button
                    onClick={() => handleEditItem(item as Item)}
                    className="p-0.5 text-gray-300 hover:text-blue-600 opacity-0 group-hover/item:opacity-100 transition-all"
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
              ))}

              {/* Quick add form */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* Payment flow */}
                <select
                  value={quickFlow}
                  onChange={(e) => setQuickFlow(e.target.value as PaymentFlow)}
                  className="text-[10px] bg-white border border-dashed border-gray-200 rounded px-1 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
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
                  className="flex-1 min-w-[120px] text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300 placeholder:text-gray-300"
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
                  className="w-20 text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300 placeholder:text-gray-300 text-right"
                />
                <select
                  value={quickRatio}
                  onChange={(e) => setQuickRatio(e.target.value as 'set' | 'per_person')}
                  className="text-xs bg-white border border-dashed border-gray-200 rounded px-1.5 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  title="Tarification"
                >
                  <option value="set">Forfait</option>
                  <option value="per_person">/ pax</option>
                </select>
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickName.trim() || addingItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded border border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
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
                      setEditingItem({ cost_nature_code: 'ACT', day_start: dayNumber || 1, day_end: dayNumber || 1 });
                      setShowItemEditor(true);
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded border border-dashed border-gray-300 hover:border-blue-300 transition-colors whitespace-nowrap"
                    title="Ouvrir le formulaire de cotation détaillé"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Détaillé
                  </button>
                )}
              </div>

              {/* Empty state hint */}
              {directItems.length === 0 && !quickName && (
                <p className="text-[10px] text-gray-300 text-center mt-1">
                  Ajoutez des prestations (entrée, guide, etc.)
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
          tripDays={tripDays || 7}
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
