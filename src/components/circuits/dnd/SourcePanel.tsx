'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, Loader2, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTrips, useTrip } from '@/hooks/useTrips';
import { DraggableSourceBlock } from './DraggableSourceBlock';
import { DraggableSourceDay } from './DraggableSourceDay';
import type { Trip } from '@/lib/api/types';

interface SourcePanelProps {
  /** Current trip ID — excluded from the list */
  currentTripId: number;
  onClose: () => void;
}

/**
 * Sidebar panel to browse templates and other circuits.
 * Blocks and days can be dragged from here into the circuit editor.
 *
 * Rendered inline (not in a portal) so it stays inside the DndContext DOM tree.
 */
export function SourcePanel({ currentTripId, onClose }: SourcePanelProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'circuits'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  // Fetch trips based on active tab
  const { data: templateTrips, loading: templatesLoading } = useTrips({ type: 'template', page_size: 50 });
  const { data: onlineTrips, loading: circuitsLoading } = useTrips({ type: 'online', page_size: 50 });

  // Lazy-load full trip data when expanding
  const { data: expandedTrip, loading: expandedTripLoading } = useTrip(expandedTripId);

  const trips = activeTab === 'templates' ? templateTrips : onlineTrips;
  const loading = activeTab === 'templates' ? templatesLoading : circuitsLoading;

  // Filter trips (exclude current, apply search)
  const filteredTrips = useMemo(() => {
    if (!trips?.items) return [];
    let items = trips.items.filter(t => t.id !== currentTripId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t =>
        t.name?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [trips, currentTripId, searchQuery]);

  // Reset expanded state when switching tabs
  useEffect(() => {
    setExpandedTripId(null);
    setExpandedDays([]);
  }, [activeTab]);

  const toggleTrip = (tripId: number) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
      setExpandedDays([]);
    } else {
      setExpandedTripId(tripId);
      setExpandedDays([]);
    }
  };

  const toggleDay = (dayId: number) => {
    setExpandedDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Bibliothèque</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('circuits')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'circuits'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Circuits
          </button>
        </div>
      </div>

      {/* Trip list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Layers className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Aucun {activeTab === 'templates' ? 'template' : 'circuit'} trouvé</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredTrips.map(trip => (
              <TripItem
                key={trip.id}
                trip={trip}
                isExpanded={expandedTripId === trip.id}
                expandedTrip={expandedTripId === trip.id ? expandedTrip : null}
                expandedTripLoading={expandedTripId === trip.id && expandedTripLoading}
                expandedDays={expandedDays}
                onToggleTrip={() => toggleTrip(trip.id)}
                onToggleDay={toggleDay}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] text-gray-400 text-center">
          Glissez un bloc ou un jour vers votre circuit
        </p>
      </div>
    </div>
  );
}

/** Single trip item in the panel list */
function TripItem({
  trip,
  isExpanded,
  expandedTrip,
  expandedTripLoading,
  expandedDays,
  onToggleTrip,
  onToggleDay,
}: {
  trip: Trip;
  isExpanded: boolean;
  expandedTrip: Trip | null;
  expandedTripLoading: boolean;
  expandedDays: number[];
  onToggleTrip: () => void;
  onToggleDay: (dayId: number) => void;
}) {
  const dayCount = trip.duration_days || trip.days?.length || 0;

  return (
    <div>
      {/* Trip header */}
      <button
        onClick={onToggleTrip}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
          isExpanded ? 'bg-emerald-50' : 'hover:bg-gray-50'
        }`}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-800 truncate block">
            {trip.name || `Circuit #${trip.id}`}
          </span>
          <span className="text-[10px] text-gray-400">
            {dayCount > 0 ? `${dayCount} jour${dayCount > 1 ? 's' : ''}` : 'Aucun jour'}
          </span>
        </div>
      </button>

      {/* Expanded: show days */}
      {isExpanded && (
        <div className="ml-2 pl-2 border-l border-gray-200">
          {expandedTripLoading ? (
            <div className="flex items-center py-3 text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin mr-2" />
              <span className="text-[10px]">Chargement...</span>
            </div>
          ) : expandedTrip?.days?.length ? (
            expandedTrip.days.map(day => (
              <div key={day.id}>
                {/* Day: draggable header + collapsible blocks */}
                <DraggableSourceDay day={day} sourceTripId={expandedTrip.id}>
                  {/* Expand/collapse toggle for blocks */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDay(day.id);
                    }}
                    className="ml-8 text-[10px] text-gray-400 hover:text-gray-600 py-0.5"
                  >
                    {expandedDays.includes(day.id)
                      ? `Masquer ${day.formulas?.length || 0} bloc(s)`
                      : `${day.formulas?.length || 0} bloc(s)`
                    }
                  </button>

                  {/* Blocks list */}
                  {expandedDays.includes(day.id) && day.formulas && (
                    <div className="ml-6 mb-1">
                      {day.formulas
                        .filter(f => !f.parent_block_id)
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map(block => (
                          <DraggableSourceBlock
                            key={block.id}
                            block={block}
                            sourceDayId={day.id}
                          />
                        ))
                      }
                    </div>
                  )}
                </DraggableSourceDay>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-gray-300 py-2 px-2">Aucun jour</p>
          )}
        </div>
      )}
    </div>
  );
}
