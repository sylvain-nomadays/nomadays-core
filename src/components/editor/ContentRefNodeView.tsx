'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  MapPin,
  Compass,
  Tent,
  Bed,
  UtensilsCrossed,
  Map,
  X,
} from 'lucide-react';

// ─── Type → Icon mapping ────────────────────────────────────────────

interface TypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const FALLBACK_CONFIG: TypeConfig = {
  icon: MapPin,
  label: 'Attraction',
  bgColor: 'bg-primary-50',
  textColor: 'text-primary-700',
  borderColor: 'border-primary-200',
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  attraction: FALLBACK_CONFIG,
  destination: {
    icon: Compass,
    label: 'Destination',
    bgColor: 'bg-secondary-50',
    textColor: 'text-secondary-700',
    borderColor: 'border-secondary-200',
  },
  activity: {
    icon: Tent,
    label: 'Activité',
    bgColor: 'bg-sage-50',
    textColor: 'text-sage-700',
    borderColor: 'border-sage-200',
  },
  accommodation: {
    icon: Bed,
    label: 'Hébergement',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  eating: {
    icon: UtensilsCrossed,
    label: 'Restaurant',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
  },
  region: {
    icon: Map,
    label: 'Région',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
};

// ─── ContentRefNodeView ─────────────────────────────────────────────

export function ContentRefNodeView({ node, deleteNode, editor }: NodeViewProps) {
  const { type, slug, title } = node.attrs;
  const config = TYPE_CONFIG[type] ?? FALLBACK_CONFIG;
  const Icon = config.icon;
  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper as="span" className="inline-flex">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} select-none align-baseline`}
        title={`${config.label}: ${slug}`}
        contentEditable={false}
      >
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[150px]">{title || slug}</span>
        {isEditable && (
          <button
            type="button"
            onClick={deleteNode}
            className="ml-0.5 p-0 hover:opacity-70 transition-opacity"
            title="Supprimer la référence"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    </NodeViewWrapper>
  );
}
