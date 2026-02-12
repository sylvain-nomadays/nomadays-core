'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  CreditCard,
  Check,
  FileText,
} from 'lucide-react';
import { COUNTRIES, getCountryFlag } from '@/lib/constants/countries';
import type {
  Supplier,
  SupplierType,
  SupplierStatus,
  CreateSupplierDTO,
  UpdateSupplierDTO,
} from '@/lib/api/types';

// ============================================================================
// Constants
// ============================================================================

const SUPPLIER_TYPES: { value: SupplierType; label: string; icon: string }[] = [
  { value: 'accommodation', label: 'Hébergement', icon: '🏨' },
  { value: 'transport', label: 'Transport', icon: '🚐' },
  { value: 'activity', label: 'Activité', icon: '🎯' },
  { value: 'guide', label: 'Guide', icon: '👤' },
  { value: 'restaurant', label: 'Restauration', icon: '🍽️' },
  { value: 'other', label: 'Autre', icon: '📦' },
];

const STATUS_OPTIONS: { value: SupplierStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Actif', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'inactive', label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'En attente', color: 'bg-amber-100 text-amber-700' },
];

const CURRENCIES = ['EUR', 'USD', 'MAD', 'THB', 'VND', 'IDR', 'MXN', 'BRL'];

// ============================================================================
// Types
// ============================================================================

interface SupplierEditorProps {
  supplier: Supplier | null;
  onSave: (data: CreateSupplierDTO | UpdateSupplierDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type FormData = {
  name: string;
  types: SupplierType[];  // Array of types (multi-select)
  status: SupplierStatus;
  // Location
  country_code: string;
  city: string;
  address: string;
  // Contact commercial
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  // Contact réservation
  reservation_email: string;
  reservation_phone: string;
  // Entité de facturation (pour la logistique)
  billing_entity_name: string;
  billing_entity_note: string;
  // Autres
  tax_id: string;
  is_vat_registered: boolean;  // Assujetti TVA = TVA récupérable
  requires_pre_booking: boolean;  // Réservation obligatoire avant confirmation
  default_currency: string;
};

// ============================================================================
// Component
// ============================================================================

export default function SupplierEditor({
  supplier,
  onSave,
  onCancel,
  loading = false,
}: SupplierEditorProps) {
  const isEditing = !!supplier;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    types: ['accommodation'],
    status: 'active',
    country_code: '',
    city: '',
    address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    reservation_email: '',
    reservation_phone: '',
    billing_entity_name: '',
    billing_entity_note: '',
    tax_id: '',
    is_vat_registered: false,
    requires_pre_booking: false,
    default_currency: 'EUR',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Initialize form with supplier data
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        types: supplier.types || (supplier.type ? [supplier.type] : ['accommodation']),
        status: supplier.status || 'active',
        country_code: supplier.country_code || '',
        city: supplier.city || '',
        address: supplier.address || '',
        contact_name: supplier.contact_name || '',
        contact_email: supplier.contact_email || '',
        contact_phone: supplier.contact_phone || '',
        reservation_email: supplier.reservation_email || '',
        reservation_phone: supplier.reservation_phone || '',
        billing_entity_name: supplier.billing_entity_name || '',
        billing_entity_note: supplier.billing_entity_note || '',
        tax_id: supplier.tax_id || '',
        is_vat_registered: supplier.is_vat_registered || false,
        requires_pre_booking: supplier.requires_pre_booking || false,
        default_currency: supplier.default_currency || 'EUR',
      });
    }
  }, [supplier]);

  const handleChange = (field: keyof FormData, value: string | SupplierType[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Toggle a type in the types array
  const toggleType = (typeValue: SupplierType) => {
    setFormData((prev) => {
      const currentTypes = prev.types;
      const hasType = currentTypes.includes(typeValue);

      if (hasType) {
        // Remove type, but ensure at least one type remains
        const newTypes = currentTypes.filter(t => t !== typeValue);
        return { ...prev, types: newTypes.length > 0 ? newTypes : currentTypes };
      } else {
        // Add type
        return { ...prev, types: [...currentTypes, typeValue] };
      }
    });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (formData.types.length === 0) {
      newErrors.types = 'Au moins un type est requis';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Email invalide';
    }

    if (formData.reservation_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reservation_email)) {
      newErrors.reservation_email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData: UpdateSupplierDTO = {
      name: formData.name,
      types: formData.types,  // Send array of types
      status: formData.status,
      country_code: formData.country_code || undefined,
      city: formData.city || undefined,
      address: formData.address || undefined,
      contact_name: formData.contact_name || undefined,
      contact_email: formData.contact_email || undefined,
      contact_phone: formData.contact_phone || undefined,
      reservation_email: formData.reservation_email || undefined,
      reservation_phone: formData.reservation_phone || undefined,
      billing_entity_name: formData.billing_entity_name || undefined,
      billing_entity_note: formData.billing_entity_note || undefined,
      tax_id: formData.tax_id || undefined,
      is_vat_registered: formData.is_vat_registered,
      requires_pre_booking: formData.requires_pre_booking,
      default_currency: formData.default_currency || undefined,
    };

    try {
      console.log('[SupplierEditor] Submitting data:', JSON.stringify(submitData, null, 2));
      await onSave(submitData);
      toast.success('Fournisseur enregistré avec succès');
    } catch (err: unknown) {
      // Log full error for debugging
      console.error('Error saving supplier (full):', JSON.stringify(err, null, 2));
      console.error('Error type:', typeof err);
      console.error('Error keys:', err && typeof err === 'object' ? Object.keys(err) : 'N/A');

      const error = err as { detail?: string; message?: string; status?: number };
      const errorMessage = error.detail || error.message || `Erreur lors de la sauvegarde (status: ${error.status || 'unknown'})`;
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du fournisseur *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Riad Jnane Mogador"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Types (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Types de services
              <span className="text-xs text-gray-500 font-normal ml-2">(sélection multiple)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPLIER_TYPES.map((type) => {
                const isSelected = formData.types.includes(type.value);
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleType(type.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 absolute right-2 text-emerald-600" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.types && <p className="mt-1 text-sm text-red-600">{errors.types}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleChange('status', status.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.status === status.value
                      ? status.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location - Simplified: only country and city */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Localisation
              <span className="text-xs text-gray-500 font-normal">(l'adresse précise est définie sur l'hébergement)</span>
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <select
                  value={formData.country_code}
                  onChange={(e) => handleChange('country_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner...</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {getCountryFlag(country.code)} {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Marrakech"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Contact Commercial */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact commercial
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Mohamed Alami"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.contact_email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="contact@hotel.com"
                />
              </div>
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+212 524 123 456"
                />
              </div>
            </div>
          </div>

          {/* Contact Réservation */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Contact réservation
              <span className="text-xs text-gray-500 font-normal">(par défaut pour les produits)</span>
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email réservation</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.reservation_email}
                  onChange={(e) => handleChange('reservation_email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.reservation_email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="reservation@hotel.com"
                />
              </div>
              {errors.reservation_email && (
                <p className="mt-1 text-sm text-red-600">{errors.reservation_email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone réservation</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.reservation_phone}
                  onChange={(e) => handleChange('reservation_phone', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+212 524 123 456"
                />
              </div>
            </div>
          </div>

          {/* Pré-réservation obligatoire */}
          <div className="p-4 bg-[#E6F9FA] border border-[#CCF3F5] rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requires_pre_booking}
                onChange={(e) => handleChange('requires_pre_booking', e.target.checked)}
                className="mt-1 w-4 h-4 text-[#0FB6BC] border-gray-300 rounded focus:ring-[#0FB6BC]"
              />
              <div>
                <span className="font-medium text-gray-900">Pré-réservation obligatoire</span>
                <p className="text-sm text-gray-600 mt-0.5">
                  Si coché, ce fournisseur devra être réservé avant la confirmation du voyage.
                  Les services concernés apparaîtront automatiquement dans les demandes de pré-réservation.
                </p>
              </div>
            </label>
          </div>

          {/* Entité de facturation (pour la logistique) */}
          <div className="p-4 bg-amber-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Entité de facturation
              <span className="text-xs text-gray-500 font-normal">(pour la logistique)</span>
            </h4>
            <p className="text-xs text-gray-500">
              À qui envoyer les demandes de facturation
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'entité (si différent du fournisseur)
              </label>
              <input
                type="text"
                value={formData.billing_entity_name}
                onChange={(e) => handleChange('billing_entity_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Ex: Hotel Exploitation Company"
              />
              <p className="mt-1 text-xs text-gray-500">
                Laisser vide si identique au nom du fournisseur
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note pour la logistique
              </label>
              <textarea
                value={formData.billing_entity_note}
                onChange={(e) => handleChange('billing_entity_note', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Ex: Envoyer copie à accounting@company.com, référence client: ABC123"
              />
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA / Fiscal</label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => handleChange('tax_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="MA123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
              <select
                value={formData.default_currency}
                onChange={(e) => handleChange('default_currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VAT Registration checkbox */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_vat_registered}
                onChange={(e) => handleChange('is_vat_registered', e.target.checked)}
                className="mt-1 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <div>
                <span className="font-medium text-gray-900">Fournisseur assujetti à la TVA</span>
                <p className="text-sm text-gray-600 mt-0.5">
                  Si coché, les factures reçues incluent une TVA récupérable.
                  <br />
                  <span className="text-amber-700">Impact cotation : le coût net = prix TTC - TVA récupérable</span>
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Enregistrer
        </button>
      </div>
    </form>
  );
}
