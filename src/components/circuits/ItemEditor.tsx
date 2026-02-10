'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, Plus, ChevronDown, AlertTriangle, Info,
  Building2, Wallet, ShoppingCart, UserCheck, FileText,
  Bed, Car, Activity, Users, Utensils, MoreHorizontal,
} from 'lucide-react';
import type { Item, ItemPriceTier, CostNature, PaymentFlow, RatioRule, SupplierType, TripCondition } from '@/lib/api/types';
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers';
import { useAccommodationBySupplier } from '@/hooks/useAccommodations';
import { usePaxCategories } from '@/hooks/usePaxCategories';

interface ItemEditorProps {
  item?: Partial<Item>;
  costNatures: CostNature[];
  onSave: (item: Partial<Item>) => void;
  onCancel: () => void;
  tripDays: number;
  defaultCurrency?: string;
  /** Hide the day_start/day_end fields (used for transversal services where day range is at formula level) */
  hideItemDayRange?: boolean;
  /** Number of service days from formula (for transversal items — makes quantity read-only) */
  serviceDays?: number;
  /** If the parent formula has a condition, show option selector */
  conditionId?: number | null;
  /** Trip conditions for condition option dropdown */
  tripConditions?: TripCondition[];
}

// ─── Category icons (matches CostBreakdown) ──────────────────────────
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HTL: Bed,
  TRS: Car,
  ACT: Activity,
  GDE: Users,
  RES: Utensils,
  MIS: MoreHorizontal,
};

// ─── Payment flow configuration ──────────────────────────────────────
const PAYMENT_FLOWS: {
  value: PaymentFlow;
  label: string;
  icon: typeof Building2;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  hint: string;
}[] = [
  { value: 'booking', label: 'Fournisseur', icon: Building2, colorClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', hint: 'Réservation fournisseur' },
  { value: 'advance', label: 'Allowance', icon: Wallet, colorClass: 'text-amber-700', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', hint: 'Avance de caisse sur le terrain' },
  { value: 'purchase_order', label: 'Achat bureau', icon: ShoppingCart, colorClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', hint: 'Bon de commande / achat en ligne' },
  { value: 'payroll', label: 'Salaire', icon: UserCheck, colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', hint: 'Affectation paie' },
  { value: 'manual', label: 'Manuel', icon: FileText, colorClass: 'text-gray-600', bgClass: 'bg-gray-50', borderClass: 'border-gray-200', hint: 'Gestion manuelle, pas de dépense' },
];

// ratioRules replaced by inline dropdown + "1 pour N" input in the form

// Supplier type labels for display
const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  accommodation: 'Hébergement',
  transport: 'Transport',
  activity: 'Activités',
  guide: 'Guide',
  restaurant: 'Restaurant',
  other: 'Autre',
};

export default function ItemEditor({
  item,
  costNatures,
  onSave,
  onCancel,
  tripDays,
  defaultCurrency = 'THB',
  hideItemDayRange = false,
  serviceDays,
  conditionId,
  tripConditions,
}: ItemEditorProps) {
  // Resolve initial cost nature code: prefer direct code, then lookup by id, then first in list
  const initialCostNatureCode = item?.cost_nature_code
    || (item?.cost_nature_id != null
      ? costNatures.find(cn => cn.id === item.cost_nature_id)?.code
      : undefined)
    || costNatures[0]?.code;

  const [formData, setFormData] = useState<Partial<Item>>({
    name: item?.name || '',
    cost_nature_code: initialCostNatureCode,
    payment_flow: item?.payment_flow || 'booking',
    supplier_id: item?.supplier_id ?? null,
    unit_cost: item?.unit_cost ?? 0,
    quantity: item?.quantity ?? 1,
    currency: item?.currency || defaultCurrency,
    ratio_rule: item?.ratio_rule || 'per_person',
    ratio_per: item?.ratio_per ?? 1,
    ratio_categories: item?.ratio_categories || 'adult',
    day_start: item?.day_start ?? 1,
    day_end: item?.day_end ?? 1,
    condition_option_id: item?.condition_option_id ?? null,
    price_includes_vat: item?.price_includes_vat ?? true,
    notes: item?.notes || '',
  });

  // Price tiers state
  const [tiersEnabled, setTiersEnabled] = useState(() => (item?.price_tiers?.length ?? 0) > 0);
  const [tiers, setTiers] = useState<ItemPriceTier[]>(() =>
    item?.price_tiers?.length ? [...item.price_tiers] : []
  );
  const [tierCategories, setTierCategories] = useState(item?.tier_categories || '');

  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierType, setNewSupplierType] = useState<string>('transport');

  // Close supplier dropdown on click outside
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch pax categories for ratio_categories selector
  const { data: paxCategories } = usePaxCategories();
  const activePaxCategories = useMemo(() =>
    (paxCategories || []).filter(c => c.is_active),
    [paxCategories]
  );

  // Parse ratio_categories string into a Set for toggle logic
  const selectedRatioCategories = useMemo(() => {
    const str = formData.ratio_categories || 'adult';
    return new Set(str.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  }, [formData.ratio_categories]);

  const toggleRatioCategory = (code: string) => {
    const next = new Set(selectedRatioCategories);
    if (next.has(code)) {
      next.delete(code);
      // At least one category must be selected
      if (next.size === 0) return;
    } else {
      next.add(code);
    }
    setFormData({ ...formData, ratio_categories: Array.from(next).join(',') });
  };

  // Fetch real suppliers from API
  const { data: suppliersData, loading: loadingSuppliers, refetch: refetchSuppliers } = useSuppliers({
    search: supplierSearch || undefined,
    page_size: 50,
  });

  const suppliers = useMemo(() => {
    return suppliersData?.items || [];
  }, [suppliersData]);

  // Get the currently selected supplier
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === formData.supplier_id) || null;
  }, [suppliers, formData.supplier_id]);

  // Fetch accommodation data if supplier is of type 'accommodation'
  const { data: accommodation } = useAccommodationBySupplier(
    selectedSupplier?.type === 'accommodation' ? selectedSupplier.id : null
  );

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const search = supplierSearch.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(search) ||
      (s.city && s.city.toLowerCase().includes(search))
    );
  }, [suppliers, supplierSearch]);

  // Create supplier hook
  const { mutate: createSupplier, loading: creatingSupplier } = useCreateSupplier();

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const newSupplier = await createSupplier({
        name: newSupplierName.trim(),
        types: [newSupplierType as SupplierType],
      });
      if (newSupplier?.id) {
        setFormData(prev => ({ ...prev, supplier_id: newSupplier.id }));
      }
      await refetchSuppliers();
      setNewSupplierName('');
      setNewSupplierType('transport');
      setShowNewSupplierForm(false);
      setShowSupplierSearch(false);
    } catch (err) {
      console.error('Failed to create supplier:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCN = costNatures.find(cn => cn.code === formData.cost_nature_code);
    onSave({
      ...formData,
      cost_nature_id: selectedCN && selectedCN.id > 0 ? selectedCN.id : undefined,
      tier_categories: tiersEnabled ? tierCategories || undefined : undefined,
      price_tiers: tiersEnabled ? tiers : [],
    });
  };

  const selectedCostNature = costNatures.find(cn => cn.code === formData.cost_nature_code);
  const selectedFlow = PAYMENT_FLOWS.find(f => f.value === formData.payment_flow) || PAYMENT_FLOWS[0];

  // Supplier label and state based on payment_flow
  const supplierDisabled = formData.payment_flow === 'payroll';
  const supplierOptional = formData.payment_flow === 'advance' || formData.payment_flow === 'manual';
  const supplierLabel = supplierDisabled
    ? 'Fournisseur (non applicable)'
    : supplierOptional
      ? 'Fournisseur (optionnel)'
      : 'Fournisseur';

  // Category icon for the selected nature
  const SelectedCatIcon = selectedCostNature
    ? (CATEGORY_ICONS[selectedCostNature.code] || MoreHorizontal)
    : MoreHorizontal;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {item?.id ? 'Modifier la prestation' : 'Nouvelle prestation'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la prestation *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Riad 4* Marrakech"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* ─── Catégorie (native select — no overflow issues) ─────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <div className="relative">
              <SelectedCatIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={formData.cost_nature_code ?? ''}
                onChange={e => {
                  const newCode = e.target.value;
                  const newCN = costNatures.find(cn => cn.code === newCode);
                  setFormData(prev => ({
                    ...prev,
                    cost_nature_code: newCode,
                    // Auto-set TTC/HT from cost nature default (only for new items)
                    ...(!item?.id && newCN ? { price_includes_vat: newCN.vat_recoverable_default ?? true } : {}),
                  }));
                }}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm appearance-none cursor-pointer"
              >
                {costNatures.map(cn => (
                  <option key={cn.code} value={cn.code}>
                    {cn.label || cn.name} ({cn.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* ─── Flux de paiement (radio buttons visuels) ─────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Flux de paiement
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_FLOWS.map(flow => {
                const FlowIcon = flow.icon;
                const isSelected = formData.payment_flow === flow.value;
                return (
                  <label
                    key={flow.value}
                    className={`flex flex-col items-center gap-1.5 p-2.5 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                      isSelected
                        ? `${flow.borderClass} ${flow.bgClass}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_flow"
                      value={flow.value}
                      checked={isSelected}
                      onChange={() => setFormData({ ...formData, payment_flow: flow.value })}
                      className="sr-only"
                    />
                    <FlowIcon className={`w-4 h-4 ${isSelected ? flow.colorClass : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium leading-tight ${isSelected ? flow.colorClass : 'text-gray-500'}`}>
                      {flow.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ─── Combination banner ────────────────────────────────────── */}
          {selectedCostNature && selectedFlow && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${selectedFlow.bgClass} ${selectedFlow.borderClass}`}>
              <SelectedCatIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                {selectedCostNature.label || selectedCostNature.name}
              </span>
              <span className="text-gray-300">•</span>
              {(() => { const FlowIcon = selectedFlow.icon; return <FlowIcon className={`w-4 h-4 flex-shrink-0 ${selectedFlow.colorClass}`} />; })()}
              <span className={`text-sm font-medium ${selectedFlow.colorClass}`}>
                {selectedFlow.label}
              </span>
              <span className="text-xs text-gray-500 ml-1">— {selectedFlow.hint}</span>
            </div>
          )}

          {/* Supplier — adapted label based on payment flow */}
          <div className={supplierDisabled ? 'opacity-40 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {supplierLabel}
            </label>
            <div ref={supplierDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSupplierSearch(!showSupplierSearch)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-left flex items-center justify-between"
              >
                <span className={formData.supplier_id ? 'text-gray-900' : 'text-gray-400'}>
                  {formData.supplier_id && selectedSupplier
                    ? selectedSupplier.name
                    : 'Sélectionner un fournisseur (optionnel)'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showSupplierSearch && (
                <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={supplierSearch}
                        onChange={e => setSupplierSearch(e.target.value)}
                        placeholder="Rechercher un fournisseur..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {loadingSuppliers ? (
                      <div className="px-3 py-4 text-center text-gray-500">
                        Chargement...
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, supplier_id: null });
                            setShowSupplierSearch(false);
                          }}
                          className="w-full px-3 py-2 text-left text-gray-500 hover:bg-gray-50"
                        >
                          Aucun fournisseur
                        </button>
                        {filteredSuppliers.length === 0 ? (
                          <div className="px-3 py-4 text-center text-gray-500">
                            Aucun fournisseur trouvé
                          </div>
                        ) : (
                          filteredSuppliers.map(supplier => (
                            <button
                              key={supplier.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, supplier_id: supplier.id });
                                setShowSupplierSearch(false);
                                setSupplierSearch('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-medium">{supplier.name}</span>
                                {supplier.city && (
                                  <span className="ml-2 text-xs text-gray-400">{supplier.city}</span>
                                )}
                              </div>
                              <span className="text-sm text-gray-400">
                                {SUPPLIER_TYPE_LABELS[supplier.type] || supplier.type}
                              </span>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    {!showNewSupplierForm ? (
                      <button
                        type="button"
                        onClick={() => setShowNewSupplierForm(true)}
                        className="w-full px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Créer un nouveau fournisseur
                      </button>
                    ) : (
                      <div className="space-y-2 p-1">
                        <input
                          type="text"
                          value={newSupplierName}
                          onChange={e => setNewSupplierName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateSupplier();
                            }
                          }}
                          placeholder="Nom du fournisseur..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                        />
                        <select
                          value={newSupplierType}
                          onChange={e => setNewSupplierType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="transport">Transport</option>
                          <option value="accommodation">Hébergement</option>
                          <option value="activity">Activités</option>
                          <option value="guide">Guide</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="other">Autre</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewSupplierForm(false);
                              setNewSupplierName('');
                            }}
                            className="flex-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateSupplier}
                            disabled={!newSupplierName.trim() || creatingSupplier}
                            className="flex-1 px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            {creatingSupplier ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Création...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                Créer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Internal Notes Alert */}
            {selectedSupplier?.type === 'accommodation' && accommodation?.internal_notes && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Notes internes - {accommodation.name}</p>
                    <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">
                      {accommodation.internal_notes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Accommodation info */}
            {selectedSupplier?.type === 'accommodation' && accommodation && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-3 h-3" />
                <span>
                  {accommodation.star_rating && `${accommodation.star_rating}★ • `}
                  {accommodation.city || 'Emplacement non défini'}
                </span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coût unitaire *
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={formData.unit_cost}
                  onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* TTC/HT toggle */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, price_includes_vat: !formData.price_includes_vat })}
                  className={`text-[10px] font-semibold px-1.5 py-2 rounded-lg border transition-colors flex-shrink-0 ${
                    formData.price_includes_vat
                      ? 'bg-sage-50 text-sage-700 border-sage-200 hover:bg-sage-100'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                  title={formData.price_includes_vat
                    ? 'TTC — TVA récupérable (cliquer pour passer en HT)'
                    : 'HT — TVA non récupérable (cliquer pour passer en TTC)'
                  }
                >
                  {formData.price_includes_vat ? 'TTC' : 'HT'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                value={formData.currency || defaultCurrency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="THB">THB</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="VND">VND</option>
                <option value="KHR">KHR</option>
                <option value="LAK">LAK</option>
                <option value="MMK">MMK</option>
                <option value="IDR">IDR</option>
                <option value="MYR">MYR</option>
                <option value="JPY">JPY</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {serviceDays ? 'Jours de service' : 'Quantité *'}
              </label>
              {serviceDays ? (
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 text-sm">
                  {serviceDays} jour{serviceDays > 1 ? 's' : ''}
                  <span className="text-xs text-gray-400 ml-1">(calculé depuis la formule)</span>
                </div>
              ) : (
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg font-semibold text-gray-900">
                {((formData.unit_cost || 0) * (serviceDays || formData.quantity || 1)).toLocaleString('fr-FR')} {formData.currency || defaultCurrency}
              </div>
            </div>
          </div>

          {/* ─── Price Tiers ──────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setTiersEnabled(!tiersEnabled)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                tiersEnabled
                  ? 'bg-primary-50 text-primary-700 border-b border-primary-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>Tarif par tranche de pax</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tiersEnabled ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-500'
              }`}>
                {tiersEnabled ? `${tiers.length} palier${tiers.length > 1 ? 's' : ''}` : 'Désactivé'}
              </span>
            </button>

            {tiersEnabled && (
              <div className="p-4 space-y-3">
                {/* Tier categories */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Catégories comptées pour le palier
                  </label>
                  <input
                    type="text"
                    value={tierCategories}
                    onChange={(e) => setTierCategories(e.target.value)}
                    placeholder="adult,teen,child (vide = ratio_categories)"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Codes séparés par virgule. Vide = utilise les mêmes que la règle de ratio.
                  </p>
                </div>

                {/* Tiers table */}
                <div className="space-y-1.5">
                  {tiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">De</span>
                        <input
                          type="number"
                          min={1}
                          value={tier.pax_min}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[idx] = { ...updated[idx], pax_min: parseInt(e.target.value) || 1 } as ItemPriceTier;
                            setTiers(updated);
                          }}
                          className="w-12 px-1.5 py-1 text-sm border border-gray-200 rounded text-center"
                        />
                        <span className="text-xs text-gray-500">à</span>
                        <input
                          type="number"
                          min={1}
                          value={tier.pax_max}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[idx] = { ...updated[idx], pax_max: parseInt(e.target.value) || 1 } as ItemPriceTier;
                            setTiers(updated);
                          }}
                          className="w-12 px-1.5 py-1 text-sm border border-gray-200 rounded text-center"
                        />
                        <span className="text-xs text-gray-500">pax</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-xs text-gray-500">Prix:</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={tier.unit_cost}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[idx] = { ...updated[idx], unit_cost: parseFloat(e.target.value) || 0 } as ItemPriceTier;
                            setTiers(updated);
                          }}
                          className="w-24 px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      </div>

                      {/* Category adjustments compact display */}
                      <div className="flex items-center gap-1">
                        {tier.category_adjustments_json && Object.entries(tier.category_adjustments_json).map(([cat, pct]) => {
                          const val = pct as number;
                          return (
                            <span key={cat} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                              {cat}: {val > 0 ? '+' : ''}{val}%
                            </span>
                          );
                        })}
                      </div>

                      {/* Delete tier */}
                      <button
                        type="button"
                        onClick={() => setTiers(tiers.filter((_, i) => i !== idx))}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add tier button */}
                <button
                  type="button"
                  onClick={() => {
                    const lastTier = tiers[tiers.length - 1];
                    const lastMax = lastTier ? lastTier.pax_max + 1 : 2;
                    setTiers([
                      ...tiers,
                      {
                        pax_min: lastMax,
                        pax_max: lastMax + 4,
                        unit_cost: formData.unit_cost || 0,
                        sort_order: tiers.length,
                      },
                    ]);
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 px-2 py-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un palier
                </button>
              </div>
            )}
          </div>

          {/* Ratio Rule — dropdown + "1 pour N" input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Règle de ratio
            </label>
            <div className="flex items-center gap-3">
              {/* Type dropdown */}
              <div className="flex-1">
                <select
                  value={formData.ratio_rule}
                  onChange={e => {
                    const newRule = e.target.value as RatioRule;
                    setFormData({
                      ...formData,
                      ratio_rule: newRule,
                      ratio_per: newRule === 'per_group' ? 1 : (formData.ratio_per ?? 1),
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                >
                  <option value="per_person">Par personne</option>
                  <option value="per_room">Par chambre</option>
                  <option value="per_vehicle">Par véhicule</option>
                  <option value="per_group">Par groupe (forfait)</option>
                </select>
              </div>

              {/* "1 pour N" input — hidden for per_group */}
              {formData.ratio_rule !== 'per_group' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">1 pour</span>
                  <input
                    type="number"
                    min={1}
                    value={formData.ratio_per ?? 1}
                    onChange={e => setFormData({ ...formData, ratio_per: parseInt(e.target.value) || 1 })}
                    className="w-16 px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-sm"
                  />
                </div>
              )}
            </div>

            {/* Dynamic description */}
            <p className="text-xs text-gray-400 mt-1.5">
              {formData.ratio_rule === 'per_group'
                ? 'Coût fixe pour tout le groupe'
                : (formData.ratio_per ?? 1) === 1
                  ? `Coût multiplié par le nombre de ${formData.ratio_rule === 'per_person' ? 'voyageurs' : formData.ratio_rule === 'per_room' ? 'chambres' : 'véhicules'}`
                  : `1 unité pour ${formData.ratio_per} ${formData.ratio_rule === 'per_person' ? 'personnes' : formData.ratio_rule === 'per_room' ? 'chambres' : 'véhicules'}`
              }
            </p>

            {/* Pax categories selector — shown for per_person and per_group */}
            {(formData.ratio_rule === 'per_person' || formData.ratio_rule === 'per_group') && activePaxCategories.length > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Catégories comptées
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activePaxCategories.map(cat => {
                    const isSelected = selectedRatioCategories.has(cat.code);
                    return (
                      <button
                        key={cat.code}
                        type="button"
                        onClick={() => toggleRatioCategory(cat.code)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-primary-50 text-primary-700 border-primary-300 hover:bg-primary-100'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                      >
                        {isSelected && <span className="text-primary-500">✓</span>}
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Sélectionnez les types de voyageurs comptés pour ce calcul
                </p>
              </div>
            )}
          </div>

          {/* Days — hidden for transversal services (day range is at formula level) */}
          {!hideItemDayRange && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jour de début
              </label>
              <select
                value={formData.day_start}
                onChange={e => {
                  const start = parseInt(e.target.value);
                  setFormData({
                    ...formData,
                    day_start: start,
                    day_end: Math.max(start, formData.day_end || start),
                  });
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    Jour {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jour de fin
              </label>
              <select
                value={formData.day_end}
                onChange={e => setFormData({ ...formData, day_end: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {Array.from({ length: tripDays }, (_, i) => i + 1)
                  .filter(day => day >= (formData.day_start || 1))
                  .map(day => (
                    <option key={day} value={day}>
                      Jour {day}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          )}

          {/* Condition option — only when parent formula has a condition */}
          {conditionId && tripConditions && (() => {
            const matchingCondition = tripConditions.find(tc => tc.condition_id === conditionId);
            if (!matchingCondition) return null;
            return (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {matchingCondition.condition_name}
                </label>
                <select
                  value={formData.condition_option_id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, condition_option_id: val ? parseInt(val) : null });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Commun (toutes options)</option>
                  {(matchingCondition.options || []).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Si spécifié, cet item ne sera inclus que lorsque cette option est sélectionnée
                </p>
              </div>
            );
          })()}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes internes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes ou commentaires (non visibles sur le devis)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {item?.id ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
