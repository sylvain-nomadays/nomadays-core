'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calendar,
  Package,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  MapPin,
  Clock,
  Building2,
  Truck,
  Users,
  UtensilsCrossed,
  Compass,
  ArrowRight,
  Ruler,
  Link2,
} from 'lucide-react';
import { LocationSelector } from '@/components/suppliers/LocationSelector';
import { Camera, Upload, X, Sparkles } from 'lucide-react';
import {
  useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation,
  useLocationPhotos, useUploadLocationPhoto, useDeleteLocationPhoto, useReorderLocationPhotos,
  useGenerateLocationPhotoAI,
} from '@/hooks/useLocations';
import { COUNTRIES, getCountryFlag, getCountryName } from '@/lib/constants/countries';
import GooglePlacesAutocomplete, { type PlaceResult } from '@/components/common/GooglePlacesAutocomplete';
import LocationMapPicker from '@/components/common/LocationMapPicker';
import type { FormulaCategory, TransportMode, LocationLink, LocationType, CreateLocationDTO, UpdateLocationDTO, Location, LocationPhoto } from '@/lib/api/types';
import { DestinationSuggestModal } from '@/components/locations/DestinationSuggestModal';
import { useFormulaTemplates, type FormulaTemplateListItem } from '@/hooks/useFormulaTemplates';
import { useDayTemplates, type DayTemplateListItem } from '@/hooks/useDayTemplates';

type TemplateTab = 'formulas' | 'days' | 'destinations' | 'links';

// ============================================================================
// Category configuration for formulas
// ============================================================================

const categoryConfig: Record<FormulaCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  accommodation: { label: 'Hébergement', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  activity: { label: 'Activité', icon: Compass, color: 'bg-amber-100 text-amber-700' },
  transport: { label: 'Transport', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  restaurant: { label: 'Restauration', icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-700' },
  guide: { label: 'Accompagnement', icon: Users, color: 'bg-emerald-100 text-emerald-700' },
  other: { label: 'Autre', icon: Package, color: 'bg-gray-100 text-gray-700' },
};

// ============================================================================
// Transport mode config (for links)
// ============================================================================

const LINK_TRANSPORT_MODES: { value: TransportMode; label: string; emoji: string }[] = [
  { value: 'driving', label: 'Route', emoji: '🚗' },
  { value: 'flight', label: 'Vol', emoji: '✈️' },
  { value: 'transit', label: 'Train', emoji: '🚂' },
  { value: 'boat', label: 'Bateau', emoji: '🚢' },
  { value: 'walking', label: 'Trek', emoji: '🥾' },
  { value: 'horse', label: 'Cheval', emoji: '🐎' },
  { value: 'camel', label: 'Chameau', emoji: '🐪' },
  { value: 'bicycle', label: 'Vélo', emoji: '🚲' },
  { value: 'kayak', label: 'Kayak', emoji: '🛶' },
];

function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// ============================================================================
// Mock data
// ============================================================================

const mockDayTemplates = [
  {
    id: 1, name: 'Journée Bangkok Temples',
    description: 'Visite des temples majeurs de Bangkok avec guide francophone',
    location_id: 1, location: 'Bangkok', duration_hours: 8,
    tags: ['culture', 'temples', 'incontournable'], formulas_count: 3, is_active: true,
  },
  {
    id: 2, name: 'Journée Chiang Mai Nature',
    description: 'Découverte de la nature et des éléphants dans le nord de la Thaïlande',
    location_id: 2, location: 'Chiang Mai', duration_hours: 10,
    tags: ['nature', 'éléphants', 'famille'], formulas_count: 4, is_active: true,
  },
  {
    id: 3, name: 'Journée Ayutthaya Histoire',
    description: "Visite du site historique d'Ayutthaya, ancienne capitale du Siam",
    location_id: 7, location: 'Ayutthaya', duration_hours: 6,
    tags: ['histoire', 'UNESCO', 'temples'], formulas_count: 2, is_active: true,
  },
];

const mockFormulaTemplates = [
  { id: 1, name: 'Transfert aéroport Bangkok', description: 'Transfert privé aéroport Suvarnabhumi - hôtel centre-ville', category: 'transport' as FormulaCategory, location_id: 1, location: 'Bangkok', supplier: 'Bangkok Limo Service', items_count: 1, unit_cost: 45, currency: 'EUR', tags: ['aéroport', 'transfert'], is_active: true },
  { id: 2, name: 'Guide francophone journée', description: 'Guide professionnel francophone pour une journée complète', category: 'guide' as FormulaCategory, location_id: 1, location: 'Bangkok', supplier: 'Thai Guides Association', items_count: 2, unit_cost: 85, currency: 'EUR', tags: ['guide', 'francophone'], is_active: true },
  { id: 3, name: 'Excursion temples Bangkok', description: 'Visite Wat Pho + Wat Arun avec entrées et bateau', category: 'activity' as FormulaCategory, location_id: 1, location: 'Bangkok', supplier: 'Bangkok Tours', items_count: 4, unit_cost: 65, currency: 'EUR', tags: ['temples', 'culture', 'incontournable'], is_active: true },
  { id: 4, name: 'Déjeuner restaurant local', description: 'Repas dans un restaurant local typique', category: 'restaurant' as FormulaCategory, location_id: null, location: null, supplier: null, items_count: 1, unit_cost: 15, currency: 'EUR', tags: ['repas', 'local'], is_active: true },
  { id: 5, name: 'Sanctuaire éléphants Chiang Mai', description: 'Journée dans un sanctuaire éthique avec repas', category: 'activity' as FormulaCategory, location_id: 2, location: 'Chiang Mai', supplier: 'Elephant Nature Park', items_count: 3, unit_cost: 95, currency: 'EUR', tags: ['éléphants', 'éthique', 'nature'], is_active: true },
  { id: 6, name: 'Nuit Riad Boutique Chiang Mai', description: 'Hébergement boutique hôtel avec petit-déjeuner', category: 'accommodation' as FormulaCategory, location_id: 2, location: 'Chiang Mai', supplier: 'Rachamankha Hotel', items_count: 2, unit_cost: 120, currency: 'EUR', tags: ['boutique', 'charme'], is_active: true },
  { id: 7, name: 'Cours de cuisine thaïe', description: 'Cours de cuisine incluant marché et repas', category: 'activity' as FormulaCategory, location_id: 2, location: 'Chiang Mai', supplier: 'Cooking School Chiang Mai', items_count: 2, unit_cost: 45, currency: 'EUR', tags: ['cuisine', 'authentique', 'famille'], is_active: true },
  { id: 8, name: 'Transfert Chiang Mai - Chiang Rai', description: 'Transfert privé avec arrêt Temple Blanc', category: 'transport' as FormulaCategory, location_id: 2, location: 'Chiang Mai', supplier: 'Northern Thailand Transport', items_count: 2, unit_cost: 110, currency: 'EUR', tags: ['transfert', 'temple blanc'], is_active: true },
];

const mockLocationLinks: LocationLink[] = [
  { id: 1, from_location_id: 1, to_location_id: 7, from_location_name: 'Bangkok', to_location_name: 'Ayutthaya', travel_mode: 'driving', duration_minutes: 90, distance_km: 80, narrative_text: 'Nous prenons la route en direction du nord vers l\'ancienne capitale royale d\'Ayutthaya.' },
  { id: 2, from_location_id: 1, to_location_id: 2, from_location_name: 'Bangkok', to_location_name: 'Chiang Mai', travel_mode: 'flight', duration_minutes: 75, distance_km: 700, narrative_text: 'Nous nous envolons vers le nord pour rejoindre Chiang Mai, la rose du nord.' },
  { id: 3, from_location_id: 2, to_location_id: 3, from_location_name: 'Chiang Mai', to_location_name: 'Chiang Rai', travel_mode: 'driving', duration_minutes: 180, distance_km: 200, narrative_text: 'Route vers Chiang Rai avec un arrêt au fameux Temple Blanc.' },
];

// ============================================================================
// Location types config
// ============================================================================

const locationTypes: { value: LocationType; label: string; icon: string; color: string }[] = [
  { value: 'city', label: 'Ville', icon: '🏙️', color: 'bg-blue-100 text-blue-700' },
  { value: 'region', label: 'Région', icon: '🗺️', color: 'bg-purple-100 text-purple-700' },
  { value: 'country', label: 'Pays', icon: '🌍', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'area', label: 'Zone', icon: '📍', color: 'bg-amber-100 text-amber-700' },
  { value: 'neighborhood', label: 'Quartier', icon: '🏘️', color: 'bg-cyan-100 text-cyan-700' },
];

const typeConfigMap: Record<string, { label: string; icon: string; color: string }> = {
  city: { label: 'Ville', icon: '🏙️', color: 'bg-blue-100 text-blue-700' },
  region: { label: 'Région', icon: '🗺️', color: 'bg-purple-100 text-purple-700' },
  country: { label: 'Pays', icon: '🌍', color: 'bg-emerald-100 text-emerald-700' },
  area: { label: 'Zone', icon: '📍', color: 'bg-amber-100 text-amber-700' },
  neighborhood: { label: 'Quartier', icon: '🏘️', color: 'bg-cyan-100 text-cyan-700' },
};

// ============================================================================
// Page Component
// ============================================================================

const VALID_TABS: TemplateTab[] = ['formulas', 'days', 'destinations', 'links'];

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial tab from URL ?tab=destinations
  const tabFromUrl = searchParams.get('tab') as TemplateTab | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'formulas';

  const [activeTab, setActiveTab] = useState<TemplateTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FormulaCategory | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  // Location links state (mock for now)
  const [locationLinks, setLocationLinks] = useState<LocationLink[]>(mockLocationLinks);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLink, setNewLink] = useState<Partial<LocationLink>>({ travel_mode: 'driving' });

  // Sync URL when tab changes
  const handleTabChange = useCallback((tab: TemplateTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedCategory(null);
    // Update URL without full navigation
    const url = tab === 'formulas' ? '/admin/templates' : `/admin/templates?tab=${tab}`;
    router.replace(url, { scroll: false });
  }, [router]);

  // Sync tab from URL if it changes externally (e.g. browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as TemplateTab | null;
    const resolvedTab = urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'formulas';
    if (resolvedTab !== activeTab) {
      setActiveTab(resolvedTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Destination form state
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Location | null>(null);
  const [destFormData, setDestFormData] = useState<Partial<CreateLocationDTO>>({
    location_type: 'city',
    country_code: 'TH',
  });
  const [destMenuOpen, setDestMenuOpen] = useState<number | null>(null);

  // Formula templates from API
  const {
    templates: formulaTemplates,
    isLoading: formulasLoading,
    refetch: refetchFormulas,
    remove: deleteFormulaTemplate,
  } = useFormulaTemplates({
    category: selectedCategory || undefined,
    search: searchQuery && activeTab === 'formulas' ? searchQuery : undefined,
  });

  // Day templates from API
  const {
    dayTemplates,
    isLoading: daysLoading,
    refetch: refetchDays,
    remove: deleteDayTemplate,
  } = useDayTemplates({
    search: searchQuery && activeTab === 'days' ? searchQuery : undefined,
  });

  // Locations from API (for destinations tab and links)
  const { locations, isLoading: locationsLoading, refetch: refetchLocations } = useLocations({ is_active: true, page_size: 200 });
  const { mutate: createLocation, loading: creatingDest } = useCreateLocation();
  const { mutate: updateLocation, loading: updatingDest } = useUpdateLocation();
  const { mutate: deleteLocation, loading: deletingDest } = useDeleteLocation();

  // Location photos
  const { mutate: uploadLocationPhoto, loading: uploadingPhoto } = useUploadLocationPhoto();
  const { mutate: deleteLocationPhoto } = useDeleteLocationPhoto();
  const { mutate: generatePhotoAI, loading: generatingPhotoAI } = useGenerateLocationPhotoAI();
  const {
    data: editingDestPhotos,
    refetch: refetchDestPhotos,
  } = useLocationPhotos(editingDestination?.id ?? null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  // Destination handlers
  const openCreateDestination = useCallback(() => {
    setEditingDestination(null);
    setDestFormData({ location_type: 'city', country_code: 'TH' });
    setShowDestinationForm(true);
  }, []);

  const openEditDestination = useCallback((location: Location) => {
    setEditingDestination(location);
    setDestFormData({
      name: location.name,
      slug: location.slug,
      location_type: location.location_type,
      country_code: location.country_code,
      lat: location.lat,
      lng: location.lng,
      google_place_id: location.google_place_id,
      description: location.description,
      sort_order: location.sort_order,
    });
    setShowDestinationForm(true);
    setDestMenuOpen(null);
  }, []);

  const handlePlaceSelect = useCallback((place: PlaceResult | null) => {
    if (!place) return;
    setDestFormData(prev => ({
      ...prev,
      name: place.name || prev.name,
      lat: place.geometry?.location.lat,
      lng: place.geometry?.location.lng,
      google_place_id: place.place_id,
      country_code: place.country_code?.toUpperCase() || prev.country_code,
    }));
  }, []);

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destFormData.name?.trim()) return;
    try {
      if (editingDestination) {
        await updateLocation({ id: editingDestination.id, data: destFormData as UpdateLocationDTO });
      } else {
        await createLocation(destFormData as CreateLocationDTO);
      }
      setShowDestinationForm(false);
      setDestFormData({ location_type: 'city', country_code: 'TH' });
      setEditingDestination(null);
      refetchLocations();
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      console.error('Failed to save destination:', error);
      alert(`Erreur: ${error.detail || error.message || 'Echec de la sauvegarde'}`);
    }
  };

  const handleDeleteDestination = async (location: Location) => {
    if (!confirm(`Voulez-vous supprimer "${location.name}" ?`)) return;
    try {
      await deleteLocation(location.id);
      setDestMenuOpen(null);
      refetchLocations();
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      alert(`Erreur: ${error.detail || error.message || 'Echec de la suppression'}`);
    }
  };

  // Photo upload handler
  const handlePhotoUpload = useCallback(async (files: FileList) => {
    if (!editingDestination) return;
    for (const file of Array.from(files)) {
      try {
        await uploadLocationPhoto({
          locationId: editingDestination.id,
          file,
          options: { alt_text: editingDestination.name },
        });
      } catch (err) {
        console.error('Failed to upload photo:', err);
      }
    }
    refetchDestPhotos();
  }, [editingDestination, uploadLocationPhoto, refetchDestPhotos]);

  const handlePhotoDelete = useCallback(async (photoId: number) => {
    if (!editingDestination) return;
    try {
      await deleteLocationPhoto({ locationId: editingDestination.id, photoId });
      refetchDestPhotos();
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  }, [editingDestination, deleteLocationPhoto, refetchDestPhotos]);

  // AI photo generation handler
  const handleGeneratePhotoAI = useCallback(async (customPrompt?: string) => {
    if (!editingDestination) return;
    try {
      await generatePhotoAI({
        locationId: editingDestination.id,
        prompt: customPrompt || undefined,
        quality: 'high',
      });
      refetchDestPhotos();
      setShowAIPrompt(false);
      setAiPrompt('');
    } catch (err) {
      console.error('Failed to generate AI photo:', err);
      alert('Erreur lors de la génération IA. Vérifiez que le service Vertex AI est configuré.');
    }
  }, [editingDestination, generatePhotoAI, refetchDestPhotos]);

  // Templates are already filtered by the API (search + category sent as query params)
  const filteredDayTemplates = dayTemplates;
  const filteredFormulaTemplates = formulaTemplates;

  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations;
    return locations.filter(loc =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.country_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const filteredLinks = useMemo(() => {
    if (!searchQuery) return locationLinks;
    return locationLinks.filter(link =>
      link.from_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.to_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.narrative_text?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locationLinks, searchQuery]);

  // Stats by category (from API data)
  const statsByCategory = useMemo(() => {
    const stats: Record<FormulaCategory, number> = {
      accommodation: 0, activity: 0, transport: 0, restaurant: 0, guide: 0, other: 0,
    };
    formulaTemplates.forEach(f => {
      const cat = (f.template_category || f.block_type || 'other') as FormulaCategory;
      if (cat in stats) stats[cat]++;
    });
    return stats;
  }, [formulaTemplates]);

  // Handle new link creation
  const handleCreateLink = () => {
    if (!newLink.from_location_id || !newLink.to_location_id) return;
    const fromLoc = locations.find(l => l.id === newLink.from_location_id);
    const toLoc = locations.find(l => l.id === newLink.to_location_id);
    const link: LocationLink = {
      id: Date.now(),
      from_location_id: newLink.from_location_id,
      to_location_id: newLink.to_location_id,
      from_location_name: fromLoc?.name || '',
      to_location_name: toLoc?.name || '',
      travel_mode: newLink.travel_mode || 'driving',
      duration_minutes: newLink.duration_minutes,
      distance_km: newLink.distance_km,
      narrative_text: newLink.narrative_text,
    };
    setLocationLinks(prev => [...prev, link]);
    setNewLink({ travel_mode: 'driving' });
    setShowLinkForm(false);
  };

  const handleDeleteLink = (linkId: number) => {
    setLocationLinks(prev => prev.filter(l => l.id !== linkId));
  };

  // Tab button labels
  const tabConfig: { key: TemplateTab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { key: 'formulas', label: 'Formules types', icon: Package, count: formulaTemplates.length },
    { key: 'days', label: 'Journées types', icon: Calendar, count: dayTemplates.length },
    { key: 'destinations', label: 'Destinations', icon: MapPin, count: locations.length },
    { key: 'links', label: 'Liaisons', icon: Link2, count: locationLinks.length },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500">
            Bibliothèque de formules, journées, destinations et liaisons réutilisables
          </p>
        </div>
        {activeTab === 'links' ? (
          <button
            onClick={() => setShowLinkForm(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5" />
            Nouvelle liaison
          </button>
        ) : activeTab === 'destinations' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSuggestModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              <Sparkles className="w-5 h-5" />
              Suggérer par IA
            </button>
            <button
              onClick={openCreateDestination}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-5 h-5" />
              Nouvelle destination
            </button>
          </div>
        ) : (
          <button
            onClick={() => {/* TODO */}}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'days' ? 'Nouvelle journée type' : 'Nouvelle formule'}
          </button>
        )}
      </div>

      {/* Tabs — 4 onglets */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {tabConfig.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className="ml-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs">{count}</span>
          </button>
        ))}
      </div>

      {/* Category pills (only for formulas) */}
      {activeTab === 'formulas' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes ({formulaTemplates.length})
          </button>
          {(Object.entries(categoryConfig) as [FormulaCategory, typeof categoryConfig[FormulaCategory]][]).map(([key, config]) => {
            const count = statsByCategory[key];
            if (count === 0) return null;
            const CatIcon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? `${config.color.replace('100', '600').replace('700', 'white')} text-white`
                    : `${config.color} hover:opacity-80`
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Search (shown on all tabs except links) */}
      {activeTab !== 'links' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'destinations' ? "Rechercher une destination..." :
                  activeTab === 'days' ? "Rechercher par nom, lieu, tag..." :
                  "Rechercher par nom, fournisseur, lieu, tag..."
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {(searchQuery || selectedCategory || selectedLocation) && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedLocation(null); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Formulas                                                    */}
      {/* ================================================================ */}
      {activeTab === 'formulas' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Formule</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Catégorie</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Pays</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Items</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Version</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFormulaTemplates.map(template => {
                const cat = (template.template_category || template.block_type || 'other') as FormulaCategory;
                const catConfig = categoryConfig[cat] || categoryConfig.other;
                const CatIcon = catConfig.icon;
                const tags = template.template_tags || [];
                return (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        {template.description_html && (
                          <div className="text-sm text-gray-500 line-clamp-1">{template.description_html.replace(/<[^>]*>/g, '')}</div>
                        )}
                        {tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${catConfig.color}`}>
                        <CatIcon className="w-3.5 h-3.5" />
                        {catConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {template.template_country_code ? (
                        <div className="flex items-center gap-1 text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {getCountryFlag(template.template_country_code)} {getCountryName(template.template_country_code)}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="text-sm text-gray-700">{template.items_count} item{template.items_count > 1 ? 's' : ''}</div>
                      {template.usage_count > 0 && (
                        <div className="text-xs text-gray-400">{template.usage_count} utilisation{template.usage_count > 1 ? 's' : ''}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs text-gray-400">v{template.template_version}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Voir"><Eye className="w-4 h-4 text-gray-400" /></button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Modifier"><Edit className="w-4 h-4 text-gray-400" /></button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Dupliquer"><Copy className="w-4 h-4 text-gray-400" /></button>
                        <button
                          className="p-1.5 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                          onClick={async () => {
                            if (confirm('Supprimer ce template ?')) {
                              await deleteFormulaTemplate(template.id);
                              refetchFormulas();
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredFormulaTemplates.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune formule type trouvée</h3>
              <p className="text-gray-500">
                {searchQuery || selectedCategory ? 'Essayez de modifier vos filtres' : 'Créez votre première formule type'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Day Templates                                               */}
      {/* ================================================================ */}
      {activeTab === 'days' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDayTemplates.map(template => {
            const tags = template.template_tags || [];
            return (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.title || 'Sans titre'}</h3>
                        {(template.location_from || template.location_to) && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {template.location_from}{template.location_to ? ` → ${template.location_to}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === template.id ? null : template.id)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {menuOpen === template.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 w-36">
                            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"><Eye className="w-4 h-4" />Voir</button>
                            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"><Edit className="w-4 h-4" />Modifier</button>
                            <button
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                              onClick={async () => {
                                setMenuOpen(null);
                                if (confirm('Supprimer cette journée type ?')) {
                                  await deleteDayTemplate(template.id);
                                  refetchDays();
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1"><Package className="w-4 h-4" />{template.formulas_count} bloc{template.formulas_count > 1 ? 's' : ''}</div>
                    <span className="text-xs text-gray-400">v{template.template_version}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                  <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Utiliser →</button>
                </div>
              </div>
            );
          })}
          {filteredDayTemplates.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune journée type trouvée</h3>
              <p className="text-gray-500">{searchQuery ? 'Essayez de modifier vos filtres' : 'Créez votre première journée type'}</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Destinations                                                */}
      {/* ================================================================ */}
      {activeTab === 'destinations' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Destination</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Pays</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Coordonnées</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLocations.map(location => {
                const tc = typeConfigMap[location.location_type] || { label: location.location_type, icon: '📍', color: 'bg-gray-100 text-gray-700' };
                const hasCoords = !!(location.lat && location.lng);
                return (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        {/* Photo thumbnail or icon */}
                        {location.photos && location.photos.length > 0 ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <img
                              src={location.photos![0]!.thumbnail_url || location.photos![0]!.url}
                              alt={location.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{location.name}</div>
                          {location.slug && <div className="text-xs text-gray-400">{location.slug}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tc.color}`}>
                        {tc.icon} {tc.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {location.country_code ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{getCountryFlag(location.country_code)}</span>
                          <span className="text-sm text-gray-600">{getCountryName(location.country_code)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {hasCoords ? (
                        <span className="text-xs text-gray-500">{Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}</span>
                      ) : (
                        <span className="text-xs text-gray-300">Non géolocalisé</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setDestMenuOpen(destMenuOpen === location.id ? null : location.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {destMenuOpen === location.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setDestMenuOpen(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50">
                              <button
                                onClick={() => openEditDestination(location)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                              >
                                <Edit className="w-4 h-4" />
                                Modifier
                              </button>
                              {hasCoords && (
                                <a
                                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                                  onClick={() => setDestMenuOpen(null)}
                                >
                                  <Compass className="w-4 h-4" />
                                  Google Maps
                                </a>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleDeleteDestination(location)}
                                disabled={deletingDest}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLocations.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {locationsLoading ? 'Chargement...' : 'Aucune destination trouvée'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Essayez de modifier votre recherche' : 'Créez votre première destination'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openCreateDestination}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-5 h-5" />
                  Nouvelle destination
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Create/Edit Destination                                   */}
      {/* ================================================================ */}
      {showDestinationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDestination ? 'Modifier la destination' : 'Nouvelle destination'}
              </h2>
              <button
                onClick={() => { setShowDestinationForm(false); setEditingDestination(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDestination} className="p-4 space-y-4">
              {/* Google Places Autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recherche Google Maps
                </label>
                <GooglePlacesAutocomplete
                  value=""
                  placeholder="Rechercher un lieu sur Google Maps..."
                  onPlaceSelect={handlePlaceSelect}
                  types={['geocode']}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Sélectionnez un lieu pour auto-remplir les coordonnées
                </p>

                {/* Interactive map with draggable marker */}
                {destFormData.lat && destFormData.lng && (
                  <LocationMapPicker
                    lat={destFormData.lat}
                    lng={destFormData.lng}
                    onPositionChange={(lat, lng) => setDestFormData(prev => ({ ...prev, lat, lng }))}
                    height="250px"
                    className="mt-3"
                  />
                )}
              </div>

              <div className="border-t border-gray-100 pt-4" />

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={destFormData.name || ''}
                  onChange={e => setDestFormData({ ...destFormData, name: e.target.value })}
                  placeholder="Ex: Bangkok, Chiang Mai, Marrakech..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={destFormData.location_type || 'city'}
                    onChange={e => setDestFormData({ ...destFormData, location_type: e.target.value as LocationType })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {locationTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                    ))}
                  </select>
                </div>
                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <select
                    value={destFormData.country_code || ''}
                    onChange={e => setDestFormData({ ...destFormData, country_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">-- Sélectionner --</option>
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number" step="any"
                    value={destFormData.lat ?? ''}
                    onChange={e => setDestFormData({ ...destFormData, lat: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="13.7563"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number" step="any"
                    value={destFormData.lng ?? ''}
                    onChange={e => setDestFormData({ ...destFormData, lng: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="100.5018"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={destFormData.description || ''}
                  onChange={e => setDestFormData({ ...destFormData, description: e.target.value })}
                  rows={3}
                  placeholder="Description de la destination..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Photos (only when editing, not creating) */}
              {editingDestination && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Camera className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    Photos ({editingDestPhotos?.length || 0})
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Les photos sont utilisées pour illustrer les jours du circuit associés à cette destination (1re photo = 1er jour, 2e photo = 2e jour, etc.)
                  </p>

                  {/* Photo gallery */}
                  {(editingDestPhotos?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {editingDestPhotos?.map((photo, index) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-gray-100">
                          <img
                            src={photo.thumbnail_url || photo.url}
                            alt={photo.alt_text || editingDestination.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Sort order badge */}
                          <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">
                            {index + 1}
                          </span>
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handlePhotoDelete(photo.id)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload dropzone + AI Generate side by side */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Upload dropzone */}
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            handlePhotoUpload(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      {uploadingPhoto ? (
                        <span className="text-sm text-gray-500">Upload en cours...</span>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Uploader une photo</span>
                        </>
                      )}
                    </label>

                    {/* AI Generate button */}
                    <button
                      type="button"
                      onClick={() => setShowAIPrompt(!showAIPrompt)}
                      disabled={generatingPhotoAI}
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-200 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingPhotoAI ? (
                        <>
                          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-1" />
                          <span className="text-xs text-purple-500">Génération IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-purple-400 mb-1" />
                          <span className="text-xs text-purple-500">Générer par IA</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Prompt panel (expandable) */}
                  {showAIPrompt && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 mb-2 font-medium">
                        Prompt (optionnel — laissez vide pour auto-générer à partir du nom et pays)
                      </p>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={`Ex: Beautiful temple at sunset in ${editingDestination?.name || 'Chiang Mai'}, golden hour lighting, travel photography...`}
                        className="w-full h-16 text-xs border border-purple-200 rounded-md px-2 py-1.5 resize-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <button
                          type="button"
                          onClick={() => { setShowAIPrompt(false); setAiPrompt(''); }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGeneratePhotoAI(aiPrompt || undefined)}
                          disabled={generatingPhotoAI}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          {generatingPhotoAI ? 'Génération...' : 'Générer'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowDestinationForm(false); setEditingDestination(null); }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingDest || updatingDest}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creatingDest || updatingDest
                    ? 'Enregistrement...'
                    : editingDestination ? 'Enregistrer' : 'Créer la destination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Liaisons                                                    */}
      {/* ================================================================ */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          {/* New link form */}
          {showLinkForm && (
            <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Nouvelle liaison</h3>

              <div className="flex items-center gap-3 flex-wrap">
                {/* From */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-xs text-gray-500 font-medium w-6">De</span>
                  <LocationSelector
                    value={newLink.from_location_id ?? null}
                    onChange={(id) => setNewLink(prev => ({ ...prev, from_location_id: id ?? undefined }))}
                    placeholder="Départ..."
                    allowCreate
                    clearable
                    className="flex-1 h-9 text-sm"
                  />
                </div>
                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                {/* To */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-xs text-gray-500 font-medium w-6">→</span>
                  <LocationSelector
                    value={newLink.to_location_id ?? null}
                    onChange={(id) => setNewLink(prev => ({ ...prev, to_location_id: id ?? undefined }))}
                    placeholder="Arrivée..."
                    allowCreate
                    clearable
                    className="flex-1 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Mode */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Mode</span>
                  <select
                    value={newLink.travel_mode || 'driving'}
                    onChange={(e) => setNewLink(prev => ({ ...prev, travel_mode: e.target.value as TransportMode }))}
                    className="text-sm bg-white border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    {LINK_TRANSPORT_MODES.map(m => (
                      <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>
                    ))}
                  </select>
                </div>
                {/* Duration */}
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number" min={0}
                    value={newLink.duration_minutes ?? ''}
                    onChange={(e) => setNewLink(prev => ({ ...prev, duration_minutes: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="min"
                    className="w-20 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="text-xs text-gray-400">min</span>
                </div>
                {/* Distance */}
                <div className="flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number" min={0}
                    value={newLink.distance_km ?? ''}
                    onChange={(e) => setNewLink(prev => ({ ...prev, distance_km: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="km"
                    className="w-20 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="text-xs text-gray-400">km</span>
                </div>
              </div>

              {/* Narrative text */}
              <textarea
                value={newLink.narrative_text || ''}
                onChange={(e) => setNewLink(prev => ({ ...prev, narrative_text: e.target.value }))}
                placeholder="Texte narratif du déplacement... (ex: Nous prenons la route vers...)"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                rows={2}
              />

              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => { setShowLinkForm(false); setNewLink({ travel_mode: 'driving' }); }} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                  Annuler
                </button>
                <button
                  onClick={handleCreateLink}
                  disabled={!newLink.from_location_id || !newLink.to_location_id}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Créer la liaison
                </button>
              </div>
            </div>
          )}

          {/* Links list */}
          <div className="space-y-3">
            {filteredLinks.map(link => {
              const modeConf = LINK_TRANSPORT_MODES.find(m => m.value === link.travel_mode);
              return (
                <div key={link.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-3">
                    {/* Route visual */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 whitespace-nowrap">{link.from_location_name}</span>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded-full">
                        <span className="text-sm">{modeConf?.emoji || '🚗'}</span>
                        <ArrowRight className="w-3 h-3 text-purple-400" />
                      </div>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">{link.to_location_name}</span>
                    </div>

                    {/* Meta badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {link.duration_minutes && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(link.duration_minutes)}
                        </span>
                      )}
                      {link.distance_km && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          {link.distance_km}km
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Modifier">
                        <Edit className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Dupliquer">
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleDeleteLink(link.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Narrative text */}
                  {link.narrative_text && (
                    <p className="mt-2 text-sm text-gray-500 italic pl-1">
                      &ldquo;{link.narrative_text}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredLinks.length === 0 && !showLinkForm && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune liaison</h3>
              <p className="text-gray-500 mb-4">
                Créez des liaisons réutilisables entre vos destinations
              </p>
              <button
                onClick={() => setShowLinkForm(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-5 h-5" />
                Créer une liaison
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal suggestion IA de destinations */}
      <DestinationSuggestModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onSuccess={() => refetchLocations()}
        defaultCountryCode="TH"
      />
    </div>
  );
}
