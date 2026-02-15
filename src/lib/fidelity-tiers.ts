// ─── Fidelity tier definitions (shared between server & client) ──────────────

export interface FidelityTier {
  label: string
  baseline: string
  min_trips: number
  /** Phosphor icon name — resolved to actual icon in client components */
  iconName: 'Binoculars' | 'Compass' | 'MapTrifold' | 'Airplane' | 'GlobeHemisphereWest' | 'Sparkle'
  color: string
}

export const FIDELITY_TIERS: FidelityTier[] = [
  {
    label: 'A l\'Horizon',
    baseline: 'Le monde s\'ouvre, l\'envie de partir commence.',
    min_trips: 0,
    iconName: 'Binoculars',
    color: '#A3A3A3',
  },
  {
    label: 'Premiers Pas',
    baseline: 'Un premier souvenir, et déjà l\'appel du suivant.',
    min_trips: 1,
    iconName: 'Compass',
    color: '#8BA080',
  },
  {
    label: 'Éclaireur',
    baseline: 'Le voyage devient un regard plus attentif sur le monde.',
    min_trips: 3,
    iconName: 'MapTrifold',
    color: '#0FB6BC',
  },
  {
    label: 'Grand Voyageur',
    baseline: 'Les horizons se multiplient, les histoires aussi.',
    min_trips: 7,
    iconName: 'Airplane',
    color: '#DD9371',
  },
  {
    label: 'Connaisseur du Monde',
    baseline: 'Chaque destination révèle une nuance nouvelle.',
    min_trips: 12,
    iconName: 'GlobeHemisphereWest',
    color: '#D4A847',
  },
  {
    label: 'Esprit Nomade',
    baseline: 'Le voyage n\'est plus un départ, mais une manière d\'être.',
    min_trips: 20,
    iconName: 'Sparkle',
    color: '#9B59B6',
  },
]

/** Statuts de dossier qui comptent pour la fidélité */
export const FIDELITY_STATUSES = new Set(['deposit_paid', 'fully_paid', 'in_trip', 'completed'])

export interface CurrentTierResult {
  current: FidelityTier
  next: FidelityTier | null
  progress: number
  totalTrips: number
}

export function getCurrentTier(trips: number): CurrentTierResult {
  let currentIndex = 0
  for (let i = FIDELITY_TIERS.length - 1; i >= 0; i--) {
    if (trips >= FIDELITY_TIERS[i]!.min_trips) {
      currentIndex = i
      break
    }
  }

  const current = FIDELITY_TIERS[currentIndex]!
  const next = currentIndex < FIDELITY_TIERS.length - 1 ? FIDELITY_TIERS[currentIndex + 1]! : null

  let progress = 100
  if (next) {
    const rangeStart = current.min_trips
    const rangeEnd = next.min_trips
    progress = Math.round(((trips - rangeStart) / (rangeEnd - rangeStart)) * 100)
    progress = Math.min(Math.max(progress, 0), 100)
  }

  return { current, next, progress, totalTrips: trips }
}
