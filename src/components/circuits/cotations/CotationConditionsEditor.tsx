'use client';

import type { TripCondition } from '@/lib/api/types';

interface CotationConditionsEditorProps {
  tripConditions: TripCondition[];
  conditionSelections: Record<string, number>;
  onChange: (selections: Record<string, number>) => void;
}

export default function CotationConditionsEditor({
  tripConditions,
  conditionSelections,
  onChange,
}: CotationConditionsEditorProps) {
  const activeConditions = tripConditions.filter(tc => tc.is_active);

  if (activeConditions.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic">
        Aucune condition configurée sur ce circuit
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {activeConditions.map(tc => {
        const currentValue = conditionSelections[String(tc.condition_id)] ?? tc.selected_option_id;

        return (
          <div key={tc.id} className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{tc.condition_name} :</span>
            <select
              value={currentValue ?? ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val) {
                  onChange({
                    ...conditionSelections,
                    [String(tc.condition_id)]: val,
                  });
                }
              }}
              className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {tc.options?.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
