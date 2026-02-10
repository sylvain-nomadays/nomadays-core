/**
 * Utility to format trip day labels and dates in French.
 *
 * Examples:
 *   (1, null, "2025-03-15")  => { dayLabel: "Jour 1", dateLabel: "15 Mars 2025" }
 *   (2, 3, "2025-03-15")    => { dayLabel: "Jours 2 et 3", dateLabel: "16-17 Mars 2025" }
 *   (2, 5, "2025-03-15")    => { dayLabel: "Jours 2 à 5", dateLabel: "16-19 Mars 2025" }
 *   (1, null, null)          => { dayLabel: "Jour 1", dateLabel: null }
 */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFrenchDate(date: Date): string {
  return capitalize(
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  );
}

export function formatTripDayLabel(
  dayNumber: number,
  dayNumberEnd: number | null | undefined,
  startDate: string | null | undefined
): { dayLabel: string; dateLabel: string | null } {
  // Build day label
  let dayLabel: string;
  if (!dayNumberEnd || dayNumberEnd === dayNumber) {
    dayLabel = `Jour ${dayNumber}`;
  } else if (dayNumberEnd === dayNumber + 1) {
    dayLabel = `Jours ${dayNumber} et ${dayNumberEnd}`;
  } else {
    dayLabel = `Jours ${dayNumber} à ${dayNumberEnd}`;
  }

  // Build date label from trip start_date
  let dateLabel: string | null = null;
  if (startDate) {
    const base = new Date(startDate + 'T00:00:00');
    const startDay = new Date(base);
    startDay.setDate(startDay.getDate() + dayNumber - 1);

    if (!dayNumberEnd || dayNumberEnd === dayNumber) {
      // Single day: "15 Mars 2025"
      dateLabel = formatFrenchDate(startDay);
    } else {
      // Range
      const endDay = new Date(base);
      endDay.setDate(endDay.getDate() + dayNumberEnd - 1);

      if (startDay.getMonth() === endDay.getMonth()) {
        // Same month: "16-19 Mars 2025"
        const monthName = capitalize(
          startDay.toLocaleDateString('fr-FR', { month: 'long' })
        );
        dateLabel = `${startDay.getDate()}-${endDay.getDate()} ${monthName} ${startDay.getFullYear()}`;
      } else if (startDay.getFullYear() === endDay.getFullYear()) {
        // Different months, same year: "28 Mars - 2 Avril 2025"
        const startStr = capitalize(
          startDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        );
        dateLabel = `${startStr} - ${formatFrenchDate(endDay)}`;
      } else {
        // Different years: "28 Décembre 2025 - 2 Janvier 2026"
        dateLabel = `${formatFrenchDate(startDay)} - ${formatFrenchDate(endDay)}`;
      }
    }
  }

  return { dayLabel, dateLabel };
}

/**
 * Get the short badge label for a day.
 * Examples: "J1", "J2-3", "J2-5"
 */
export function getDayBadge(dayNumber: number, dayNumberEnd?: number | null): string {
  if (!dayNumberEnd || dayNumberEnd === dayNumber) {
    return `J${dayNumber}`;
  }
  return `J${dayNumber}-${dayNumberEnd}`;
}
