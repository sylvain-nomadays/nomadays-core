import { Badge } from '@/components/ui/badge';
import { Phone, Envelope } from '@phosphor-icons/react/dist/ssr';
import type { ContinentTheme } from '../continent-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DossierParticipant {
  is_lead: boolean;
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
  };
}

interface TravelersSectionProps {
  participants: DossierParticipant[];
  continentTheme: ContinentTheme;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TravelersSection({
  participants,
  continentTheme,
}: TravelersSectionProps) {
  if (!participants || participants.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">
          Les informations des voyageurs seront disponibles prochainement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        {participants.length} voyageur{participants.length > 1 ? 's' : ''} pour ce voyage
      </p>

      {participants.map((dp) => (
        <div
          key={dp.participant.id}
          className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${continentTheme.primary}15` }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: continentTheme.primary }}
              >
                {dp.participant.first_name?.[0]}{dp.participant.last_name?.[0]}
              </span>
            </div>

            {/* Info */}
            <div>
              <p className="font-medium text-sm text-gray-900">
                {dp.participant.first_name} {dp.participant.last_name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Envelope size={12} weight="duotone" />
                  {dp.participant.email}
                </span>
                {dp.participant.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={12} weight="duotone" />
                    {dp.participant.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lead badge */}
          {dp.is_lead && (
            <Badge
              className="text-xs border-0"
              style={{
                backgroundColor: `${continentTheme.accent}15`,
                color: continentTheme.accent,
              }}
            >
              Contact principal
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
