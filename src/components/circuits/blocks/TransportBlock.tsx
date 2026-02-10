'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  GripVertical,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Car,
  Plane,
  TrainFront,
  Ship,
  Footprints,
  Bike,
  Waves,
  Loader2,
  Clock,
  Ruler,
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { LocationSelector } from '@/components/suppliers/LocationSelector';
import { useLocations } from '@/hooks/useLocations';
import { useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useFormulaItems';
import ItemEditor from '@/components/circuits/ItemEditor';
import type { Formula, TransportMeta, TransportMode, Item, CostNature, PaymentFlow } from '@/lib/api/types';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { mapRatioRule } from '@/lib/ratioUtils';

/** Compact payment flow options for inline selects */
const PAYMENT_FLOW_OPTIONS: { value: PaymentFlow; label: string; colorClass: string }[] = [
  { value: 'booking', label: 'Fournisseur', colorClass: 'text-blue-600' },
  { value: 'advance', label: 'Allowance', colorClass: 'text-amber-600' },
  { value: 'purchase_order', label: 'Achat bureau', colorClass: 'text-purple-600' },
  { value: 'payroll', label: 'Salaire', colorClass: 'text-emerald-600' },
  { value: 'manual', label: 'Manuel', colorClass: 'text-gray-500' },
];

// ============================================================================
// Transport mode configuration
// ============================================================================

interface TransportModeConfig {
  value: TransportMode;
  label: string;
  icon: React.ReactNode;
  emoji?: string;
}

const TRANSPORT_MODES: TransportModeConfig[] = [
  { value: 'driving', label: 'Route / Transfert', icon: <Car className="w-3.5 h-3.5" />, emoji: '🚗' },
  { value: 'flight', label: 'Vol', icon: <Plane className="w-3.5 h-3.5" />, emoji: '✈️' },
  { value: 'transit', label: 'Train', icon: <TrainFront className="w-3.5 h-3.5" />, emoji: '🚂' },
  { value: 'boat', label: 'Bateau', icon: <Ship className="w-3.5 h-3.5" />, emoji: '🚢' },
  { value: 'walking', label: 'Trek / Randonnée', icon: <Footprints className="w-3.5 h-3.5" />, emoji: '🥾' },
  { value: 'horse', label: 'Cheval', emoji: '🐎', icon: <span className="text-sm leading-none">🐎</span> },
  { value: 'camel', label: 'Chameau', emoji: '🐪', icon: <span className="text-sm leading-none">🐪</span> },
  { value: 'bicycle', label: 'Vélo', icon: <Bike className="w-3.5 h-3.5" />, emoji: '🚲' },
  { value: 'kayak', label: 'Kayak', icon: <Waves className="w-3.5 h-3.5" />, emoji: '🛶' },
];

function getModeConfig(mode: TransportMode): TransportModeConfig {
  return TRANSPORT_MODES.find(m => m.value === mode) ?? TRANSPORT_MODES[0]!;
}

// ============================================================================
// Metadata parsing
// ============================================================================

function parseTransportMeta(descriptionHtml?: string): TransportMeta | null {
  if (!descriptionHtml) return null;
  try {
    const parsed = JSON.parse(descriptionHtml);
    if (parsed && typeof parsed === 'object' && parsed.travel_mode) {
      return parsed as TransportMeta;
    }
  } catch {
    // Not JSON (legacy or text content)
  }
  return null;
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// ============================================================================
// Component
// ============================================================================

interface TransportBlockProps {
  block: Formula;
  tripId: number;
  onUpdate?: (data: { name?: string; description_html?: string }) => void;
  onDelete?: () => void;
  onRefetch?: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
  costNatures?: CostNature[];
  tripDays?: number;
  /** Current day number (1-based) for pre-filling day_start/day_end */
  dayNumber?: number;
}

export function TransportBlock({
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
}: TransportBlockProps) {
  // Parse initial metadata
  const initialMeta = parseTransportMeta(block.description_html);

  // Local state
  const [travelMode, setTravelMode] = useState<TransportMode>(initialMeta?.travel_mode || 'driving');
  const [narrativeText, setNarrativeText] = useState(initialMeta?.narrative_text || '');
  const [fromLocationId, setFromLocationId] = useState<number | null>(initialMeta?.from_location_id || null);
  const [toLocationId, setToLocationId] = useState<number | null>(initialMeta?.to_location_id || null);
  const [fromName, setFromName] = useState(initialMeta?.location_from_name || '');
  const [toName, setToName] = useState(initialMeta?.location_to_name || '');
  const [distanceKm, setDistanceKm] = useState<number | undefined>(initialMeta?.distance_km);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(initialMeta?.duration_minutes);

  // UI state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [prestationsOpen, setPrestationsOpen] = useState(false);

  // Item management state
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickRatio, setQuickRatio] = useState<'set' | 'per_person' | 'per_vehicle'>('set');
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

  // Location lookup for resolving names from IDs
  const { locations } = useLocations({ is_active: true, page_size: 200 });

  const debounceRef = useRef<NodeJS.Timeout>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current mode config
  const modeConfig = getModeConfig(travelMode);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 24)}px`;
    }
  }, [narrativeText]);

  // Resolve location name from ID
  const getLocationName = useCallback((locationId: number | null): string => {
    if (!locationId) return '';
    const loc = locations.find(l => l.id === locationId);
    return loc?.name || '';
  }, [locations]);

  // Build and persist metadata (debounced)
  const persistMeta = useCallback((overrides: Partial<TransportMeta> = {}) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const meta: TransportMeta = {
        travel_mode: overrides.travel_mode ?? travelMode,
        narrative_text: overrides.narrative_text !== undefined ? overrides.narrative_text : (narrativeText || undefined),
        from_location_id: overrides.from_location_id !== undefined ? overrides.from_location_id : fromLocationId || undefined,
        to_location_id: overrides.to_location_id !== undefined ? overrides.to_location_id : toLocationId || undefined,
        location_from_name: overrides.location_from_name !== undefined ? overrides.location_from_name : (fromName || undefined),
        location_to_name: overrides.location_to_name !== undefined ? overrides.location_to_name : (toName || undefined),
        distance_km: overrides.distance_km !== undefined ? overrides.distance_km : distanceKm,
        duration_minutes: overrides.duration_minutes !== undefined ? overrides.duration_minutes : durationMinutes,
      };
      onUpdate?.({ description_html: JSON.stringify(meta) });
    }, 500);
  }, [travelMode, narrativeText, fromLocationId, toLocationId, fromName, toName, distanceKm, durationMinutes, onUpdate]);

  // Handlers
  const handleModeChange = (newMode: TransportMode) => {
    setTravelMode(newMode);
    persistMeta({ travel_mode: newMode });
  };

  const handleNarrativeChange = (value: string) => {
    setNarrativeText(value);
    persistMeta({ narrative_text: value || undefined });
  };

  const handleFromChange = (locationId: number | null) => {
    setFromLocationId(locationId);
    const name = locationId ? getLocationName(locationId) : '';
    setFromName(name);
    persistMeta({ from_location_id: locationId || undefined, location_from_name: name || undefined });
  };

  const handleToChange = (locationId: number | null) => {
    setToLocationId(locationId);
    const name = locationId ? getLocationName(locationId) : '';
    setToName(name);
    persistMeta({ to_location_id: locationId || undefined, location_to_name: name || undefined });
  };

  const handleDistanceChange = (value: string) => {
    const km = value ? parseFloat(value) : undefined;
    setDistanceKm(km);
    persistMeta({ distance_km: km });
  };

  const handleDurationChange = (value: string) => {
    const mins = value ? parseInt(value, 10) : undefined;
    setDurationMinutes(mins);
    persistMeta({ duration_minutes: mins });
  };

  // ─── Optimistic local items state ─────────────────────────────────
  // Items are managed locally for instant UI feedback.
  // API calls happen in background; onRefetch is only called for structural changes.
  const [localItems, setLocalItems] = useState(block.items || []);

  // Sync from server when block.items change (e.g. after parent refetch)
  useEffect(() => {
    setLocalItems(block.items || []);
  }, [block.items]);

  const directItems = localItems;
  const totalCost = directItems.reduce((s, item) => s + ((item.unit_cost || 0) * (item.quantity || 1)), 0);

  // Quick add item handler — optimistic
  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    setAddingItem(true);

    const ratioType = quickRatio === 'set' ? 'set' : 'ratio';
    const ratioCategories = quickRatio === 'per_person' ? 'adult' : 'adult';
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

    // 1. Optimistic: add placeholder item to local state immediately
    const tempId = -Date.now(); // negative temp ID
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
      // Replace temp item with real item from server
      if (created) {
        setLocalItems(prev => prev.map(item => item.id === tempId ? (created as unknown as Item) : item));
      }
    } catch (err: unknown) {
      // Rollback: remove the optimistic item
      setLocalItems(prev => prev.filter(item => item.id !== tempId));
      console.error('Failed to create item:', err);
    } finally {
      setAddingItem(false);
    }
  };

  // Delete item handler — optimistic
  const handleDeleteItem = async (itemId: number) => {
    // 1. Optimistic: remove from local state immediately
    const removedItem = directItems.find(i => i.id === itemId);
    setLocalItems(prev => prev.filter(i => i.id !== itemId));
    setDeletingItemId(itemId);

    try {
      // 2. Background delete
      await deleteItemMutation(itemId);
    } catch (err) {
      // Rollback: re-add the item
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

    // Close modal immediately for snappy UX
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

        // 1. Optimistic: update local item immediately
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

        // 1. Optimistic: add placeholder
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
      // On error, refetch to get correct state from server
      onRefetch?.();
      console.error('Failed to save item:', err);
    }
  };

  // Build compact summary for the header badge
  const summaryParts: string[] = [];
  if (fromName && toName) summaryParts.push(`${fromName} → ${toName}`);
  else if (fromName) summaryParts.push(`Depuis ${fromName}`);
  else if (toName) summaryParts.push(`Vers ${toName}`);
  if (durationMinutes) summaryParts.push(formatDuration(durationMinutes));
  if (distanceKm) summaryParts.push(`${distanceKm}km`);
  const summaryText = summaryParts.join(' • ');

  return (
    <>
      <div className="group relative rounded-lg border border-purple-200 bg-purple-50/30 hover:border-purple-300 transition-colors">

        {/* ============================================================ */}
        {/* COMPACT HEADER — always visible (~45px)                      */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 p-2.5">
          {/* Drag handle */}
          <div
            className="flex-shrink-0 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
            {...dragListeners}
            {...dragAttributes}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Mode emoji */}
          <span className="flex-shrink-0 text-sm" title={modeConfig.label}>
            {modeConfig.emoji || '🚗'}
          </span>

          {/* Narrative text input (inline, single line) */}
          <textarea
            ref={textareaRef}
            value={narrativeText}
            onChange={(e) => handleNarrativeChange(e.target.value)}
            placeholder="Description du déplacement..."
            className="flex-1 min-w-0 resize-none border-0 bg-transparent text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-0 p-0 leading-6"
            rows={1}
          />

          {/* Summary badge (when collapsed & has route data) */}
          {!detailsOpen && summaryText && (
            <span className="flex-shrink-0 text-[10px] text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[200px] truncate">
              {summaryText}
            </span>
          )}

          {/* Prestations count badge */}
          {!detailsOpen && directItems.length > 0 && (
            <span className="flex-shrink-0 text-[10px] text-purple-600 font-medium whitespace-nowrap">
              {totalCost.toLocaleString('fr-FR')} THB
            </span>
          )}

          {/* Expand/collapse toggle */}
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex-shrink-0 p-1 text-gray-300 hover:text-purple-500 transition-colors rounded hover:bg-purple-100"
            title={detailsOpen ? 'Réduire' : 'Détails'}
          >
            {detailsOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

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
        {/* DETAILS PANEL — collapsible                                  */}
        {/* ============================================================ */}
        {detailsOpen && (
          <div className="border-t border-purple-100 px-3 py-2.5 space-y-2.5">
            {/* Mode selector + locations row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mode select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Mode</span>
                <select
                  value={travelMode}
                  onChange={(e) => handleModeChange(e.target.value as TransportMode)}
                  className="text-xs bg-white border border-purple-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                >
                  {TRANSPORT_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.emoji ? `${mode.emoji} ` : ''}{mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location fields */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* From */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                <span className="text-xs text-gray-400 w-6 flex-shrink-0 text-right">De</span>
                <LocationSelector
                  value={fromLocationId}
                  onChange={handleFromChange}
                  placeholder="Départ..."
                  allowCreate
                  clearable
                  className="flex-1 h-8 text-xs"
                />
              </div>
              {/* To */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                <span className="text-xs text-gray-400 w-6 flex-shrink-0 text-right">→</span>
                <LocationSelector
                  value={toLocationId}
                  onChange={handleToChange}
                  placeholder="Arrivée..."
                  allowCreate
                  clearable
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            {/* Duration / Distance */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Duration input */}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <input
                  type="number"
                  min={0}
                  value={durationMinutes ?? ''}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  placeholder="min"
                  className="w-16 text-xs bg-white border border-gray-200 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <span className="text-xs text-gray-400">min</span>
                {durationMinutes ? (
                  <span className="text-xs text-gray-500 ml-0.5">({formatDuration(durationMinutes)})</span>
                ) : null}
              </div>

              {/* Distance input */}
              <div className="flex items-center gap-1">
                <Ruler className="w-3 h-3 text-gray-400" />
                <input
                  type="number"
                  min={0}
                  value={distanceKm ?? ''}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  placeholder="km"
                  className="w-16 text-xs bg-white border border-gray-200 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <span className="text-xs text-gray-400">km</span>
              </div>
            </div>

            {/* ============================================================ */}
            {/* PRESTATIONS — nested collapsible                             */}
            {/* ============================================================ */}
            <div className="border-t border-purple-100 pt-2">
              <button
                onClick={() => setPrestationsOpen(!prestationsOpen)}
                className="w-full flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
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
                  <span className="text-purple-600 font-medium ml-auto">
                    {totalCost.toLocaleString('fr-FR')} THB
                  </span>
                )}
              </button>

              {prestationsOpen && (
                <div className="mt-2 space-y-1.5">
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
                        className="flex-shrink-0 text-[10px] border rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-purple-400 max-w-[90px] border-gray-200 text-gray-600 cursor-pointer"
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
                      <span className="text-purple-600 font-medium whitespace-nowrap">
                        {((item.unit_cost || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} {item.currency || 'THB'}
                      </span>
                      <button
                        onClick={() => handleEditItem(item as Item)}
                        className="p-0.5 text-gray-300 hover:text-purple-600 opacity-0 group-hover/item:opacity-100 transition-all"
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
                      className="text-[10px] bg-white border border-dashed border-gray-200 rounded px-1 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
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
                      className="flex-1 min-w-[120px] text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-300 placeholder:text-gray-300"
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
                      className="w-20 text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-300 placeholder:text-gray-300 text-right"
                    />
                    <select
                      value={quickRatio}
                      onChange={(e) => setQuickRatio(e.target.value as 'set' | 'per_person' | 'per_vehicle')}
                      className="text-xs bg-white border border-dashed border-gray-200 rounded px-1.5 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                      title="Tarification"
                    >
                      <option value="set">Forfait</option>
                      <option value="per_person">/ pax</option>
                      <option value="per_vehicle">/ véhicule</option>
                    </select>
                    <button
                      onClick={handleQuickAdd}
                      disabled={!quickName.trim() || addingItem}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1.5 rounded border border-purple-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {addingItem ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Ajouter
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem({ cost_nature_code: 'TRS', day_start: dayNumber || 1, day_end: dayNumber || 1 });
                        setShowItemEditor(true);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-700 hover:bg-purple-50 px-2 py-1.5 rounded border border-dashed border-gray-300 hover:border-purple-300 transition-colors whitespace-nowrap"
                      title="Ouvrir le formulaire de cotation détaillé"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      Détaillé
                    </button>
                  </div>

                  {/* Empty state hint */}
                  {directItems.length === 0 && !quickName && (
                    <p className="text-[10px] text-gray-300 text-center mt-1">
                      Ajoutez des prestations (transfert, vol, etc.)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ItemEditor modal */}
      {showItemEditor && costNatures && (
        <ItemEditor
          item={editingItem}
          costNatures={costNatures}
          tripDays={tripDays || 7}
          defaultCurrency="THB"
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
