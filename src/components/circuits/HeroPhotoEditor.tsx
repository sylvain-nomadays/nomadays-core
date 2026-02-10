'use client';

import { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Upload, Loader2, Sparkles } from 'lucide-react';
import OptimizedImage from '@/components/common/OptimizedImage';
import { useUploadTripPhoto, useRegenerateTripPhoto } from '@/hooks/useTrips';
import type { TripPhoto } from '@/lib/api/types';

interface HeroPhotoEditorProps {
  tripId: number;
  heroPhoto?: TripPhoto | null;
  destinationCountry?: string;
  descriptionShort?: string;
  onPhotoChanged: () => void;
  className?: string;
}

export function HeroPhotoEditor({
  tripId,
  heroPhoto,
  destinationCountry,
  descriptionShort,
  onPhotoChanged,
  className = '',
}: HeroPhotoEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadPhoto, loading: uploading } = useUploadTripPhoto();
  const { mutate: regeneratePhoto, loading: generating } = useRegenerateTripPhoto();
  const [error, setError] = useState<string | null>(null);

  const isLoading = uploading || generating;

  const handleUpload = async (file: File) => {
    setError(null);
    try {
      await uploadPhoto({
        tripId,
        file,
        isHero: true,
        altText: descriptionShort ? descriptionShort.slice(0, 120) : undefined,
      });
      onPhotoChanged();
    } catch (err) {
      setError('Erreur lors de l\'upload');
      console.error('Hero upload error:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      e.target.value = '';
    }
  };

  const handleGenerateAI = async () => {
    if (!heroPhoto) {
      // No existing hero — we need to upload a placeholder first, or use a different approach
      // For now, use the upload endpoint to create the hero, then the user can regenerate
      setError('Uploadez d\'abord une photo, puis utilisez Regénérer pour la remplacer par l\'IA');
      return;
    }

    setError(null);
    try {
      // Build a prompt from the circuit's description
      const prompt = descriptionShort
        ? `Photorealistic hero banner image for a travel circuit: ${descriptionShort.slice(0, 300)}, stunning landscape, travel magazine cover quality, National Geographic style, 16:9 cinematic composition, golden hour lighting`
        : `Photorealistic travel destination landscape, stunning panoramic view, ${destinationCountry || 'Asia'}, travel magazine cover quality, National Geographic style, 16:9 cinematic composition, golden hour lighting`;

      await regeneratePhoto({
        tripId,
        photoId: heroPhoto.id,
        prompt,
        quality: 'high',
      });
      onPhotoChanged();
    } catch (err) {
      setError('Erreur lors de la génération');
      console.error('Hero generation error:', err);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Title */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <ImagePlus className="w-4 h-4 text-emerald-600" />
          Photo principale du circuit
        </h3>
        {heroPhoto && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Upload className="w-3 h-3" />
              Changer
            </button>
            <button
              onClick={handleGenerateAI}
              disabled={isLoading}
              className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Regénérer IA
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {heroPhoto ? (
        /* Hero photo display */
        <div className="relative aspect-[16/9]">
          <OptimizedImage
            tripPhoto={heroPhoto}
            alt={heroPhoto.alt_text || 'Photo principale du circuit'}
            className="w-full h-full"
            imageClassName="w-full h-full"
            sizeHint="hero"
            objectFit="cover"
            showPlaceholder={true}
            priority={true}
          />
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{uploading ? 'Upload en cours...' : 'Génération IA en cours...'}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Placeholder / dropzone */
        <div
          className="aspect-[16/9] flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 m-4 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Upload en cours...</span>
            </div>
          ) : (
            <>
              <ImagePlus className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-1">Cliquez pour uploader une photo hero</p>
              <p className="text-xs text-gray-400">Format 16:9 recommandé — JPEG, PNG, WebP (max 10MB)</p>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
