'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Calculator,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  MapPin,
  Euro,
  AlertTriangle,
  CheckCircle,
  Copy,
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
} from 'lucide-react';
import { useTrip, useUpdateTrip } from '@/hooks/useTrips';
import { useLanguages, useTripTranslations, useTranslateTrip, useTranslationPreview, usePushTranslation } from '@/hooks/useTranslation';
import { useTravelThemes } from '@/hooks/useTravelThemes';
import { LanguageSelector, StaleWarningBanner, PreviewModeIndicator } from '@/components/circuits/LanguageSelector';
import { TranslationVersionsNav } from '@/components/circuits/TranslationVersionsNav';
import { ThemeCheckboxGrid } from '@/components/ui/theme-checkbox-grid';
import type { Trip, TripDay, Formula, QuotationResult, TripHighlight, InclusionItem, DescriptionTone, CostNature, Item, PaxConfig } from '@/lib/api/types';
import {
  TripMapEditor,
  TripPresentationEditor,
  InclusionExclusionEditor,
  TripInfoEditor,
  CostBreakdown,
  PriceGrid,
  ItemEditor,
} from '@/components/circuits';
import { TRIP_STATUS, getStatusConfig, TONE_OPTIONS } from '@/lib/constants/circuits';
import { getCountryFlag, getCountryName } from '@/lib/constants/countries';

// Pax configurations par défaut
const defaultPaxConfigs: { pax: number; rooms: number }[] = [
  { pax: 2, rooms: 1 },
  { pax: 4, rooms: 2 },
  { pax: 6, rooms: 3 },
];

type TabType = 'presentation' | 'program' | 'quotation' | 'settings';

export default function CircuitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { data: trip, loading, error, refetch } = useTrip(tripId);
  const { mutate: updateTrip, loading: saving } = useUpdateTrip();

  const [activeTab, setActiveTab] = useState<TabType>('presentation');
  const [selectedFormula, setSelectedFormula] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([1, 2, 3]);
  const [selectedPax, setSelectedPax] = useState(2);
  const [quotationResult, setQuotationResult] = useState<QuotationResult | null>(null);
  const [selectedCostNature, setSelectedCostNature] = useState<string>('HTL');
  const [quotationView, setQuotationView] = useState<'by-type' | 'by-day'>('by-type');

  // Presentation state
  const [presentationData, setPresentationData] = useState({
    description_short: '',
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
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([]);

  // Item editor state
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | undefined>(undefined);

  // Default cost natures (TODO: fetch from API)
  const defaultCostNatures: CostNature[] = [
    { id: 1, code: 'HTL', name: 'Hébergement' },
    { id: 2, code: 'GDE', name: 'Guide' },
    { id: 3, code: 'TRS', name: 'Transport' },
    { id: 4, code: 'ACT', name: 'Activités' },
    { id: 5, code: 'RES', name: 'Restauration' },
    { id: 6, code: 'MIS', name: 'Divers' },
  ];

  // Initialise les données de présentation depuis le trip
  useEffect(() => {
    if (trip) {
      setPresentationData({
        description_short: trip.description_short || '',
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
      });

      // Settings data
      setSettingsData({
        name: trip.name || '',
        duration_days: trip.duration_days || 0,
        destination_country: trip.destination_country || '',
        default_currency: trip.default_currency || 'EUR',
        margin_pct: trip.margin_pct || 30,
        margin_type: trip.margin_type || 'margin',
        vat_pct: trip.vat_pct || 20,
        vat_calculation_mode: trip.vat_calculation_mode || 'on_margin',
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

      // Travel themes
      if (trip.themes && trip.themes.length > 0) {
        setSelectedThemeIds(trip.themes.map(t => t.id));
      }

      // Sélectionner la première formule par défaut
      if (trip.formulas && trip.formulas.length > 0) {
        const defaultFormula = trip.formulas.find(f => f.is_default) ?? trip.formulas[0];
        if (defaultFormula) {
          setSelectedFormula(defaultFormula.id);
        }
      }
    }
  }, [trip]);

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
          client_name: settingsData.client_name,
          client_email: settingsData.client_email,
          start_date: settingsData.start_date,
          // Thématiques
          theme_ids: selectedThemeIds,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
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
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Copy className="w-4 h-4" />
              Dupliquer
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              Générer PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'presentation', label: 'Présentation', icon: FileText },
            { id: 'program', label: 'Programme', icon: Calendar },
            { id: 'quotation', label: 'Cotation', icon: Calculator },
            { id: 'settings', label: 'Paramètres', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
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
          {/* Map */}
          <TripMapEditor
            tripId={trip.id}
            destinationCountries={trip.destination_countries || (trip.destination_country ? [trip.destination_country] : [])}
          />

          {/* Presentation */}
          <TripPresentationEditor
            descriptionShort={previewLanguage && preview?.content.description_short ? preview.content.description_short : presentationData.description_short}
            descriptionTone={presentationData.description_tone}
            highlights={previewLanguage && preview?.content.highlights ? preview.content.highlights : presentationData.highlights}
            onChange={(data) => {
              if (!previewLanguage) {
                setPresentationData({
                  description_short: data.description_short || '',
                  description_tone: data.description_tone || 'factuel',
                  highlights: data.highlights || [],
                });
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

          {/* Additional Info */}
          <TripInfoEditor
            data={tripInfo}
            onChange={(data) => setTripInfo({
              info_general: data.info_general || '',
              info_formalities: data.info_formalities || '',
              info_booking_conditions: data.info_booking_conditions || '',
              info_cancellation_policy: data.info_cancellation_policy || '',
              info_additional: data.info_additional || '',
            })}
            onLoadDefaults={() => {
              // TODO: Load defaults from country templates
              console.log('Load info defaults');
            }}
          />
        </div>
      )}

      {activeTab === 'program' && (
        <div className="space-y-4">
          {trip.days && trip.days.length > 0 ? (
            <>
              {trip.days.map(day => (
                <div key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <button
                    onClick={() => toggleDay(day.day_number)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        J{day.day_number}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{day.title || `Jour ${day.day_number}`}</h3>
                        {(day.location_from || day.location_to || day.overnight_city) && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {day.location_from || day.overnight_city}
                            {day.location_to && day.location_from !== day.location_to && (
                              <> → {day.location_to}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    {expandedDays.includes(day.day_number) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedDays.includes(day.day_number) && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-4">
                        <textarea
                          defaultValue={day.description || ''}
                          placeholder="Description de la journée..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
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
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                Ajouter un jour
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotation' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Cost Types Navigation + Items */}
          <div className="col-span-8 space-y-4">
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
                            ? 'bg-emerald-600 text-white'
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
                      ? 'bg-white text-emerald-700 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
                  Par type
                </button>
                <button
                  onClick={() => setQuotationView('by-day')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    quotationView === 'by-day'
                      ? 'bg-white text-emerald-700 shadow-sm font-medium'
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
                  {defaultCostNatures.map(nature => {
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
                            ? 'bg-white text-emerald-700 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-3 h-3 rounded-full ${
                            nature.code === 'HTL' ? 'bg-blue-500' :
                            nature.code === 'GDE' ? 'bg-purple-500' :
                            nature.code === 'TRS' ? 'bg-orange-500' :
                            nature.code === 'ACT' ? 'bg-emerald-500' :
                            nature.code === 'RES' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-sm">{nature.name}</span>
                          {items.length > 0 && (
                            <span className="text-xs text-gray-400">{total.toFixed(0)} €</span>
                          )}
                        </div>
                        {(selectedCostNature || 'HTL') === nature.code && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
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
                          <p className="text-sm mb-3">Aucune prestation {defaultCostNatures.find(n => n.code === natureCode)?.name?.toLowerCase()}</p>
                          <button
                            onClick={() => {
                              setEditingItem(undefined);
                              setShowItemEditor(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
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
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 text-sm"
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
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
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
                        case 'ACT': return 'bg-emerald-500';
                        case 'RES': return 'bg-red-500';
                        default: return 'bg-gray-500';
                      }
                    };

                    return (
                      <div key={dayNumber} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Day Header */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
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
                            className="w-full mt-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 text-sm"
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

          {/* Right: Tarification Module */}
          <div className="col-span-4 space-y-4">
            {/* PAX Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Voyageurs</h3>
              <div className="grid grid-cols-3 gap-2">
                {defaultPaxConfigs.map(config => (
                  <button
                    key={config.pax}
                    onClick={() => setSelectedPax(config.pax)}
                    className={`py-3 rounded-lg border-2 transition-all ${
                      selectedPax === config.pax
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-bold">{config.pax}</div>
                    <div className="text-xs text-gray-500">{config.rooms} chb</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tarification Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Tarification
              </h3>

              {quotationResult ? (
                <div className="space-y-3">
                  {/* Cost breakdown by type */}
                  <div className="space-y-2 pb-3 border-b border-gray-100">
                    {defaultCostNatures.map(nature => {
                      const items = currentFormula?.items?.filter(
                        item => (item.cost_nature?.code || 'MIS') === nature.code
                      ) || [];
                      if (items.length === 0) return null;

                      let total = 0;
                      items.forEach(item => {
                        let cost = item.unit_cost * item.quantity;
                        if (item.ratio_rule === 'per_person') cost *= selectedPax;
                        else if (item.ratio_rule === 'per_room') cost *= (defaultPaxConfigs.find(c => c.pax === selectedPax)?.rooms || 1);
                        total += cost;
                      });

                      return (
                        <div key={nature.code} className="flex justify-between text-sm">
                          <span className="text-gray-500 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              nature.code === 'HTL' ? 'bg-blue-500' :
                              nature.code === 'GDE' ? 'bg-purple-500' :
                              nature.code === 'TRS' ? 'bg-orange-500' :
                              nature.code === 'ACT' ? 'bg-emerald-500' :
                              nature.code === 'RES' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`} />
                            {nature.name}
                          </span>
                          <span className="font-medium">{total.toFixed(2)} €</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700">Coût total</span>
                    <span>{quotationResult.total_cost.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Marge ({trip.margin_pct}%)</span>
                    <span className="text-emerald-600 font-medium">
                      +{quotationResult.margin_amount.toFixed(2)} €
                    </span>
                  </div>

                  {settingsData.primary_commission_pct > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {settingsData.primary_commission_label} ({settingsData.primary_commission_pct}%)
                      </span>
                      <span className="text-orange-600 font-medium">
                        -{(quotationResult.total_selling * settingsData.primary_commission_pct / 100).toFixed(2)} €
                      </span>
                    </div>
                  )}

                  {settingsData.vat_pct > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        TVA {settingsData.vat_pct}%
                      </span>
                      <span className="text-gray-600">
                        {settingsData.vat_calculation_mode === 'on_margin'
                          ? (quotationResult.margin_amount * settingsData.vat_pct / 100).toFixed(2)
                          : ((quotationResult.total_selling - (quotationResult.total_selling * settingsData.primary_commission_pct / 100)) * settingsData.vat_pct / 100).toFixed(2)
                        } €
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-baseline">
                      <span className="font-medium text-gray-700">Prix de vente</span>
                      <span className="text-xl font-bold text-gray-900">
                        {quotationResult.total_selling.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-emerald-600 mb-1">Prix par personne</div>
                    <div className="text-3xl font-bold text-emerald-700">
                      {quotationResult.price_per_person.toFixed(0)} €
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Ajoutez des prestations pour calculer le tarif</p>
                </div>
              )}
            </div>

            {/* Cost Breakdown Chart */}
            {currentFormula && currentFormula.items && currentFormula.items.length > 0 && (
              <CostBreakdown
                formula={currentFormula}
                pax={selectedPax}
                rooms={defaultPaxConfigs.find(c => c.pax === selectedPax)?.rooms || 1}
                currency={trip.default_currency || 'EUR'}
              />
            )}

            {/* Alerts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Alertes</h3>
              <div className="space-y-2">
                {quotationResult && quotationResult.margin_pct < 20 && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">
                      Marge faible ({quotationResult.margin_pct.toFixed(1)}%)
                    </span>
                  </div>
                )}
                {(!currentFormula?.items || currentFormula.items.length === 0) && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Aucune prestation</span>
                  </div>
                )}
                {currentFormula?.items && currentFormula.items.length > 0 && quotationResult && quotationResult.margin_pct >= 20 && (
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Cotation valide</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Item Editor Modal */}
          {showItemEditor && (
            <ItemEditor
              item={editingItem}
              costNatures={defaultCostNatures}
              tripDays={trip.duration_days || 7}
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
      )}

      {activeTab === 'settings' && (
        <div className="max-w-3xl space-y-6">
          {/* Informations de base */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              Informations de base
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du circuit
                </label>
                <input
                  type="text"
                  value={settingsData.name}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={settingsData.duration_days}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays de destination
                  </label>
                  <select
                    value={settingsData.destination_country}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, destination_country: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              </div>
            </div>
          </div>

          {/* Caractéristiques du voyage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Caractéristiques du voyage
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
            </div>

            {/* Thématiques de voyage */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
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

          {/* Tarification */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Tarification
            </h3>
            <div className="space-y-6">
              {/* Devise et Marge */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise de vente
                  </label>
                  <select
                    value={settingsData.default_currency}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, default_currency: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marge (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settingsData.margin_pct}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, margin_pct: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de marge
                  </label>
                  <select
                    value={settingsData.margin_type}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, margin_type: e.target.value as 'margin' | 'markup' }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="margin">Marge (sur PV)</option>
                    <option value="markup">Markup (sur PA)</option>
                  </select>
                </div>
              </div>

              {/* Commissions */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Commissions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Commission principale
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsData.primary_commission_label}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, primary_commission_label: e.target.value }))}
                        placeholder="Libellé"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="relative w-24">
                        <input
                          type="number"
                          value={settingsData.primary_commission_pct}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, primary_commission_pct: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Commission secondaire (optionnel)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsData.secondary_commission_label}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, secondary_commission_label: e.target.value }))}
                        placeholder="Libellé"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="relative w-24">
                        <input
                          type="number"
                          value={settingsData.secondary_commission_pct}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, secondary_commission_pct: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TVA */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">TVA</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Taux de TVA
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={settingsData.vat_pct}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, vat_pct: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Mode de calcul
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSettingsData(prev => ({ ...prev, vat_calculation_mode: 'on_margin' }))}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm transition-colors ${
                          settingsData.vat_calculation_mode === 'on_margin'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Sur la marge
                      </button>
                      <button
                        onClick={() => setSettingsData(prev => ({ ...prev, vat_calculation_mode: 'on_selling_price' }))}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm transition-colors ${
                          settingsData.vat_calculation_mode === 'on_selling_price'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Sur prix vente agence
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {settingsData.vat_calculation_mode === 'on_margin'
                    ? 'TVA calculée sur la marge brute'
                    : 'TVA calculée sur le prix de vente moins la commission principale'}
                </p>
              </div>

              {/* Taux de change */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Taux de change</h4>
                  <button className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
                    <RefreshCw className="w-4 h-4" />
                    Actualiser depuis Kantox
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Devise principale du pays */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {settingsData.destination_country === 'TH' ? '🇹🇭' :
                         settingsData.destination_country === 'VN' ? '🇻🇳' :
                         settingsData.destination_country === 'JP' ? '🇯🇵' :
                         settingsData.destination_country === 'ID' ? '🇮🇩' :
                         settingsData.destination_country === 'MA' ? '🇲🇦' :
                         settingsData.destination_country === 'IN' ? '🇮🇳' :
                         '🌍'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">
                          1 {settingsData.default_currency} =
                        </div>
                        <div className="text-xs text-gray-500">Devise du pays</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder={
                          settingsData.destination_country === 'TH' ? '37.50' :
                          settingsData.destination_country === 'VN' ? '26500' :
                          settingsData.destination_country === 'JP' ? '160' :
                          settingsData.destination_country === 'ID' ? '17200' :
                          settingsData.destination_country === 'MA' ? '10.80' :
                          settingsData.destination_country === 'IN' ? '91' :
                          '1.00'
                        }
                        className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-gray-600 w-12">
                        {settingsData.destination_country === 'TH' ? 'THB' :
                         settingsData.destination_country === 'VN' ? 'VND' :
                         settingsData.destination_country === 'JP' ? 'JPY' :
                         settingsData.destination_country === 'ID' ? 'IDR' :
                         settingsData.destination_country === 'MA' ? 'MAD' :
                         settingsData.destination_country === 'IN' ? 'INR' :
                         settingsData.destination_country === 'CN' ? 'CNY' :
                         settingsData.destination_country === 'KH' ? 'USD' :
                         'USD'}
                      </span>
                    </div>
                  </div>

                  {/* Taux Kantox indicatif */}
                  <div className="flex items-center justify-between text-sm text-gray-500 px-3">
                    <span>Taux Kantox indicatif :</span>
                    <span className="font-mono">
                      {settingsData.destination_country === 'TH' ? '37.45' :
                       settingsData.destination_country === 'VN' ? '26450' :
                       settingsData.destination_country === 'JP' ? '159.80' :
                       settingsData.destination_country === 'ID' ? '17150' :
                       settingsData.destination_country === 'MA' ? '10.75' :
                       settingsData.destination_country === 'IN' ? '90.80' :
                       '-'}
                    </span>
                  </div>

                  {/* Ajouter une devise */}
                  <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Ajouter une devise (USD, etc.)
                  </button>

                  <p className="text-xs text-gray-500">
                    Les taux sont utilisés pour convertir les coûts des prestations en devise locale vers votre devise de vente ({settingsData.default_currency}).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Informations client (si circuit sur mesure) */}
          {(trip.type === 'custom' || trip.client_name) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Informations client
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du client
                  </label>
                  <input
                    type="text"
                    value={settingsData.client_name}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, client_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settingsData.client_email}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, client_email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de départ
                </label>
                <input
                  type="date"
                  value={settingsData.start_date}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Zone de danger */}
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Zone de danger
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              La suppression d'un circuit est irréversible. Toutes les données associées seront perdues.
            </p>
            <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              Supprimer ce circuit
            </button>
          </div>
        </div>
      )}

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
                          t.is_original ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
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
    </div>
  );
}
