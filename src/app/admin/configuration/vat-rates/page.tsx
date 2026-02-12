'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Loader2,
  ArrowLeft,
  Check,
  Pencil,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCountryVatRates } from '@/hooks/useCountryVatRates';
import type { CountryVatRate } from '@/lib/api/types';

// Category labels for display
const CATEGORY_LABELS: { key: keyof Pick<CountryVatRate, 'vat_rate_hotel' | 'vat_rate_restaurant' | 'vat_rate_transport' | 'vat_rate_activity'>; label: string; description: string }[] = [
  { key: 'vat_rate_hotel', label: 'Hébergement', description: 'Hôtels, guesthouses, lodges' },
  { key: 'vat_rate_restaurant', label: 'Restauration', description: 'Restaurants, repas inclus' },
  { key: 'vat_rate_transport', label: 'Transport', description: 'Véhicules, transferts, vols internes' },
  { key: 'vat_rate_activity', label: 'Activités', description: 'Excursions, visites, expériences' },
];

export default function VatRatesPage() {
  const {
    data: rates,
    loading,
    refetch,
    updateRate,
    seedRates,
    isSeeding,
  } = useCountryVatRates();

  // The tenant has a single destination country — show only that rate
  const vatRate = rates && rates.length > 0 ? rates[0] : null;

  const [isEditing, setIsEditing] = useState(false);
  const [standard, setStandard] = useState('');
  const [hotel, setHotel] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [transport, setTransport] = useState('');
  const [activity, setActivity] = useState('');

  // Load values when rate changes
  useEffect(() => {
    if (vatRate) {
      setStandard(vatRate.vat_rate_standard?.toString() ?? '0');
      setHotel(vatRate.vat_rate_hotel?.toString() ?? '');
      setRestaurant(vatRate.vat_rate_restaurant?.toString() ?? '');
      setTransport(vatRate.vat_rate_transport?.toString() ?? '');
      setActivity(vatRate.vat_rate_activity?.toString() ?? '');
    }
  }, [vatRate]);

  const handleSeed = async () => {
    try {
      await seedRates(undefined);
      refetch();
    } catch (err) {
      console.error('[VatRatesPage] Erreur seed:', err);
    }
  };

  const handleStartEdit = () => {
    if (vatRate) {
      setStandard(vatRate.vat_rate_standard?.toString() ?? '0');
      setHotel(vatRate.vat_rate_hotel?.toString() ?? '');
      setRestaurant(vatRate.vat_rate_restaurant?.toString() ?? '');
      setTransport(vatRate.vat_rate_transport?.toString() ?? '');
      setActivity(vatRate.vat_rate_activity?.toString() ?? '');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!vatRate) return;

    const parseOpt = (val: string) => val.trim() === '' ? null : parseFloat(val);

    // Always send all values to avoid float comparison issues
    const newStd = parseFloat(standard);
    const data: Record<string, unknown> = {
      vat_rate_standard: isNaN(newStd) ? 0 : newStd,
      vat_rate_hotel: parseOpt(hotel),
      vat_rate_restaurant: parseOpt(restaurant),
      vat_rate_transport: parseOpt(transport),
      vat_rate_activity: parseOpt(activity),
    };

    try {
      await updateRate({ rateId: vatRate.id, data });
      await refetch();
    } catch (err) {
      console.error('[VatRatesPage] Erreur update:', err);
    }
    setIsEditing(false);
  };

  const handleSetCalcMode = async (mode: 'on_margin' | 'on_selling_price') => {
    if (!vatRate || vatRate.vat_calculation_mode === mode) return;
    try {
      await updateRate({ rateId: vatRate.id, data: { vat_calculation_mode: mode } });
      refetch();
    } catch (err) {
      console.error('[VatRatesPage] Erreur update mode:', err);
    }
  };

  const formatRate = (val: number | null | undefined) => {
    if (val == null) return null;
    return `${Number(val).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="mb-8">
          <Link
            href="/admin/configuration"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Configuration
          </Link>
        </div>
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Configuration
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-primary" />
          Taux de TVA
        </h1>
        <p className="text-gray-500 mt-1">
          Configuration de la TVA pour votre destination
        </p>
      </div>

      {/* No rate yet — seed */}
      {!vatRate && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun taux de TVA configuré</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Initialisez les taux de TVA par défaut pour votre destination.
          </p>
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Initialiser les taux par défaut
          </button>
        </div>
      )}

      {/* Main config when rate exists */}
      {vatRate && (
        <div className="space-y-6">

          {/* ─── Section 1 : Taux de TVA ─── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Taux de TVA
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Taux appliqués aux calculs de cotation et tarification
                </p>
              </div>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Taux standard (default) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Taux standard (par défaut)
                  </label>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={standard}
                        onChange={(e) => setStandard(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24 text-right focus:ring-2 focus:ring-primary focus:border-primary"
                        autoFocus
                      />
                      <span className="text-sm text-gray-400">%</span>
                    </div>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900">
                      {formatRate(vatRate.vat_rate_standard)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Appliqué par défaut à tous les types de services
                </p>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-100" />

              {/* Taux par catégorie de service */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Taux par catégorie de service
                  </h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    optionnel
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Si renseigné, surcharge le taux standard pour cette catégorie. Laissez vide pour utiliser le taux standard.
                </p>

                <div className="space-y-3">
                  {CATEGORY_LABELS.map(({ key, label, description }) => {
                    const currentVal = vatRate[key];
                    const stateMap = {
                      vat_rate_hotel: [hotel, setHotel] as const,
                      vat_rate_restaurant: [restaurant, setRestaurant] as const,
                      vat_rate_transport: [transport, setTransport] as const,
                      vat_rate_activity: [activity, setActivity] as const,
                    };
                    const entry = stateMap[key];
                    const val = entry[0];
                    const setVal = entry[1];

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-gray-50/50 border border-gray-100"
                      >
                        <div className="min-w-0">
                          <span className="text-sm text-gray-700">{label}</span>
                          <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
                            {description}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={val}
                              onChange={(e) => setVal(e.target.value)}
                              placeholder="—"
                              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24 text-right focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                            <span className="text-sm text-gray-400">%</span>
                          </div>
                        ) : (
                          <span className={`text-sm font-medium ${currentVal != null ? 'text-gray-900' : 'text-gray-300'}`}>
                            {currentVal != null ? formatRate(currentVal) : '— (standard)'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save / Cancel buttons */}
              {isEditing && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── Section 2 : Mode de calcul TVA ─── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-800">
                Mode de calcul de la TVA
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Détermine la base de calcul de la TVA dans les cotations
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSetCalcMode('on_margin')}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    vatRate.vat_calculation_mode === 'on_margin'
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    vatRate.vat_calculation_mode === 'on_margin' ? 'text-primary' : 'text-gray-600'
                  }`}>
                    Sur la marge
                  </div>
                  <p className={`text-xs ${
                    vatRate.vat_calculation_mode === 'on_margin' ? 'text-primary/70' : 'text-gray-400'
                  }`}>
                    TVA calculée sur la marge brute (prix de vente - coût)
                  </p>
                </button>

                <button
                  onClick={() => handleSetCalcMode('on_selling_price')}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    vatRate.vat_calculation_mode === 'on_selling_price'
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    vatRate.vat_calculation_mode === 'on_selling_price' ? 'text-primary' : 'text-gray-600'
                  }`}>
                    Sur le prix de vente
                  </div>
                  <p className={`text-xs ${
                    vatRate.vat_calculation_mode === 'on_selling_price' ? 'text-primary/70' : 'text-gray-400'
                  }`}>
                    TVA calculée sur le prix de vente (hors commission)
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* ─── Légende ─── */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Comment ça fonctionne
            </h3>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p>
                <span className="font-medium">Taux standard</span> — appliqué par défaut à tous les items d&apos;un circuit.
              </p>
              <p>
                <span className="font-medium">Taux catégoriel</span> — s&apos;il est renseigné, il remplace le taux standard pour les items de cette catégorie (hébergement, transport, etc.).
              </p>
              <p>
                <span className="text-gray-400">— (standard)</span> — aucun taux spécifique, le taux standard est utilisé.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
