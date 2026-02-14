import Link from 'next/link';
import { ChatCircle } from '@phosphor-icons/react/dist/ssr';

interface AdvisorCardProps {
  advisor: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  dossierId?: string;
  accentColor?: string;
  avgResponseTime?: string | null;
}

export function AdvisorCard({ advisor, dossierId, accentColor = '#0FB6BC', avgResponseTime }: AdvisorCardProps) {
  const initials = `${advisor.first_name?.[0] ?? ''}${advisor.last_name?.[0] ?? ''}`;
  const fullName = [advisor.first_name, advisor.last_name].filter(Boolean).join(' ') || 'Votre hôte';

  return (
    <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{fullName}</p>
          <p className="text-xs text-gray-500">
            Votre hôte local
          </p>
          {avgResponseTime && (
            <p className="text-[11px] font-medium text-emerald-600">{avgResponseTime}</p>
          )}
        </div>
      </div>
      {dossierId && (
        <Link
          href={`/client/voyages/${dossierId}?tab=messages`}
          className="mt-2.5 flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
          }}
        >
          <ChatCircle size={14} weight="duotone" />
          Envoyer un message
        </Link>
      )}
    </div>
  );
}
