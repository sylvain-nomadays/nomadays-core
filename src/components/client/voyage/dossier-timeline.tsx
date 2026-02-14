import {
  ClipboardList,
  FileText,
  CheckCircle,
  CreditCard,
  Plane,
} from 'lucide-react';
import type { ContinentTheme } from '../continent-theme';

// ─── Timeline step config ───────────────────────────────────────────────────

interface TimelineStep {
  key: string;
  label: string;
  icon: typeof ClipboardList;
  statuses: string[];
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: 'request',
    label: 'Demande',
    icon: ClipboardList,
    statuses: ['lead', 'qualified'],
  },
  {
    key: 'quote',
    label: 'Devis',
    icon: FileText,
    statuses: ['proposal_sent', 'negotiation'],
  },
  {
    key: 'confirmed',
    label: 'Confirmé',
    icon: CheckCircle,
    statuses: ['won', 'confirmed'],
  },
  {
    key: 'paid',
    label: 'Payé',
    icon: CreditCard,
    statuses: ['deposit_paid', 'fully_paid'],
  },
  {
    key: 'traveling',
    label: 'En voyage',
    icon: Plane,
    statuses: ['in_trip', 'completed'],
  },
];

// ─── Helper ─────────────────────────────────────────────────────────────────

function getActiveStepIndex(status: string): number {
  const idx = TIMELINE_STEPS.findIndex((step) =>
    step.statuses.includes(status)
  );
  return idx >= 0 ? idx : 0;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface DossierTimelineProps {
  status: string;
  continentTheme: ContinentTheme;
}

export function DossierTimeline({ status, continentTheme }: DossierTimelineProps) {
  const activeIndex = getActiveStepIndex(status);

  // Don't show for lost/cancelled
  if (status === 'lost' || status === 'cancelled' || status === 'archived') {
    return null;
  }

  return (
    <div className="px-6 py-5 border-b border-gray-100 bg-white overflow-x-auto">
      <div className="flex items-center justify-between min-w-[400px]">
        {TIMELINE_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isPast = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isFuture = index > activeIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 relative">
                {/* Circle */}
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: isPast || isCurrent ? continentTheme.primary : '#f3f4f6',
                    boxShadow: isCurrent ? `0 0 0 4px ${continentTheme.primary}20` : 'none',
                  }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{
                      color: isPast || isCurrent ? '#ffffff' : '#d1d5db',
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  style={{
                    color: isPast || isCurrent ? continentTheme.primary : '#9ca3af',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < TIMELINE_STEPS.length - 1 && (
                <div className="flex-1 mx-2 mb-5">
                  <div
                    className="h-0.5 w-full rounded-full transition-colors"
                    style={{
                      backgroundColor: isPast ? continentTheme.primary : '#e5e7eb',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
