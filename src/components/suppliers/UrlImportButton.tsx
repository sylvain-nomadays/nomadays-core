'use client';

import { useState } from 'react';
import {
  Globe,
  Sparkles,
  Loader2,
  Check,
  X,
  AlertCircle,
  Image as ImageIcon,
  Home,
  Star,
  MapPin,
  Clock,
  Mail,
  Phone,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

interface ExtractedRoomCategory {
  name: string;
  description?: string;
  max_occupancy?: number;
}

interface ExtractedAccommodationData {
  name?: string;
  description?: string;
  star_rating?: number;
  address?: string;
  city?: string;
  country_code?: string;
  check_in_time?: string;
  check_out_time?: string;
  amenities?: string[];
  reservation_email?: string;
  reservation_phone?: string;
  website_url?: string;
  room_categories?: ExtractedRoomCategory[];
  photo_urls?: string[];
  source_url: string;
  extraction_confidence?: number;
  warnings?: string[];
}

interface ImportFromUrlResponse {
  success: boolean;
  data?: ExtractedAccommodationData;
  error?: string;
}

interface UrlImportButtonProps {
  onImport: (data: ExtractedAccommodationData) => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function UrlImportButton({ onImport, disabled = false }: UrlImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedAccommodationData | null>(null);

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Veuillez entrer une URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('URL invalide');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const response = await apiClient.post<ImportFromUrlResponse>(
        '/accommodations/import/from-url',
        { url }
      );

      if (response.success && response.data) {
        setExtractedData(response.data);
      } else {
        setError(response.error || "Impossible d'extraire les données");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'extraction';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onImport(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setUrl('');
    setError(null);
    setExtractedData(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" />
        Importer depuis URL
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Import IA depuis URL
                  </h3>
                  <p className="text-sm text-gray-500">
                    Pré-remplir les informations depuis le site web de l'hôtel
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!extractedData ? (
                /* URL Input Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL du site de l'hébergement
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            setUrl(e.target.value);
                            setError(null);
                          }}
                          placeholder="https://www.hotel-example.com"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          disabled={loading}
                        />
                      </div>
                      <button
                        onClick={handleExtract}
                        disabled={loading || !url.trim()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Extraction...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Extraire
                          </>
                        )}
                      </button>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Comment ça marche ?
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      <li>Collez l'URL du site web de l'hôtel</li>
                      <li>L'IA analyse la page et extrait les informations</li>
                      <li>Vérifiez et confirmez les données extraites</li>
                      <li>Les champs du formulaire sont pré-remplis</li>
                    </ol>
                  </div>
                </div>
              ) : (
                /* Extracted Data Preview */
                <div className="space-y-6">
                  {/* Confidence indicator */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        extractedData.extraction_confidence && extractedData.extraction_confidence >= 0.7
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Confiance:{' '}
                      {extractedData.extraction_confidence
                        ? Math.round(extractedData.extraction_confidence * 100)
                        : 50}
                      %
                    </div>
                    <span className="text-sm text-gray-500">
                      Source: {extractedData.source_url}
                    </span>
                  </div>

                  {/* Warnings */}
                  {extractedData.warnings && extractedData.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-medium mb-1">
                        Avertissements
                      </p>
                      <ul className="text-sm text-amber-700 list-disc list-inside">
                        {extractedData.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Main info */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left column */}
                    <div className="space-y-4">
                      {/* Name & Stars */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">
                              Nom
                            </label>
                            <p className="font-medium text-gray-900 text-lg">
                              {extractedData.name || 'Non trouvé'}
                            </p>
                          </div>
                          {extractedData.star_rating && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: extractedData.star_rating }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-5 h-5 text-amber-400 fill-amber-400"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-wide">
                            Localisation
                          </span>
                        </div>
                        <p className="text-gray-900">
                          {extractedData.address || 'Adresse non trouvée'}
                        </p>
                        {(extractedData.city || extractedData.country_code) && (
                          <p className="text-sm text-gray-600">
                            {[extractedData.city, extractedData.country_code]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Check-in/out */}
                      {(extractedData.check_in_time || extractedData.check_out_time) && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wide">
                              Horaires
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            {extractedData.check_in_time && (
                              <span>Check-in: {extractedData.check_in_time}</span>
                            )}
                            {extractedData.check_out_time && (
                              <span>Check-out: {extractedData.check_out_time}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Contact */}
                      {(extractedData.reservation_email || extractedData.reservation_phone) && (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                            Contact
                          </span>
                          {extractedData.reservation_email && (
                            <div className="flex items-center gap-2 text-gray-900">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {extractedData.reservation_email}
                            </div>
                          )}
                          {extractedData.reservation_phone && (
                            <div className="flex items-center gap-2 text-gray-900">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {extractedData.reservation_phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                      {/* Description */}
                      {extractedData.description && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="text-xs text-gray-500 uppercase tracking-wide">
                            Description
                          </label>
                          <p className="mt-1 text-gray-900 text-sm line-clamp-6">
                            {extractedData.description}
                          </p>
                        </div>
                      )}

                      {/* Amenities */}
                      {extractedData.amenities && extractedData.amenities.length > 0 && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="text-xs text-gray-500 uppercase tracking-wide">
                            Équipements ({extractedData.amenities.length})
                          </label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {extractedData.amenities.slice(0, 10).map((amenity) => (
                              <span
                                key={amenity}
                                className="px-2 py-1 bg-white text-gray-700 text-xs rounded border border-gray-200"
                              >
                                {amenity}
                              </span>
                            ))}
                            {extractedData.amenities.length > 10 && (
                              <span className="px-2 py-1 text-gray-500 text-xs">
                                +{extractedData.amenities.length - 10} autres
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Room categories */}
                      {extractedData.room_categories &&
                        extractedData.room_categories.length > 0 && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="w-4 h-4 text-gray-400" />
                              <label className="text-xs text-gray-500 uppercase tracking-wide">
                                Catégories de chambres ({extractedData.room_categories.length})
                              </label>
                            </div>
                            <div className="space-y-2">
                              {extractedData.room_categories.slice(0, 5).map((room, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-900">{room.name}</span>
                                  {room.max_occupancy && (
                                    <span className="text-gray-500">
                                      max {room.max_occupancy} pers.
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Photos */}
                      {extractedData.photo_urls && extractedData.photo_urls.length > 0 && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            <label className="text-xs text-gray-500 uppercase tracking-wide">
                              Photos trouvées ({extractedData.photo_urls.length})
                            </label>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {extractedData.photo_urls.slice(0, 4).map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Photo ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              {extractedData ? (
                <>
                  <button
                    onClick={() => setExtractedData(null)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                  >
                    Nouvelle extraction
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                    Utiliser ces données
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
