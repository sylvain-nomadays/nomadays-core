/**
 * Countries constants - shared across the application
 */

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
}

// Common destination countries
export const COUNTRIES: Country[] = [
  { code: 'TH', name: 'Thaïlande', flag: '🇹🇭', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND' },
  { code: 'JP', name: 'Japon', flag: '🇯🇵', currency: 'JPY' },
  { code: 'ID', name: 'Indonésie', flag: '🇮🇩', currency: 'IDR' },
  { code: 'MY', name: 'Malaisie', flag: '🇲🇾', currency: 'MYR' },
  { code: 'KH', name: 'Cambodge', flag: '🇰🇭', currency: 'KHR' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', currency: 'LAK' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', currency: 'MMK' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳', currency: 'CNY' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳', currency: 'INR' },
  { code: 'NP', name: 'Népal', flag: '🇳🇵', currency: 'NPR' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', currency: 'MAD' },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬', currency: 'EGP' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', currency: 'TZS' },
  { code: 'MX', name: 'Mexique', flag: '🇲🇽', currency: 'MXN' },
  { code: 'PE', name: 'Pérou', flag: '🇵🇪', currency: 'PEN' },
  { code: 'BR', name: 'Brésil', flag: '🇧🇷', currency: 'BRL' },
  { code: 'AR', name: 'Argentine', flag: '🇦🇷', currency: 'ARS' },
  { code: 'CL', name: 'Chili', flag: '🇨🇱', currency: 'CLP' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', currency: 'CRC' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', currency: 'CUP' },
  { code: 'AE', name: 'Émirats Arabes Unis', flag: '🇦🇪', currency: 'AED' },
  { code: 'TR', name: 'Turquie', flag: '🇹🇷', currency: 'TRY' },
  { code: 'GR', name: 'Grèce', flag: '🇬🇷', currency: 'EUR' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', currency: 'EUR' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
];

// Get country by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

// Get country flag by code
export function getCountryFlag(code: string): string {
  return getCountryByCode(code)?.flag || '🌍';
}

// Get country name by code
export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name || code;
}

// Get currency by country code
export function getCurrencyByCountry(code: string): string {
  return getCountryByCode(code)?.currency || 'EUR';
}

// Country flags lookup (for backward compatibility)
export const countryFlags: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.code, c.flag])
);
