'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  MapPin,
  Car,
  Plane,
  TrainFront,
  Ship,
  Footprints,
  Bike,
  Waves,
  Building2,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { MapTrifold } from '@phosphor-icons/react';
import type { Formula } from '@/lib/api/types';
import { useAccommodation } from '@/hooks/useAccommodations';
import MiniMap from '@/components/common/MiniMap';
import {
  getCategoryConfig,
  parseRoadbookMeta,
  stripRoadbookMeta,
} from '../blocks/roadbook-categories';

// ─── Transport mode → icon mapping ─────────────────────────────────
const TRANSPORT_MODE_ICONS: Record<string, React.ReactNode> = {
  driving: <Car className="w-3.5 h-3.5 text-[#DD9371]" />,
  flight: <Plane className="w-3.5 h-3.5 text-[#DD9371]" />,
  transit: <TrainFront className="w-3.5 h-3.5 text-[#DD9371]" />,
  boat: <Ship className="w-3.5 h-3.5 text-[#DD9371]" />,
  walking: <Footprints className="w-3.5 h-3.5 text-[#DD9371]" />,
  horse: <span className="text-xs">🐎</span>,
  camel: <span className="text-xs">🐪</span>,
  bicycle: <Bike className="w-3.5 h-3.5 text-[#DD9371]" />,
  kayak: <Waves className="w-3.5 h-3.5 text-[#DD9371]" />,
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Strip HTML tags and trim whitespace */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/** Truncate string to max length */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + '\u2026';
}

/** Parse transport metadata from description_html (JSON block) */
function parseTransportMeta(descriptionHtml?: string): {
  mode?: string;
  from?: string;
  to?: string;
  duration?: string;
} | null {
  if (!descriptionHtml) return null;
  // Transport blocks store metadata as JSON in the description_html
  const jsonMatch = descriptionHtml.match(/<!--TRANSPORT_META:(.*?)-->/);
  if (!jsonMatch?.[1]) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}

/** Parse accommodation metadata from description_html */
function parseAccommodationBlockMeta(block: Formula): {
  hotelName?: string;
  nights?: number;
  accommodationId?: number;
} {
  const name = block.name || '';
  let nights = 1;
  let accommodationId: number | undefined;

  // Try to parse JSON metadata from description_html
  if (block.description_html) {
    try {
      const parsed = JSON.parse(block.description_html);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.nights === 'number') nights = parsed.nights;
        if (typeof parsed.accommodation_id === 'number') accommodationId = parsed.accommodation_id;
      }
    } catch {
      // Not JSON, try children
    }
  }

  // Fallback: extract nights from children
  if (nights === 1 && block.children && block.children.length > 0) {
    const childWithNights = block.children.find(c =>
      c.items?.some(item => item.times_type === 'service_days')
    );
    if (childWithNights) {
      const item = childWithNights.items?.find(i => i.times_type === 'service_days');
      if (item && item.times_value) {
        nights = item.times_value;
      }
    }
  }

  return { hotelName: name, nights, accommodationId };
}

// ─── Component ──────────────────────────────────────────────────────

interface BlockSummaryProps {
  block: Formula;
}

export function BlockSummary({ block }: BlockSummaryProps) {
  const blockType = block.block_type || 'text';

  switch (blockType) {
    case 'text':
      return <TextBlockSummary block={block} />;

    case 'activity':
      return <ActivityBlockSummary block={block} />;

    case 'transport':
      return <TransportBlockSummary block={block} />;

    case 'accommodation':
      return <AccommodationBlockSummary block={block} />;

    case 'roadbook': {
      const catConfig = getCategoryConfig(block.description_html);
      const CatIcon = catConfig.icon;
      const meta = parseRoadbookMeta(block.description_html);
      const roadbookText = block.description_html
        ? truncate(stripHtml(stripRoadbookMeta(block.description_html)), 80)
        : '';
      const hasLocation = !!meta?.location;
      return (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
          style={{ backgroundColor: catConfig.bgColor, color: catConfig.color }}
        >
          <CatIcon weight="duotone" size={14} className="flex-shrink-0" style={{ color: catConfig.color }} />
          <span className="font-medium">{catConfig.label}</span>
          {roadbookText && (
            <span className="truncate" style={{ opacity: 0.7 }}>{'\u2014'} {roadbookText}</span>
          )}
          {hasLocation && (
            <span className="flex items-center gap-0.5 ml-auto flex-shrink-0" style={{ opacity: 0.6 }}>
              <MapPin className="w-3 h-3" />
              <span className="text-xs truncate max-w-[100px]">
                {meta!.location!.name || 'Lieu'}
              </span>
            </span>
          )}
        </div>
      );
    }

    default: {
      return (
        <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-1.5 text-sm text-gray-600">
          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">{block.name || 'Bloc'}</span>
        </div>
      );
    }
  }
}

// ─── Text summary with expandable content ───────────────────────────

function TextBlockSummary({ block }: { block: Formula }) {
  const [expanded, setExpanded] = useState(false);
  const fullText = block.description_html ? stripHtml(block.description_html) : '';
  const preview = fullText ? truncate(fullText, 80) : (block.name || 'Texte');
  const hasMore = fullText.length > 80;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasMore && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 bg-gray-50 rounded-md px-3 py-1.5 text-sm text-gray-600 text-left ${hasMore ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
      >
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="truncate flex-1">{expanded ? '' : preview}</span>
        {hasMore && (
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && (
        <div className="mt-1 ml-6 mr-3 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-md px-3 py-2">
          {fullText}
        </div>
      )}
    </div>
  );
}

// ─── Activity summary with expandable description ───────────────────

function ActivityBlockSummary({ block }: { block: Formula }) {
  const [expanded, setExpanded] = useState(false);
  const name = block.name || 'Activité';
  const fullDesc = block.description_html ? stripHtml(block.description_html) : '';
  const preview = fullDesc ? truncate(fullDesc, 60) : '';
  const hasMore = fullDesc.length > 60;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasMore && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 bg-[#E6F9FA] rounded-md px-3 py-1.5 text-sm text-[#096D71] text-left ${hasMore ? 'cursor-pointer hover:bg-[#CCF3F5] transition-colors' : ''}`}
      >
        <MapPin className="w-3.5 h-3.5 text-[#0FB6BC] flex-shrink-0" />
        <span className="font-medium truncate">{name}</span>
        {!expanded && preview && <span className="text-[#33CFD7] truncate hidden sm:inline">{'\u2014'} {preview}</span>}
        {hasMore && (
          <ChevronDown className={`w-3.5 h-3.5 text-[#0FB6BC] flex-shrink-0 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && (
        <div className="mt-1 ml-6 mr-3 text-sm text-[#096D71] whitespace-pre-wrap leading-relaxed bg-[#E6F9FA] rounded-md px-3 py-2">
          {fullDesc}
        </div>
      )}
    </div>
  );
}

// ─── Transport summary with expandable details ──────────────────────

function TransportBlockSummary({ block }: { block: Formula }) {
  const [expanded, setExpanded] = useState(false);
  const meta = parseTransportMeta(block.description_html);
  const modeIcon = meta?.mode ? (TRANSPORT_MODE_ICONS[meta.mode] || <Car className="w-3.5 h-3.5 text-[#DD9371]" />) : <Car className="w-3.5 h-3.5 text-[#DD9371]" />;
  const route = meta?.from && meta?.to ? `${meta.from} \u2192 ${meta.to}` : (block.name || 'Transport');
  const duration = meta?.duration || '';

  // Get description text (after transport meta comment)
  const rawHtml = block.description_html || '';
  const descHtml = rawHtml.replace(/<!--TRANSPORT_META:.*?-->/, '').trim();
  const fullDesc = descHtml ? stripHtml(descHtml) : '';
  const hasMore = fullDesc.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasMore && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 bg-[#FDF5F2] rounded-md px-3 py-1.5 text-sm text-[#A66244] text-left ${hasMore ? 'cursor-pointer hover:bg-[#FBEBE5] transition-colors' : ''}`}
      >
        <span className="flex-shrink-0">{modeIcon}</span>
        <span className="truncate">{route}</span>
        {duration && <span className="text-[#E8AB91] text-xs ml-auto whitespace-nowrap">{duration}</span>}
        {hasMore && (
          <ChevronDown className={`w-3.5 h-3.5 text-[#DD9371] flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && (
        <div className="mt-1 ml-6 mr-3 text-sm text-[#A66244] whitespace-pre-wrap leading-relaxed bg-[#FDF5F2] rounded-md px-3 py-2">
          {fullDesc}
        </div>
      )}
    </div>
  );
}

// ─── Accommodation summary with expandable map ──────────────────────

function AccommodationBlockSummary({ block }: { block: Formula }) {
  const [expanded, setExpanded] = useState(false);

  const { hotelName, nights, accommodationId } = useMemo(
    () => parseAccommodationBlockMeta(block),
    [block]
  );

  // Lazy fetch: only when expanded AND we have an accommodation_id
  const { data: accommodation, loading } = useAccommodation(
    expanded && accommodationId ? accommodationId : null
  );

  const name = hotelName || 'Hébergement';
  const nightsLabel = nights && nights > 1 ? `${nights} nuits` : '1 nuit';
  const hasLocation = accommodation?.lat && accommodation?.lng;

  return (
    <div>
      {/* Main summary row */}
      <div className="flex items-center gap-2 bg-amber-50 rounded-md px-3 py-1.5 text-sm text-amber-700">
        <Building2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span className="font-medium truncate">{name}</span>
        <span className="text-amber-400 text-xs ml-auto whitespace-nowrap">{nightsLabel}</span>
        {accommodationId && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 p-0.5 rounded transition-all hover:bg-amber-100"
            title={expanded ? 'Masquer la carte' : 'Afficher la carte'}
          >
            <MapTrifold
              weight="duotone"
              size={14}
              style={{ color: expanded ? '#D97706' : '#FBBF24' }}
            />
          </button>
        )}
      </div>

      {/* Expandable map section */}
      {expanded && (
        <div className="mt-1 ml-5">
          {loading && (
            <div className="flex items-center gap-2 py-3 text-gray-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Chargement...
            </div>
          )}
          {!loading && hasLocation && (
            <MiniMap
              lat={Number(accommodation!.lat)}
              lng={Number(accommodation!.lng)}
              label={accommodation!.name || name}
              height={120}
              markerColor="0xD97706"
            />
          )}
          {!loading && accommodation && !hasLocation && (
            <div className="text-xs text-gray-400 py-2 italic">
              Position GPS non renseignée pour cet hébergement
            </div>
          )}
        </div>
      )}
    </div>
  );
}
