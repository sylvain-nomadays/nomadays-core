'use client';

import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Edit2,
  Trash2,
  Download,
  Building2,
  Plus,
} from 'lucide-react';
import { RoomCategory, AccommodationSeason, MEAL_PLAN_LABELS } from '@/lib/api/types';
import {
  extractRatesFromPdf,
  importExtractedRates,
  type ExtractedRoomCategory,
  type ExtractedSeason,
  type ExtractedRate,
  type ExtractedContractInfo,
  type ExtractionResult,
  type ImportResult,
} from '@/lib/api/contract-extraction';

interface ContractRateExtractorProps {
  supplierId: number;
  supplierName?: string;
  accommodationId?: number;
  accommodationName?: string;
  existingCategories?: RoomCategory[];
  existingSeasons?: AccommodationSeason[];
  onImportComplete?: (result: {
    categories: ExtractedRoomCategory[];
    seasons: ExtractedSeason[];
    rates: ExtractedRate[];
    accommodationId: number;
    accommodationCreated: boolean;
    contractId?: number;
    contractCreated: boolean;
    created: { categories: number; seasons: number; rates: number };
    reused: { categories: number; seasons: number };
  }) => void;
  onClose?: () => void;
}

// ============================================================================
// Composant principal
// ============================================================================

export default function ContractRateExtractor({
  supplierId,
  supplierName,
  accommodationId,
  accommodationName,
  existingCategories = [],
  existingSeasons = [],
  onImportComplete,
  onClose,
}: ContractRateExtractorProps) {
  // État
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'categories' | 'seasons' | 'rates'>('categories');
  const [editingItem, setEditingItem] = useState<{ type: string; index: number } | null>(null);

  // State pour création automatique de l'hébergement
  const [newAccommodationName, setNewAccommodationName] = useState(accommodationName || supplierName || '');

  // Gestion du fichier
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Vérifier le type de fichier
      if (!selectedFile.type.includes('pdf')) {
        setError('Seuls les fichiers PDF sont acceptés');
        return;
      }
      // Vérifier la taille (max 10 Mo)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setExtractionResult(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.type.includes('pdf')) {
        setError('Seuls les fichiers PDF sont acceptés');
        return;
      }
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setFile(droppedFile);
      setError(null);
      setExtractionResult(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Extraction IA
  const handleExtract = useCallback(async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      // Appeler l'API d'extraction
      const result = await extractRatesFromPdf(file, supplierId, accommodationId);

      // Valider les résultats
      validateExtractionResult(result);

      setExtractionResult(result);
    } catch (err: unknown) {
      console.error('Extraction error:', err);
      let errorMessage = 'Une erreur est survenue';

      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = (err as { detail: string }).detail;
        } else if ('status' in err) {
          const status = (err as { status: number }).status;
          if (status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          } else if (status === 503) {
            errorMessage = 'Service IA non disponible. Vérifiez la configuration du serveur.';
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
        // Failed to fetch = problème réseau/CORS
        if (err.message === 'Failed to fetch') {
          errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est en cours d\'exécution.';
        }
      }

      setError(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  }, [file, supplierId, accommodationId]);

  // Validation des résultats
  const validateExtractionResult = (result: ExtractionResult) => {
    // Valider les catégories
    result.room_categories.forEach((cat) => {
      const errors: string[] = [];
      if (!cat.name) errors.push('Nom requis');
      if (cat.max_occupancy && cat.max_occupancy < 1) errors.push('Capacité invalide');
      cat.isValid = errors.length === 0;
      cat.validationErrors = errors;
    });

    // Valider les saisons
    result.seasons.forEach((season) => {
      const errors: string[] = [];
      if (!season.name) errors.push('Nom requis');
      if (season.start_date && !/^\d{2}-\d{2}$/.test(season.start_date)) {
        errors.push('Format date début invalide (MM-DD)');
      }
      if (season.end_date && !/^\d{2}-\d{2}$/.test(season.end_date)) {
        errors.push('Format date fin invalide (MM-DD)');
      }
      season.isValid = errors.length === 0;
      season.validationErrors = errors;
    });

    // Valider les tarifs
    const categoryCodes = new Set(result.room_categories.map((c) => c.code || c.name));
    const seasonCodes = new Set(result.seasons.map((s) => s.code || s.name));

    result.rates.forEach((rate) => {
      const errors: string[] = [];
      if (!rate.room_code) errors.push('Catégorie requise');
      else if (!categoryCodes.has(rate.room_code)) errors.push(`Catégorie "${rate.room_code}" inconnue`);
      if (rate.season_code && !seasonCodes.has(rate.season_code)) {
        errors.push(`Saison "${rate.season_code}" inconnue`);
      }
      if (!rate.cost || rate.cost <= 0) errors.push('Tarif invalide');
      rate.isValid = errors.length === 0;
      rate.validationErrors = errors;
    });
  };

  // Modification d'un item extrait
  const updateExtractedItem = useCallback(
    (type: 'categories' | 'seasons' | 'rates', index: number, updates: Record<string, unknown>) => {
      if (!extractionResult) return;

      const newResult = { ...extractionResult };
      if (type === 'categories') {
        newResult.room_categories = [...newResult.room_categories];
        newResult.room_categories[index] = {
          ...newResult.room_categories[index],
          ...updates,
        } as ExtractedRoomCategory;
      } else if (type === 'seasons') {
        newResult.seasons = [...newResult.seasons];
        newResult.seasons[index] = {
          ...newResult.seasons[index],
          ...updates,
        } as ExtractedSeason;
      } else {
        newResult.rates = [...newResult.rates];
        newResult.rates[index] = {
          ...newResult.rates[index],
          ...updates,
        } as ExtractedRate;
      }

      validateExtractionResult(newResult);
      setExtractionResult(newResult);
      setEditingItem(null);
    },
    [extractionResult]
  );

  // Suppression d'un item
  const removeExtractedItem = useCallback(
    (type: 'categories' | 'seasons' | 'rates', index: number) => {
      if (!extractionResult) return;

      const newResult = { ...extractionResult };
      if (type === 'categories') {
        newResult.room_categories = newResult.room_categories.filter((_, i) => i !== index);
      } else if (type === 'seasons') {
        newResult.seasons = newResult.seasons.filter((_, i) => i !== index);
      } else {
        newResult.rates = newResult.rates.filter((_, i) => i !== index);
      }

      validateExtractionResult(newResult);
      setExtractionResult(newResult);
    },
    [extractionResult]
  );

  // Import final
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(async () => {
    if (!extractionResult) return;

    // Vérifier qu'il n'y a pas d'erreurs
    const hasErrors =
      extractionResult.room_categories.some((c) => !c.isValid) ||
      extractionResult.seasons.some((s) => !s.isValid) ||
      extractionResult.rates.some((r) => !r.isValid);

    if (hasErrors) {
      setError('Veuillez corriger les erreurs avant d\'importer');
      return;
    }

    // Si pas d'hébergement, vérifier qu'on a un nom
    if (!accommodationId && !newAccommodationName.trim()) {
      setError('Veuillez saisir un nom pour l\'hébergement');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // Appeler l'API d'import (crée l'hébergement et le contrat si nécessaire)
      const result = await importExtractedRates({
        supplierId,
        accommodationId,
        accommodationName: !accommodationId ? newAccommodationName.trim() : undefined,
        contractInfo: extractionResult.contract_info,
        categories: extractionResult.room_categories,
        seasons: extractionResult.seasons,
        rates: extractionResult.rates,
        warnings: extractionResult.warnings,  // Pass AI warnings to be stored with contract
      });

      // Notifier le parent du succès
      onImportComplete?.({
        categories: extractionResult.room_categories,
        seasons: extractionResult.seasons,
        rates: extractionResult.rates,
        accommodationId: result.accommodation_id,
        accommodationCreated: result.accommodation_created,
        contractId: result.contract_id,
        contractCreated: result.contract_created,
        created: result.created,
        reused: result.reused,
      });
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? (err as { detail: string }).detail
        : err instanceof Error
          ? err.message
          : 'Erreur lors de l\'import';
      setError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [extractionResult, accommodationId, newAccommodationName, supplierId, onImportComplete]);

  // Statistiques de l'extraction
  const getExtractionStats = () => {
    if (!extractionResult) return null;

    const totalCategories = extractionResult.room_categories.length;
    const validCategories = extractionResult.room_categories.filter((c) => c.isValid).length;
    const totalSeasons = extractionResult.seasons.length;
    const validSeasons = extractionResult.seasons.filter((s) => s.isValid).length;
    const totalRates = extractionResult.rates.length;
    const validRates = extractionResult.rates.filter((r) => r.isValid).length;

    return {
      totalCategories,
      validCategories,
      totalSeasons,
      validSeasons,
      totalRates,
      validRates,
      allValid: validCategories === totalCategories && validSeasons === totalSeasons && validRates === totalRates,
    };
  };

  const stats = getExtractionStats();

  // ============================================================================
  // Rendu
  // ============================================================================

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import IA depuis contrat PDF</h2>
              <p className="text-sm text-gray-500">
                {accommodationName || 'Extraction automatique des tarifs'}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Zone d'upload */}
        {!extractionResult && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all
              ${file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'}
            `}
          >
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setFile(null);
                      setError(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Changer de fichier
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extraction en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Extraire avec l'IA
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Déposez votre contrat PDF ici</p>
                  <p className="text-sm text-gray-500">ou cliquez pour sélectionner un fichier</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="contract-file-input"
                />
                <label
                  htmlFor="contract-file-input"
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Sélectionner un fichier
                </label>
                <p className="text-xs text-gray-400">PDF uniquement, max 10 Mo</p>
              </div>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Résultats de l'extraction */}
        {extractionResult && (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {stats?.validCategories}/{stats?.totalCategories}
                </p>
                <p className="text-sm text-blue-600">Catégories</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">
                  {stats?.validSeasons}/{stats?.totalSeasons}
                </p>
                <p className="text-sm text-amber-600">Saisons</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {stats?.validRates}/{stats?.totalRates}
                </p>
                <p className="text-sm text-green-600">Tarifs</p>
              </div>
            </div>

            {/* Avertissements */}
            {extractionResult.warnings && extractionResult.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="font-medium text-amber-800">Avertissements</p>
                </div>
                <ul className="text-sm text-amber-700 space-y-1">
                  {extractionResult.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Onglets */}
            <div className="border-b">
              <div className="flex gap-1">
                {(['categories', 'seasons', 'rates'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-4 py-2 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === tab
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    {tab === 'categories' && `Catégories (${extractionResult.room_categories.length})`}
                    {tab === 'seasons' && `Saisons (${extractionResult.seasons.length})`}
                    {tab === 'rates' && `Tarifs (${extractionResult.rates.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des onglets */}
            <div className="min-h-[300px]">
              {/* Catégories */}
              {activeTab === 'categories' && (
                <div className="space-y-2">
                  {extractionResult.room_categories.map((cat, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${
                        cat.isValid ? 'border-gray-200' : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {cat.isValid ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-sm text-gray-500">
                              {cat.code && `Code: ${cat.code} • `}
                              Max: {cat.max_occupancy || '-'} pers.
                              {cat.available_bed_types && ` • Lits: ${cat.available_bed_types.join(', ')}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingItem({ type: 'categories', index })}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => removeExtractedItem('categories', index)}
                            className="p-1.5 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      {!cat.isValid && cat.validationErrors && (
                        <div className="mt-2 text-sm text-red-600">
                          {cat.validationErrors.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Saisons */}
              {activeTab === 'seasons' && (
                <div className="space-y-2">
                  {extractionResult.seasons.map((season, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${
                        season.isValid ? 'border-gray-200' : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {season.isValid ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{season.name}</p>
                              {season.season_level && (
                                <span className={`px-1.5 py-0.5 text-xs rounded ${
                                  season.season_level === 'peak' ? 'bg-red-100 text-red-700' :
                                  season.season_level === 'low' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {season.season_level === 'peak' ? 'Peak' :
                                   season.season_level === 'low' ? 'Basse' : 'Haute'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {season.code && `Code: ${season.code} • `}
                              {season.start_date && season.end_date
                                ? `${season.start_date} → ${season.end_date}`
                                : 'Dates non définies'}
                              {season.year && ` (${season.year})`}
                              {season.original_name && season.original_name !== season.name && (
                                <span className="italic text-gray-400"> — "{season.original_name}"</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingItem({ type: 'seasons', index })}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => removeExtractedItem('seasons', index)}
                            className="p-1.5 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      {!season.isValid && season.validationErrors && (
                        <div className="mt-2 text-sm text-red-600">
                          {season.validationErrors.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tarifs */}
              {activeTab === 'rates' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Statut</th>
                        <th className="px-3 py-2 text-left">Catégorie</th>
                        <th className="px-3 py-2 text-left">Saison</th>
                        <th className="px-3 py-2 text-left">Lit</th>
                        <th className="px-3 py-2 text-left">Repas</th>
                        <th className="px-3 py-2 text-right">Tarif</th>
                        <th className="px-3 py-2 text-right">Suppl.</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {extractionResult.rates.map((rate, index) => (
                        <tr
                          key={index}
                          className={rate.isValid ? '' : 'bg-red-50'}
                        >
                          <td className="px-3 py-2">
                            {rate.isValid ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </td>
                          <td className="px-3 py-2">{rate.room_code}</td>
                          <td className="px-3 py-2">{rate.season_code || 'Défaut'}</td>
                          <td className="px-3 py-2">{rate.bed_type}</td>
                          <td className="px-3 py-2">{MEAL_PLAN_LABELS[rate.meal_plan]}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {rate.cost} {rate.currency}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {rate.single_supplement ? `+${rate.single_supplement}` : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingItem({ type: 'rates', index })}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button
                                onClick={() => removeExtractedItem('rates', index)}
                                className="p-1 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {extractionResult && (
        <div className="px-6 py-4 border-t bg-gray-50">
          {/* Section création hébergement si nécessaire */}
          {!accommodationId && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Nouvel hébergement</p>
                  <p className="text-sm text-blue-700 mb-3">
                    Aucun hébergement n'existe pour ce fournisseur. Un hébergement sera créé automatiquement avec les données importées.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      Nom de l'hébergement *
                    </label>
                    <input
                      type="text"
                      value={newAccommodationName}
                      onChange={(e) => setNewAccommodationName(e.target.value)}
                      placeholder="Ex: Riad Jnane Mogador"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setExtractionResult(null);
                setFile(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Recommencer
            </button>
            <div className="flex items-center gap-3">
              {stats && !stats.allValid && (
                <span className="text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Corrigez les erreurs avant d'importer
                </span>
              )}
              <button
                onClick={handleImport}
                disabled={!stats?.allValid || isImporting || (!accommodationId && !newAccommodationName.trim())}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {!accommodationId ? 'Création et import...' : 'Import en cours...'}
                  </>
                ) : (
                  <>
                    {!accommodationId ? (
                      <>
                        <Plus className="w-4 h-4" />
                        Créer l'hébergement et importer {stats?.totalRates || 0} tarifs
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Importer {stats?.totalRates || 0} tarifs
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
