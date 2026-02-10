'use client';

import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ContentTranslation, SupportedLanguage } from '@/lib/api/types';

interface ContentLanguageNavProps {
  translations: ContentTranslation[];
  activeLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  entityId?: string;
  showMissingLanguages?: boolean;
}

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr', label: 'Francais', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'es', label: 'Espanol', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function ContentLanguageNav({
  translations,
  activeLanguage,
  onLanguageChange,
  showMissingLanguages = true,
}: ContentLanguageNavProps) {
  const availableLanguages = new Set(translations.map((t) => t.language_code));

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {LANGUAGES.map((lang) => {
        const hasTranslation = availableLanguages.has(lang.code);
        const isActive = activeLanguage === lang.code;
        const translation = translations.find((t) => t.language_code === lang.code);
        const isPrimary = translation?.is_primary;

        // Skip missing languages if not showing them
        if (!hasTranslation && !showMissingLanguages) return null;

        return (
          <button
            key={lang.code}
            onClick={() => hasTranslation && onLanguageChange(lang.code)}
            disabled={!hasTranslation}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : hasTranslation
                    ? 'bg-muted hover:bg-muted/80 text-foreground'
                    : 'bg-transparent text-muted-foreground/50 cursor-not-allowed'
              }
            `}
          >
            <span>{lang.flag}</span>
            <span className="uppercase">{lang.code}</span>
            {isPrimary && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                P
              </Badge>
            )}
          </button>
        );
      })}

      {/* Indicator for missing translations */}
      {showMissingLanguages && availableLanguages.size < LANGUAGES.length && (
        <div className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {availableLanguages.size}/{LANGUAGES.length}
        </div>
      )}
    </div>
  );
}
