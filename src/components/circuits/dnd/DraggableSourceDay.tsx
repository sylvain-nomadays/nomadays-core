'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical, MapPin } from 'lucide-react';
import type { TripDay } from '@/lib/api/types';
import type { SourceDayDragData } from './types';

interface DraggableSourceDayProps {
  day: TripDay;
  sourceTripId: number;
  children?: React.ReactNode;
}

/**
 * A day header in the source panel that can be dragged into the circuit.
 * Dragging an entire day copies ALL its blocks into the target day.
 */
export function DraggableSourceDay({ day, sourceTripId, children }: DraggableSourceDayProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-day-${day.id}`,
    data: {
      type: 'source-day',
      day,
      sourceTripId,
    } satisfies SourceDayDragData,
  });

  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-30' : ''}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
        <span {...listeners} {...attributes} className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab">
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
          {day.day_number}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-700 truncate block">
            {day.title || `Jour ${day.day_number}`}
          </span>
          {day.location_to && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {day.location_to}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
