/**
 * Default hero photos per country code (ISO 3166-1 alpha-2).
 *
 * Uses Unsplash Source URLs which are free for production use.
 * Each URL includes `w=800&q=80` for optimised delivery.
 *
 * These serve as fallback when a dossier/trip has no uploaded hero photo.
 * A continent-level fallback is provided for countries not in the map.
 */

// ─── Per-country photos ─────────────────────────────────────────────────────

const COUNTRY_PHOTOS: Record<string, string> = {
  // Asie
  TH: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80', // Temples de Bangkok
  VN: 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=800&q=80', // Baie d'Ha Long
  KH: 'https://images.unsplash.com/photo-1569428034239-f9565e32e224?w=800&q=80', // Angkor Wat
  LA: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80', // Luang Prabang
  MM: 'https://images.unsplash.com/photo-1540611025311-01df3cef54b5?w=800&q=80', // Bagan pagodas
  JP: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80', // Mont Fuji
  CN: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80', // Grande Muraille
  ID: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', // Bali rizières
  IN: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80', // Taj Mahal
  LK: 'https://images.unsplash.com/photo-1586523969233-be0ea0a82654?w=800&q=80', // Sri Lanka train
  NP: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80', // Himalaya
  PH: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80', // Philippines plage
  MY: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80', // Petronas Towers
  SG: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80', // Marina Bay
  KR: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80', // Séoul
  MN: 'https://images.unsplash.com/photo-1596395463872-2e8f5d3c4c7b?w=800&q=80', // Steppes mongoles
  UZ: 'https://images.unsplash.com/photo-1575986767340-5d17ae767ab0?w=800&q=80', // Registan Samarkand
  TR: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80', // Cappadoce
  JO: 'https://images.unsplash.com/photo-1580834341580-8c17a3a630ca?w=800&q=80', // Pétra
  AE: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80', // Dubai
  IL: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80', // Jérusalem
  OM: 'https://images.unsplash.com/photo-1597020642626-3c9b687eba70?w=800&q=80', // Oman
  GE: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80', // Géorgie
  MV: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80', // Maldives
  BT: 'https://images.unsplash.com/photo-1553856622-d1b352e24a4c?w=800&q=80', // Bhoutan
  TW: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80', // Taipei

  // Afrique
  MA: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80', // Marrakech
  TZ: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80', // Kilimandjaro
  KE: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80', // Safari Kenya
  ZA: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80', // Le Cap
  ET: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800&q=80', // Lalibela
  MG: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=800&q=80', // Baobabs
  NA: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', // Sossusvlei
  MZ: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&q=80', // Mozambique plage
  BW: 'https://images.unsplash.com/photo-1527430253228-e93688616381?w=800&q=80', // Delta Okavango
  UG: 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&q=80', // Gorilles Ouganda
  RW: 'https://images.unsplash.com/photo-1580746738099-78d6833aba81?w=800&q=80', // Rwanda collines
  ZW: 'https://images.unsplash.com/photo-1568127861898-a1640a8fc60c?w=800&q=80', // Victoria Falls
  SN: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80', // Sénégal
  EG: 'https://images.unsplash.com/photo-1539768942893-daf53e736b68?w=800&q=80', // Pyramides
  TN: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80', // Tunisie
  MU: 'https://images.unsplash.com/photo-1583685188601-0d0f1e0c1e0a?w=800&q=80', // Ile Maurice
  SC: 'https://images.unsplash.com/photo-1589979481223-deb893043163?w=800&q=80', // Seychelles

  // Amérique latine
  MX: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80', // Chichen Itza
  PE: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80', // Machu Picchu
  CO: 'https://images.unsplash.com/photo-1533050487297-09b450131914?w=800&q=80', // Cartagena
  CR: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=800&q=80', // Costa Rica jungle
  AR: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80', // Patagonie
  CL: 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&q=80', // Torres del Paine
  BR: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80', // Rio de Janeiro
  BO: 'https://images.unsplash.com/photo-1545063914-a1a6ec29cea6?w=800&q=80', // Salar d'Uyuni
  EC: 'https://images.unsplash.com/photo-1575408264798-b50b252663e6?w=800&q=80', // Galápagos
  GT: 'https://images.unsplash.com/photo-1582040249021-2afef8ed4ca2?w=800&q=80', // Guatemala
  CU: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=800&q=80', // La Havane

  // Europe
  FR: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80', // Paris
  IT: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80', // Venise
  ES: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80', // Espagne
  PT: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80', // Lisbonne
  GR: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80', // Santorin
  HR: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80', // Dubrovnik
  IS: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80', // Islande
  NO: 'https://images.unsplash.com/photo-1507272931001-fc06c17e4f43?w=800&q=80', // Fjords
  GB: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80', // Londres
  DE: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80', // Neuschwanstein

  // Océanie
  AU: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80', // Sydney Opera
  NZ: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80', // Milford Sound
  FJ: 'https://images.unsplash.com/photo-1530538095376-a4936b35b5f0?w=800&q=80', // Fidji
  PF: 'https://images.unsplash.com/photo-1589179899083-fa6b3cfd4f95?w=800&q=80', // Bora Bora
  NC: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80', // Nouvelle-Calédonie
}

// ─── Continent fallback photos ──────────────────────────────────────────────

const CONTINENT_FALLBACK_PHOTOS: Record<string, string> = {
  asia: 'https://images.unsplash.com/photo-1464817739973-0128fe77aed1?w=800&q=80',
  africa: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80',
  'latin-america': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80',
  europe: 'https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=800&q=80',
  oceania: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80',
}

// ─── Country → Continent mapping (imported separately for photo fallback) ───

const PHOTO_COUNTRY_CONTINENT: Record<string, string> = {
  TH: 'asia', VN: 'asia', KH: 'asia', LA: 'asia', MM: 'asia',
  JP: 'asia', CN: 'asia', ID: 'asia', IN: 'asia', LK: 'asia',
  NP: 'asia', PH: 'asia', MY: 'asia', SG: 'asia', KR: 'asia',
  MN: 'asia', UZ: 'asia', TR: 'asia', JO: 'asia', AE: 'asia',
  IL: 'asia', OM: 'asia', GE: 'asia', MV: 'asia', BT: 'asia',
  TW: 'asia', BD: 'asia', PK: 'asia', AF: 'asia', IR: 'asia',
  IQ: 'asia', LB: 'asia', QA: 'asia', BH: 'asia', KW: 'asia',
  SA: 'asia', YE: 'asia', AM: 'asia', AZ: 'asia', KG: 'asia',
  KZ: 'asia', TJ: 'asia', BN: 'asia', TL: 'asia', HK: 'asia',
  MO: 'asia',

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

  MX: 'latin-america', PE: 'latin-america', CO: 'latin-america', CR: 'latin-america',
  AR: 'latin-america', CL: 'latin-america', BR: 'latin-america', BO: 'latin-america',
  EC: 'latin-america', GT: 'latin-america', CU: 'latin-america', PA: 'latin-america',
  HN: 'latin-america', NI: 'latin-america', SV: 'latin-america', BZ: 'latin-america',
  PY: 'latin-america', UY: 'latin-america', VE: 'latin-america', GY: 'latin-america',
  SR: 'latin-america', GF: 'latin-america', HT: 'latin-america', DO: 'latin-america',
  JM: 'latin-america', TT: 'latin-america', BB: 'latin-america', PR: 'latin-america',

  FR: 'europe', IT: 'europe', ES: 'europe', PT: 'europe', GR: 'europe',
  HR: 'europe', IS: 'europe', NO: 'europe', SE: 'europe', IE: 'europe',
  GB: 'europe', DE: 'europe', AT: 'europe', CH: 'europe', BE: 'europe',
  NL: 'europe', LU: 'europe', DK: 'europe', FI: 'europe', PL: 'europe',
  CZ: 'europe', SK: 'europe', HU: 'europe', RO: 'europe', BG: 'europe',
  RS: 'europe', ME: 'europe', BA: 'europe', MK: 'europe', AL: 'europe',
  SI: 'europe', EE: 'europe', LV: 'europe', LT: 'europe', MT: 'europe',
  CY: 'europe', RU: 'europe', UA: 'europe', BY: 'europe', MD: 'europe',

  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', PF: 'oceania', NC: 'oceania',
  PG: 'oceania', WS: 'oceania', TO: 'oceania', VU: 'oceania', SB: 'oceania',
  CK: 'oceania', NU: 'oceania', TV: 'oceania', NR: 'oceania', KI: 'oceania',
  MH: 'oceania', FM: 'oceania', PW: 'oceania',
}

// ─── Exported helper ────────────────────────────────────────────────────────

/**
 * Get a default hero photo URL for a given country code.
 *
 * Priority:
 * 1. Per-country Unsplash photo
 * 2. Continent-level fallback photo
 * 3. null (caller should use gradient fallback)
 */
export function getCountryDefaultPhoto(countryCode?: string | null): string | null {
  if (!countryCode) return null
  const code = countryCode.toUpperCase()

  // Direct country match
  if (COUNTRY_PHOTOS[code]) return COUNTRY_PHOTOS[code]

  // Continent fallback
  const continent = PHOTO_COUNTRY_CONTINENT[code]
  if (continent && CONTINENT_FALLBACK_PHOTOS[continent]) {
    return CONTINENT_FALLBACK_PHOTOS[continent]
  }

  return null
}
