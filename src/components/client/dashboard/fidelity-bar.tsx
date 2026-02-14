'use client'

import {
  Binoculars,
  Compass,
  GlobeHemisphereWest,
  Airplane,
  MapTrifold,
  Sparkle,
  Confetti,
  Globe,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

// ─── Tier definitions ────────────────────────────────────────────────────────

export interface FidelityTierDef {
  label: string
  emoji: string
  min_trips: number
}

interface TierConfig {
  label: string
  baseline: string
  min_trips: number
  icon: PhosphorIcon
  color: string
}

const TIERS: TierConfig[] = [
  {
    label: 'A l\'Horizon',
    baseline: 'Le monde s\'ouvre, l\'envie de partir commence.',
    min_trips: 0,
    icon: Binoculars,
    color: '#A3A3A3',
  },
  {
    label: 'Premiers Pas',
    baseline: 'Un premier souvenir, et deja l\'appel du suivant.',
    min_trips: 1,
    icon: Compass,
    color: '#8BA080',
  },
  {
    label: 'Eclaireur',
    baseline: 'Le voyage devient un regard plus attentif sur le monde.',
    min_trips: 3,
    icon: MapTrifold,
    color: '#0FB6BC',
  },
  {
    label: 'Grand Voyageur',
    baseline: 'Les horizons se multiplient, les histoires aussi.',
    min_trips: 7,
    icon: Airplane,
    color: '#DD9371',
  },
  {
    label: 'Connaisseur du Monde',
    baseline: 'Chaque destination revele une nuance nouvelle.',
    min_trips: 12,
    icon: GlobeHemisphereWest,
    color: '#D4A847',
  },
  {
    label: 'Esprit Nomade',
    baseline: 'Le voyage n\'est plus un depart, mais une maniere d\'etre.',
    min_trips: 20,
    icon: Sparkle,
    color: '#9B59B6',
  },
]

// ─── Helper ──────────────────────────────────────────────────────────────────

function getCurrentTier(trips: number): {
  current: TierConfig
  next: TierConfig | null
  progress: number
} {
  // Find current tier (highest matching)
  let currentIndex = 0
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (trips >= TIERS[i]!.min_trips) {
      currentIndex = i
      break
    }
  }

  const current = TIERS[currentIndex]!
  const next = currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1]! : null

  // Calculate progress toward next tier
  let progress = 100
  if (next) {
    const rangeStart = current.min_trips
    const rangeEnd = next.min_trips
    progress = Math.round(((trips - rangeStart) / (rangeEnd - rangeStart)) * 100)
    progress = Math.min(Math.max(progress, 0), 100)
  }

  return { current, next, progress }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FidelityBarProps {
  totalTrips: number
  tiers?: FidelityTierDef[]
  themeColor?: string
}

export function FidelityBar({ totalTrips }: FidelityBarProps) {
  const { current, next, progress } = getCurrentTier(totalTrips)
  const IconComp = current.icon
  const remaining = next ? next.min_trips - totalTrips : 0

  return (
    <section className="bg-[#F8F9FA] px-8 lg:px-10 py-5 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Status icon + label + baseline */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}CC 100%)` }}
          >
            <IconComp size={22} weight="duotone" className="text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="font-display font-bold text-[15px] text-gray-800">
              {current.label}
            </h4>
            <p className="text-xs text-gray-500 italic leading-snug">
              {current.baseline}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="bg-gray-200 h-2 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: next
                  ? `linear-gradient(90deg, ${current.color} 0%, ${next.color} 100%)`
                  : current.color,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>
              {totalTrips} voyage{totalTrips !== 1 ? 's' : ''}
            </span>
            {next ? (
              <span className="flex items-center gap-1">
                Encore {remaining} voyage{remaining > 1 ? 's' : ''} &rarr; {next.label}
                <Globe size={13} weight="duotone" style={{ color: next.color }} />
              </span>
            ) : (
              <span className="flex items-center gap-1">
                Niveau ultime atteint !
                <Confetti size={13} weight="duotone" className="text-[#D4A847]" />
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
