'use client';

import { FileText, MapPin, Building2, Calendar, Car } from 'lucide-react';
import type { DragData } from './types';

interface DragPreviewProps {
  data: DragData;
}

/**
 * Visual preview shown in the DragOverlay during a drag operation.
 * Compact card showing block type icon + name.
 */
export function DragPreview({ data }: DragPreviewProps) {
  // Day preview (source-day from panel OR circuit-day reorder)
  if (data.type === 'source-day' || data.type === 'circuit-day') {
    const { day } = data;
    const isReorder = data.type === 'circuit-day';
    return (
      <div className={`w-72 bg-white rounded-lg shadow-xl border ${isReorder ? 'border-blue-200' : 'border-emerald-200'} px-3 py-2 opacity-90`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full ${isReorder ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold text-xs flex-shrink-0`}>
            J{day.day_number}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate block">
              {day.title || `Jour ${day.day_number}`}
            </span>
            {day.location_to && (
              <span className="text-xs text-gray-500">{day.location_to}</span>
            )}
          </div>
          {isReorder ? (
            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
              Déplacer
            </span>
          ) : (
            <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  }

  // Block preview (both 'block' and 'source-block')
  const { block } = data;
  const blockType = block.block_type || 'activity';

  const iconMap: Record<string, React.ReactNode> = {
    text: <FileText className="w-4 h-4 text-gray-400" />,
    activity: <MapPin className="w-4 h-4 text-blue-500" />,
    accommodation: <Building2 className="w-4 h-4 text-amber-600" />,
    transport: <Car className="w-4 h-4 text-purple-500" />,
  };

  const bgMap: Record<string, string> = {
    text: 'border-gray-200',
    activity: 'border-blue-200',
    accommodation: 'border-amber-200',
    transport: 'border-purple-200',
  };

  return (
    <div className={`w-72 bg-white rounded-lg shadow-xl border ${bgMap[blockType]} px-3 py-2 opacity-90`}>
      <div className="flex items-center gap-2">
        {iconMap[blockType]}
        <span className="text-sm font-medium text-gray-900 truncate flex-1">
          {block.name}
        </span>
        {data.type === 'source-block' && (
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
            Copie
          </span>
        )}
      </div>
    </div>
  );
}
