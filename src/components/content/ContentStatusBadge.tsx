'use client';

import { CheckCircle, Clock, FileEdit, Archive, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ContentStatus, AIGenerationStatus } from '@/lib/api/types';

interface ContentStatusBadgeProps {
  status: ContentStatus;
  aiStatus?: AIGenerationStatus;
  size?: 'sm' | 'default';
}

const statusConfig: Record<
  ContentStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: FileEdit,
  },
  review: {
    label: 'En revision',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  published: {
    label: 'Publie',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
  },
  archived: {
    label: 'Archive',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: Archive,
  },
};

const aiStatusConfig: Record<
  AIGenerationStatus,
  { label: string; color: string }
> = {
  pending: { label: 'IA en attente', color: 'bg-blue-50 text-blue-600' },
  in_progress: { label: 'IA en cours', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Genere par IA', color: 'bg-purple-100 text-purple-700' },
  failed: { label: 'IA echouee', color: 'bg-red-100 text-red-600' },
  reviewed: { label: 'IA valide', color: 'bg-emerald-50 text-emerald-600' },
};

export function ContentStatusBadge({ status, aiStatus, size = 'default' }: ContentStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={`${config.color} ${sizeClass}`}>
        <Icon className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1'} />
        {config.label}
      </Badge>
      {aiStatus && aiStatus !== 'reviewed' && (
        <Badge variant="outline" className={`${aiStatusConfig[aiStatus].color} ${sizeClass}`}>
          <Sparkles className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1'} />
          {aiStatusConfig[aiStatus].label}
        </Badge>
      )}
    </div>
  );
}

interface ContentEntityTypeBadgeProps {
  type: string;
  size?: 'sm' | 'default';
}

const entityTypeConfig: Record<
  string,
  { label: string; color: string }
> = {
  attraction: { label: 'Attraction', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  destination: { label: 'Destination', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  activity: { label: 'Activite', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  accommodation: { label: 'Hebergement', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  eating: { label: 'Restaurant', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  region: { label: 'Region', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

export function ContentEntityTypeBadge({ type, size = 'default' }: ContentEntityTypeBadgeProps) {
  const config = entityTypeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <Badge variant="outline" className={`${config.color} ${sizeClass}`}>
      {config.label}
    </Badge>
  );
}
