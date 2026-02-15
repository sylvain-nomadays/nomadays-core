'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Calculator,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  MapPin,
  Euro,
  AlertTriangle,
  FileText,
  Settings,
  Clock,
  Globe,
  Edit,
  MoreVertical,
  Loader2,
  AlertCircle,
  Languages,
  X,
  Check,
  ExternalLink,
  Percent,
  DollarSign,
  Star,
  Mountain,
  RefreshCw,
  Info,
  Layers,
  Coffee,
  UtensilsCrossed,
  Soup,
  BedDouble,
  BookOpen,
  FolderOpen,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';
import { useTrip, useUpdateTrip, useTripPhotos, useRegenerateTripPhoto, useUploadTripPhoto, useCreateTripDay, useUpdateTripDay, useDeleteTripDay, useExtendTripDay, useReorderDays } from '@/hooks/useTrips';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DayBlockList } from '@/components/circuits/blocks/DayBlockList';
import type { AccommodationInfo, LinkedAccommodation } from '@/components/circuits/blocks/DayBlockList';
import { LocationSelector } from '@/components/suppliers/LocationSelector';
import { CircuitDndProvider, DroppableDayCard, SourcePanel } from '@/components/circuits/dnd';
import { useMoveBlock, useDuplicateBlock, useCopyDayBlocks, useReorderBlocks } from '@/hooks/useBlocks';
import { formatTripDayLabel, getDayBadge } from '@/lib/formatTripDate';
import OptimizedImage from '@/components/common/OptimizedImage';
import { useLocationPhotosByIds } from '@/hooks/useLocations';
import { useLanguages, useTripTranslations, useTranslateTrip, useTranslationPreview, usePushTranslation } from '@/hooks/useTranslation';
import { useTravelThemes } from '@/hooks/useTravelThemes';
import { useCostNatures } from '@/hooks/useCostNatures';
import { useCotations } from '@/hooks/useCotations';
import { useCountryVatRates } from '@/hooks/useCountryVatRates';
import { LanguageSelector, StaleWarningBanner, PreviewModeIndicator } from '@/components/circuits/LanguageSelector';
import { TranslationVersionsNav } from '@/components/circuits/TranslationVersionsNav';
import { ThemeCheckboxGrid } from '@/components/ui/theme-checkbox-grid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Trip, TripDay, Formula, QuotationResult, TripHighlight, InclusionItem, DescriptionTone, CostNature, Item, PaxConfig, RoomDemandEntry, LocationPhoto } from '@/lib/api/types';
import { createClient as createSupabaseBrowser } from '@/lib/supabase/client';
import {
  TripMapEditor,
  TripPresentationEditor,
  InclusionExclusionEditor,
  TripInfoEditor,
  HeroPhotoEditor,
  CostBreakdown,
  PriceGrid,
  ItemEditor,
  EarlyBirdAlerts,
  TransversalServicesPanel,
  ConditionsPanel,
  RoomDemandEditor,
} from '@/components/circuits';
import PreBookingDialog from '@/components/circuits/PreBookingDialog';
import dynamic from 'next/dynamic';
import { useEarlyBirdAlerts } from '@/hooks/useEarlyBirdAlerts';
import { useTripConditions } from '@/hooks/useConditions';
import { TRIP_STATUS, getStatusConfig, TONE_OPTIONS } from '@/lib/constants/circuits';
import { getCountryFlag, getCountryName } from '@/lib/constants/countries';

// Lazy load CotationsTab to avoid loading cotation dependencies when tab is inactive
const CotationsTab = dynamic(
  () => import('@/components/circuits/cotations/CotationsTab'),
  { loading: () => <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#0FB6BC] animate-spin" /></div> }
);

// Lazy load TarificationPanel
const TarificationPanel = dynamic(
  () => import('@/components/circuits/cotations/TarificationPanel'),
  { loading: () => <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-[#0FB6BC] animate-spin" /></div> }
);

// Lazy load RoadbookEditor
const RoadbookEditor = dynamic(
  () => import('@/components/circuits/roadbook/RoadbookEditor'),
  { loading: () => <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#0FB6BC] animate-spin" /></div> }
);

// Lazy load EchangesTab
const EchangesTab = dynamic(
  () => import('@/components/circuits/echanges/EchangesTab'),
  { loading: () => <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#0FB6BC] animate-spin" /></div> }
);

// Map destination country code → local currency code
function getLocalCurrency(destinationCountry: string): string {
  const map: Record<string, string> = {
    TH: 'THB', VN: 'VND', JP: 'JPY', ID: 'IDR',
    MA: 'MAD', IN: 'INR', CN: 'CNY', KH: 'USD',
    LA: 'LAK', MM: 'MMK', PH: 'PHP', MY: 'MYR',
    SG: 'SGD', KR: 'KRW', LK: 'LKR', NP: 'NPR',
    MX: 'MXN', PE: 'PEN', CO: 'COP', BR: 'BRL',
    AR: 'ARS', CL: 'CLP', CR: 'CRC', CU: 'CUP',
    TZ: 'TZS', KE: 'KES', ZA: 'ZAR', EG: 'EGP',
    GH: 'GHS', ET: 'ETB', MG: 'MGA', MU: 'MUR',
    TR: 'TRY', GE: 'GEL', UZ: 'UZS', AZ: 'AZN',
  };
  return map[destinationCountry] || 'USD';
}

// Pax configurations par défaut
const defaultPaxConfigs: { pax: number; rooms: number }[] = [
  { pax: 2, rooms: 1 },
  { pax: 4, rooms: 2 },
  { pax: 6, rooms: 3 },
];

type TabType = 'presentation' | 'program' | 'roadbook' | 'cotations' | 'tarification' | 'echanges';

export default function CircuitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { data: trip, loading, error, refetch } = useTrip(tripId);
  const { data: tripPhotos, refetch: refetchPhotos } = useTripPhotos(tripId);
  const { mutate: updateTrip, loading: saving } = useUpdateTrip();
  const { mutate: regeneratePhoto, loading: regenerating } = useRegenerateTripPhoto();
  const { mutate: createTripDay } = useCreateTripDay();
  const { mutate: updateTripDay } = useUpdateTripDay();
  const { mutate: extendTripDay } = useExtendTripDay();
  const { mutate: moveBlock } = useMoveBlock();
  const { mutate: duplicateBlock } = useDuplicateBlock();
  const { mutate: copyDayBlocks } = useCopyDayBlocks();
  const { mutate: reorderBlocks } = useReorderBlocks();
  const { mutate: reorderDays } = useReorderDays();

  // DnD: track block IDs per day for reorder calculations
  const dayBlocksMapRef = useRef<Map<number, number[]>>(new Map());
  const handleBlocksLoaded = useCallback((dayId: number, blockIds: number[]) => {
    dayBlocksMapRef.current.set(dayId, blockIds);
  }, []);

  // Multi-night accommodation: track accommodation info per day number
  const [accommodationInfoMap, setAccommodationInfoMap] = useState<Map<number, AccommodationInfo>>(new Map());
  const handleAccommodationLoaded = useCallback((dayNumber: number, info: AccommodationInfo | null) => {
    setAccommodationInfoMap(prev => {
      const next = new Map(prev);
      if (info) {
        next.set(dayNumber, info);
      } else {
        next.delete(dayNumber);
      }
      return next;
    });
  }, []);

  // Activity meals: track which meals are included from activity blocks per day
  const [activityMealsMap, setActivityMealsMap] = useState<Map<number, { breakfast: boolean; lunch: boolean; dinner: boolean }>>(new Map());
  const handleActivityMealsChanged = useCallback((dayNumber: number, meals: { breakfast: boolean; lunch: boolean; dinner: boolean }) => {
    setActivityMealsMap(prev => {
      const next = new Map(prev);
      if (meals.breakfast || meals.lunch || meals.dinner) {
        next.set(dayNumber, meals);
      } else {
        next.delete(dayNumber);
      }
      return next;
    });
  }, []);

  /**
   * For a given dayNumber, find if a previous day has a multi-night accommodation
   * that covers this day. Returns LinkedAccommodation or undefined.
   */
  const getLinkedAccommodation = useCallback((dayNumber: number): LinkedAccommodation | undefined => {
    // Check all days before this one for multi-night accommodations
    for (const [sourceDayNum, info] of accommodationInfoMap.entries()) {
      if (sourceDayNum >= dayNumber) continue; // Only look at previous days
      // Accommodation at sourceDayNum covers nights: sourceDayNum, sourceDayNum+1, ..., sourceDayNum+nights-1
      const lastNight = sourceDayNum + info.nights - 1;
      if (dayNumber <= lastNight) {
        return {
          hotelName: info.hotelName,
          nightNumber: dayNumber - sourceDayNum + 1,
          totalNights: info.nights,
          sourceDayNumber: sourceDayNum,
          breakfastIncluded: info.breakfastIncluded,
          lunchIncluded: info.lunchIncluded,
          dinnerIncluded: info.dinnerIncluded,
        };
      }
    }
    return undefined;
  }, [accommodationInfoMap]);

  // ─── Location photos for auto-illustration ───────────────────────────
  // Extract unique location_ids from trip days
  const locationIds = useMemo(() => {
    if (!trip?.days) return [];
    const ids = new Set<number>();
    trip.days.forEach(day => {
      if (day.location_id) ids.add(day.location_id);
    });
    return Array.from(ids);
  }, [trip?.days]);

  // Fetch location photos in batch
  const { data: locationPhotosMap } = useLocationPhotosByIds(locationIds);

  /**
   * Get the location photo for a specific day.
   * Distribution: 1st photo for 1st day at that location, 2nd photo for 2nd day, etc.
   * Returns null if no location photo available or if day already has a TripPhoto.
   */
  const getLocationPhotoForDay = useCallback((day: TripDay): LocationPhoto | null => {
    if (!day.location_id || !locationPhotosMap) return null;

    const photos = locationPhotosMap[String(day.location_id)];
    if (!photos?.length) return null;

    // Count how many days BEFORE this one use the same location_id
    const allDays = trip?.days || [];
    const sameLocationDaysBefore = allDays.filter(
      d => d.location_id === day.location_id && d.day_number < day.day_number
    ).length;

    // If we have more days than photos, return null (no cycling)
    if (sameLocationDaysBefore >= photos.length) return null;
    return photos[sameLocationDaysBefore] ?? null;
  }, [locationPhotosMap, trip?.days]);

  const [activeTab, setActiveTab] = useState<TabType>('presentation');
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  // Regenerate photo dialog state
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regeneratePhotoId, setRegeneratePhotoId] = useState<number | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [regenerateDayNumber, setRegenerateDayNumber] = useState<number | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [selectedPax, setSelectedPax] = useState(2);
  const [quotationResult, setQuotationResult] = useState<QuotationResult | null>(null);
  const [selectedCostNature, setSelectedCostNature] = useState<string>('HTL');
  const [quotationView, setQuotationView] = useState<'by-type' | 'by-day'>('by-type');

  // Presentation state
  const [presentationData, setPresentationData] = useState({
    description_short: '',
    description_html: '',
    description_tone: 'factuel' as DescriptionTone,
    highlights: [] as TripHighlight[],
  });
  const [inclusionsExclusions, setInclusionsExclusions] = useState({
    inclusions: [] as InclusionItem[],
    exclusions: [] as InclusionItem[],
  });
  const [tripInfo, setTripInfo] = useState({
    info_general: '',
    info_formalities: '',
    info_booking_conditions: '',
    info_cancellation_policy: '',
    info_additional: '',
    info_general_html: '',
    info_formalities_html: '',
    info_booking_conditions_html: '',
    info_cancellation_policy_html: '',
    info_additional_html: '',
  });

  // Settings state
  const [settingsData, setSettingsData] = useState({
    name: '',
    duration_days: 0,
    destination_country: '',
    default_currency: 'EUR',
    margin_pct: 30,
    margin_type: 'margin' as 'margin' | 'markup',
    // TVA
    vat_pct: 20,
    vat_calculation_mode: 'on_margin' as 'on_margin' | 'on_selling_price',
    // Commissions
    primary_commission_pct: 11.5,
    primary_commission_label: 'Nomadays',
    secondary_commission_pct: 0,
    secondary_commission_label: '',
    // Caractéristiques
    comfort_level: 3,
    difficulty_level: 2,
    // Client
    client_name: '',
    client_email: '',
    start_date: '',
  });

  // Room demand state (trip-level default room allocation)
  const [roomDemand, setRoomDemand] = useState<RoomDemandEntry[]>([]);

  // Roadbook intro state
  const [roadbookIntro, setRoadbookIntro] = useState('');

  // Exchange rate state: user-facing value (e.g. 37.50 for "1 EUR = 37.50 THB")
  const [exchangeRateValue, setExchangeRateValue] = useState<string>('');

  // Pre-booking state
  const [showPreBookingDialog, setShowPreBookingDialog] = useState(false);

  // Translation state
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const { data: languagesData } = useLanguages();
  const { data: translationsData, refetch: refetchTranslations } = useTripTranslations(tripId);
  const { mutate: translateTrip, loading: translating } = useTranslateTrip();

  // Translation preview state
  const {
    previewLanguage,
    preview,
    isLoading: previewLoading,
    fetchPreview,
    refreshPreview,
    clearPreview,
  } = useTranslationPreview(tripId);

  // Push translation hook
  const { mutate: pushTranslation, loading: isPushing } = usePushTranslation();

  // Travel themes
  const { themes: availableThemes, isLoading: themesLoading } = useTravelThemes();

  // Cost natures (from API, with fallback to defaults)
  const { costNatures } = useCostNatures();

  // Country VAT rates (from Configuration)
  const { data: vatRates } = useCountryVatRates();
  const globalVatRate = vatRates && vatRates.length > 0 ? vatRates[0] : null;

  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([]);

  // Item editor state
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | undefined>(undefined);
  const [pricingExpanded, setPricingExpanded] = useState(false);
  const [conditionsVersion, setConditionsVersion] = useState(0);

  // Cotations for tarification tab
  const {
    cotations: tarificationCotations,
    refetch: refetchTarificationCotations,
  } = useCotations(trip?.id);

  // Conditions for context banner
  const { tripConditions: tarificationConditions } = useTripConditions(trip?.id, conditionsVersion);
  const [tarificationCotationId, setTarificationCotationId] = useState<number | null>(null);
  const activeTarificationCotation = tarificationCotations.find(c => c.id === tarificationCotationId)
    || tarificationCotations.find(c => c.status === 'calculated')
    || tarificationCotations[0]
    || null;

  // Fetch selected_cotation_id from dossier (if trip is linked to a dossier)
  const [selectedCotationId, setSelectedCotationId] = useState<number | null>(null);
  useEffect(() => {
    if (!trip?.dossier_id) { setSelectedCotationId(null); return; }
    const dossierId = trip.dossier_id;
    const fetchSelection = async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data, error } = await supabase
          .from('dossiers')
          .select('selected_cotation_id')
          .eq('id', dossierId)
          .single();
        if (error) {
          console.error('[CircuitPage] Failed to fetch selected_cotation_id:', error);
          setSelectedCotationId(null);
          return;
        }
        setSelectedCotationId((data as any)?.selected_cotation_id ?? null);
      } catch (err) {
        console.error('[CircuitPage] Failed to fetch dossier:', err);
        setSelectedCotationId(null);
      }
    };
    fetchSelection();
  }, [trip?.dossier_id]);

  // Cost natures are now fetched via useCostNatures() hook above

  // Initialise les données de présentation depuis le trip
  useEffect(() => {
    if (trip) {
      setPresentationData({
        description_short: trip.description_short || '',
        description_html: trip.description_html || '',
        description_tone: (trip.description_tone as DescriptionTone) || 'factuel',
        highlights: trip.highlights || [],
      });
      setInclusionsExclusions({
        inclusions: trip.inclusions || [],
        exclusions: trip.exclusions || [],
      });
      setTripInfo({
        info_general: trip.info_general || '',
        info_formalities: trip.info_formalities || '',
        info_booking_conditions: trip.info_booking_conditions || '',
        info_cancellation_policy: trip.info_cancellation_policy || '',
        info_additional: trip.info_additional || '',
        info_general_html: trip.info_general_html || '',
        info_formalities_html: trip.info_formalities_html || '',
        info_booking_conditions_html: trip.info_booking_conditions_html || '',
        info_cancellation_policy_html: trip.info_cancellation_policy_html || '',
        info_additional_html: trip.info_additional_html || '',
      });

      // Settings data
      setSettingsData({
        name: trip.name || '',
        duration_days: trip.duration_days || 0,
        destination_country: trip.destination_country || '',
        default_currency: trip.default_currency || 'EUR',
        margin_pct: trip.margin_pct || 30,
        margin_type: trip.margin_type || 'margin',
        vat_pct: globalVatRate ? globalVatRate.vat_rate_standard : (trip.vat_pct || 20),
        vat_calculation_mode: globalVatRate ? globalVatRate.vat_calculation_mode : (trip.vat_calculation_mode || 'on_margin'),
        primary_commission_pct: trip.primary_commission_pct || 11.5,
        primary_commission_label: trip.primary_commission_label || 'Nomadays',
        secondary_commission_pct: trip.secondary_commission_pct || 0,
        secondary_commission_label: trip.secondary_commission_label || '',
        comfort_level: trip.comfort_level || 3,
        difficulty_level: trip.difficulty_level || 2,
        client_name: trip.client_name || '',
        client_email: trip.client_email || '',
        start_date: trip.start_date || '',
      });

      // Room demand
      setRoomDemand(trip.room_demand_json || []);

      // Roadbook intro
      setRoadbookIntro(trip.roadbook_intro_html || '');

      // Exchange rate: load from currency_rates_json
      // Engine stores rate as "1 THB = 0.0267 EUR", UI shows "1 EUR = 37.50 THB"
      const localCurrency = getLocalCurrency(trip.destination_country || '');
      const storedRates = trip.currency_rates_json?.rates || {};
      const storedRate = storedRates[localCurrency];
      if (storedRate) {
        const engineRate = typeof storedRate === 'object' ? storedRate.rate : storedRate;
        if (engineRate && engineRate > 0) {
          // Inverse: engine rate 0.0267 → UI value 37.50
          const uiValue = 1 / engineRate;
          setExchangeRateValue(uiValue.toFixed(2));
        }
      }

      // Travel themes
      if (trip.themes && trip.themes.length > 0) {
        setSelectedThemeIds(trip.themes.map(t => t.id));
      }

      // Expand all days by default
      if (trip.days && trip.days.length > 0) {
        setExpandedDays(trip.days.map(d => d.day_number));
      }

      // Sélectionner la première formule par défaut
      if (trip.formulas && trip.formulas.length > 0) {
        const defaultFormula = trip.formulas.find(f => f.is_default) ?? trip.formulas[0];
        if (defaultFormula) {
          setSelectedFormula(defaultFormula.id);
        }
      }
    }
  }, [trip, globalVatRate]);

  // Sync TVA when global config changes (after initial trip load)
  useEffect(() => {
    if (globalVatRate) {
      setSettingsData(prev => ({
        ...prev,
        vat_pct: globalVatRate.vat_rate_standard,
        vat_calculation_mode: globalVatRate.vat_calculation_mode,
      }));
    }
  }, [globalVatRate]);

  // Calcul de la cotation
  useEffect(() => {
    if (trip && selectedFormula) {
      calculateQuotation();
    }
  }, [selectedFormula, selectedPax, trip]);

  const calculateQuotation = () => {
    if (!trip || !selectedFormula) return;

    const formula = trip.formulas?.find(f => f.id === selectedFormula);
    if (!formula) return;

    const paxConfig = defaultPaxConfigs.find(p => p.pax === selectedPax) ?? defaultPaxConfigs[0];
    if (!paxConfig) return;

    let totalCost = 0;

    // Calculer les coûts selon les règles de ratio
    formula.items?.forEach(item => {
      let itemCost = item.unit_cost * item.quantity;

      switch (item.ratio_rule) {
        case 'per_person':
          itemCost *= paxConfig.pax;
          break;
        case 'per_room':
          itemCost *= paxConfig.rooms;
          break;
        case 'per_vehicle':
          itemCost *= Math.ceil(paxConfig.pax / 4);
          break;
        case 'per_group':
          // Pas de multiplication
          break;
      }

      totalCost += itemCost;
    });

    // Appliquer la marge
    let sellingPrice: number;
    if (trip.margin_type === 'margin') {
      sellingPrice = totalCost / (1 - (trip.margin_pct || 30) / 100);
    } else {
      sellingPrice = totalCost * (1 + (trip.margin_pct || 30) / 100);
    }

    const pricePerPerson = sellingPrice / paxConfig.pax;
    const margin = sellingPrice - totalCost;

    setQuotationResult({
      formula_id: selectedFormula,
      pax: paxConfig.pax,
      rooms: paxConfig.rooms,
      total_cost: totalCost,
      total_selling: sellingPrice,
      margin_amount: margin,
      margin_pct: (margin / sellingPrice) * 100,
      price_per_person: pricePerPerson,
      currency: trip.default_currency || 'EUR',
      breakdown: [],
    });
  };

  const toggleDay = (dayNumber: number) => {
    setExpandedDays(prev =>
      prev.includes(dayNumber)
        ? prev.filter(d => d !== dayNumber)
        : [...prev, dayNumber]
    );
  };

  const handleSave = async () => {
    if (!trip) return;

    try {
      await updateTrip({
        id: parseInt(tripId),
        data: {
          // Présentation
          description_short: presentationData.description_short,
          description_html: presentationData.description_html,
          description_tone: presentationData.description_tone,
          highlights: presentationData.highlights,
          inclusions: inclusionsExclusions.inclusions,
          exclusions: inclusionsExclusions.exclusions,
          ...tripInfo,
          // Paramètres de base
          name: settingsData.name,
          duration_days: settingsData.duration_days,
          destination_country: settingsData.destination_country,
          default_currency: settingsData.default_currency,
          margin_pct: settingsData.margin_pct,
          margin_type: settingsData.margin_type,
          // Caractéristiques
          comfort_level: settingsData.comfort_level,
          difficulty_level: settingsData.difficulty_level,
          // TVA
          vat_pct: settingsData.vat_pct,
          vat_calculation_mode: settingsData.vat_calculation_mode,
          // Commissions
          primary_commission_pct: settingsData.primary_commission_pct,
          primary_commission_label: settingsData.primary_commission_label,
          secondary_commission_pct: settingsData.secondary_commission_pct,
          secondary_commission_label: settingsData.secondary_commission_label,
          // Client
          client_name: settingsData.client_name || undefined,
          client_email: settingsData.client_email || undefined,
          start_date: settingsData.start_date || undefined,
          // Roadbook
          roadbook_intro_html: roadbookIntro,
          // Thématiques
          theme_ids: selectedThemeIds,
          // Répartition chambres
          room_demand_json: roomDemand.length > 0 ? roomDemand : null,
          // Taux de change
          ...(exchangeRateValue && parseFloat(exchangeRateValue) > 0 ? {
            currency_rates_json: {
              rates: {
                [getLocalCurrency(settingsData.destination_country)]: {
                  rate: 1 / parseFloat(exchangeRateValue),
                  source: 'manual' as const,
                },
              },
              base_currency: settingsData.default_currency,
            },
          } : {}),
        },
      });
      // Rafraîchir les données
      refetch();
    } catch (err) {
      console.error('Failed to save trip:', err);
    }
  };

  const getRatioLabel = (rule: string) => {
    switch (rule) {
      case 'per_person': return '/pers';
      case 'per_room': return '/chb';
      case 'per_vehicle': return '/véh';
      case 'per_group': return '/grp';
      default: return '';
    }
  };

  // Early Bird alerts — hooks must be called before any early return
  const currentFormulaForHooks = trip?.formulas?.find(f => f.id === selectedFormula);
  const allItems = useMemo(() => {
    return currentFormulaForHooks?.items || [];
  }, [currentFormulaForHooks]);
  const { accommodations: earlyBirdAccommodations, loading: loadingEarlyBird } = useEarlyBirdAlerts(allItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#0FB6BC] animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error?.detail || 'Circuit non trouvé'}</span>
        </div>
        <Link
          href="/admin/circuits"
          className="inline-flex items-center gap-2 mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux circuits
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(trip.status);
  const currentFormula = trip.formulas?.find(f => f.id === selectedFormula);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/circuits"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux circuits
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Country flag */}
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">
              {getCountryFlag(trip.destination_country || '')}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {previewLanguage && preview ? preview.content.name : trip.name}
                </h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.label}
                </span>
                {/* Language selector */}
                <LanguageSelector
                  tripId={trip.id}
                  sourceLanguage={trip.language || 'fr'}
                  currentPreviewLanguage={previewLanguage}
                  onLanguageSelect={(lang) => {
                    if (lang === (trip.language || 'fr')) {
                      clearPreview();
                    } else {
                      fetchPreview(lang);
                    }
                  }}
                  onOpenTranslation={(translatedTripId) => {
                    router.push(`/admin/circuits/${translatedTripId}`);
                  }}
                  isLoading={previewLoading}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                {trip.reference && (
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {trip.reference}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {trip.duration_days} jours
                </span>
                {trip.destination_country && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {getCountryName(trip.destination_country)}
                  </span>
                )}
                {/* Comfort level */}
                {settingsData.comfort_level > 0 && (
                  <span className="flex items-center gap-0.5" title={`Confort ${settingsData.comfort_level}/5`}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= settingsData.comfort_level ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    ))}
                  </span>
                )}
                {/* Difficulty level */}
                {settingsData.difficulty_level > 0 && (
                  <span className="flex items-center gap-0.5" title={`Difficulté ${settingsData.difficulty_level}/5`}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Mountain key={i} className={`w-3.5 h-3.5 ${i <= settingsData.difficulty_level ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />
                    ))}
                  </span>
                )}
                {trip.client_name && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {trip.client_name}
                  </span>
                )}
                {trip.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Départ: {new Date(trip.start_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {trip.dossier_id && (
                  <Link
                    href={`/admin/dossiers/${trip.dossier_id}`}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="Voir le dossier lié"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranslateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50"
            >
              <Languages className="w-4 h-4" />
              Traduire
              {translationsData && translationsData.translations.length > 1 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
                  {translationsData.translations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowPreBookingDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#CCF3F5] text-[#0C9296] rounded-lg hover:bg-[#E6F9FA] transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Pré-réserver
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              Générer PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#0FB6BC] text-white px-4 py-2 rounded-lg hover:bg-[#0C9296] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      {/* Early Bird Alerts */}
      {trip.start_date && currentFormula?.items && currentFormula.items.length > 0 && earlyBirdAccommodations.size > 0 && (
        <div className="mb-6">
          <EarlyBirdAlerts
            tripStartDate={trip.start_date}
            items={currentFormula.items}
            accommodations={earlyBirdAccommodations}
            compact={false}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'presentation', label: 'Présentation', icon: FileText },
            { id: 'program', label: 'Programme', icon: Calendar },
            { id: 'roadbook', label: 'Roadbook', icon: BookOpen },
            { id: 'cotations', label: 'Cotations', icon: Calculator },
            { id: 'tarification', label: 'Tarification', icon: DollarSign },
            { id: 'echanges', label: 'Échanges', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#0C9296] text-[#0C9296]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Preview mode indicators */}
      {previewLanguage && preview && (
        <>
          <PreviewModeIndicator
            language={preview.language}
            languageName={preview.language_name}
            languageFlag={preview.language_flag}
            onExitPreview={clearPreview}
          />
          {preview.cache_metadata.is_stale && (
            <StaleWarningBanner
              cachedAt={preview.cache_metadata.cached_at}
              onRefresh={refreshPreview}
              isRefreshing={previewLoading}
            />
          )}
        </>
      )}

      {/* Translation versions navigation */}
      {!previewLanguage && (
        <TranslationVersionsNav
          tripId={trip.id}
          currentLanguage={trip.language || 'fr'}
          onPushTranslation={async (targetIds) => {
            await pushTranslation({
              tripId: trip.id,
              targetTripIds: targetIds,
            });
            refetch();
            refetchTranslations();
          }}
          isPushing={isPushing}
        />
      )}

      {/* Content */}
      {activeTab === 'presentation' && (
        <div className="space-y-6">
          {/* Hero Photo */}
          <HeroPhotoEditor
            tripId={trip.id}
            heroPhoto={tripPhotos?.find(p => p.is_hero) || null}
            destinationCountry={trip.destination_country}
            descriptionShort={presentationData.description_short}
            onPhotoChanged={refetchPhotos}
          />

          {/* Caractéristiques du voyage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Caractéristiques du voyage
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Nom du circuit */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Nom du circuit
                </label>
                <input
                  type="text"
                  value={settingsData.name}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 col-span-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={settingsData.duration_days}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Pays de destination
                  </label>
                  <select
                    value={settingsData.destination_country}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, destination_country: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC] bg-white"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="TH">🇹🇭 Thaïlande</option>
                    <option value="VN">🇻🇳 Vietnam</option>
                    <option value="JP">🇯🇵 Japon</option>
                    <option value="ID">🇮🇩 Indonésie</option>
                    <option value="MY">🇲🇾 Malaisie</option>
                    <option value="KH">🇰🇭 Cambodge</option>
                    <option value="LA">🇱🇦 Laos</option>
                    <option value="MM">🇲🇲 Myanmar</option>
                    <option value="PH">🇵🇭 Philippines</option>
                    <option value="CN">🇨🇳 Chine</option>
                    <option value="IN">🇮🇳 Inde</option>
                    <option value="NP">🇳🇵 Népal</option>
                    <option value="LK">🇱🇰 Sri Lanka</option>
                    <option value="MA">🇲🇦 Maroc</option>
                  </select>
                </div>
                {(trip.type === 'custom' || trip.type === 'gir' || trip.client_name) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Date de départ
                    </label>
                    <input
                      type="date"
                      value={settingsData.start_date}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                    />
                  </div>
                )}
              </div>

              {/* Confort */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Niveau de confort
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSettingsData(prev => ({ ...prev, comfort_level: level }))}
                      className="p-1 transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          level <= settingsData.comfort_level
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {settingsData.comfort_level}/5
                  </span>
                </div>
              </div>

              {/* Difficulté */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Niveau de difficulté
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSettingsData(prev => ({ ...prev, difficulty_level: level }))}
                      className="p-1 transition-colors"
                    >
                      <Mountain
                        className={`w-6 h-6 ${
                          level <= settingsData.difficulty_level
                            ? 'fill-orange-400 text-orange-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {settingsData.difficulty_level}/5
                  </span>
                </div>
              </div>

              {/* Client (si custom/gir) */}
              {(trip.type === 'custom' || trip.client_name) && (
                <div className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nom du client
                    </label>
                    <input
                      type="text"
                      value={settingsData.client_name}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, client_name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email client
                    </label>
                    <input
                      type="email"
                      value={settingsData.client_email}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, client_email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Thématiques de voyage */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-3">
                Thématiques de voyage
              </label>
              {themesLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Chargement des thématiques...</span>
                </div>
              ) : availableThemes && availableThemes.length > 0 ? (
                <ThemeCheckboxGrid
                  themes={availableThemes}
                  selectedIds={selectedThemeIds}
                  onChange={setSelectedThemeIds}
                />
              ) : (
                <p className="text-sm text-gray-500">
                  Aucune thématique disponible. Configurez-les dans les paramètres.
                </p>
              )}
            </div>
          </div>

          {/* Presentation */}
          <TripPresentationEditor
            descriptionShort={previewLanguage && preview?.content.description_short ? preview.content.description_short : presentationData.description_short}
            descriptionHtml={presentationData.description_html}
            descriptionTone={presentationData.description_tone}
            highlights={previewLanguage && preview?.content.highlights ? preview.content.highlights : presentationData.highlights}
            onChange={(data) => {
              if (!previewLanguage) {
                setPresentationData((prev) => ({
                  ...prev,
                  ...(data.description_html !== undefined && { description_html: data.description_html }),
                  ...(data.description_tone !== undefined && { description_tone: data.description_tone }),
                  ...(data.highlights !== undefined && { highlights: data.highlights }),
                }));
              }
            }}
            onGenerateWithAI={() => {
              // TODO: Call AI generation endpoint
              console.log('Generate with AI');
            }}
            readOnly={!!previewLanguage}
          />

          {/* Inclusions / Exclusions */}
          <InclusionExclusionEditor
            inclusions={previewLanguage && preview?.content.inclusions ? preview.content.inclusions : inclusionsExclusions.inclusions}
            exclusions={previewLanguage && preview?.content.exclusions ? preview.content.exclusions : inclusionsExclusions.exclusions}
            onChange={setInclusionsExclusions}
            onLoadDefaults={() => {
              // TODO: Load defaults from country templates
              console.log('Load defaults');
            }}
          />

          {/* Map */}
          <TripMapEditor
            tripId={trip.id}
            destinationCountries={trip.destination_countries || (trip.destination_country ? [trip.destination_country] : [])}
          />

          {/* Additional Info */}
          <TripInfoEditor
            data={tripInfo}
            onChange={(data) => setTripInfo((prev) => ({
              ...prev,
              ...data,
            }))}
            onLoadDefaults={() => {
              // TODO: Load defaults from country templates
              console.log('Load info defaults');
            }}
          />
        </div>
      )}

      {activeTab === 'program' && (
        <CircuitDndProvider
          onMoveBlock={async (formulaId, targetDayId) => {
            await moveBlock({ formulaId, targetDayId });
            refetch();
          }}
          onReorderBlocks={async (dayId, blockIds) => {
            await reorderBlocks({ dayId, blockIds });
            refetch();
          }}
          onReorderDays={async (dayIds) => {
            await reorderDays({ tripId: trip.id, dayIds });
            refetch();
          }}
          onDuplicateBlock={async (formulaId, targetDayId) => {
            await duplicateBlock({ formulaId, targetDayId });
            refetch();
          }}
          onCopyDayBlocks={async (sourceDayId, targetDayId) => {
            await copyDayBlocks({ sourceDayId, targetDayId });
            refetch();
          }}
          dayBlocksMap={dayBlocksMapRef.current}
          dayIds={(trip.days || []).map(d => d.id)}
        >
        <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-4">
          {/* Transversal services panel — above day-by-day */}
          <TransversalServicesPanel
            tripId={trip.id}
            totalDays={trip.duration_days || trip.days?.length || 1}
            costNatures={costNatures}
            onRefetch={refetch}
            conditionsVersion={conditionsVersion}
            vatMode={settingsData.vat_calculation_mode}
          />

          {/* Conditions panel — manage trip-level conditions */}
          <ConditionsPanel
            tripId={trip.id}
            onConditionsChanged={() => setConditionsVersion(v => v + 1)}
          />

          {trip.days && trip.days.length > 0 ? (
            <>
              <SortableContext
                items={(trip.days || []).map(d => `day-sort-${d.id}`)}
                strategy={verticalListSortingStrategy}
              >
              {trip.days.map(day => (
                <DroppableDayCard key={day.id} dayId={day.id} dayNumber={day.day_number} day={day} tripId={trip.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleDay(day.day_number)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleDay(day.day_number); }}
                    className="w-full flex items-center justify-between p-4 gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#E6F9FA] text-[#096D71] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {getDayBadge(day.day_number, day.day_number_end)}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            defaultValue={day.title || ''}
                            placeholder="Titre du jour..."
                            className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[#0FB6BC] rounded px-1 -ml-1 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => {
                              if (e.target.value !== (day.title || '')) {
                                updateTripDay({ tripId: trip.id, dayId: day.id, data: { title: e.target.value } });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                          />
                          {(() => {
                            const { dateLabel } = formatTripDayLabel(day.day_number, day.day_number_end, trip.start_date);
                            return dateLabel ? (
                              <span className="text-xs font-medium text-[#0C9296] bg-[#E6F9FA] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{dateLabel}</span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                          {/* Meal toggles — detect from accommodation & activities */}
                          {(() => {
                            // Detect meals from accommodation:
                            // Breakfast: served MORNING AFTER the night → Hotel at day S with N nights → breakfast at S+1..S+N
                            // Lunch/Dinner: served DURING the stay → Hotel at day S with N nights → lunch/dinner at S..S+N-1
                            let breakfastFromBlock = false;
                            let lunchFromBlock = false;
                            let dinnerFromBlock = false;
                            let mealSourceName = '';

                            for (const [sourceDayNum, info] of accommodationInfoMap.entries()) {
                              // Breakfast: morning after each night
                              if (info.breakfastIncluded) {
                                const firstBreakfast = sourceDayNum + 1;
                                const lastBreakfast = sourceDayNum + info.nights;
                                if (day.day_number >= firstBreakfast && day.day_number <= lastBreakfast) {
                                  breakfastFromBlock = true;
                                  mealSourceName = info.hotelName;
                                }
                              }
                              // Lunch: during the stay days
                              if (info.lunchIncluded) {
                                const firstLunch = sourceDayNum;
                                const lastLunch = sourceDayNum + info.nights - 1;
                                if (day.day_number >= firstLunch && day.day_number <= lastLunch) {
                                  lunchFromBlock = true;
                                  mealSourceName = info.hotelName;
                                }
                              }
                              // Dinner: evening of each stay day
                              if (info.dinnerIncluded) {
                                const firstDinner = sourceDayNum;
                                const lastDinner = sourceDayNum + info.nights - 1;
                                if (day.day_number >= firstDinner && day.day_number <= lastDinner) {
                                  dinnerFromBlock = true;
                                  mealSourceName = info.hotelName;
                                }
                              }
                            }

                            // Also detect meals from activity blocks
                            const activityMeals = activityMealsMap.get(day.day_number);
                            if (activityMeals) {
                              if (activityMeals.breakfast) { breakfastFromBlock = true; mealSourceName = mealSourceName || 'activité'; }
                              if (activityMeals.lunch) { lunchFromBlock = true; mealSourceName = mealSourceName || 'activité'; }
                              if (activityMeals.dinner) { dinnerFromBlock = true; mealSourceName = mealSourceName || 'activité'; }
                            }

                            const breakfastActive = day.breakfast_included || breakfastFromBlock;
                            const lunchActive = day.lunch_included || lunchFromBlock;
                            const dinnerActive = day.dinner_included || dinnerFromBlock;

                            return (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                if (breakfastFromBlock && !day.breakfast_included) return;
                                await updateTripDay({
                                  tripId: trip.id,
                                  dayId: day.id,
                                  data: { breakfast_included: !day.breakfast_included },
                                });
                                refetch();
                              }}
                              className={`p-1 rounded transition-colors ${
                                breakfastActive
                                  ? breakfastFromBlock
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-amber-600 hover:text-amber-700'
                                  : 'text-gray-300 hover:text-gray-400'
                              }`}
                              title={
                                breakfastFromBlock
                                  ? `Petit-déjeuner inclus (${mealSourceName})`
                                  : day.breakfast_included ? 'Petit-déjeuner inclus' : 'Petit-déjeuner non inclus'
                              }
                            >
                              <Coffee className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (lunchFromBlock && !day.lunch_included) return;
                                await updateTripDay({
                                  tripId: trip.id,
                                  dayId: day.id,
                                  data: { lunch_included: !day.lunch_included },
                                });
                                refetch();
                              }}
                              className={`p-1 rounded transition-colors ${
                                lunchActive
                                  ? lunchFromBlock
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-amber-600 hover:text-amber-700'
                                  : 'text-gray-300 hover:text-gray-400'
                              }`}
                              title={
                                lunchFromBlock
                                  ? `Déjeuner inclus (${mealSourceName})`
                                  : day.lunch_included ? 'Déjeuner inclus' : 'Déjeuner non inclus'
                              }
                            >
                              <UtensilsCrossed className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (dinnerFromBlock && !day.dinner_included) return;
                                await updateTripDay({
                                  tripId: trip.id,
                                  dayId: day.id,
                                  data: { dinner_included: !day.dinner_included },
                                });
                                refetch();
                              }}
                              className={`p-1 rounded transition-colors ${
                                dinnerActive
                                  ? dinnerFromBlock
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-amber-600 hover:text-amber-700'
                                  : 'text-gray-300 hover:text-gray-400'
                              }`}
                              title={
                                dinnerFromBlock
                                  ? `Dîner inclus (${mealSourceName})`
                                  : day.dinner_included ? 'Dîner inclus' : 'Dîner non inclus'
                              }
                            >
                              <Soup className="w-4.5 h-4.5" />
                            </button>
                          </div>
                            );
                          })()}
                          <LocationSelector
                            value={day.location_id}
                            onChange={async (locationId) => {
                              await updateTripDay({ tripId: trip.id, dayId: day.id, data: { location_id: locationId } });
                              refetch();
                            }}
                            placeholder="Destination..."
                            allowCreate
                            clearable
                            className="h-7 text-xs border-dashed max-w-[200px]"
                          />
                          {(day.location_from || day.location_to) && !day.location_id && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {day.location_from}
                              {day.location_to && day.location_from !== day.location_to && (
                                <> → {day.location_to}</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Boutons +/- pour étendre/réduire le bloc */}
                      <div className="flex items-center gap-0.5 mr-1" onClick={(e) => e.stopPropagation()}>
                        {/* Bouton - : visible seulement si le bloc couvre plus d'1 jour */}
                        {day.day_number_end && day.day_number_end > day.day_number && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await extendTripDay({ tripId: trip.id, dayId: day.id, delta: -1 });
                              refetch();
                            }}
                            className="flex items-center justify-center w-7 h-7 text-xs text-gray-400 hover:text-[#DD9371] hover:bg-[#FDF5F2] rounded-md transition-colors border border-gray-200 hover:border-[#F3C3B1]"
                            title="Retirer un jour de ce bloc"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await extendTripDay({ tripId: trip.id, dayId: day.id, delta: 1 });
                            refetch();
                          }}
                          className="flex items-center justify-center w-7 h-7 text-xs text-gray-400 hover:text-[#0C9296] hover:bg-[#E6F9FA] rounded-md transition-colors border border-gray-200 hover:border-[#99E7EB]"
                          title="Ajouter un jour à ce bloc"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {expandedDays.includes(day.day_number) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedDays.includes(day.day_number) && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-4 flex gap-4">
                        {/* Blocs modulaires à gauche */}
                        <div className="flex-1 min-w-0">
                          <DayBlockList
                            tripId={trip.id}
                            dayId={day.id}
                            dayNumber={day.day_number}
                            legacyDescription={day.description}
                            locationTo={day.location_to}
                            tripStartDate={trip.start_date}
                            onRefetch={refetch}
                            onBlocksLoaded={handleBlocksLoaded}
                            costNatures={costNatures}
                            tripDays={trip.duration_days || 7}
                            onAccommodationLoaded={handleAccommodationLoaded}
                            onActivityMealsChanged={handleActivityMealsChanged}
                            linkedAccommodation={getLinkedAccommodation(day.day_number)}
                            conditionsVersion={conditionsVersion}
                            tripRoomDemand={roomDemand}
                            vatMode={settingsData.vat_calculation_mode}
                          />
                        </div>
                        {/* Vignette photo à droite */}
                        {(() => {
                          const dayPhoto = tripPhotos?.find(p => p.day_number === day.day_number);
                          if (dayPhoto) {
                            // Priority 1: TripPhoto specific to this day
                            return (
                              <div className="flex-shrink-0 w-36">
                                <div className="relative group">
                                  <OptimizedImage
                                    tripPhoto={dayPhoto}
                                    alt={dayPhoto.alt_text || day.title || `Jour ${day.day_number}`}
                                    className="w-36 h-24 rounded-lg overflow-hidden shadow-sm"
                                    imageClassName="w-full h-full"
                                    sizeHint="thumbnail"
                                    objectFit="cover"
                                    showPlaceholder={true}
                                    lazy={true}
                                  />
                                  {/* Overlay hover avec bouton régénérer */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRegeneratePhotoId(dayPhoto.id);
                                        setRegeneratePrompt(dayPhoto.ai_prompt || '');
                                        setRegenerateDayNumber(day.day_number);
                                        setRegenerateDialogOpen(true);
                                      }}
                                      className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors shadow-sm"
                                      title="Éditer le prompt / Regénérer"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-gray-700" />
                                    </button>
                                  </div>
                                </div>
                                {dayPhoto.alt_text && (
                                  <p className="mt-1 text-[10px] text-gray-400 italic text-center truncate">{dayPhoto.alt_text}</p>
                                )}
                              </div>
                            );
                          }

                          // Priority 2: Location photo (inherited from destination)
                          const locPhoto = getLocationPhotoForDay(day);
                          if (locPhoto) {
                            return (
                              <div className="flex-shrink-0 w-36">
                                <div className="relative group">
                                  <img
                                    src={locPhoto.thumbnail_url || locPhoto.url}
                                    alt={locPhoto.alt_text || day.location_name || day.title || `Jour ${day.day_number}`}
                                    className="w-36 h-24 rounded-lg object-cover shadow-sm"
                                    loading="lazy"
                                  />
                                  {/* Badge indicating this comes from the location */}
                                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {day.location_name || 'Location'}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </DroppableDayCard>
              ))}
              </SortableContext>

              {/* DnD tips */}
              <div className="flex items-center justify-center gap-1.5 py-2 text-gray-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <p className="text-xs">
                  Glissez la poignée à gauche d&apos;un jour pour réordonner · Glissez un bloc vers un autre jour pour le déplacer
                </p>
              </div>

              <button
                onClick={async () => {
                  const maxDay = Math.max(0, ...(trip.days || []).map(d => d.day_number_end || d.day_number));
                  await createTripDay({ tripId: trip.id, data: { day_number: maxDay + 1 } });
                  refetch();
                }}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#0FB6BC] hover:text-[#0C9296] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter un jour
              </button>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun jour configuré
              </h3>
              <p className="text-gray-500 mb-4">
                Ajoutez des jours pour créer le programme du circuit
              </p>
              <button
                onClick={async () => {
                  await createTripDay({ tripId: trip.id, data: { day_number: 1 } });
                  refetch();
                }}
                className="px-4 py-2 bg-[#0FB6BC] text-white rounded-lg hover:bg-[#0C9296] transition-colors"
              >
                Ajouter un jour
              </button>
            </div>
          )}
        </div>

        {/* Source panel sidebar */}
        {sourcePanelOpen && (
          <div className="w-80 flex-shrink-0 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100">
            <SourcePanel currentTripId={trip.id} onClose={() => setSourcePanelOpen(false)} />
          </div>
        )}
        </div>

        {/* Floating button to open source panel */}
        {!sourcePanelOpen && (
          <button
            onClick={() => setSourcePanelOpen(true)}
            className="fixed right-6 bottom-6 w-12 h-12 bg-[#0FB6BC] text-white rounded-full shadow-lg hover:bg-[#0C9296] transition-colors flex items-center justify-center z-40"
            title="Bibliothèque de blocs"
          >
            <Layers className="w-5 h-5" />
          </button>
        )}
        </CircuitDndProvider>
      )}

      {activeTab === 'roadbook' && (
        <RoadbookEditor
          trip={trip}
          roadbookIntro={roadbookIntro}
          onRoadbookIntroChange={setRoadbookIntro}
        />
      )}

      {activeTab === 'cotations' && (
        <CotationsTab tripId={trip.id} tripType={trip.type} tripRoomDemand={trip.room_demand_json} tripPaxConfigs={trip.pax_configs} selectedCotationId={selectedCotationId} />
      )}

      {activeTab === 'tarification' && (
        <div className="space-y-6">
          {/* Context Banner — pax composition, conditions, cotation */}
          {activeTarificationCotation?.results_json?.pax_configs && (
            (() => {
              const paxConfigs = activeTarificationCotation.results_json.pax_configs;
              const isRange = (activeTarificationCotation.tarification_json?.mode || 'range_web') === 'range_web';
              // Derive conditions from cotation's condition_selections (with trip-level fallback)
              const cotationSelections = activeTarificationCotation.condition_selections || {};
              const activeConditions: { id: number; conditionName: string; label: string }[] = [];
              const activeTripConditions = tarificationConditions.filter(tc => tc.is_active);

              if (Object.keys(cotationSelections).length > 0) {
                Object.entries(cotationSelections).forEach(([condIdStr, optionId]) => {
                  const tripCond = tarificationConditions.find(tc => tc.condition_id === Number(condIdStr));
                  if (tripCond) {
                    const opt = tripCond.options?.find(o => o.id === optionId);
                    if (opt) activeConditions.push({ id: tripCond.id, conditionName: tripCond.condition_name, label: opt.label });
                  }
                });
              } else {
                // Fallback: use trip-level default selections
                activeTripConditions.forEach(tc => {
                  const optionId = tc.selected_option_id;
                  if (optionId) {
                    const opt = tc.options?.find(o => o.id === optionId);
                    if (opt) activeConditions.push({ id: tc.id, conditionName: tc.condition_name, label: opt.label });
                  }
                });
              }

              // Parse pax composition from first pax_config args
              const firstConfig = paxConfigs[0];
              const argsLabel = firstConfig?.args_label || '';

              // Extract pax range for range_web mode
              const paxValues = paxConfigs.map(p => p.total_pax).filter(Boolean);
              const minPax = Math.min(...paxValues);
              const maxPax = Math.max(...paxValues);

              // Parse room composition from args (Record<string, number>)
              const firstArgs = firstConfig?.args || {};
              const roomParts: string[] = [];
              const paxParts: string[] = [];
              Object.entries(firstArgs).forEach(([key, val]) => {
                if (key.startsWith('room_')) {
                  roomParts.push(`${val} ${key.replace('room_', '')}`);
                } else if (key === 'adult' && val > 0) {
                  paxParts.push(`${val} adulte${val > 1 ? 's' : ''}`);
                } else if (key === 'child' && val > 0) {
                  paxParts.push(`${val} enfant${val > 1 ? 's' : ''}`);
                }
              });

              return (
                <div className="bg-nomadays-turquoise-light border border-primary/15 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Pax composition */}
                    <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm border border-gray-200">
                      <Users className="w-4 h-4 text-primary" />
                      {isRange ? (
                        <span className="text-gray-700 font-medium">{minPax} à {maxPax} participants</span>
                      ) : (
                        <span className="text-gray-700 font-medium">
                          {paxParts.length > 0 ? paxParts.join(' + ') : argsLabel || `${firstConfig?.total_pax || '?'} pers`}
                        </span>
                      )}
                    </div>

                    {/* Room composition (non-range mode) */}
                    {!isRange && roomParts.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm border border-gray-200">
                        <BedDouble className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700">{roomParts.join(' + ')}</span>
                      </div>
                    )}

                    {/* Active conditions (cotation-specific) */}
                    {activeConditions.map(cond => (
                      <div key={cond.id} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm border border-gray-200">
                        <Star className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-gray-500">{cond.conditionName} :</span>
                        <span className="text-gray-700 font-medium">{cond.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}

          {/* Cotation pills selector */}
          {tarificationCotations.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 mr-1">Cotation :</span>
              {tarificationCotations.map(cotation => {
                const isCotSelected = selectedCotationId != null && cotation.id === selectedCotationId;
                return (
                  <button
                    key={cotation.id}
                    onClick={() => setTarificationCotationId(cotation.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                      activeTarificationCotation?.id === cotation.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{cotation.name}</span>
                    {isCotSelected && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTarificationCotation?.id === cotation.id
                          ? 'bg-emerald-400/30 text-white'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        Retenue
                      </span>
                    )}
                    {cotation.status !== 'calculated' && (
                      <span className="text-xs opacity-60">
                        {cotation.status === 'calculating' ? '⏳' : cotation.status === 'error' ? '⚠️' : '○'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Paramètres de tarification (rappel) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Paramètres de tarification
              </h3>
              <button
                onClick={() => setPricingExpanded(!pricingExpanded)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {pricingExpanded ? 'Réduire' : 'Modifier'}
                {pricingExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Résumé compact (toujours visible) */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                {settingsData.default_currency}
              </span>
              <span className="text-gray-600">
                Marge : <span className="font-medium">{settingsData.margin_pct}%</span>
                <span className="text-gray-400 ml-1">({settingsData.margin_type === 'margin' ? 'sur PV' : 'markup'})</span>
              </span>
              {settingsData.primary_commission_pct > 0 && (
                <span className="text-gray-600">
                  {settingsData.primary_commission_label} : <span className="font-medium">{settingsData.primary_commission_pct}%</span>
                </span>
              )}
              {settingsData.vat_pct > 0 && (
                <span className="text-gray-600">
                  TVA : <span className="font-medium">{settingsData.vat_pct}%</span>
                  <span className="text-gray-400 ml-1">({settingsData.vat_calculation_mode === 'on_margin' ? 'sur marge' : 'sur PV'})</span>
                </span>
              )}
              {exchangeRateValue && parseFloat(exchangeRateValue) > 0 && settingsData.destination_country && (
                <span className="text-gray-600">
                  Taux : <span className="font-medium">1 {settingsData.default_currency} = {exchangeRateValue} {getLocalCurrency(settingsData.destination_country)}</span>
                </span>
              )}
            </div>

            {/* Détail éditable (collapsible) */}
            {pricingExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-6">
                {/* Devise et Marge */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Devise de vente
                    </label>
                    <select
                      value={settingsData.default_currency}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, default_currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC] bg-white"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CHF">CHF</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Marge (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={settingsData.margin_pct}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, margin_pct: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Type de marge
                    </label>
                    <select
                      value={settingsData.margin_type}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, margin_type: e.target.value as 'margin' | 'markup' }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC] bg-white"
                    >
                      <option value="margin">Marge (sur PV)</option>
                      <option value="markup">Markup (sur PA)</option>
                    </select>
                  </div>
                </div>

                {/* Commissions */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Commissions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="block text-xs text-gray-500 mb-1.5">Commission principale</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsData.primary_commission_label}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, primary_commission_label: e.target.value }))}
                          placeholder="Libellé"
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                        />
                        <div className="relative w-20">
                          <input
                            type="number"
                            value={settingsData.primary_commission_pct}
                            onChange={(e) => setSettingsData(prev => ({ ...prev, primary_commission_pct: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="block text-xs text-gray-500 mb-1.5">Commission secondaire</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsData.secondary_commission_label}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, secondary_commission_label: e.target.value }))}
                          placeholder="Libellé"
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                        />
                        <div className="relative w-20">
                          <input
                            type="number"
                            value={settingsData.secondary_commission_pct}
                            onChange={(e) => setSettingsData(prev => ({ ...prev, secondary_commission_pct: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TVA (read-only — configuré dans Configuration) */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-medium text-gray-500">TVA</h4>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Configuration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={settingsData.vat_pct}
                        readOnly
                        className="w-24 px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {settingsData.vat_calculation_mode === 'on_margin' ? 'sur marge' : 'sur PV'}
                    </span>
                  </div>
                </div>

                {/* Taux de change */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-gray-500">Taux de change</h4>
                    <button className="inline-flex items-center gap-1 text-xs text-[#0FB6BC] hover:text-[#0C9296]">
                      <RefreshCw className="w-3 h-3" />
                      Actualiser
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">
                        1 {settingsData.default_currency} =
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={exchangeRateValue}
                        onChange={(e) => setExchangeRateValue(e.target.value)}
                        placeholder={
                          settingsData.destination_country === 'TH' ? '37.50' :
                          settingsData.destination_country === 'VN' ? '26500' :
                          settingsData.destination_country === 'JP' ? '160' :
                          settingsData.destination_country === 'ID' ? '17200' :
                          settingsData.destination_country === 'MA' ? '10.80' :
                          settingsData.destination_country === 'IN' ? '91' :
                          '1.00'
                        }
                        className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]"
                      />
                      <span className="text-sm font-medium text-gray-600 w-12">
                        {getLocalCurrency(settingsData.destination_country)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tarification Panel — reverse margin from selling price */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Tarification client
              </h3>
            </div>

            {tarificationCotations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm mb-1">Aucune cotation disponible</p>
                <p className="text-xs text-gray-400">
                  Créez une cotation dans l&apos;onglet « Cotations » pour accéder à la tarification.
                </p>
              </div>
            ) : activeTarificationCotation ? (
              <TarificationPanel
                cotation={activeTarificationCotation}
                currency={settingsData.default_currency}
                localCurrency={settingsData.destination_country ? getLocalCurrency(settingsData.destination_country) : undefined}
                exchangeRate={exchangeRateValue && parseFloat(exchangeRateValue) > 0 ? (1 / parseFloat(exchangeRateValue)) : undefined}
                tripType={trip.type}
                selectedCotationId={selectedCotationId}
                conditionLabels={(() => {
                  const selections = activeTarificationCotation.condition_selections || {};
                  const labels: { name: string; value: string }[] = [];
                  const activeConditions = tarificationConditions.filter(tc => tc.is_active);

                  if (Object.keys(selections).length > 0) {
                    // Cotation has explicit condition_selections
                    Object.entries(selections).forEach(([condIdStr, optionId]) => {
                      const tc = tarificationConditions.find(c => c.condition_id === Number(condIdStr));
                      if (tc) {
                        const opt = tc.options?.find(o => o.id === optionId);
                        if (opt) labels.push({ name: tc.condition_name, value: opt.label });
                      }
                    });
                  } else {
                    // Fallback: use trip-level default selections (same logic as CotationConditionsEditor)
                    activeConditions.forEach(tc => {
                      const optionId = tc.selected_option_id;
                      if (optionId) {
                        const opt = tc.options?.find(o => o.id === optionId);
                        if (opt) labels.push({ name: tc.condition_name, value: opt.label });
                      }
                    });
                  }
                  return labels;
                })()}
                onSaved={() => refetchTarificationCotations()}
              />
            ) : null}
          </div>

        <div>
          {/* Cost Types Navigation + Items (full-width) */}
          <div className="space-y-4">
            {/* Formula Selection + View Toggle */}
            <div className="flex items-center justify-between mb-2">
              {/* Formula Selection (compact) */}
              {trip.formulas && trip.formulas.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Formule :</span>
                  <div className="flex gap-1">
                    {trip.formulas.map(formula => (
                      <button
                        key={formula.id}
                        onClick={() => setSelectedFormula(formula.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedFormula === formula.id
                            ? 'bg-[#0FB6BC] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {formula.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div />
              )}

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setQuotationView('by-type')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    quotationView === 'by-type'
                      ? 'bg-white text-[#096D71] shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#0FB6BC] via-[#DD9371] to-[#8BA080]" />
                  Par type
                </button>
                <button
                  onClick={() => setQuotationView('by-day')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    quotationView === 'by-day'
                      ? 'bg-white text-[#096D71] shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Par jour
                </button>
              </div>
            </div>

            {/* View: By Type */}
            {quotationView === 'by-type' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs Header */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {costNatures.map(nature => {
                    const items = currentFormula?.items?.filter(
                      item => (item.cost_nature?.code || 'MIS') === nature.code
                    ) || [];
                    const total = items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);

                    return (
                      <button
                        key={nature.code}
                        onClick={() => setSelectedCostNature && setSelectedCostNature(nature.code)}
                        className={`flex-1 px-4 py-3 text-center transition-colors relative ${
                          (selectedCostNature || 'HTL') === nature.code
                            ? 'bg-white text-[#096D71] font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-3 h-3 rounded-full ${
                            nature.code === 'HTL' ? 'bg-blue-500' :
                            nature.code === 'GDE' ? 'bg-purple-500' :
                            nature.code === 'TRS' ? 'bg-orange-500' :
                            nature.code === 'ACT' ? 'bg-[#0FB6BC]' :
                            nature.code === 'RES' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-sm">{nature.label || nature.name}</span>
                          {items.length > 0 && (
                            <span className="text-xs text-gray-400">{total.toFixed(0)} €</span>
                          )}
                        </div>
                        {(selectedCostNature || 'HTL') === nature.code && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0FB6BC]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Items List for selected cost type */}
                <div className="p-4">
                  {(() => {
                    const natureCode = selectedCostNature || 'HTL';
                    const items = currentFormula?.items?.filter(
                      item => (item.cost_nature?.code || 'MIS') === natureCode
                    ) || [];

                    if (items.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <Plus className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm mb-3">Aucune prestation {(costNatures.find(n => n.code === natureCode)?.label || costNatures.find(n => n.code === natureCode)?.name || '')?.toLowerCase()}</p>
                          <button
                            onClick={() => {
                              setEditingItem(undefined);
                              setShowItemEditor(true);
                            }}
                            className="px-4 py-2 bg-[#0FB6BC] text-white rounded-lg hover:bg-[#0C9296] text-sm"
                          >
                            Ajouter
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group cursor-pointer"
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemEditor(true);
                            }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{item.name}</span>
                                <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                                  J{item.day_start}{item.day_end !== item.day_start ? `-${item.day_end}` : ''}
                                </span>
                                {item.supplier_id && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                    Fournisseur
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>{item.quantity} × {item.unit_cost.toFixed(2)} €</span>
                                <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                                  {getRatioLabel(item.ratio_rule)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900">
                                {(item.unit_cost * item.quantity).toFixed(2)} €
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                    setShowItemEditor(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Delete item
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add button */}
                        <button
                          onClick={() => {
                            setEditingItem(undefined);
                            setShowItemEditor(true);
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#0FB6BC] hover:text-[#0C9296] transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter une prestation
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* View: By Day */}
            {quotationView === 'by-day' && (
              <div className="space-y-3">
                {(() => {
                  const items = currentFormula?.items || [];
                  const dayNumbers = [...new Set(items.map(item => item.day_start || 1))].sort((a, b) => a - b);

                  // Add all days from trip even if no items
                  const allDays = Array.from({ length: trip.duration_days || 7 }, (_, i) => i + 1);
                  const daysToShow = [...new Set([...allDays, ...dayNumbers])].sort((a, b) => a - b);

                  if (items.length === 0) {
                    return (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm mb-3">Aucune prestation configurée</p>
                        <button
                          onClick={() => {
                            setEditingItem(undefined);
                            setShowItemEditor(true);
                          }}
                          className="px-4 py-2 bg-[#0FB6BC] text-white rounded-lg hover:bg-[#0C9296] text-sm"
                        >
                          Ajouter une prestation
                        </button>
                      </div>
                    );
                  }

                  return daysToShow.map(dayNumber => {
                    const dayItems = items.filter(item => (item.day_start || 1) <= dayNumber && (item.day_end || item.day_start || 1) >= dayNumber);
                    const dayTotal = dayItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
                    const tripDay = trip.days?.find(d => d.day_number === dayNumber);

                    // Helper function to get color for cost nature
                    const getNatureColor = (code: string) => {
                      switch (code) {
                        case 'HTL': return 'bg-blue-500';
                        case 'GDE': return 'bg-purple-500';
                        case 'TRS': return 'bg-orange-500';
                        case 'ACT': return 'bg-[#0FB6BC]';
                        case 'RES': return 'bg-red-500';
                        default: return 'bg-gray-500';
                      }
                    };

                    return (
                      <div key={dayNumber} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Day Header */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#E6F9FA] text-[#096D71] flex items-center justify-center font-bold text-sm">
                              J{dayNumber}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {tripDay?.title || `Jour ${dayNumber}`}
                              </h4>
                              {tripDay?.overnight_city && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {tripDay.overnight_city}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">{dayTotal.toFixed(0)} €</span>
                            <span className="text-xs text-gray-500 ml-1">/ jour</span>
                          </div>
                        </div>

                        {/* Day Items */}
                        <div className="p-4">
                          {dayItems.length > 0 ? (
                            <div className="space-y-2">
                              {dayItems.map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group cursor-pointer"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowItemEditor(true);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-2.5 h-2.5 rounded-full ${getNatureColor(item.cost_nature?.code || 'MIS')}`} />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{item.name}</span>
                                        <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                                          {item.cost_nature?.name || 'Divers'}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                                        <span>{item.quantity} × {item.unit_cost.toFixed(2)} €</span>
                                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                                          {getRatioLabel(item.ratio_rule)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">
                                      {(item.unit_cost * item.quantity).toFixed(2)} €
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingItem(item);
                                          setShowItemEditor(true);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // TODO: Delete item
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              Aucune prestation pour ce jour
                            </div>
                          )}

                          {/* Add button for this day */}
                          <button
                            onClick={() => {
                              setEditingItem({ day_start: dayNumber, day_end: dayNumber });
                              setShowItemEditor(true);
                            }}
                            className="w-full mt-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#0FB6BC] hover:text-[#0C9296] transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Ajouter au Jour {dayNumber}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Price Grid */}
            {currentFormula && currentFormula.items && currentFormula.items.length > 0 && (
              <PriceGrid
                formula={currentFormula}
                paxConfigs={defaultPaxConfigs}
                marginPct={trip.margin_pct || 30}
                marginType={trip.margin_type || 'margin'}
                currency={trip.default_currency || 'EUR'}
                minMarginPct={20}
                onPaxSelect={setSelectedPax}
                selectedPax={selectedPax}
              />
            )}
          </div>

          {/* Item Editor Modal */}
          {showItemEditor && (
            <ItemEditor
              item={editingItem}
              costNatures={costNatures}
              tripDays={trip.duration_days || 7}
              defaultCurrency={trip.default_currency || 'THB'}
              onSave={(itemData) => {
                console.log('Save item:', itemData);
                // TODO: Call API to save item
                setShowItemEditor(false);
                setEditingItem(undefined);
              }}
              onCancel={() => {
                setShowItemEditor(false);
                setEditingItem(undefined);
              }}
            />
          )}
        </div>
        </div>
      )}


      {activeTab === 'echanges' && (
        <EchangesTab tripId={trip.id} tenantId={trip.tenant_id} />
      )}

      {/* Pre-Booking Dialog */}
      <PreBookingDialog
        isOpen={showPreBookingDialog}
        onClose={() => setShowPreBookingDialog(false)}
        tripId={trip.id}
        tripName={trip.name}
        paxCount={trip.pax_configs?.[0]?.total_pax || undefined}
        onCreated={() => setShowPreBookingDialog(false)}
      />

      {/* Translation Modal */}
      {showTranslateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Languages className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Traduire ce circuit</h2>
                  <p className="text-sm text-gray-500">
                    Langue actuelle : {trip.language === 'fr' ? 'Français' : trip.language || 'Français'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTranslateModal(false);
                  setSelectedLanguage('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Existing translations */}
              {translationsData && translationsData.translations.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Traductions existantes</h3>
                  <div className="space-y-2">
                    {translationsData.translations.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          t.is_original ? 'bg-[#E6F9FA] border border-[#99E7EB]' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {t.language === 'fr' && '🇫🇷'}
                            {t.language === 'en' && '🇬🇧'}
                            {t.language === 'es' && '🇪🇸'}
                            {t.language === 'de' && '🇩🇪'}
                            {t.language === 'it' && '🇮🇹'}
                            {t.language === 'pt' && '🇵🇹'}
                            {t.language === 'nl' && '🇳🇱'}
                            {t.language === 'ru' && '🇷🇺'}
                            {t.language === 'zh' && '🇨🇳'}
                            {t.language === 'ja' && '🇯🇵'}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{t.language_name}</div>
                            <div className="text-xs text-gray-500">
                              {t.is_original ? 'Version originale' : t.name}
                            </div>
                          </div>
                        </div>
                        {t.id !== parseInt(tripId) && (
                          <Link
                            href={`/admin/circuits/${t.id}`}
                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                          >
                            Ouvrir
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New translation */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Nouvelle traduction</h3>
                <div className="grid grid-cols-2 gap-2">
                  {languagesData?.languages
                    .filter((lang) => {
                      // Exclude current language and already translated
                      const existingLangs = translationsData?.translations.map(t => t.language) || [];
                      return !existingLangs.includes(lang.code);
                    })
                    .map((lang) => {
                      const flags: Record<string, string> = {
                        fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', it: '🇮🇹',
                        pt: '🇵🇹', nl: '🇳🇱', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵',
                      };
                      const isSelected = selectedLanguage === lang.code;

                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setSelectedLanguage(lang.code)}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg">{flags[lang.code] || '🌐'}</span>
                          <span className={isSelected ? 'text-purple-700 font-medium' : 'text-gray-700'}>
                            {lang.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 ml-auto" />}
                        </button>
                      );
                    })}
                </div>

                {languagesData?.languages.filter((lang) => {
                  const existingLangs = translationsData?.translations.map(t => t.language) || [];
                  return !existingLangs.includes(lang.code);
                }).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    Ce circuit a été traduit dans toutes les langues disponibles
                  </p>
                )}
              </div>

              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-700">
                  <strong>Note :</strong> La traduction crée une copie indépendante du circuit.
                  Les modifications futures ne seront pas synchronisées entre les versions.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowTranslateModal(false);
                  setSelectedLanguage('');
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!selectedLanguage) return;
                  try {
                    const result = await translateTrip({
                      tripId: parseInt(tripId),
                      targetLanguage: selectedLanguage,
                    });
                    setShowTranslateModal(false);
                    setSelectedLanguage('');
                    // Navigate to the new translated circuit
                    router.push(`/admin/circuits/${result.id}`);
                  } catch (err) {
                    console.error('Translation failed:', err);
                  }
                }}
                disabled={!selectedLanguage || translating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Traduction en cours...
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    Traduire
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Photo Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#0FB6BC]" />
              Regénérer la photo — Jour {regenerateDayNumber}
            </DialogTitle>
            <DialogDescription>
              Modifiez le prompt ci-dessous puis cliquez sur Regénérer pour obtenir une nouvelle image via l&apos;IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt de génération
              </label>
              <textarea
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                placeholder="Décrivez l'image souhaitée..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0FB6BC] resize-none text-sm"
                rows={6}
              />
              <p className="mt-1 text-xs text-gray-400">
                Laissez vide pour regénérer automatiquement depuis la description du jour.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setRegenerateDialogOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!regeneratePhotoId) return;
                try {
                  await regeneratePhoto({
                    tripId: parseInt(tripId),
                    photoId: regeneratePhotoId,
                    prompt: regeneratePrompt || undefined,
                    quality: 'high',
                  });
                  setRegenerateDialogOpen(false);
                  refetchPhotos();
                } catch (err) {
                  console.error('Regeneration failed:', err);
                }
              }}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 bg-[#0FB6BC] text-white rounded-lg hover:bg-[#0C9296] transition-colors disabled:opacity-50 text-sm"
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regénérer
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
