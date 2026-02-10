'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical, FileText, MapPin, Building2 } from 'lucide-react';
import type { Formula } from '@/lib/api/types';
import type { SourceBlockDragData } from './types';

interface DraggableSourceBlockProps {
  block: Formula;
  sourceDayId: number;
}

/**
 * A block in the source panel that can be dragged into the circuit.
 * Uses useDraggable (not useSortable) since panel items are not reorderable.
 * Accommodation blocks are rendered but NOT draggable.
 */
export function DraggableSourceBlock({ block, sourceDayId }: DraggableSourceBlockProps) {
  const isAccommodation = block.block_type === 'accommodation';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-block-${block.id}`,
    data: {
      type: 'source-block',
      block,
      sourceDayId,
    } satisfies SourceBlockDragData,
    disabled: isAccommodation,
  });

  const iconMap = {
    text: <FileText className="w-3 h-3 text-gray-400" />,
    activity: <MapPin className="w-3 h-3 text-blue-500" />,
    accommodation: <Building2 className="w-3 h-3 text-amber-500" />,
  };

  const blockType = (block.block_type || 'activity') as 'text' | 'activity' | 'accommodation';

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-left transition-all ${
        isAccommodation
          ? 'opacity-40 cursor-default'
          : 'hover:bg-gray-50 cursor-grab'
      } ${isDragging ? 'opacity-30' : ''}`}
    >
      {!isAccommodation && (
        <span {...listeners} {...attributes} className="flex-shrink-0 text-gray-300 hover:text-gray-500">
          <GripVertical className="w-3 h-3" />
        </span>
      )}
      {isAccommodation && <span className="w-3" />}
      {iconMap[blockType]}
      <span className="text-xs text-gray-600 truncate flex-1">{block.name}</span>
    </div>
  );
}
