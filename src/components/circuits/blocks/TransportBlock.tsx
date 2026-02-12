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
  Bookmark,
  LayoutTemplate,
} from 'lucide-react';
import { LocationSelector } from '@/components/suppliers/LocationSelector';
import { useLocations } from '@/hooks/useLocations';
import { useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useFormulaItems';
import ItemEditor from '@/components/circuits/ItemEditor';
import { RichTextEditor } from '@/components/editor';
import SaveAsTemplateDialog from '@/components/templates/SaveAsTemplateDialog';
import TemplateSyncDialog from '@/components/templates/TemplateSyncDialog';
import { getBlockSyncStatus } from '@/hooks/useTemplateSync';
import type { Formula, TransportMeta, TransportMode, Item, CostNature, PaymentFlow } from '@/lib/api/types';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { mapRatioRule } from '@/lib/ratioUtils';

/** Compact payment flow options for inline selects */
const PAYMENT_FLOW_OPTIONS: { value: PaymentFlow; label: string; colorClass: string }[] = [
  { value: 'booking', label: 'Fournisseur', colorClass: 'text-blue-600' },
  { value: 'advance', label: 'Allowance', colorClass: 'text-amber-600' },
  { value: 'purchase_order', label: 'Achat bureau', colorClass: 'text-[#C97A56]' },
  { value: 'payroll', label: 'Salaire', colorClass: 'text-[#8BA080]' },
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
  /** VAT calculation mode — hides TTC/HT toggle when 'on_margin' */
  vatMode?: 'on_margin' | 'on_selling_price';
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
  vatMode,
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

  // Template state
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const syncStatus = getBlockSyncStatus(block);

  // Item CRUD hooks
  const { mutate: createItem } = useCreateItem();
  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItemMutation } = useDeleteItem();

  // Location lookup for resolving names from IDs
  const { locations } = useLocations({ is_active: true, page_size: 200 });

  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Current mode config
  const modeConfig = getModeConfig(travelMode);

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

  const handleNarrativeChange = (html: string) => {
    setNarrativeText(html);
    // RichTextEditor already debounces internally (500ms)
    persistMeta({ narrative_text: html || undefined });
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
      <div className="group relative rounded-lg border border-[#F7D7CB] bg-[#FDF5F2]/30 hover:border-[#F3C3B1] transition-colors">

        {/* ============================================================ */}
        {/* COMPACT HEADER — always visible (~45px)                      */}
        {/* ============================================================ */}
        <div className="flex items-start gap-2 p-2.5">
          {/* Drag handle */}
          <div
            className="flex-shrink-0 mt-1 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
            {...dragListeners}
            {...dragAttributes}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Content column: emoji + editor */}
          <div className="flex-1 min-w-0 flex items-start gap-2">
            <span className="flex-shrink-0 text-sm mt-0.5" title={modeConfig.label}>
              {modeConfig.emoji || '🚗'}
            </span>
            <div className="flex-1 min-w-0">
              <RichTextEditor
                content={narrativeText}
                onChange={handleNarrativeChange}
                placeholder="Description du déplacement..."
                inline
                enableContentRefs
              />
            </div>
          </div>

          {/* Right-side action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-1">
            {/* Template sync indicator */}
            {syncStatus !== 'no_template' && (
              <button
                onClick={() => setShowSyncDialog(true)}
                className={`flex-shrink-0 p-1 transition-all ${
                  syncStatus === 'template_updated'
                    ? 'text-amber-500 animate-pulse'
                    : 'text-emerald-400 opacity-0 group-hover:opacity-100'
                }`}
                title={syncStatus === 'template_updated' ? 'Template mis à jour' : 'Lié à un template'}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save as template button */}
            <button
              onClick={() => setShowSaveAsTemplate(true)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#0FB6BC] transition-all p-1"
              title="Sauvegarder comme template"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            {/* Delete button */}
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
              title="Supprimer ce bloc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRESTATIONS — always visible, like ActivityBlock              */}
        {/* ============================================================ */}
        <div className="border-t border-[#FBEBE5]">
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
            {/* Route summary badge — click to open/edit details */}
            {summaryText ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsOpen(!detailsOpen);
                }}
                className="text-[10px] text-[#DD9371] bg-[#FBEBE5] hover:bg-[#F7D7CB] px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[250px] truncate ml-1 cursor-pointer transition-colors"
                title="Cliquer pour modifier les détails du trajet"
              >
                {summaryText}
              </span>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsOpen(!detailsOpen);
                }}
                className="text-[10px] text-[#E8AB91] hover:text-[#C97A56] bg-[#FDF5F2] hover:bg-[#FBEBE5] px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1 cursor-pointer transition-colors border border-dashed border-[#F7D7CB]"
                title="Cliquer pour définir le trajet"
              >
                + Trajet
              </span>
            )}
            {totalCost > 0 && (
              <span className="text-[#C97A56] font-medium ml-auto">
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
                        className="flex-shrink-0 text-[10px] border rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-[#E8AB91] max-w-[90px] border-gray-200 text-gray-600 cursor-pointer"
                        title="Flux de paiement"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {PAYMENT_FLOW_OPTIONS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                      {/* TTC/HT inline toggle — only in on_selling_price mode */}
                      {vatMode !== 'on_margin' && (
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
                      )}
                      <span className="font-medium text-gray-700 flex-1 truncate">{item.name}</span>
                      <span className="text-[#C97A56] font-medium whitespace-nowrap">
                        {((item.unit_cost || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} {item.currency || 'THB'}
                      </span>
                      <button
                        onClick={() => handleEditItem(item as Item)}
                        className="p-0.5 text-gray-300 hover:text-[#C97A56] opacity-0 group-hover/item:opacity-100 transition-all"
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
                      className="text-[10px] bg-white border border-dashed border-gray-200 rounded px-1 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E8AB91] cursor-pointer"
                      title="Flux de paiement"
                    >
                      {PAYMENT_FLOW_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {/* TTC/HT toggle — only in on_selling_price mode */}
                    {vatMode !== 'on_margin' && (
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
                    )}
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
                      className="flex-1 min-w-[120px] text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#E8AB91] focus:border-[#F3C3B1] placeholder:text-gray-300"
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
                      className="w-20 text-xs bg-white border border-dashed border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#E8AB91] focus:border-[#F3C3B1] placeholder:text-gray-300 text-right"
                    />
                    <select
                      value={quickRatio}
                      onChange={(e) => setQuickRatio(e.target.value as 'set' | 'per_person' | 'per_vehicle')}
                      className="text-xs bg-white border border-dashed border-gray-200 rounded px-1.5 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E8AB91] cursor-pointer"
                      title="Tarification"
                    >
                      <option value="set">Forfait</option>
                      <option value="per_person">/ pax</option>
                      <option value="per_vehicle">/ véhicule</option>
                    </select>
                    <button
                      onClick={handleQuickAdd}
                      disabled={!quickName.trim() || addingItem}
                      className="flex items-center gap-1 text-xs text-[#C97A56] hover:text-[#834A33] bg-[#FDF5F2] hover:bg-[#FBEBE5] px-2 py-1.5 rounded border border-[#F7D7CB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
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
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-700 hover:bg-purple-50 px-2 py-1.5 rounded border border-dashed border-gray-300 hover:border-[#F3C3B1] transition-colors whitespace-nowrap"
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

        {/* ============================================================ */}
        {/* DETAILS PANEL — collapsible (mode, locations, distance)       */}
        {/* ============================================================ */}
        {detailsOpen && (
          <div className="border-t border-[#FBEBE5] px-3 py-2.5 space-y-2.5">
            {/* Mode selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Mode</span>
                <select
                  value={travelMode}
                  onChange={(e) => handleModeChange(e.target.value as TransportMode)}
                  className="text-xs bg-white border border-[#F7D7CB] rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#E8AB91] cursor-pointer"
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
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <input
                  type="number"
                  min={0}
                  value={durationMinutes ?? ''}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  placeholder="min"
                  className="w-16 text-xs bg-white border border-gray-200 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#E8AB91]"
                />
                <span className="text-xs text-gray-400">min</span>
                {durationMinutes ? (
                  <span className="text-xs text-gray-500 ml-0.5">({formatDuration(durationMinutes)})</span>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <Ruler className="w-3 h-3 text-gray-400" />
                <input
                  type="number"
                  min={0}
                  value={distanceKm ?? ''}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  placeholder="km"
                  className="w-16 text-xs bg-white border border-gray-200 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#E8AB91]"
                />
                <span className="text-xs text-gray-400">km</span>
              </div>
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
          vatMode={vatMode}
          onSave={handleItemEditorSave}
          onCancel={() => {
            setShowItemEditor(false);
            setEditingItem(undefined);
          }}
        />
      )}

      {/* Save as template dialog */}
      <SaveAsTemplateDialog
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        formulaId={block.id}
        defaultName={block.name}
        defaultCategory={block.block_type || 'transport'}
      />

      {/* Template sync dialog */}
      {block.template_source_id && (
        <TemplateSyncDialog
          isOpen={showSyncDialog}
          onClose={() => setShowSyncDialog(false)}
          formulaId={block.id}
          formulaName={block.name}
          templateSourceId={block.template_source_id}
          sourceVersion={block.template_source_version ?? 0}
          templateVersion={block.template_version ?? 1}
          onSynced={onRefetch}
        />
      )}
    </>
  );
}
