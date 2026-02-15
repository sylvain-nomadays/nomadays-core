// ─── Shared constants for participant forms (admin + client) ─────────────────

import type { Civility } from '@/lib/actions/participants'

export const CIVILITIES: { value: Civility | ''; label: string }[] = [
  { value: 'mr', label: 'M.' },
  { value: 'mrs', label: 'Mme' },
  { value: 'mx', label: 'Mx' },
  { value: 'dr', label: 'Dr' },
  { value: 'other', label: 'Autre' },
]

export const DIETARY_OPTIONS = [
  { value: '', label: 'Standard' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végan' },
  { value: 'gluten_free', label: 'Sans gluten' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Casher' },
  { value: 'other', label: 'Autre' },
]

export const COMMON_ALLERGIES = [
  'Arachides', 'Fruits à coque', 'Lait', 'Œufs', 'Poisson',
  'Crustacés', 'Soja', 'Gluten', 'Sésame',
]

/**
 * Extract the list of allergies from the medical_notes field.
 * Convention: first line is "Allergies: item1, item2, ..."
 */
export function extractAllergies(medicalNotes: string | null | undefined): string[] {
  if (!medicalNotes) return []
  const match = medicalNotes.match(/^Allergies:\s*(.+?)(?:\n|$)/)
  if (match && match[1]) {
    return match[1].split(',').map(a => a.trim()).filter(Boolean)
  }
  return []
}

/**
 * Build the medical_notes string from structured allergy + other notes.
 * Returns undefined if everything is empty (to clear the field).
 */
export function buildMedicalNotes(
  allergies: string[],
  allergyOther: string,
  otherNotes: string
): string | undefined {
  const allAllergies = [...allergies]
  if (allergyOther.trim()) {
    allAllergies.push(allergyOther.trim())
  }

  const parts: string[] = []
  if (allAllergies.length > 0) {
    parts.push(`Allergies: ${allAllergies.join(', ')}`)
  }
  if (otherNotes.trim()) {
    parts.push(otherNotes.trim())
  }

  return parts.length > 0 ? parts.join('\n') : undefined
}

/**
 * Get the display label for a dietary requirement value.
 * Handles both technical values ('vegetarian') and legacy labels ('Végétarien').
 */
export function getDietLabel(diet: string | null | undefined): string {
  if (!diet) return 'Standard'
  const option = DIETARY_OPTIONS.find(d => d.value === diet || d.label === diet)
  return option?.label || diet
}

/**
 * Normalize a dietary requirement value to the technical key.
 * Handles both technical values ('vegetarian') and legacy labels ('Végétarien').
 */
export function normalizeDietValue(diet: string | null | undefined): string {
  if (!diet) return ''
  // Already a technical value?
  const byValue = DIETARY_OPTIONS.find(d => d.value === diet)
  if (byValue) return byValue.value
  // Legacy label? Convert to technical value
  const byLabel = DIETARY_OPTIONS.find(d => d.label === diet)
  if (byLabel) return byLabel.value
  return diet
}

/**
 * Calculate age from a birth date string.
 */
export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Auto-determine age_category from birth date.
 */
export function getAgeCategoryFromBirthDate(birthDate: string): 'adult' | 'teen' | 'child' | 'infant' {
  const age = calculateAge(birthDate)
  if (age < 2) return 'infant'
  if (age < 12) return 'child'
  if (age < 18) return 'teen'
  return 'adult'
}
