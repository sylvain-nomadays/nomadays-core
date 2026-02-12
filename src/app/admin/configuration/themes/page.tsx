'use client';

import Link from 'next/link';
import {
  Palette,
  ArrowLeft,
  Loader2,
  Lock,
} from 'lucide-react';
import { useTravelThemes } from '@/hooks/useTravelThemes';
import { ThemeIcon } from '@/components/ui/theme-icon';

export default function ThemesConfigPage() {
  const { themes, isLoading } = useTravelThemes();

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Back link + Header */}
      <div className="mb-6">
        <Link
          href="/admin/configuration"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Configuration
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Palette className="w-7 h-7 text-teal-600" />
              Thématiques de voyage
            </h1>
            <p className="text-gray-500 mt-1">
              12 thématiques prédéfinies. Chaque circuit peut être associé à 3 thématiques maximum.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
            <Lock className="w-3 h-3" />
            Liste fixe
          </div>
        </div>
      </div>

      {/* Themes grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : themes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Palette className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">Aucune thématique configurée</p>
          <p className="text-sm text-gray-400">
            Les thématiques seront automatiquement créées lors du premier accès.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {themes.map((theme, index) => (
            <div
              key={theme.id}
              className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm"
            >
              {/* Number */}
              <span className="w-6 text-sm font-medium text-gray-400 text-right flex-shrink-0">
                {index + 1}
              </span>

              {/* Phosphor Duotone icon with Nomadays color background */}
              <ThemeIcon code={theme.code} size={22} bgSize="w-10 h-10" />

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-gray-800">
                    {theme.label}
                  </span>
                  {theme.label_en && (
                    <span className="text-xs text-gray-400">
                      ({theme.label_en})
                    </span>
                  )}
                </div>
                {theme.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {theme.description}
                  </p>
                )}
              </div>

              {/* Color dot */}
              {theme.color && (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: theme.color }}
                  title={theme.color}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-display font-semibold text-sm text-gray-700 mb-2">Comment fonctionnent les thématiques ?</h3>
        <ul className="text-sm text-gray-500 space-y-1.5">
          <li>
            <strong className="text-gray-600">1.</strong> Les 12 thématiques sont prédéfinies et communes à tous les agents
          </li>
          <li>
            <strong className="text-gray-600">2.</strong> Chaque circuit peut être associé à un maximum de 3 thématiques
          </li>
          <li>
            <strong className="text-gray-600">3.</strong> Les thématiques servent au filtrage et à la navigation sur le site B2C
          </li>
          <li>
            <strong className="text-gray-600">4.</strong> Elles remplacent l&apos;ancien système de tags libres (30+ thèmes non contrôlés)
          </li>
        </ul>
      </div>
    </div>
  );
}
