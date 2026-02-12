'use client';

import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { Trip } from '@/lib/api/types';
import { RichTextEditor } from '@/components/editor';
import { RoadbookDayCard } from './RoadbookDayCard';

interface RoadbookEditorProps {
  trip: Trip;
  roadbookIntro: string;
  onRoadbookIntroChange: (html: string) => void;
}

export default function RoadbookEditor({
  trip,
  roadbookIntro,
  onRoadbookIntroChange,
}: RoadbookEditorProps) {
  // Sort days by day_number
  const sortedDays = useMemo(() => {
    return [...(trip.days || [])].sort((a, b) => a.day_number - b.day_number);
  }, [trip.days]);

  return (
    <div className="space-y-6">
      {/* Introduction section */}
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0FB6BC]" />
            <span className="font-semibold text-gray-900">Introduction du Roadbook</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <RichTextEditor
            content={roadbookIntro}
            onChange={onRoadbookIntroChange}
            placeholder="Informations pratiques pour le voyageur : carte SIM, rappel des formalités administratives, conseils bagages, informations utiles..."
          />
        </div>
      </div>

      {/* Day-by-day section */}
      {sortedDays.length > 0 ? (
        <div className="space-y-4">
          {sortedDays.map(day => (
            <RoadbookDayCard
              key={day.id}
              day={day}
              tripId={trip.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Aucun jour dans ce circuit</p>
          <p className="text-sm mt-1">
            Ajoutez des jours dans l'onglet Programme pour pouvoir créer le Roadbook.
          </p>
        </div>
      )}
    </div>
  );
}
