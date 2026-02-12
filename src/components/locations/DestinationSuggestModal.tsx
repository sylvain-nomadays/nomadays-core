'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, Check, AlertTriangle, Loader2, X } from 'lucide-react';
import { COUNTRIES } from '@/lib/constants/countries';
import { useSuggestDestinations, useBulkCreateDestinations } from '@/hooks/useLocations';
import type { SuggestedDestination } from '@/lib/api/types';

// ============================================================================
// Props
// ============================================================================

interface DestinationSuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultCountryCode?: string;
}

// ============================================================================
// Badge labels for location types
// ============================================================================

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  city: { label: 'Ville', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  region: { label: 'Région', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  area: { label: 'Zone', className: 'bg-green-100 text-green-800 border-green-200' },
};

// ============================================================================
// Component
// ============================================================================

export function DestinationSuggestModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCountryCode,
}: DestinationSuggestModalProps) {
  // ---- State ----
  const [step, setStep] = useState<'config' | 'loading' | 'review'>('config');
  const [countryCode, setCountryCode] = useState(defaultCountryCode || '');
  const [count, setCount] = useState(20);
  const [suggestions, setSuggestions] = useState<SuggestedDestination[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [countryName, setCountryName] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ---- Hooks ----
  const { mutate: suggestDestinations, loading: suggesting } = useSuggestDestinations();
  const { mutate: bulkCreate, loading: creating } = useBulkCreateDestinations();

  // ---- Handlers ----

  const handleSuggest = useCallback(async () => {
    if (!countryCode) return;

    setError(null);
    setStep('loading');
    setLoadingMessage('Claude analyse les destinations...');

    try {
      const result = await suggestDestinations({
        country_code: countryCode,
        count,
      });

      if (result) {
        setSuggestions(result.suggestions);
        setCountryName(result.country_name);
        // Select all by default
        setSelected(new Set(result.suggestions.map((_, i) => i)));
        setStep('review');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la suggestion des destinations'
      );
      setStep('config');
    }
  }, [countryCode, count, suggestDestinations]);

  const handleToggle = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected(new Set(suggestions.map((_, i) => i)));
  }, [suggestions]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleCreate = useCallback(async () => {
    const selectedDestinations = suggestions.filter((_, i) => selected.has(i));
    if (selectedDestinations.length === 0) return;

    setError(null);

    try {
      const result = await bulkCreate({
        destinations: selectedDestinations.map(s => ({
          name: s.name,
          location_type: s.location_type,
          country_code: s.country_code,
          description_fr: s.description_fr,
          description_en: s.description_en,
          sort_order: s.sort_order,
          lat: s.lat,
          lng: s.lng,
          google_place_id: s.google_place_id,
        })),
      });

      if (result) {
        onSuccess();
        handleReset();
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la création des destinations'
      );
    }
  }, [suggestions, selected, bulkCreate, onSuccess, onClose]);

  const handleReset = useCallback(() => {
    setStep('config');
    setSuggestions([]);
    setSelected(new Set());
    setCountryName('');
    setError(null);
    setLoadingMessage('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  // ---- Derived ----
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode);
  const selectedCount = selected.size;
  const geocodedCount = suggestions.filter(s => s.geocoding_success).length;

  // ---- Render ----
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Suggestion IA de destinations
          </DialogTitle>
          <DialogDescription>
            {step === 'config' && 'Sélectionnez un pays pour générer automatiquement ses destinations touristiques.'}
            {step === 'loading' && loadingMessage}
            {step === 'review' && `${selectedCountry?.flag || ''} ${countryName} — ${suggestions.length} destinations suggérées`}
          </DialogDescription>
        </DialogHeader>

        {/* Error banner */}
        {error && (
          <div className="mx-1 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Configuration */}
        {step === 'config' && (
          <div className="space-y-4 py-2">
            {/* Country selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Sélectionnez un pays...</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Count slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de destinations : <span className="font-bold text-purple-600">{count}</span>
              </label>
              <input
                type="range"
                min={10}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10</span>
                <span>20</span>
                <span>30</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
              <Sparkles className="h-4 w-4 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700">{loadingMessage}</p>
              <p className="text-xs text-gray-400">
                Cela peut prendre 15-20 secondes...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review list */}
        {step === 'review' && (
          <div className="flex flex-col min-h-0 flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  Tout sélectionner
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Tout désélectionner
                </button>
              </div>
              <div className="text-xs text-gray-500">
                <Check className="h-3 w-3 inline mr-1 text-green-600" />
                {geocodedCount}/{suggestions.length} géolocalisées
              </div>
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1" style={{ maxHeight: '400px' }}>
              {suggestions.map((suggestion, index) => {
                const isSelected = selected.has(index);
                const defaultType = { label: 'Ville', className: 'bg-blue-100 text-blue-800 border-blue-200' };
                const typeInfo = TYPE_LABELS[suggestion.location_type] || defaultType;

                return (
                  <div
                    key={index}
                    onClick={() => handleToggle(index)}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${isSelected
                        ? 'border-purple-200 bg-purple-50/50 hover:bg-purple-50'
                        : 'border-gray-100 bg-white hover:bg-gray-50 opacity-60'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(index)}
                      className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-gray-900">
                          {suggestion.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${typeInfo.className}`}
                        >
                          {typeInfo.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-2">
                        {suggestion.description_fr}
                      </p>

                      {/* Geo info */}
                      <div className="flex items-center gap-2 mt-1">
                        {suggestion.geocoding_success ? (
                          <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {suggestion.lat?.toFixed(4)}, {suggestion.lng?.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Non géolocalisée
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sort order */}
                    <span className="text-xs text-gray-400 font-mono shrink-0">
                      #{suggestion.sort_order}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="mt-4">
          {step === 'config' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleSuggest}
                disabled={!countryCode || suggesting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Suggérer les destinations
              </button>
            </>
          )}

          {step === 'loading' && (
            <button
              onClick={() => { handleReset(); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Recommencer
              </button>
              <button
                onClick={handleCreate}
                disabled={selectedCount === 0 || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Créer {selectedCount} destination{selectedCount > 1 ? 's' : ''} + pages brouillon
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
