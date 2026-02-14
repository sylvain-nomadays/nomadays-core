'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from '@/hooks/useApi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceSenderInfo {
  // Identity
  company_name?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  // Legal
  siren?: string | null;
  siret?: string | null;
  rcs?: string | null;
  vat_number?: string | null;
  capital?: string | null;
  // Tourism
  immatriculation?: string | null;
  garantie?: string | null;
  assurance_rcp?: string | null;
  mediateur?: string | null;
  // VAT
  vat_regime?: string | null;
  vat_rate?: number | null;
  vat_legal_mention?: string | null;
  // Bank
  bank_name?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
  bank_account_holder?: string | null;
  bank_address?: string | null;
}

// ─── Field config ────────────────────────────────────────────────────────────

interface FieldDef {
  key: keyof InvoiceSenderInfo;
  label: string;
  placeholder?: string;
  type?: 'text' | 'select' | 'number' | 'textarea';
  options?: { value: string; label: string }[];
  span?: 1 | 2; // grid column span
}

const identityFields: FieldDef[] = [
  { key: 'company_name', label: 'Raison sociale', placeholder: 'NOMADAYS SAS', span: 2 },
  { key: 'address', label: 'Adresse', placeholder: '123 rue du Voyage', span: 2 },
  { key: 'postal_code', label: 'Code postal', placeholder: '75001' },
  { key: 'city', label: 'Ville', placeholder: 'Paris' },
  { key: 'country', label: 'Pays', placeholder: 'France' },
  { key: 'phone', label: 'Téléphone', placeholder: '+33 1 23 45 67 89' },
  { key: 'email', label: 'Email', placeholder: 'contact@nomadays.com' },
  { key: 'website', label: 'Site web', placeholder: 'www.nomadays.com' },
];

const legalFields: FieldDef[] = [
  { key: 'siren', label: 'SIREN', placeholder: '123 456 789' },
  { key: 'siret', label: 'SIRET', placeholder: '123 456 789 00012' },
  { key: 'rcs', label: 'RCS', placeholder: 'Paris B 123 456 789' },
  { key: 'vat_number', label: 'N° TVA intracommunautaire', placeholder: 'FR12345678901' },
  { key: 'capital', label: 'Capital social', placeholder: '10 000 €', span: 2 },
];

const tourismFields: FieldDef[] = [
  { key: 'immatriculation', label: "N° d'immatriculation (IM)", placeholder: 'IM075XXXXXX', span: 2 },
  { key: 'garantie', label: 'Garantie financière', placeholder: 'APST - 15 avenue Carnot, 75017 Paris', span: 2 },
  { key: 'assurance_rcp', label: 'Assurance RCP', placeholder: 'AXA France - Contrat n° 1234567890', span: 2 },
  { key: 'mediateur', label: 'Médiateur', placeholder: 'MTV - Médiation Tourisme et Voyage', span: 2 },
];

const bankFields: FieldDef[] = [
  { key: 'bank_account_holder', label: 'Titulaire du compte', placeholder: 'NOMADAYS SAS', span: 2 },
  { key: 'bank_name', label: 'Nom de la banque', placeholder: 'Crédit Mutuel' },
  { key: 'bank_bic', label: 'BIC / SWIFT', placeholder: 'CMCIFR2A' },
  { key: 'bank_iban', label: 'IBAN', placeholder: 'FR76 1234 5678 9012 3456 7890 123', span: 2 },
  { key: 'bank_address', label: 'Adresse de la banque', placeholder: '1 bd Haussmann, 75009 Paris', span: 2 },
];

const vatFields: FieldDef[] = [
  {
    key: 'vat_regime',
    label: 'Régime TVA',
    type: 'select',
    options: [
      { value: '', label: '— Non configuré —' },
      { value: 'exempt', label: 'Exonéré de TVA' },
      { value: 'margin', label: 'TVA sur la marge' },
    ],
  },
  { key: 'vat_rate', label: 'Taux TVA par défaut (%)', type: 'number', placeholder: '0 ou 20' },
  { key: 'vat_legal_mention', label: 'Mention légale TVA', type: 'textarea', placeholder: 'TVA non applicable, art. 293 B du CGI', span: 2 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanyConfigPage() {
  const [form, setForm] = useState<InvoiceSenderInfo>({});
  const [saved, setSaved] = useState(false);

  // Fetch current config
  const fetcher = useCallback(async () => {
    return apiClient.get<InvoiceSenderInfo>('/tenants/current/invoice-config');
  }, []);

  const { data, loading, error } = useApi(fetcher, { immediate: true, deps: [] });

  // Sync form when data loads
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  // Save mutation
  const saveMutation = useMutation(async (payload: InvoiceSenderInfo) => {
    return apiClient.patch<InvoiceSenderInfo>('/tenants/current/invoice-config', payload);
  });

  const handleChange = (key: keyof InvoiceSenderInfo, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const result = await saveMutation.mutate(form);
      if (result) setForm(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[CompanyConfig] Save error:', err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Erreur de chargement</p>
          <p className="text-red-600 text-sm mt-1">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/configuration"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Configuration
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary-500" />
          Informations entreprise
        </h1>
        <p className="text-gray-500 mt-1">
          Ces informations apparaissent sur tous vos devis, factures proforma et factures.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        <FormSection title="Identité" fields={identityFields} form={form} onChange={handleChange} />
        <FormSection title="Informations légales" fields={legalFields} form={form} onChange={handleChange} />
        <FormSection title="Tourisme" fields={tourismFields} form={form} onChange={handleChange} />
        <FormSection title="Coordonnées bancaires" fields={bankFields} form={form} onChange={handleChange} />
        <FormSection title="TVA" fields={vatFields} form={form} onChange={handleChange} />
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t mt-8 -mx-4 px-4 py-4 flex items-center justify-end gap-3">
        {saveMutation.error && (
          <p className="text-sm text-red-600 mr-auto">
            Erreur : {String(saveMutation.error)}
          </p>
        )}
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600 mr-auto">
            <Check className="w-4 h-4" />
            Enregistré
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saveMutation.loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#0FB6BC' }}
        >
          {saveMutation.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── FormSection ─────────────────────────────────────────────────────────────

function FormSection({
  title,
  fields,
  form,
  onChange,
}: {
  title: string;
  fields: FieldDef[];
  form: InvoiceSenderInfo;
  onChange: (key: keyof InvoiceSenderInfo, value: string | number | null) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {fields.map((field) => (
          <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                value={(form[field.key] as string) ?? ''}
                onChange={(e) => onChange(field.key, e.target.value || null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                value={(form[field.key] as string) ?? ''}
                onChange={(e) => onChange(field.key, e.target.value || null)}
                placeholder={field.placeholder}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                step="0.01"
                value={form[field.key] != null ? String(form[field.key]) : ''}
                onChange={(e) =>
                  onChange(field.key, e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <input
                type="text"
                value={(form[field.key] as string) ?? ''}
                onChange={(e) => onChange(field.key, e.target.value || null)}
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
