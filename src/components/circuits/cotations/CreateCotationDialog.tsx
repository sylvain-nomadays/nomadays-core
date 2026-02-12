'use client';

import { useState } from 'react';
import { X, Plus, Minus, ChevronDown, ChevronRight, Bed } from 'lucide-react';
import type { TripCondition, TripType, RoomDemandEntry, CreateCotationDTO, CotationMode, TripPaxConfig } from '@/lib/api/types';
import RoomDemandEditor from '@/components/circuits/RoomDemandEditor';

interface CreateCotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateCotationDTO) => void;
  tripConditions: TripCondition[];
  creating?: boolean;
  tripType?: TripType;
  tripRoomDemand?: RoomDemandEntry[];
  tripPaxConfigs?: TripPaxConfig[];  // Pre-fill pax from trip's existing pax configs (generated from dossier)
}

// ─── Auto room calculation helper ─────────────────────────────────────────────
function autoRoomSummary(adults: number): string {
  const dbl = Math.floor(adults / 2);
  const sgl = adults % 2;
  const parts: string[] = [];
  if (dbl > 0) parts.push(`${dbl} DBL`);
  if (sgl > 0) parts.push(`${sgl} SGL`);
  return parts.length > 0 ? parts.join(' + ') : '—';
}

export default function CreateCotationDialog({
  isOpen,
  onClose,
  onCreate,
  tripConditions,
  creating,
  tripType,
  tripRoomDemand,
  tripPaxConfigs,
}: CreateCotationDialogProps) {
  // ─── Pre-fill pax from trip pax configs (generated from dossier) ──────────
  // If trip already has pax_configs (e.g. from dossier copy), use them as defaults
  const defaultPax = tripPaxConfigs?.[0]?.args_json;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [conditionSelections, setConditionSelections] = useState<Record<string, number>>({});

  // Mode: auto-detect from trip type
  const defaultMode: CotationMode = tripType === 'custom' ? 'custom' : 'range';
  const [mode, setMode] = useState<CotationMode>(defaultMode);

  // Range mode state
  const [minPax, setMinPax] = useState(2);
  const [maxPax, setMaxPax] = useState(10);

  // Custom mode state — pre-fill from trip pax configs if available
  const [adult, setAdult] = useState(defaultPax?.adult || 2);
  const [teen, setTeen] = useState(defaultPax?.teen || 0);
  const [child, setChild] = useState(defaultPax?.child || 0);
  const [baby, setBaby] = useState(defaultPax?.baby || 0);

  // Disclosure states — auto-expand if teens/children/babies pre-filled from dossier
  const hasDossierMinors = Boolean(defaultPax && ((defaultPax.teen || 0) > 0 || (defaultPax.child || 0) > 0 || (defaultPax.baby || 0) > 0));
  const [showPaxDetail, setShowPaxDetail] = useState(hasDossierMinors);
  const [showRoomOverride, setShowRoomOverride] = useState(false);

  // Room override
  const [roomOverride, setRoomOverride] = useState<RoomDemandEntry[]>(
    tripRoomDemand || []
  );

  if (!isOpen) return null;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!name.trim()) return;

    const data: CreateCotationDTO = {
      name: name.trim(),
      condition_selections: conditionSelections,
      mode,
    };

    if (mode === 'custom') {
      data.adult = adult;
      if (teen > 0) data.teen = teen;
      if (child > 0) data.child = child;
      if (baby > 0) data.baby = baby;
      // Room override if user customized rooms
      if (showRoomOverride && roomOverride.length > 0) {
        data.room_demand_override = roomOverride;
      }
    } else {
      data.min_pax = minPax;
      data.max_pax = maxPax;
    }

    onCreate(data);
    // Reset form
    setName('');
    setConditionSelections({});
    setShowPaxDetail(false);
    setShowRoomOverride(false);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setConditionSelections({});
    setShowPaxDetail(false);
    setShowRoomOverride(false);
    onClose();
  };

  // Pre-fill condition selections from trip-level defaults
  const activeConditions = tripConditions.filter(tc => tc.is_active);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Nouvelle cotation</h2>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la cotation</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Budget, Classique, Deluxe..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              autoFocus
            />
          </div>

          {/* Mode toggle (discreet) */}
          <div>
            <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => setMode('range')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  mode === 'range'
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Grille (min → max)
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  mode === 'custom'
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Composition fixe
              </button>
            </div>
          </div>

          {/* ─── Mode Range ─── */}
          {mode === 'range' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de voyageurs</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">De</span>
                  <input
                    type="number"
                    value={minPax}
                    onChange={(e) => setMinPax(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={maxPax}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">à</span>
                  <input
                    type="number"
                    value={maxPax}
                    onChange={(e) => setMaxPax(Math.max(minPax, parseInt(e.target.value) || 10))}
                    min={minPax}
                    max={20}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-sm text-gray-400">participants</span>
              </div>
            </div>
          )}

          {/* ─── Mode Custom ─── */}
          {mode === 'custom' && (
            <div className="space-y-4">
              {/* Adults (always visible) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Voyageurs</label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Adultes</span>
                  <PaxCounter value={adult} onChange={setAdult} min={1} max={20} />
                </div>
              </div>

              {/* Disclosure: Détailler la composition */}
              <div>
                <button
                  onClick={() => setShowPaxDetail(!showPaxDetail)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
                >
                  {showPaxDetail
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                  Détailler la composition
                </button>

                {showPaxDetail && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-700">Ados</span>
                        <span className="text-xs text-gray-400 ml-1.5">(11-16 ans)</span>
                      </div>
                      <PaxCounter value={teen} onChange={setTeen} min={0} max={10} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-700">Enfants</span>
                        <span className="text-xs text-gray-400 ml-1.5">(2-10 ans)</span>
                      </div>
                      <PaxCounter value={child} onChange={setChild} min={0} max={10} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-700">Bébés</span>
                        <span className="text-xs text-gray-400 ml-1.5">(0-1 an)</span>
                      </div>
                      <PaxCounter value={baby} onChange={setBaby} min={0} max={5} />
                    </div>
                  </div>
                )}
              </div>

              {/* Rooms section */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Chambres</span>
                  </div>
                  {!showRoomOverride && (
                    <span className="text-xs text-gray-400">
                      Auto : {autoRoomSummary(adult)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!showRoomOverride) {
                      // Init room override with auto-calculated rooms
                      const autoRooms: RoomDemandEntry[] = [];
                      const dbl = Math.floor(adult / 2);
                      const sgl = adult % 2;
                      if (dbl > 0) autoRooms.push({ bed_type: 'DBL', qty: dbl });
                      if (sgl > 0) autoRooms.push({ bed_type: 'SGL', qty: sgl });
                      setRoomOverride(autoRooms.length > 0 ? autoRooms : [{ bed_type: 'DBL', qty: 1 }]);
                    }
                    setShowRoomOverride(!showRoomOverride);
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors mt-1"
                >
                  {showRoomOverride
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                  Personnaliser les chambres
                </button>

                {showRoomOverride && (
                  <div className="mt-2">
                    <RoomDemandEditor
                      value={roomOverride}
                      onChange={setRoomOverride}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conditions */}
          {activeConditions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Conditions</label>
              <div className="space-y-2">
                {activeConditions.map(tc => (
                  <div key={tc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{tc.condition_name}</span>
                    <select
                      value={conditionSelections[String(tc.condition_id)] ?? tc.selected_option_id ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val) {
                          setConditionSelections(prev => ({
                            ...prev,
                            [String(tc.condition_id)]: val,
                          }));
                        }
                      }}
                      className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white focus:ring-2 focus:ring-primary"
                    >
                      {tc.options?.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── PaxCounter sub-component ────────────────────────────────────────────────
function PaxCounter({
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-30"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-sm font-semibold text-gray-900 w-6 text-center tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-30"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
