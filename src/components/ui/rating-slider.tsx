'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  showLabels?: boolean;
  labels?: string[];
  icon?: 'star' | 'difficulty' | 'none';
  className?: string;
  disabled?: boolean;
}

const StarIcon = ({ filled, className }: { filled: boolean; className?: string }) => (
  <svg
    className={cn('w-6 h-6 transition-colors', className)}
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

const DifficultyIcon = ({ level, active, className }: { level: number; active: boolean; className?: string }) => (
  <div
    className={cn(
      'w-6 h-6 flex items-end justify-center gap-0.5 transition-colors',
      active ? 'text-emerald-600' : 'text-gray-300',
      className
    )}
  >
    {[1, 2, 3].map((bar) => (
      <div
        key={bar}
        className={cn(
          'w-1.5 rounded-t transition-all',
          active ? 'bg-current' : 'bg-gray-200'
        )}
        style={{ height: `${bar * 6 + 4}px` }}
      />
    ))}
  </div>
);

export function RatingSlider({
  value,
  onChange,
  min = 1,
  max = 5,
  label,
  showLabels = true,
  labels,
  icon = 'star',
  className,
  disabled = false,
}: RatingSliderProps) {
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const defaultLabels: Record<string, string[]> = {
    star: ['Basique', 'Standard', 'Confort', 'Sup\u00e9rieur', 'Luxe'],
    difficulty: ['Facile', 'Mod\u00e9r\u00e9', 'Moyen', 'Difficile', 'Expert'],
  };

  const displayLabels = labels || defaultLabels[icon] || range.map(String);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="flex items-center gap-1">
        {range.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => !disabled && onChange(level)}
            disabled={disabled}
            className={cn(
              'p-1 rounded transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110',
              level <= value
                ? icon === 'star'
                  ? 'text-amber-400'
                  : 'text-emerald-600'
                : 'text-gray-300'
            )}
            title={displayLabels[level - min]}
          >
            {icon === 'star' && <StarIcon filled={level <= value} />}
            {icon === 'difficulty' && <DifficultyIcon level={level} active={level <= value} />}
            {icon === 'none' && (
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all',
                  level <= value
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                )}
              >
                {level}
              </div>
            )}
          </button>
        ))}
      </div>
      {showLabels && value >= min && value <= max && (
        <span className="text-xs text-gray-500">
          {displayLabels[value - min]}
        </span>
      )}
    </div>
  );
}

// Preset components for convenience
export function ComfortRating({
  value,
  onChange,
  disabled,
  className,
  hideLabel = false,
}: Omit<RatingSliderProps, 'icon' | 'labels'> & { hideLabel?: boolean }) {
  return (
    <RatingSlider
      value={value}
      onChange={onChange}
      label={hideLabel ? undefined : "Niveau de confort"}
      icon="star"
      labels={['Basique', 'Standard', 'Confort', 'Supérieur', 'Luxe']}
      disabled={disabled}
      className={className}
    />
  );
}

export function DifficultyRating({
  value,
  onChange,
  disabled,
  className,
  hideLabel = false,
}: Omit<RatingSliderProps, 'icon' | 'labels'> & { hideLabel?: boolean }) {
  return (
    <RatingSlider
      value={value}
      onChange={onChange}
      label={hideLabel ? undefined : "Niveau de difficulté"}
      icon="difficulty"
      labels={['Facile', 'Modéré', 'Moyen', 'Difficile', 'Expert']}
      disabled={disabled}
      className={className}
    />
  );
}
