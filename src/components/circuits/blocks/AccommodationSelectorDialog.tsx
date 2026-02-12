'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ArrowLeft, Star, Users, Bed, Loader2, Building2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { useAccommodationSearch } from '@/hooks/useAccommodationSearch';
import { useRoomRates, useCreateAccommodation } from '@/hooks/useAccommodations';
import { useCreateSupplier } from '@/hooks/useSuppliers';
import {
  resolveSeasonForDate,
  buildRateMap,
  buildRateMapByBedType,
  getTripDayDate,
  formatRate,
} from '@/lib/seasonMatcher';
import { BED_TYPE_LABELS } from '@/components/circuits/RoomDemandEditor';
import type { Accommodation, RoomCategory, RoomRate, RoomDemandEntry, RoomBedType } from '@/lib/api/types';

interface AccommodationSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Location hint from TripDay.location_to (e.g. "Ayutthaya") */
  locationHint?: string;
  /** Current hotel name to highlight */
  currentHotelName?: string;
  /** Trip start date for rate resolution */
  tripStartDate?: string;
  /** Day number (1-based) for rate resolution */
  dayNumber?: number;
  /** Callback when hotel + room is selected */
  onSelect: (selection: {
    accommodation: Accommodation;
    roomCategory: RoomCategory;
    resolvedRate?: RoomRate;
  }) => void;
  /** Room demand for allocation preview (trip-level or custom) */
  tripRoomDemand?: RoomDemandEntry[];
  /** @deprecated Use inline creation instead. Kept for backwards compatibility. */
  onCreateHotel?: () => void;
}

/**
 * Multi-step dialog for selecting a hotel and room category.
 * Step 1: Search & select hotel (pre-filtered by location)
 * Step 2: Select room category (with rate display)
 * Step 3: Create new hotel inline (supplier + accommodation)
 */
export function AccommodationSelectorDialog({
  open,
  onOpenChange,
  locationHint,
  currentHotelName,
  tripStartDate,
  dayNumber,
  onSelect,
  tripRoomDemand,
}: AccommodationSelectorDialogProps) {
  const [step, setStep] = useState<'hotel' | 'room' | 'create'>('hotel');
  const [selectedHotel, setSelectedHotel] = useState<Accommodation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Resolve location hint to location_id
  const { resolvedLocationId, loading: locationLoading } = useLocationSearch(locationHint);

  // Refresh key to force re-fetch after creation
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch accommodations based on location + search
  const { data: accommodations, loading: accommodationsLoading } = useAccommodationSearch({
    location_id: resolvedLocationId,
    search: debouncedSearch || undefined,
    status: 'active',
    _refreshKey: refreshKey,
  });

  // Fetch rates for selected hotel (Step 2)
  const { data: hotelRates } = useRoomRates(
    step === 'room' && selectedHotel ? selectedHotel.id : null
  );

  // Resolve rate map for the selected hotel
  const dialogRateMap = useMemo(() => {
    if (!hotelRates?.length || !selectedHotel) return new Map();
    const dayDate = getTripDayDate(tripStartDate, dayNumber ?? 1);
    const seasons = selectedHotel.seasons || [];
    const seasonId = dayDate ? resolveSeasonForDate(seasons, dayDate) : null;
    return buildRateMap(hotelRates, seasonId);
  }, [hotelRates, selectedHotel, tripStartDate, dayNumber]);

  // Resolve season ID once
  const resolvedSeasonId = useMemo(() => {
    if (!selectedHotel) return null;
    const dayDate = getTripDayDate(tripStartDate, dayNumber ?? 1);
    const seasons = selectedHotel.seasons || [];
    return dayDate ? resolveSeasonForDate(seasons, dayDate) : null;
  }, [selectedHotel, tripStartDate, dayNumber]);

  // Get active room categories for selected hotel
  const activeRoomCategories = useMemo(() => {
    if (!selectedHotel?.room_categories) return [];
    return selectedHotel.room_categories
      .filter(rc => rc.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedHotel]);

  // Build per-bed-type rate maps for allocation preview
  const bedTypeRateMaps = useMemo(() => {
    const maps = new Map<number, Map<string, RoomRate>>();
    if (!hotelRates?.length || !selectedHotel) return maps;
    for (const rc of activeRoomCategories) {
      maps.set(rc.id, buildRateMapByBedType(hotelRates, resolvedSeasonId, rc.id));
    }
    return maps;
  }, [hotelRates, selectedHotel, activeRoomCategories, resolvedSeasonId]);

  // Check allocation compatibility for each room category
  const getAllocationPreview = useCallback((room: RoomCategory) => {
    if (!tripRoomDemand?.length) return null;
    const availableBeds = room.available_bed_types || [];
    const ratesByBed = bedTypeRateMaps.get(room.id) || new Map();

    return tripRoomDemand.map(demand => ({
      bed_type: demand.bed_type,
      qty: demand.qty,
      supported: availableBeds.length === 0 || availableBeds.includes(demand.bed_type),
      rate: ratesByBed.get(demand.bed_type),
    }));
  }, [tripRoomDemand, bedTypeRateMaps]);

  // ─── Create hotel form state ────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    name: '',
    starRating: 3,
    city: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { mutate: createSupplier } = useCreateSupplier();
  const { mutate: createAccommodation } = useCreateAccommodation();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('hotel');
      setSelectedHotel(null);
      setSearchQuery('');
      setCreateForm({ name: '', starRating: 3, city: locationHint || '' });
      setCreateError(null);
    }
  }, [open, locationHint]);

  // Get main photo for an accommodation
  const getMainPhoto = (acc: Accommodation) => {
    if (!acc.photos?.length) return null;
    const main = acc.photos.find(p => p.is_main);
    return main || acc.photos[0];
  };

  const handleSelectHotel = (hotel: Accommodation) => {
    setSelectedHotel(hotel);
    setStep('room');
  };

  const handleSelectRoom = (room: RoomCategory) => {
    if (!selectedHotel) return;
    const resolvedRate = dialogRateMap.get(room.id);
    onSelect({ accommodation: selectedHotel, roomCategory: room, resolvedRate });
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'room') {
      setStep('hotel');
      setSelectedHotel(null);
    } else if (step === 'create') {
      setStep('hotel');
      setCreateError(null);
    }
  };

  const handleStartCreate = () => {
    setCreateForm({ name: '', starRating: 3, city: locationHint || '' });
    setCreateError(null);
    setStep('create');
  };

  // ─── Create hotel handler ──────────────────────────────────────────
  const handleCreateHotel = useCallback(async () => {
    const trimmedName = createForm.name.trim();
    if (!trimmedName) {
      setCreateError('Le nom est obligatoire');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      // 1. Create supplier (type = accommodation)
      const supplier = await createSupplier({
        name: trimmedName,
        type: 'accommodation',
        city: createForm.city.trim() || undefined,
      });

      if (!supplier?.id) {
        throw new Error('Échec de la création du fournisseur');
      }

      // 2. Create accommodation linked to supplier
      await createAccommodation({
        supplier_id: supplier.id,
        name: trimmedName,
        star_rating: createForm.starRating || undefined,
        city: createForm.city.trim() || undefined,
        location_id: resolvedLocationId || undefined,
      });

      // 3. Refresh hotel list and go back to hotel step
      setRefreshKey(k => k + 1);
      setSearchQuery(trimmedName); // pre-fill search with the new hotel name
      setStep('hotel');
    } catch (err) {
      console.error('Failed to create hotel:', err);
      setCreateError(
        err instanceof Error ? err.message : 'Erreur lors de la création'
      );
    } finally {
      setCreating(false);
    }
  }, [createForm, createSupplier, createAccommodation, resolvedLocationId]);

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-current" />
        ))}
      </span>
    );
  };

  const isLoading = locationLoading || accommodationsLoading;
  const hotelList = accommodations || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col p-0">
        {/* STEP 1: Hotel selection */}
        {step === 'hotel' && (
          <>
            <DialogHeader className="px-5 pt-5 pb-0">
              <DialogTitle className="text-base font-semibold">
                Sélectionner un hébergement
              </DialogTitle>
            </DialogHeader>

            {/* Search input */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un hôtel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
              {locationHint && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Filtré par :</span>
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    {locationHint}
                  </span>
                </div>
              )}
            </div>

            {/* Hotel list */}
            <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0" style={{ maxHeight: '55vh' }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Chargement...</span>
                </div>
              ) : hotelList.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun hébergement trouvé</p>
                  {locationHint && (
                    <p className="text-xs mt-1">
                      Essayez de modifier la recherche
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {hotelList.map((hotel) => {
                    const photo = getMainPhoto(hotel);
                    const roomCount = hotel.room_categories?.filter(rc => rc.is_active).length ?? 0;
                    const isCurrent = currentHotelName && hotel.name === currentHotelName;

                    return (
                      <button
                        key={hotel.id}
                        onClick={() => handleSelectHotel(hotel)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isCurrent
                            ? 'bg-amber-50 border border-amber-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        {/* Photo thumbnail */}
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                          {photo ? (
                            <img
                              src={photo.thumbnail_url || photo.url}
                              alt={hotel.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Hotel info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {hotel.name}
                            </span>
                            {renderStars(hotel.star_rating)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {hotel.city && (
                              <span className="text-xs text-gray-500">{hotel.city}</span>
                            )}
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">
                              {roomCount} chambre{roomCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="text-xs text-amber-600 font-medium">Actuel</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create new hotel button (always visible at bottom) */}
            <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0">
              <button
                onClick={handleStartCreate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg border border-dashed border-amber-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer un nouvel hébergement
              </button>
            </div>
          </>
        )}

        {/* STEP 2: Room category selection */}
        {step === 'room' && selectedHotel && (
          <>
            <DialogHeader className="px-5 pt-5 pb-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                </button>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  {selectedHotel.name}
                  {renderStars(selectedHotel.star_rating)}
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* Hotel photo header */}
            {(() => {
              const photo = getMainPhoto(selectedHotel);
              if (!photo) return null;
              return (
                <div className="mx-5 mt-3 rounded-lg overflow-hidden bg-gray-100" style={{ maxHeight: '140px' }}>
                  <img
                    src={photo.url_medium || photo.url}
                    alt={selectedHotel.name}
                    className="w-full h-full object-cover"
                    style={{ maxHeight: '140px' }}
                  />
                </div>
              );
            })()}

            {/* Room categories list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0" style={{ maxHeight: '50vh' }}>
              {activeRoomCategories.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Bed className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune chambre disponible</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeRoomCategories.map((room) => {
                    const rateText = formatRate(dialogRateMap.get(room.id));
                    const preview = getAllocationPreview(room);
                    const hasUnsupported = preview?.some(p => !p.supported) ?? false;

                    return (
                      <button
                        key={room.id}
                        onClick={() => handleSelectRoom(room)}
                        className={`w-full flex flex-col gap-1 px-3 py-3 rounded-lg text-left hover:bg-gray-50 border transition-colors ${
                          hasUnsupported
                            ? 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/50'
                            : 'border-transparent hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Room icon */}
                          <div className="w-10 h-10 rounded-lg bg-amber-50 flex-shrink-0 flex items-center justify-center">
                            <Bed className="w-5 h-5 text-amber-600" />
                          </div>

                          {/* Room info */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">
                              {room.name}
                            </span>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                {room.max_occupancy} pers. max
                              </span>
                              {room.available_bed_types?.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  {room.available_bed_types.join('/')}
                                </span>
                              )}
                              {room.size_sqm && (
                                <span className="text-xs text-gray-400">
                                  {room.size_sqm}m²
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Rate (simple — only when no allocation preview) */}
                          {rateText && !preview && (
                            <span className="text-sm font-medium text-amber-700 flex-shrink-0">
                              {rateText}
                            </span>
                          )}
                        </div>

                        {/* Allocation preview — bed type compatibility */}
                        {preview && preview.length > 0 && (
                          <div className="ml-[52px] flex flex-wrap gap-1.5 mt-0.5">
                            {preview.map((p) => {
                              const rateInfo = p.rate ? formatRate(p.rate) : null;
                              return (
                                <span
                                  key={p.bed_type}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    p.supported
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-red-50 text-red-600 border border-red-200'
                                  }`}
                                >
                                  {p.supported ? '✓' : '✗'}
                                  {BED_TYPE_LABELS[p.bed_type as RoomBedType] || p.bed_type}
                                  ×{p.qty}
                                  {rateInfo && (
                                    <span className="text-[9px] text-gray-500 ml-0.5">{rateInfo}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* STEP 3: Create new hotel inline */}
        {step === 'create' && (
          <>
            <DialogHeader className="px-5 pt-5 pb-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                </button>
                <DialogTitle className="text-base font-semibold">
                  Créer un nouvel hébergement
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-gray-500">
                L'hébergement sera créé et disponible immédiatement dans la liste.
                Vous pourrez compléter sa fiche (chambres, tarifs, photos) ultérieurement depuis l'onglet Fournisseurs.
              </p>

              {/* Hotel name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'hébergement <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ex: The Siam Hotel"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="h-9 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !creating) {
                      e.preventDefault();
                      handleCreateHotel();
                    }
                  }}
                />
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classement étoiles
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCreateForm(f => ({
                        ...f,
                        starRating: f.starRating === star ? 0 : star,
                      }))}
                      className={`p-1 rounded transition-colors ${
                        star <= createForm.starRating
                          ? 'text-amber-400'
                          : 'text-gray-300 hover:text-amber-300'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                  {createForm.starRating > 0 && (
                    <span className="text-xs text-gray-400 ml-2">
                      {createForm.starRating} étoile{createForm.starRating > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <Input
                  placeholder="Ex: Bangkok"
                  value={createForm.city}
                  onChange={(e) => setCreateForm(f => ({ ...f, city: e.target.value }))}
                  className="h-9 text-sm"
                />
                {locationHint && createForm.city === locationHint && (
                  <p className="text-xs text-gray-400 mt-1">
                    Pré-rempli depuis la destination du jour
                  </p>
                )}
              </div>

              {/* Error */}
              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {createError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreateHotel}
                disabled={creating || !createForm.name.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Créer et sélectionner
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
