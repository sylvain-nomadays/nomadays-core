'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Map,
  Globe,
  Calendar,
  BookOpen,
  Sparkles,
  Save,
  Loader2,
  Wand2,
  Link as LinkIcon,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useCreateTrip } from '@/hooks/useTrips';
import { TripType, CreateTripDTO } from '@/lib/api/types';
import { apiClient } from '@/lib/api/client';

// Circuit type options
const circuitTypes: { id: TripType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: 'online',
    label: 'Circuit en ligne',
    description: 'Circuit master publié sur le site web',
    icon: Globe,
  },
  {
    id: 'gir',
    label: 'Circuit GIR',
    description: 'Départ groupé avec date fixe',
    icon: Calendar,
  },
  {
    id: 'template',
    label: 'Template',
    description: 'Modèle réutilisable pour la bibliothèque',
    icon: BookOpen,
  },
  {
    id: 'custom',
    label: 'Sur mesure',
    description: 'Circuit personnalisé pour un client',
    icon: Sparkles,
  },
];

// Tone options for AI rewriting
const toneOptions = [
  { id: 'marketing_emotionnel', label: 'Marketing émotionnel', description: 'Inspirant, fait rêver' },
  { id: 'aventure', label: 'Aventure', description: 'Exploration, découverte' },
  { id: 'familial', label: 'Familial', description: 'Rassurant, confort' },
  { id: 'factuel', label: 'Factuel', description: 'Informatif, précis' },
];

// Common countries
const countries = [
  { code: 'TH', name: 'Thaïlande', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'JP', name: 'Japon', flag: '🇯🇵' },
  { code: 'ID', name: 'Indonésie', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaisie', flag: '🇲🇾' },
  { code: 'KH', name: 'Cambodge', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳' },
  { code: 'NP', name: 'Népal', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿' },
];

interface ImportedData {
  source_url: string;
  extracted: {
    name: string;
    destination_country?: string;
    duration_days: number;
    description_short?: string;
    highlights?: string[];
    inclusions?: string[];
    exclusions?: string[];
    days: { day_number: number; title?: string; description?: string; locations?: string }[];
  };
  versions: Record<string, {
    rewritten_name: string;
    rewritten_description: string;
    rewritten_highlights: string[];
    rewritten_days: { day_number: number; title?: string; description?: string }[];
    tone: string;
  }>;
}

export default function NewCircuitPage() {
  const router = useRouter();
  const { mutate: createTrip, loading, error } = useCreateTrip();

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTripDTO>>({
    type: 'template',
    name: '',
    duration_days: 7,
    destination_country: '',
    default_currency: 'EUR',
    margin_pct: 30,
    margin_type: 'margin',
  });

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>('factuel');

  // Store imported data for submission
  const [importedDays, setImportedDays] = useState<{ day_number: number; title?: string; description?: string; locations?: string }[]>([]);
  const [importedExtras, setImportedExtras] = useState<{
    source_url?: string;
    description_short?: string;
    highlights?: string[];
    inclusions?: string[];
    exclusions?: string[];
    tone?: string;
  }>({});

  const handleTypeSelect = (type: TripType) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleChange = (field: keyof CreateTripDTO, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImport = async () => {
    if (!importUrl) return;

    setImporting(true);
    setImportError(null);

    try {
      const result = await apiClient.post<ImportedData>('/import/preview', {
        url: importUrl,
        tone: 'factuel',
      });
      setImportedData(result);
    } catch (err) {
      const message = (err as { detail?: string })?.detail || 'Erreur lors de l\'import';
      setImportError(message);
    } finally {
      setImporting(false);
    }
  };

  const handleApplyImport = () => {
    if (!importedData) return;

    const version = importedData.versions[selectedTone];
    const extracted = importedData.extracted;

    // Update form data with basic info
    setFormData(prev => ({
      ...prev,
      name: version?.rewritten_name || extracted.name,
      duration_days: extracted.duration_days,
      destination_country: extracted.destination_country || '',
      type: 'online', // Imported circuits are typically for publishing
    }));

    // Store days (use rewritten days if available, otherwise use extracted)
    const daysToStore = version?.rewritten_days?.map((d, idx) => ({
      day_number: d.day_number,
      title: d.title,
      description: d.description,
      locations: extracted.days[idx]?.locations, // Keep locations from extracted
    })) || extracted.days;
    setImportedDays(daysToStore);

    // Store extra data for submission
    setImportedExtras({
      source_url: importedData.source_url,
      description_short: version?.rewritten_description || extracted.description_short,
      highlights: version?.rewritten_highlights || extracted.highlights,
      inclusions: extracted.inclusions,
      exclusions: extracted.exclusions,
      tone: selectedTone,
    });

    setShowImportModal(false);
    setImportedData(null);
    setImportUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      return;
    }

    // If we have imported days, use the import/create endpoint
    if (importedDays.length > 0) {
      try {
        const importPayload = {
          source_url: importedExtras.source_url || '',
          name: formData.name,
          tone: importedExtras.tone || 'factuel',
          description_short: importedExtras.description_short || '',
          highlights: importedExtras.highlights || [],
          days: importedDays,
          destination_country: formData.destination_country,
          duration_days: formData.duration_days || 7,
          inclusions: importedExtras.inclusions,
          exclusions: importedExtras.exclusions,
          type: formData.type,
        };

        const result = await apiClient.post<{ id: number; name: string; message: string }>('/import/create', importPayload);
        router.push(`/admin/circuits/${result.id}`);
      } catch (err) {
        console.error('Failed to create imported circuit:', err);
        // Fall through to show error
      }
    } else {
      // Standard creation without imported days
      const result = await createTrip(formData as CreateTripDTO);
      if (result) {
        router.push(`/admin/circuits/${result.id}`);
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/circuits"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux circuits
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Map className="w-7 h-7 text-emerald-600" />
              Nouveau circuit
            </h1>
            <p className="text-gray-500 mt-1">
              Créez un nouveau circuit ou importez-le depuis une URL
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Importer avec l'IA
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Type selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            1. Type de circuit
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {circuitTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeSelect(type.id)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all
                    ${isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      p-2 rounded-lg
                      ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>
                        {type.label}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {type.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Basic info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            2. Informations de base
          </h2>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du circuit *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Thaïlande Essentielle"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            {/* Duration and Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (jours)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={formData.duration_days || ''}
                  onChange={(e) => handleChange('duration_days', parseInt(e.target.value) || 1)}
                  min={1}
                  max={365}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <select
                  id="country"
                  value={formData.destination_country || ''}
                  onChange={(e) => handleChange('destination_country', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un pays</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start date (for GIR and custom) */}
            {(formData.type === 'gir' || formData.type === 'custom') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de départ
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date || ''}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de retour
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date || ''}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Client info (for custom) */}
            {formData.type === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du client
                  </label>
                  <input
                    type="text"
                    id="client_name"
                    value={formData.client_name || ''}
                    onChange={(e) => handleChange('client_name', e.target.value)}
                    placeholder="Ex: Famille Martin"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email du client
                  </label>
                  <input
                    type="email"
                    id="client_email"
                    value={formData.client_email || ''}
                    onChange={(e) => handleChange('client_email', e.target.value)}
                    placeholder="client@email.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Imported days preview */}
        {importedDays.length > 0 && (
          <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Programme importé ({importedDays.length} jours)
              </h2>
              <button
                type="button"
                onClick={() => {
                  setImportedDays([]);
                  setImportedExtras({});
                }}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Supprimer l'import
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {importedDays.map((day) => (
                <div
                  key={day.day_number}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                    J{day.day_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {day.title || `Jour ${day.day_number}`}
                    </h4>
                    {day.locations && (
                      <p className="text-xs text-gray-500">{day.locations}</p>
                    )}
                    {day.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{day.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {importedExtras.highlights && importedExtras.highlights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <h4 className="text-sm font-medium text-purple-900 mb-2">Points forts</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  {importedExtras.highlights.slice(0, 5).map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            3. Tarification
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                id="currency"
                value={formData.default_currency || 'EUR'}
                onChange={(e) => handleChange('default_currency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollar US</option>
                <option value="GBP">GBP - Livre Sterling</option>
                <option value="CHF">CHF - Franc Suisse</option>
              </select>
            </div>
            <div>
              <label htmlFor="margin" className="block text-sm font-medium text-gray-700 mb-1">
                Marge (%)
              </label>
              <input
                type="number"
                id="margin"
                value={formData.margin_pct || ''}
                onChange={(e) => handleChange('margin_pct', parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={0.5}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="margin_type" className="block text-sm font-medium text-gray-700 mb-1">
                Type de marge
              </label>
              <select
                id="margin_type"
                value={formData.margin_type || 'margin'}
                onChange={(e) => handleChange('margin_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="margin">Marge (sur PV)</option>
                <option value="markup">Markup (sur coût)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error.detail || 'Une erreur est survenue lors de la création'}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/circuits"
            className="px-6 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Créer le circuit
              </>
            )}
          </button>
        </div>
      </form>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Importer avec l'IA</h2>
                  <p className="text-sm text-gray-500">Collez l'URL d'un circuit pour l'importer</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportedData(null);
                  setImportUrl('');
                  setImportError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {!importedData ? (
                <div className="space-y-4">
                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL du circuit source
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="url"
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          placeholder="https://www.dmc-partenaire.com/circuit/thailande"
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={handleImport}
                        disabled={importing || !importUrl}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {importing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        Analyser
                      </button>
                    </div>
                  </div>

                  {importError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {importError}
                    </div>
                  )}

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="font-medium text-purple-900 mb-2">Comment ça marche ?</h3>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>1. Collez l'URL d'un circuit de votre DMC partenaire</li>
                      <li>2. L'IA analyse la page et extrait les informations</li>
                      <li>3. Le contenu est réécrit en 4 tons différents</li>
                      <li>4. Choisissez le ton qui vous convient et créez le circuit</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Extracted info summary */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Circuit extrait</h3>
                    <div className="text-sm text-gray-600">
                      <p><strong>Nom original:</strong> {importedData.extracted.name}</p>
                      <p><strong>Durée:</strong> {importedData.extracted.duration_days} jours</p>
                      <p><strong>Destination:</strong> {importedData.extracted.destination_country || 'Non détectée'}</p>
                      <p><strong>Jours extraits:</strong> {importedData.extracted.days.length}</p>
                    </div>
                  </div>

                  {/* Tone selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Choisissez le ton de réécriture
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {toneOptions.map((tone) => {
                        const isSelected = selectedTone === tone.id;
                        const version = importedData.versions[tone.id];

                        return (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => setSelectedTone(tone.id)}
                            className={`
                              p-4 rounded-xl border-2 text-left transition-all
                              ${isSelected
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-medium ${isSelected ? 'text-purple-700' : 'text-gray-900'}`}>
                                {tone.label}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{tone.description}</p>
                            {version && (
                              <p className="text-sm text-gray-700 line-clamp-2">
                                "{version.rewritten_name}"
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview of selected version */}
                  {importedData.versions[selectedTone] && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">Aperçu</h4>
                      <p className="text-sm text-purple-800 font-medium mb-1">
                        {importedData.versions[selectedTone].rewritten_name}
                      </p>
                      <p className="text-sm text-purple-700 line-clamp-3">
                        {importedData.versions[selectedTone].rewritten_description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              {importedData && (
                <button
                  onClick={() => {
                    setImportedData(null);
                    setImportUrl('');
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nouvelle URL
                </button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportedData(null);
                    setImportUrl('');
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                {importedData && (
                  <button
                    onClick={handleApplyImport}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Appliquer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
