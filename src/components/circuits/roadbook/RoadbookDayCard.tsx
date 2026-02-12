'use client';

import { useEffect, useMemo, useState } from 'react';
import { GripVertical, MapPin, Plus, Loader2, X } from 'lucide-react';
import { MapTrifold } from '@phosphor-icons/react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { TripDay, Formula } from '@/lib/api/types';
import { useDayBlocks, useCreateBlock, useUpdateBlock, useDeleteBlock, useReorderBlocks } from '@/hooks/useBlocks';
import { BlockSummary } from './BlockSummary';
import { RichTextEditor } from '@/components/editor';
import { formatTripDayLabel } from '@/lib/formatTripDate';
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
} from '../blocks/roadbook-categories';

interface RoadbookDayCardProps {
  day: TripDay;
  tripId: number;
}

export function RoadbookDayCard({ day, tripId }: RoadbookDayCardProps) {
  const { data: blocks, refetch: refetchBlocks } = useDayBlocks(day.id);
  const { mutate: createBlock, loading: creating } = useCreateBlock();
  const { mutate: updateBlock } = useUpdateBlock();
  const { mutate: deleteBlock } = useDeleteBlock();
  const { mutate: reorderBlocks } = useReorderBlocks();

  // All top-level blocks sorted by sort_order
  const topLevelBlocks = useMemo(() => {
    return (blocks || []).filter(b => !b.parent_block_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [blocks]);

  const { dayLabel } = formatTripDayLabel(day.day_number, day.day_number_end, null);
  const location = day.location_name || day.location_from || day.overnight_city || '';

  // ─── DnD setup (local to this day card) ──────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = topLevelBlocks.findIndex(b => b.id === active.id);
    const newIndex = topLevelBlocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(
      topLevelBlocks.map(b => b.id),
      oldIndex,
      newIndex
    );

    try {
      await reorderBlocks({ dayId: day.id, blockIds: reordered });
      refetchBlocks();
    } catch (err) {
      console.error('Failed to reorder blocks:', err);
    }
  };

  // ─── Block actions ───────────────────────────────────────────────
  const handleAddAnnotation = async () => {
    const nextSortOrder = topLevelBlocks.length;
    try {
      await createBlock({
        dayId: day.id,
        name: 'Annotation Roadbook',
        blockType: 'roadbook',
        descriptionHtml: buildRoadbookHtml('', DEFAULT_CATEGORY),
        sortOrder: nextSortOrder,
      });
      refetchBlocks();
    } catch (err) {
      console.error('Failed to create roadbook block:', err);
    }
  };

  const handleUpdateBlock = async (formulaId: number, html: string) => {
    try {
      await updateBlock({ formulaId, data: { description_html: html } });
    } catch (err) {
      console.error('Failed to update roadbook block:', err);
    }
  };

  const handleDeleteBlock = async (formulaId: number) => {
    try {
      await deleteBlock(formulaId);
      refetchBlocks();
    } catch (err) {
      console.error('Failed to delete roadbook block:', err);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        {/* Day badge */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0FB6BC] text-white text-sm font-bold flex-shrink-0">
          {day.day_number}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">
              {dayLabel}
            </span>
            {day.title && (
              <span className="text-gray-600 truncate">— {day.title}</span>
            )}
          </div>
          {location && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Blocks — interleaved summaries + roadbook editors with DnD */}
      {topLevelBlocks.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={topLevelBlocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {topLevelBlocks.map(block => (
                block.block_type === 'roadbook' ? (
                  <SortableAnnotation
                    key={block.id}
                    block={block}
                    onChange={(html) => handleUpdateBlock(block.id, html)}
                    onDelete={() => handleDeleteBlock(block.id)}
                  />
                ) : (
                  <SortableBlockSummary key={block.id} block={block} />
                )
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add annotation button */}
      <div className="px-4 py-2 border-t border-gray-100">
        <button
          onClick={handleAddAnnotation}
          disabled={creating}
          className="flex items-center gap-1.5 text-xs text-[#0FB6BC] hover:text-[#0C9296] transition-colors px-2 py-1.5 rounded hover:bg-[#E6F9FA]"
        >
          {creating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Annotation
        </button>
      </div>
    </div>
  );
}

// ─── Sortable wrapper for roadbook annotations ─────────────────────

function SortableAnnotation({
  block,
  onChange,
  onDelete,
}: {
  block: Formula;
  onChange: (html: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <RoadbookInlineEditor
        blockId={block.id}
        content={block.description_html || ''}
        onChange={onChange}
        onDelete={onDelete}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  );
}

// ─── Sortable wrapper for non-roadbook blocks (drop targets) ────────

function SortableBlockSummary({ block }: { block: Formula }) {
  const {
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockSummary block={block} />
    </div>
  );
}

// ─── Inline roadbook editor (within DayCard) ───────────────────────

function RoadbookInlineEditor({
  blockId,
  content,
  onChange,
  onDelete,
  dragListeners,
  dragAttributes,
}: {
  blockId: number;
  content: string;
  onChange: (html: string) => void;
  onDelete: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
}) {
  // Optimistic local state for category (immediate UI feedback)
  const meta = parseRoadbookMeta(content);
  const [category, setCategory] = useState<RoadbookCategory>(
    meta?.category || DEFAULT_CATEGORY
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Optimistic local state for location (immediate UI feedback — same pattern as category)
  const [localLocation, setLocalLocation] = useState<RoadbookLocation | null>(
    meta?.location || null
  );

  // Sync from props when they change (e.g. from Programme tab's refetch)
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
  const editorContent = content ? stripRoadbookMeta(content) : '';
  const location = localLocation;

  const handleChange = (html: string) => {
    // Preserve existing location when content changes
    onChange(buildRoadbookHtml(html, category, location));
  };

  const handleCategoryChange = (newCategory: RoadbookCategory) => {
    setCategory(newCategory); // Optimistic local update
    const stripped = content ? stripRoadbookMeta(content) : '';
    // Preserve existing location when category changes
    onChange(buildRoadbookHtml(stripped, newCategory, location));
  };

  const handleLocationChange = (newLocation: RoadbookLocation | null) => {
    setLocalLocation(newLocation); // Optimistic local update
    const stripped = content ? stripRoadbookMeta(content) : '';
    onChange(buildRoadbookHtml(stripped, category, newLocation));
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
      {/* Drag handle */}
      {dragListeners && (
        <div
          className="flex-shrink-0 mt-1 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
          style={{ touchAction: 'none' }}
          {...dragListeners}
          {...dragAttributes}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
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
            title={location ? `\u{1F4CD} ${location.name || location.address || 'Lieu'}` : 'Ajouter un lieu'}
          >
            <MapTrifold
              weight="duotone"
              size={14}
              style={{ color: location ? config.color : '#A3A3A3' }}
            />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5"
            title="Supprimer cette annotation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Location picker (editing mode) */}
        {showLocationPicker && (
          <div className="mb-2">
            <LocationPicker
              location={location}
              onLocationChange={handleLocationChange}
              compact
            />
          </div>
        )}

        {/* Rich text editor */}
        <RichTextEditor
          content={editorContent}
          onChange={handleChange}
          placeholder={config.placeholder}
          compact
        />

        {/* Mini map (read-only display when location exists and picker is closed) */}
        {location && !showLocationPicker && (
          <div className="mt-2">
            <MiniMap
              lat={location.lat}
              lng={location.lng}
              label={location.name || location.address}
              height={100}
              markerColor={config.color.replace('#', '0x')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
