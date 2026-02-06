'use client';

import { useState } from 'react';
import { X, Search, Plus, ChevronDown } from 'lucide-react';
import type { Item, CostNature, RatioRule } from '@/lib/api/types';

interface ItemEditorProps {
  item?: Partial<Item>;
  costNatures: CostNature[];
  onSave: (item: Partial<Item>) => void;
  onCancel: () => void;
  tripDays: number;
}

const ratioRules: { value: RatioRule; label: string; description: string }[] = [
  { value: 'per_person', label: 'Par personne', description: 'Coût multiplié par le nombre de voyageurs' },
  { value: 'per_room', label: 'Par chambre', description: 'Coût multiplié par le nombre de chambres' },
  { value: 'per_vehicle', label: 'Par véhicule', description: 'Coût multiplié par le nombre de véhicules' },
  { value: 'per_group', label: 'Par groupe', description: 'Coût fixe pour tout le groupe' },
];

export default function ItemEditor({
  item,
  costNatures,
  onSave,
  onCancel,
  tripDays,
}: ItemEditorProps) {
  const [formData, setFormData] = useState<Partial<Item>>({
    name: item?.name || '',
    cost_nature_id: item?.cost_nature_id || costNatures[0]?.id,
    supplier_id: item?.supplier_id || null,
    unit_cost: item?.unit_cost || 0,
    quantity: item?.quantity || 1,
    ratio_rule: item?.ratio_rule || 'per_person',
    day_start: item?.day_start || 1,
    day_end: item?.day_end || 1,
    notes: item?.notes || '',
  });

  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Mock suppliers for now
  const mockSuppliers = [
    { id: 1, name: 'Riad Jnane', type: 'Hébergement' },
    { id: 2, name: 'Atlas Tours', type: 'Transport' },
    { id: 3, name: 'Desert Adventures', type: 'Activités' },
    { id: 4, name: 'Marrakech Guides', type: 'Guide' },
  ];

  const filteredSuppliers = mockSuppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectedCostNature = costNatures.find(cn => cn.id === formData.cost_nature_id);

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
          {/* Name & Nature */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nature de coût
              </label>
              <select
                value={formData.cost_nature_id}
                onChange={e => setFormData({ ...formData, cost_nature_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {costNatures.map(cn => (
                  <option key={cn.id} value={cn.id}>
                    {cn.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSupplierSearch(!showSupplierSearch)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-left flex items-center justify-between"
              >
                <span className={formData.supplier_id ? 'text-gray-900' : 'text-gray-400'}>
                  {formData.supplier_id
                    ? mockSuppliers.find(s => s.id === formData.supplier_id)?.name
                    : 'Sélectionner un fournisseur (optionnel)'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showSupplierSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
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
                    {filteredSuppliers.map(supplier => (
                      <button
                        key={supplier.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, supplier_id: supplier.id });
                          setShowSupplierSearch(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="font-medium">{supplier.name}</span>
                        <span className="text-sm text-gray-400">{supplier.type}</span>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Créer un nouveau fournisseur
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coût unitaire *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={formData.unit_cost}
                  onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg font-semibold text-gray-900">
                {((formData.unit_cost || 0) * (formData.quantity || 1)).toFixed(2)} €
              </div>
            </div>
          </div>

          {/* Ratio Rule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Règle de ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ratioRules.map(rule => (
                <label
                  key={rule.value}
                  className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.ratio_rule === rule.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="ratio_rule"
                    value={rule.value}
                    checked={formData.ratio_rule === rule.value}
                    onChange={e => setFormData({ ...formData, ratio_rule: e.target.value as RatioRule })}
                    className="sr-only"
                  />
                  <div>
                    <div className={`font-medium ${formData.ratio_rule === rule.value ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {rule.label}
                    </div>
                    <div className="text-xs text-gray-500">{rule.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Days */}
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
