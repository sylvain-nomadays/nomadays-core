import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CalendarBlank, MapPin, UsersThree, Buildings } from '@phosphor-icons/react/dist/ssr';
import type { ContinentTheme } from '../continent-theme';

// ─── Status labels ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  lead: { label: 'Nouvelle demande', className: 'bg-gray-500/80' },
  qualified: { label: 'En cours', className: 'bg-blue-500/80' },
  proposal_sent: { label: 'Devis envoyé', className: 'bg-amber-500/80' },
  negotiation: { label: 'En négociation', className: 'bg-amber-500/80' },
  won: { label: 'Confirmé', className: 'bg-emerald-500/80' },
  confirmed: { label: 'Confirmé', className: 'bg-emerald-500/80' },
  lost: { label: 'Annulé', className: 'bg-red-500/80' },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoyageHeroProps {
  dossier: {
    id: string;
    title: string;
    reference: string;
    status: string;
    destination_country?: string | null;
    travel_date_start?: string | null;
    travel_date_end?: string | null;
    adults_count?: number;
    children_count?: number;
    tenant?: { name: string; logo_url?: string | null } | null;
    advisor?: { first_name: string | null; last_name: string | null; email: string } | null;
  };
  heroPhotoUrl?: string | null;
  continentTheme: ContinentTheme;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VoyageHero({ dossier, heroPhotoUrl, continentTheme }: VoyageHeroProps) {
  const statusConfig = STATUS_LABELS[dossier.status] ?? { label: dossier.status, className: 'bg-gray-500/80' };
  const totalTravelers = (dossier.adults_count || 0) + (dossier.children_count || 0);
  const advisorName = dossier.advisor
    ? [dossier.advisor.first_name, dossier.advisor.last_name].filter(Boolean).join(' ')
    : null;

  const formatDateRange = () => {
    if (!dossier.travel_date_start) return null;
    const start = new Date(dossier.travel_date_start).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
    if (!dossier.travel_date_end) return start;
    const end = new Date(dossier.travel_date_end).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${start} – ${end}`;
  };

  return (
    <div className="relative h-[280px] overflow-hidden">
      {/* Background */}
      {heroPhotoUrl ? (
        <Image
          src={heroPhotoUrl}
          alt={dossier.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${continentTheme.gradient}`} />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <Link
            href="/client/voyages"
            className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
            Mes voyages
          </Link>
          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Bottom content */}
        <div>
          <h1 className="text-2xl font-bold leading-tight mb-2">{dossier.title}</h1>

          <div className="flex items-center gap-4 text-sm text-white/80 flex-wrap">
            {dossier.destination_country && (
              <span className="flex items-center gap-1.5">
                <MapPin size={16} weight="duotone" />
                {dossier.destination_country}
              </span>
            )}
            {formatDateRange() && (
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={16} weight="duotone" />
                {formatDateRange()}
              </span>
            )}
            {totalTravelers > 0 && (
              <span className="flex items-center gap-1.5">
                <UsersThree size={16} weight="duotone" />
                {totalTravelers} voyageur{totalTravelers > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Advisor + tenant info */}
          <div className="flex items-center gap-3 mt-3">
            {advisorName && (
              <span className="flex items-center gap-1.5 text-xs text-white/60">
                <Buildings size={14} weight="duotone" />
                {advisorName}{dossier.tenant?.name ? ` • ${dossier.tenant.name}` : ''}
              </span>
            )}
            <span className="text-xs text-white/40">
              Réf. {dossier.reference}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
