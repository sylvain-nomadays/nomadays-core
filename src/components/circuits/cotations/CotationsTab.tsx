'use client';

import { useState, useCallback } from 'react';
import {
  Plus, Calculator, Trash2, Play, AlertTriangle,
  Loader2, RefreshCw, Settings, ChevronDown, ChevronRight,
  Pencil, Eye,
} from 'lucide-react';
import { useCotations } from '@/hooks/useCotations';
import { useTripConditions } from '@/hooks/useConditions';
import type { TripCotation, UpdateCotationDTO, TripType, RoomDemandEntry, CreateCotationDTO, TripPaxConfig } from '@/lib/api/types';
import CreateCotationDialog from './CreateCotationDialog';
import CotationConditionsEditor from './CotationConditionsEditor';
import PaxRangeConfig from './PaxRangeConfig';
import CotationResultsTable from './CotationResultsTable';

interface CotationsTabProps {
  tripId: number;
  tripType?: TripType;
  tripRoomDemand?: RoomDemandEntry[];
  tripPaxConfigs?: TripPaxConfig[];
  selectedCotationId?: number | null;
}

export default function CotationsTab({ tripId, tripType, tripRoomDemand, tripPaxConfigs, selectedCotationId }: CotationsTabProps) {
  const {
    cotations,
    isLoading,
    refetch,
    create,
    creating,
    update,
    updating,
    remove,
    removing,
    calculate,
    calculating,
    calculateAll,
    calculatingAll,
    regeneratePax,
    regeneratingPax,
  } = useCotations(tripId);

  const { tripConditions } = useTripConditions(tripId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeCotationId, setActiveCotationId] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(true);

  // Auto-select first cotation
  const activeCotation = cotations.find(c => c.id === activeCotationId) || cotations[0] || null;

  const handleCreate = useCallback(async (data: CreateCotationDTO) => {
    try {
      const newCotation = await create(data);
      await refetch();
      // Auto-launch calculation after creation
      if (newCotation?.id) {
        setActiveCotationId(newCotation.id);
        try {
          await calculate(newCotation.id);
          refetch();
        } catch (calcErr) {
          console.error('[CotationsTab] Erreur calcul auto:', calcErr);
        }
      }
    } catch (err) {
      console.error('[CotationsTab] Erreur création:', err);
    }
  }, [create, calculate, refetch]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await remove(id);
      if (activeCotationId === id) setActiveCotationId(null);
      refetch();
    } catch (err) {
      console.error('[CotationsTab] Erreur suppression:', err);
    }
  }, [remove, activeCotationId, refetch]);

  const handleUpdateConditions = useCallback(async (selections: Record<string, number>) => {
    if (!activeCotation) return;
    try {
      await update({ cotationId: activeCotation.id, data: { condition_selections: selections } });
      refetch();
    } catch (err) {
      console.error('[CotationsTab] Erreur mise à jour conditions:', err);
    }
  }, [activeCotation, update, refetch]);

  const handleCalculate = useCallback(async () => {
    if (!activeCotation) return;
    try {
      await calculate(activeCotation.id);
      refetch();
    } catch (err) {
      console.error('[CotationsTab] Erreur calcul:', err);
    }
  }, [activeCotation, calculate, refetch]);

  const handleCalculateAll = useCallback(async () => {
    try {
      await calculateAll();
      refetch();
    } catch (err) {
      console.error('[CotationsTab] Erreur calcul global:', err);
    }
  }, [calculateAll, refetch]);

  const handleRegenerate = useCallback(async () => {
    if (!activeCotation) return;
    try {
      await regeneratePax(activeCotation.id);
      refetch();
    } catch (err) {
      console.error('[CotationsTab] Erreur régénération pax:', err);
    }
  }, [activeCotation, regeneratePax, refetch]);

  const handlePaxRangeChange = useCallback(async (field: 'min_pax' | 'max_pax', value: number) => {
    if (!activeCotation) return;
    try {
      await update({ cotationId: activeCotation.id, data: { [field]: value } });
      refetch();
    } catch (err) {
      console.error('[CotationsTab] Erreur mise à jour pax:', err);
    }
  }, [activeCotation, update, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cotation tabs bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {cotations.map(cotation => {
          const isCotSelected = selectedCotationId != null && cotation.id === selectedCotationId;
          const isActive = activeCotation?.id === cotation.id;
          return (
            <button
              key={cotation.id}
              onClick={() => setActiveCotationId(cotation.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cotation.name}</span>
              {isCotSelected && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-emerald-400/30 text-white'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  Retenue
                </span>
              )}
              {cotation.is_published_client && (
                <span title="Publié côté client">
                  <Eye className={`w-3.5 h-3.5 ${
                    isActive ? 'text-primary-foreground/70' : 'text-primary/60'
                  }`} />
                </span>
              )}
              {cotation.status === 'calculated' && (
                <span className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-primary-foreground/30' : 'bg-primary'
                }`} />
              )}
              {cotation.status === 'error' && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>

        {cotations.length > 1 && (
          <button
            onClick={handleCalculateAll}
            disabled={calculatingAll}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            {calculatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Tout recalculer
          </button>
        )}
      </div>

      {/* Published options summary banner */}
      {(() => {
        const publishedCount = cotations.filter(c => c.is_published_client).length;
        if (publishedCount === 0) return null;
        const publishedNames = cotations
          .filter(c => c.is_published_client)
          .map(c => c.client_label || c.name)
          .join(', ');
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
            <Eye className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs text-primary font-medium">
              {publishedCount} option{publishedCount > 1 ? 's' : ''} publiée{publishedCount > 1 ? 's' : ''} côté client
            </span>
            <span className="text-xs text-gray-500">— {publishedNames}</span>
          </div>
        );
      })()}

      {/* No cotations state */}
      {cotations.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune cotation</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Créez une cotation pour lancer le calcul des coûts avec différents profils
            (Budget, Classique, Deluxe) et voir les prix pour 2 à 10 participants.
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer une cotation
          </button>
        </div>
      )}

      {/* Active cotation content */}
      {activeCotation && (
        <div className="space-y-4">
          {/* Config section (collapsible) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Configuration — {activeCotation.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  activeCotation.status === 'calculated'
                    ? 'bg-nomadays-sage-light text-nomadays-sage'
                    : activeCotation.status === 'calculating'
                    ? 'bg-amber-100 text-amber-700'
                    : activeCotation.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {activeCotation.status === 'calculated' ? 'Calculé' :
                   activeCotation.status === 'calculating' ? 'En cours...' :
                   activeCotation.status === 'error' ? 'Erreur' :
                   'Brouillon'}
                </span>
                {showConfig ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Quick actions when config is collapsed */}
              {!showConfig && activeCotation.status === 'calculated' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowConfig(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Éditer
                  </button>
                  <button
                    onClick={handleCalculate}
                    disabled={calculating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {calculating
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    {calculating ? 'Calcul...' : 'Recalculer'}
                  </button>
                </div>
              )}
            </div>

            {showConfig && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                {/* Conditions */}
                {tripConditions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Conditions</label>
                    <CotationConditionsEditor
                      tripConditions={tripConditions}
                      conditionSelections={activeCotation.condition_selections || {}}
                      onChange={handleUpdateConditions}
                    />
                  </div>
                )}

                {/* Pax range */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Participants</label>
                  <PaxRangeConfig
                    minPax={activeCotation.min_pax}
                    maxPax={activeCotation.max_pax}
                    paxConfigs={activeCotation.pax_configs_json || []}
                    onMinPaxChange={(v) => handlePaxRangeChange('min_pax', v)}
                    onMaxPaxChange={(v) => handlePaxRangeChange('max_pax', v)}
                    onRegenerate={handleRegenerate}
                    regenerating={regeneratingPax}
                    isCustomMode={activeCotation.mode === 'custom'}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCalculate}
                    disabled={calculating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {calculating
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : activeCotation.status === 'calculated'
                        ? <RefreshCw className="w-4 h-4" />
                        : <Play className="w-4 h-4" />
                    }
                    {calculating
                      ? 'Calcul en cours...'
                      : activeCotation.status === 'calculated'
                        ? 'Recalculer'
                        : 'Lancer la cotation'
                    }
                  </button>

                  <button
                    onClick={() => handleDelete(activeCotation.id)}
                    disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {activeCotation.results_json && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  Résultats — {activeCotation.name}
                </h3>
                {activeCotation.calculated_at && (
                  <span className="text-xs text-gray-400">
                    Calculé le {new Date(activeCotation.calculated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <CotationResultsTable
                results={activeCotation.results_json}
                currency={activeCotation.results_json.currency || 'EUR'}
              />
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <CreateCotationDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreate}
        tripConditions={tripConditions}
        creating={creating}
        tripType={tripType}
        tripRoomDemand={tripRoomDemand}
        tripPaxConfigs={tripPaxConfigs}
      />
    </div>
  );
}
