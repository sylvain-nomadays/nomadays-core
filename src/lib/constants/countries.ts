/**
 * Countries constants - shared across the application
 * Sorted alphabetically by French name
 */

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
}

export const COUNTRIES: Country[] = [
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', currency: 'EUR' },
  { code: 'AR', name: 'Argentine', flag: '🇦🇷', currency: 'ARS' },
  { code: 'AU', name: 'Australie', flag: '🇦🇺', currency: 'AUD' },
  { code: 'AT', name: 'Autriche', flag: '🇦🇹', currency: 'EUR' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', currency: 'EUR' },
  { code: 'BR', name: 'Brésil', flag: '🇧🇷', currency: 'BRL' },
  { code: 'KH', name: 'Cambodge', flag: '🇰🇭', currency: 'KHR' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'CL', name: 'Chili', flag: '🇨🇱', currency: 'CLP' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳', currency: 'CNY' },
  { code: 'CO', name: 'Colombie', flag: '🇨🇴', currency: 'COP' },
  { code: 'KR', name: 'Corée du Sud', flag: '🇰🇷', currency: 'KRW' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', currency: 'CRC' },
  { code: 'HR', name: 'Croatie', flag: '🇭🇷', currency: 'EUR' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', currency: 'CUP' },
  { code: 'DK', name: 'Danemark', flag: '🇩🇰', currency: 'DKK' },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬', currency: 'EGP' },
  { code: 'AE', name: 'Émirats Arabes Unis', flag: '🇦🇪', currency: 'AED' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', currency: 'EUR' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', currency: 'USD' },
  { code: 'FI', name: 'Finlande', flag: '🇫🇮', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'GR', name: 'Grèce', flag: '🇬🇷', currency: 'EUR' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD' },
  { code: 'HU', name: 'Hongrie', flag: '🇭🇺', currency: 'HUF' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳', currency: 'INR' },
  { code: 'ID', name: 'Indonésie', flag: '🇮🇩', currency: 'IDR' },
  { code: 'IE', name: 'Irlande', flag: '🇮🇪', currency: 'EUR' },
  { code: 'IL', name: 'Israël', flag: '🇮🇱', currency: 'ILS' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', currency: 'EUR' },
  { code: 'JP', name: 'Japon', flag: '🇯🇵', currency: 'JPY' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', currency: 'LAK' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', currency: 'EUR' },
  { code: 'MY', name: 'Malaisie', flag: '🇲🇾', currency: 'MYR' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', currency: 'MAD' },
  { code: 'MX', name: 'Mexique', flag: '🇲🇽', currency: 'MXN' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', currency: 'MMK' },
  { code: 'NP', name: 'Népal', flag: '🇳🇵', currency: 'NPR' },
  { code: 'NO', name: 'Norvège', flag: '🇳🇴', currency: 'NOK' },
  { code: 'NZ', name: 'Nouvelle-Zélande', flag: '🇳🇿', currency: 'NZD' },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', currency: 'EUR' },
  { code: 'PE', name: 'Pérou', flag: '🇵🇪', currency: 'PEN' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
  { code: 'PL', name: 'Pologne', flag: '🇵🇱', currency: 'PLN' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  { code: 'CZ', name: 'République Tchèque', flag: '🇨🇿', currency: 'CZK' },
  { code: 'RO', name: 'Roumanie', flag: '🇷🇴', currency: 'RON' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP' },
  { code: 'RU', name: 'Russie', flag: '🇷🇺', currency: 'RUB' },
  { code: 'SG', name: 'Singapour', flag: '🇸🇬', currency: 'SGD' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR' },
  { code: 'SE', name: 'Suède', flag: '🇸🇪', currency: 'SEK' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', currency: 'CHF' },
  { code: 'TW', name: 'Taïwan', flag: '🇹🇼', currency: 'TWD' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', currency: 'TZS' },
  { code: 'TH', name: 'Thaïlande', flag: '🇹🇭', currency: 'THB' },
  { code: 'TR', name: 'Turquie', flag: '🇹🇷', currency: 'TRY' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', currency: 'UAH' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND' },
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
