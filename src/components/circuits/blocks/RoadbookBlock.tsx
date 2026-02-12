'use client';

import { useState, useEffect } from 'react';
import { GripVertical, X } from 'lucide-react';
import { MapTrifold } from '@phosphor-icons/react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { Formula } from '@/lib/api/types';
import { RichTextEditor } from '@/components/editor';
import LocationPicker from '@/components/common/LocationPicker';
import MiniMap from '@/components/common/MiniMap';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ROADBOOK_CATEGORIES,
  CATEGORY_LIST,
  parseRoadbookMeta,
  stripRoadbookMeta,
  buildRoadbookHtml,
  DEFAULT_CATEGORY,
  type RoadbookCategory,
  type RoadbookLocation,
} from './roadbook-categories';

interface RoadbookBlockProps {
  block: Formula;
  onUpdate?: (data: { name?: string; description_html?: string }) => void;
  onDelete?: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
}

export function RoadbookBlock({
  block,
  onUpdate,
  onDelete,
  dragListeners,
  dragAttributes,
}: RoadbookBlockProps) {
  // Optimistic local state for category (immediate UI feedback)
  const meta = parseRoadbookMeta(block.description_html);
  const [category, setCategory] = useState<RoadbookCategory>(
    meta?.category || DEFAULT_CATEGORY
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Optimistic local state for location (immediate UI feedback — same pattern as category)
  const [localLocation, setLocalLocation] = useState<RoadbookLocation | null>(
    meta?.location || null
  );

  // Sync from props when they change (e.g. from another tab's refetch)
  const propCategory = meta?.category || DEFAULT_CATEGORY;
  const propLocation = meta?.location || null;
  useEffect(() => {
    setCategory(propCategory);
  }, [propCategory]);
  useEffect(() => {
    setLocalLocation(propLocation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(propLocation)]);

  // Use optimistic state for config (not props) for immediate visual feedback
  const config = ROADBOOK_CATEGORIES[category];
  const location = localLocation;

  // Strip metadata for the editor content
  const editorContent = block.description_html
    ? stripRoadbookMeta(block.description_html)
    : '';

  const handleChange = (html: string) => {
    // RichTextEditor already debounces internally (500ms)
    // Preserve existing location when content changes
    onUpdate?.({ description_html: buildRoadbookHtml(html, category, location) });
  };

  const handleCategoryChange = (newCategory: RoadbookCategory) => {
    setCategory(newCategory); // Optimistic local update
    const content = block.description_html
      ? stripRoadbookMeta(block.description_html)
      : '';
    // Preserve existing location when category changes
    onUpdate?.({ description_html: buildRoadbookHtml(content, newCategory, location) });
  };

  const handleLocationChange = (newLocation: RoadbookLocation | null) => {
    setLocalLocation(newLocation); // Optimistic local update
    const content = block.description_html
      ? stripRoadbookMeta(block.description_html)
      : '';
    onUpdate?.({ description_html: buildRoadbookHtml(content, category, newLocation) });
    if (!newLocation) {
      setShowLocationPicker(false);
    }
  };

  const CategoryIcon = config.icon;

  return (
    <div
      className="group relative flex items-start gap-2 rounded-lg border bg-white p-3 transition-colors"
      style={{ borderColor: config.borderColor }}
    >
      {/* Drag handle — aligned with TextBlock/TransportBlock */}
      <div
        className="flex-shrink-0 mt-1 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
        style={{ touchAction: 'none' }}
        {...dragListeners}
        {...dragAttributes}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: icon + label + category selector + location toggle */}
        <div className="flex items-center gap-1.5 mb-1">
          <CategoryIcon weight="duotone" size={14} style={{ color: config.color }} />
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: config.color }}
          >
            {config.label}
          </span>

          {/* Category selector — 3 mini-buttons with tooltips */}
          <TooltipProvider delayDuration={400}>
            <div className="flex items-center gap-0.5 ml-auto">
              {CATEGORY_LIST.map((cat) => {
                const isActive = cat.code === category;
                const CatIcon = cat.icon;
                return (
                  <Tooltip key={cat.code}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleCategoryChange(cat.code)}
                        className="p-1 rounded transition-all"
                        style={{
                          backgroundColor: isActive ? cat.bgColor : 'transparent',
                          opacity: isActive ? 1 : 0.4,
                        }}
                      >
                        <CatIcon
                          weight="duotone"
                          size={14}
                          style={{ color: isActive ? cat.color : '#A3A3A3' }}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{cat.label}</p>
                      <p className="text-muted-foreground">{cat.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Location toggle */}
          <button
            type="button"
            onClick={() => setShowLocationPicker(!showLocationPicker)}
            className="p-1 rounded transition-all"
            style={{
              backgroundColor: location ? config.bgColor : 'transparent',
              opacity: location || showLocationPicker ? 1 : 0.4,
            }}
            title={location ? `📍 ${location.name || location.address || 'Lieu'}` : 'Ajouter un lieu'}
          >
            <MapTrifold
              weight="duotone"
              size={14}
              style={{ color: location ? config.color : '#A3A3A3' }}
            />
          </button>
        </div>

        {/* Location picker (editing mode) */}
        {showLocationPicker && (
          <div className="mb-2">
            <LocationPicker
              location={location}
              onLocationChange={handleLocationChange}
            />
          </div>
        )}

        {/* Rich text editor */}
        <RichTextEditor
          content={editorContent}
          onChange={handleChange}
          placeholder={config.placeholder}
          inline
          enableContentRefs
        />

        {/* Mini map (read-only display when location exists and picker is closed) */}
        {location && !showLocationPicker && (
          <div className="mt-2">
            <MiniMap
              lat={location.lat}
              lng={location.lng}
              label={location.name || location.address}
              height={120}
              markerColor={config.color.replace('#', '0x')}
            />
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
        title="Supprimer ce bloc"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
