'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Tag,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  X,
  Percent,
  DollarSign,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from '@/hooks/useApi';
import type { PromoCode } from '@/lib/api/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PromoCodeListResponse {
  items: PromoCode[];
  total: number;
  skip: number;
  limit: number;
}

interface PromoCodeFormData {
  code: string;
  description: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  currency: string;
  min_amount: number;
  max_uses: number | null;
  valid_from: string;
  valid_until: string;
}

const EMPTY_FORM: PromoCodeFormData = {
  code: '',
  description: '',
  discount_type: 'fixed',
  discount_value: 0,
  currency: 'EUR',
  min_amount: 0,
  max_uses: null,
  valid_from: '',
  valid_until: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PromoCodesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PromoCodeFormData>(EMPTY_FORM);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch list
  const fetcher = useCallback(async () => {
    return apiClient.get<PromoCodeListResponse>('/promo-codes?limit=100');
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error } = useApi(fetcher, { immediate: true, deps: [refreshKey] });

  // Create / Update
  const saveMutation = useMutation(async (payload: PromoCodeFormData) => {
    const body = {
      ...payload,
      discount_value: Number(payload.discount_value),
      min_amount: Number(payload.min_amount),
      max_uses: payload.max_uses ? Number(payload.max_uses) : null,
      valid_from: payload.valid_from || null,
      valid_until: payload.valid_until || null,
    };

    if (editingId) {
      return apiClient.patch<PromoCode>(`/promo-codes/${editingId}`, body);
    }
    return apiClient.post<PromoCode>('/promo-codes', body);
  });

  // Delete (soft)
  const deleteMutation = useMutation(async (id: number) => {
    return apiClient.delete(`/promo-codes/${id}`);
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const handleOpenEdit = (promo: PromoCode) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      currency: promo.currency,
      min_amount: promo.min_amount,
      max_uses: promo.max_uses,
      valid_from: promo.valid_from || '',
      valid_until: promo.valid_until || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutate(form);
      setShowDialog(false);
      setRefreshKey((k) => k + 1);
    } catch {
      // Error shown in UI via saveMutation.error
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutate(id);
      setRefreshKey((k) => k + 1);
    } catch {
      // Error shown via deleteMutation.error
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/configuration"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Configuration
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Tag className="w-7 h-7 text-primary-500" />
              Codes promo
            </h1>
            <p className="text-gray-500 mt-1">
              Gérez les codes promo et bons de réduction applicables sur les factures.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#0FB6BC' }}
          >
            <Plus className="w-4 h-4" />
            Nouveau code
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {String(error)}
          </p>
        </div>
      )}

      {/* Promo codes table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Réduction</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Utilisations</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Validité</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Aucun code promo. Cliquez sur &quot;Nouveau code&quot; pour en créer un.
                  </td>
                </tr>
              )}
              {data?.items?.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-gray-900 tracking-wider">
                      {promo.code}
                    </div>
                    {promo.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{promo.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {promo.discount_type === 'percentage' ? (
                        <>
                          <Percent className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold">{promo.discount_value}%</span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold">{promo.discount_value} {promo.currency}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-900 font-medium">{promo.current_uses}</span>
                    <span className="text-gray-400">
                      /{promo.max_uses ?? '\u221E'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {promo.valid_from || promo.valid_until ? (
                      <>
                        {formatDate(promo.valid_from)} → {formatDate(promo.valid_until)}
                      </>
                    ) : (
                      <span className="text-gray-400">Illimité</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {promo.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="w-3 h-3" />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <X className="w-3 h-3" />
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Modifier
                      </button>
                      {promo.is_active && (
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Désactiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {editingId ? 'Modifier le code promo' : 'Nouveau code promo'}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="FIDELE2024"
                  disabled={!!editingId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono tracking-wider focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Bon de fidélité 50€"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_type: e.target.value as 'fixed' | 'percentage' }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="fixed">Montant fixe</option>
                    <option value="percentage">Pourcentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valeur * {form.discount_type === 'percentage' ? '(%)' : '(€)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.discount_value || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder={form.discount_type === 'percentage' ? '10' : '50'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Min amount + Max uses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant min. facture (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_amount || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, min_amount: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Utilisations max.
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_uses: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="Illimité"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début validité</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin validité</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {saveMutation.error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {String(saveMutation.error)}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.loading || !form.code || !form.discount_value}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#0FB6BC' }}
              >
                {saveMutation.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
