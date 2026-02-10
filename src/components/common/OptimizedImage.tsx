'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import type { AccommodationPhoto, TripPhoto, SrcsetEntry } from '@/lib/api/types';

// ============================================================================
// Types
// ============================================================================

interface OptimizedImageProps {
  /** AccommodationPhoto object with all URL variants */
  photo?: AccommodationPhoto;

  /** TripPhoto object with srcset and SEO variants */
  tripPhoto?: TripPhoto;

  /** Fallback URL if no photo object */
  src?: string;

  /** Alternative text for accessibility */
  alt: string;

  /** CSS class for the container */
  className?: string;

  /** CSS class for the image */
  imageClassName?: string;

  /** Width of the container (for aspect ratio) */
  width?: number;

  /** Height of the container (for aspect ratio) */
  height?: number;

  /** Whether to use lazy loading */
  lazy?: boolean;

  /** Image size hint: determines which variant to prefer */
  sizeHint?: 'thumbnail' | 'small' | 'medium' | 'large' | 'hero' | 'full';

  /** Object-fit for the image */
  objectFit?: CSSProperties['objectFit'];

  /** Object-position for the image */
  objectPosition?: CSSProperties['objectPosition'];

  /** Called when image finishes loading */
  onLoad?: () => void;

  /** Called on error */
  onError?: () => void;

  /** Show placeholder while loading (blur effect) */
  showPlaceholder?: boolean;

  /** Priority loading (for above-the-fold images) */
  priority?: boolean;

  /**
   * Custom sizes attribute for responsive images.
   * Default: "(max-width: 480px) 400px, (max-width: 768px) 800px, (max-width: 1200px) 1200px, 1920px"
   */
  sizes?: string;
}

// Default responsive sizes
const DEFAULT_SIZES = '(max-width: 480px) 400px, (max-width: 768px) 800px, (max-width: 1200px) 1200px, 1920px';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a srcset string from SrcsetEntry array for a specific format.
 */
function buildSrcSet(entries: SrcsetEntry[], format: 'avif' | 'webp'): string | undefined {
  const filtered = entries.filter((e) => e.format === format);
  if (filtered.length === 0) return undefined;
  return filtered.map((e) => `${e.url} ${e.width}w`).join(', ');
}

/**
 * Parse srcset_json (could be string from AccommodationPhoto or array from TripPhoto).
 */
function parseSrcsetJson(json: string | SrcsetEntry[] | undefined | null): SrcsetEntry[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  try {
    return JSON.parse(json) as SrcsetEntry[];
  } catch {
    return [];
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * OptimizedImage — Composant image responsive avec support complet.
 *
 * Features:
 * - <picture> avec fallback AVIF > WebP > img
 * - srcset complet avec sizes responsive
 * - LQIP blur-up loading effect
 * - Lazy loading natif (loading="lazy")
 * - Supporte AccommodationPhoto, TripPhoto, ou simple URL
 */
export default function OptimizedImage({
  photo,
  tripPhoto,
  src,
  alt,
  className = '',
  imageClassName = '',
  width,
  height,
  lazy = true,
  sizeHint = 'medium',
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  showPlaceholder = true,
  priority = false,
  sizes = DEFAULT_SIZES,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // TripPhoto takes priority over AccommodationPhoto
  const source = tripPhoto || photo;

  // Extract srcset entries from either source
  const srcsetEntries = parseSrcsetJson(
    tripPhoto?.srcset_json || photo?.srcset_json
  );

  // Build srcsets per format
  const avifSrcset = buildSrcSet(srcsetEntries, 'avif');
  const webpSrcset = buildSrcSet(srcsetEntries, 'webp');

  // Determine all available URLs
  const urls = {
    avif: source?.url_avif || null,
    webp: source?.url_webp || null,
    hero: (source as TripPhoto)?.url_hero || null,
    large: source?.url_large || null,
    medium: source?.url_medium || null,
    thumbnail: source?.thumbnail_url || null,
    original: source?.url || src || null,
    lqip: source?.lqip_data_url || null,
  };

  // Select best URL based on size hint
  const getPreferredUrl = (): string | null => {
    switch (sizeHint) {
      case 'thumbnail':
        return urls.thumbnail || urls.original;
      case 'small':
        return urls.thumbnail || urls.medium || urls.original;
      case 'medium':
        return urls.medium || urls.original;
      case 'large':
        return urls.large || urls.original;
      case 'hero':
        return urls.hero || urls.large || urls.original;
      case 'full':
      default:
        return urls.original;
    }
  };

  const preferredUrl = getPreferredUrl();

  // Use width/height from source if not provided
  const imgWidth = width || source?.width;
  const imgHeight = height || source?.height;

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Check if image is already cached
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth) {
      setIsLoaded(true);
    }
  }, [preferredUrl]);

  // Container style for aspect ratio
  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(imgWidth && imgHeight ? { aspectRatio: `${imgWidth} / ${imgHeight}` } : {}),
  };

  // Image style
  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  };

  // Placeholder style (LQIP blur)
  const placeholderStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
    filter: 'blur(20px)',
    transform: 'scale(1.1)',
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 0 : 1,
  };

  if (!preferredUrl) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <span className="text-gray-400 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {/* LQIP Placeholder — tiny blurred image shown instantly */}
      {showPlaceholder && urls.lqip && !isLoaded && (
        <img
          src={urls.lqip}
          alt=""
          aria-hidden="true"
          style={placeholderStyle}
        />
      )}

      {/* Main Picture Element — AVIF > WebP > fallback */}
      <picture>
        {/* AVIF source with full srcset (best compression) */}
        {(avifSrcset || urls.avif) && (
          <source
            type="image/avif"
            srcSet={avifSrcset || urls.avif || undefined}
            sizes={avifSrcset ? sizes : undefined}
          />
        )}

        {/* WebP source with full srcset (good fallback) */}
        {(webpSrcset || urls.webp) && (
          <source
            type="image/webp"
            srcSet={webpSrcset || urls.webp || undefined}
            sizes={webpSrcset ? sizes : undefined}
          />
        )}

        {/* Fallback img */}
        <img
          ref={imgRef}
          src={preferredUrl}
          alt={alt}
          className={imageClassName}
          style={imgStyle}
          loading={priority ? 'eager' : (lazy ? 'lazy' : undefined)}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          onError={handleError}
          width={imgWidth}
          height={imgHeight}
        />
      </picture>
    </div>
  );
}


// ============================================================================
// Utility: Generate srcSet string from photo data
// ============================================================================

/**
 * Generate a srcset string from a photo's srcset_json.
 * Works with both AccommodationPhoto and TripPhoto.
 */
export function generateSrcSet(
  photo: AccommodationPhoto | TripPhoto,
  format: 'avif' | 'webp' = 'avif'
): string | undefined {
  const entries = parseSrcsetJson(photo.srcset_json as SrcsetEntry[] | string | undefined);
  if (entries.length === 0) return undefined;

  return entries
    .filter((e) => e.format === format)
    .map((e) => `${e.url} ${e.width}w`)
    .join(', ');
}


// ============================================================================
// Wrapper: Simple image with optimization
// ============================================================================

interface SimpleOptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  priority?: boolean;
}

/**
 * Simple optimized image component for URLs without full photo metadata.
 * Falls back to standard img with lazy loading.
 */
export function SimpleOptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  priority = false,
}: SimpleOptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={priority ? 'eager' : (lazy ? 'lazy' : undefined)}
      decoding={priority ? 'sync' : 'async'}
    />
  );
}
