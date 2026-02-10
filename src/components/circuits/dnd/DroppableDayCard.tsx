'use client';

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { DayDropData, IntraDayDragData } from './types';
import type { TripDay } from '@/lib/api/types';

interface DroppableDayCardProps {
  dayId: number;
  dayNumber: number;
  day: TripDay;
  tripId: number;
  children: React.ReactNode;
}

/**
 * Wraps each day card to make it:
 * 1. A droppable target for blocks (inter-day move / source panel copies)
 * 2. A sortable item for day reordering (drag handle on the left)
 *
 * Uses both useDroppable (for block drops) and useSortable (for day reordering).
 * The droppable uses a stable ID (`day-drop-{dayId}`) separate from the sortable ID (`day-sort-{dayId}`).
 */
export function DroppableDayCard({ dayId, dayNumber, day, tripId, children }: DroppableDayCardProps) {
  // Droppable: accepts block drops
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `day-drop-${dayId}`,
    data: {
      type: 'day',
      dayId,
      dayNumber,
    } satisfies DayDropData,
  });

  // Sortable: allows reordering days
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `day-sort-${dayId}`,
    data: {
      type: 'circuit-day',
      day,
      tripId,
    } satisfies IntraDayDragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 40 : undefined,
  };

  return (
    <div
      ref={(node) => {
        setDropRef(node);
        setSortRef(node);
      }}
      style={style}
      className={`bg-white rounded-xl shadow-sm border transition-all duration-200 relative group/daycard ${
        isOver
          ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/30'
          : isDragging
            ? 'border-blue-300 ring-2 ring-blue-100 shadow-lg'
            : 'border-gray-100'
      }`}
    >
      {/* Drag handle — floats to the left of the card, always visible */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-9 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
        title="Glisser pour réordonner les jours"
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-400" />
      </div>
      {children}
    </div>
  );
}
