/**
 * Continent color theming for the traveler space.
 *
 * Maps 2-letter ISO country codes to continents, then to color palettes.
 * Used throughout the client area to give each destination its own visual identity.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Continent = 'asia' | 'africa' | 'latin-america' | 'europe' | 'oceania' | 'default';

export interface ContinentTheme {
  continent: Continent;
  primary: string;
  accent: string;
  light: string;
  gradient: string;
  label: string;
}

// ─── Palettes ────────────────────────────────────────────────────────────────

export const CONTINENT_THEMES: Record<Continent, Omit<ContinentTheme, 'continent'>> = {
  asia: {
    primary: '#D4A020',      // Safran doux — or, temples, lanternes
    accent: '#E8C55A',       // Safran clair
    light: '#FDF8E8',        // Fond safran très pâle
    gradient: 'from-[#D4A020] to-[#E8C55A]',
    label: 'Asie',
  },
  africa: {
    primary: '#6B8E4E',      // Vert savane — nature, savane, forêts
    accent: '#8AAF6A',       // Vert savane clair
    light: '#F4F8F0',        // Fond vert très pâle
    gradient: 'from-[#6B8E4E] to-[#8AAF6A]',
    label: 'Afrique',
  },
  'latin-america': {
    primary: '#B85C3B',      // Rouge adobe — terre, chaleur, adobe
    accent: '#D4845E',       // Adobe clair / terracotta
    light: '#FDF5F0',        // Fond adobe très pâle
    gradient: 'from-[#B85C3B] to-[#D4845E]',
    label: 'Amérique latine',
  },
  europe: {
    primary: '#1B7F8E',      // Bleu ardoise — mer, pierre, ardoise
    accent: '#4DA8B5',       // Ardoise clair
    light: '#EFF8FA',        // Fond bleu très pâle
    gradient: 'from-[#1B7F8E] to-[#4DA8B5]',
    label: 'Europe',
  },
  oceania: {
    primary: '#1A9E9E',      // Bleu lagon profond — lagon, récif, eaux
    accent: '#4DC4C4',       // Lagon clair
    light: '#EEF9F9',        // Fond lagon très pâle
    gradient: 'from-[#1A9E9E] to-[#4DC4C4]',
    label: 'Océanie',
  },
  default: {
    primary: '#0FB6BC',      // Turquoise Nomadays (identité marque)
    accent: '#DD9371',       // Terracotta Nomadays
    light: '#F0FAFA',
    gradient: 'from-[#0FB6BC] to-[#DD9371]',
    label: 'Voyage',
  },
};

// ─── Country → Continent mapping ─────────────────────────────────────────────

const COUNTRY_CONTINENT_MAP: Record<string, Continent> = {
  // Asie
  TH: 'asia', VN: 'asia', KH: 'asia', LA: 'asia', MM: 'asia',
  JP: 'asia', CN: 'asia', ID: 'asia', IN: 'asia', LK: 'asia',
  NP: 'asia', PH: 'asia', MY: 'asia', SG: 'asia', KR: 'asia',
  MN: 'asia', UZ: 'asia', KZ: 'asia', KG: 'asia', TJ: 'asia',
  TW: 'asia', HK: 'asia', MO: 'asia', BN: 'asia', TL: 'asia',
  MV: 'asia', BT: 'asia', BD: 'asia', PK: 'asia', AF: 'asia',
  IR: 'asia', IQ: 'asia', JO: 'asia', IL: 'asia', LB: 'asia',
  OM: 'asia', AE: 'asia', QA: 'asia', BH: 'asia', KW: 'asia',
  SA: 'asia', YE: 'asia', GE: 'asia', AM: 'asia', AZ: 'asia',
  TR: 'asia',

  // Afrique
  MA: 'africa', TZ: 'africa', KE: 'africa', ZA: 'africa', ET: 'africa',
  MG: 'africa', NA: 'africa', MZ: 'africa', BW: 'africa', UG: 'africa',
  RW: 'africa', ZW: 'africa', ZM: 'africa', SN: 'africa', GH: 'africa',
  CI: 'africa', CM: 'africa', NG: 'africa', EG: 'africa', TN: 'africa',
  DZ: 'africa', MU: 'africa', SC: 'africa', CV: 'africa', BJ: 'africa',
  ML: 'africa', BF: 'africa', NE: 'africa', TD: 'africa', CG: 'africa',
  CD: 'africa', AO: 'africa', GA: 'africa', GQ: 'africa', ST: 'africa',
  GM: 'africa', GW: 'africa', GN: 'africa', SL: 'africa', LR: 'africa',
  TG: 'africa', ER: 'africa', DJ: 'africa', SO: 'africa', KM: 'africa',
  LS: 'africa', SZ: 'africa', MW: 'africa', SS: 'africa', CF: 'africa',
  LY: 'africa', SD: 'africa', MR: 'africa',

  // Amérique latine
  MX: 'latin-america', PE: 'latin-america', CO: 'latin-america', CR: 'latin-america',
  AR: 'latin-america', CL: 'latin-america', BR: 'latin-america', BO: 'latin-america',
  EC: 'latin-america', GT: 'latin-america', CU: 'latin-america', PA: 'latin-america',
  HN: 'latin-america', NI: 'latin-america', SV: 'latin-america', BZ: 'latin-america',
  PY: 'latin-america', UY: 'latin-america', VE: 'latin-america', GY: 'latin-america',
  SR: 'latin-america', GF: 'latin-america', HT: 'latin-america', DO: 'latin-america',
  JM: 'latin-america', TT: 'latin-america', BB: 'latin-america', PR: 'latin-america',

  // Europe
  FR: 'europe', IT: 'europe', ES: 'europe', PT: 'europe', GR: 'europe',
  HR: 'europe', IS: 'europe', NO: 'europe', SE: 'europe', IE: 'europe',
  GB: 'europe', DE: 'europe', AT: 'europe', CH: 'europe', BE: 'europe',
  NL: 'europe', LU: 'europe', DK: 'europe', FI: 'europe', PL: 'europe',
  CZ: 'europe', SK: 'europe', HU: 'europe', RO: 'europe', BG: 'europe',
  RS: 'europe', ME: 'europe', BA: 'europe', MK: 'europe', AL: 'europe',
  SI: 'europe', EE: 'europe', LV: 'europe', LT: 'europe', MT: 'europe',
  CY: 'europe', RU: 'europe', UA: 'europe', BY: 'europe', MD: 'europe',

  // Océanie
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', PF: 'oceania', NC: 'oceania',
  PG: 'oceania', WS: 'oceania', TO: 'oceania', VU: 'oceania', SB: 'oceania',
  CK: 'oceania', NU: 'oceania', TV: 'oceania', NR: 'oceania', KI: 'oceania',
  MH: 'oceania', FM: 'oceania', PW: 'oceania',
};

// ─── Exported helper ─────────────────────────────────────────────────────────

/**
 * Get the continent theme for a given 2-letter ISO country code.
 * Falls back to the default Nomadays turquoise/terracotta theme.
 */
export function getContinentTheme(countryCode?: string | null): ContinentTheme {
  const continent: Continent = countryCode
    ? COUNTRY_CONTINENT_MAP[countryCode.toUpperCase()] ?? 'default'
    : 'default';

  return {
    continent,
    ...CONTINENT_THEMES[continent],
  };
}

/**
 * Get a CSS style object with continent theme CSS custom properties.
 * Useful for passing to a root container `style` prop.
 */
export function getContinentCssVars(theme: ContinentTheme): React.CSSProperties {
  return {
    '--continent-primary': theme.primary,
    '--continent-accent': theme.accent,
    '--continent-light': theme.light,
  } as React.CSSProperties;
}
