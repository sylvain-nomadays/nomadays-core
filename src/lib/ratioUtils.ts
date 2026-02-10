/**
 * Maps a UI-level ratio rule (per_person, per_room, per_vehicle, per_group)
 * to the backend fields (ratio_type, ratio_per, ratio_categories).
 *
 * @param rule - The ratio rule from ItemEditor (per_person | per_room | per_vehicle | per_group)
 * @param ratioPer - How many units per 1 item (e.g., 12 = 1 guide per 12 pax). Defaults to 1.
 * @param ratioCategories - Comma-separated pax category codes (e.g. "adult,teen,child"). Only used for per_person.
 */
export function mapRatioRule(rule?: string, ratioPer?: number, ratioCategories?: string) {
  const per = ratioPer ?? 1;
  switch (rule) {
    case 'per_person':
      return { ratio_type: 'ratio' as const, ratio_per: per, ratio_categories: ratioCategories || 'adult' };
    case 'per_room':
      return { ratio_type: 'ratio' as const, ratio_per: per, ratio_categories: 'room' };
    case 'per_vehicle':
      return { ratio_type: 'ratio' as const, ratio_per: per, ratio_categories: 'vehicle' };
    case 'per_group':
      return { ratio_type: 'set' as const, ratio_per: 1, ratio_categories: ratioCategories || 'adult' };
    default:
      return { ratio_type: 'set' as const, ratio_per: 1, ratio_categories: 'adult' };
  }
}
