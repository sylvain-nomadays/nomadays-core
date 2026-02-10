/**
 * Shared Google Maps script loader.
 *
 * Ensures the Google Maps JS SDK is loaded exactly once across
 * all components that need it (GooglePlacesAutocomplete, TransportBlock, etc.).
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let googleMapsPromise: Promise<void> | null = null;

/**
 * Load the Google Maps JavaScript SDK if not already loaded.
 * Returns a promise that resolves when `window.google.maps.places` is available.
 * Safe to call multiple times — the script is only loaded once.
 */
export function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    return Promise.reject(new Error('API key not configured'));
  }

  // Check if already loaded
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/** Whether a Google Maps API key is configured */
export function isGoogleMapsConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY;
}
