'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Globe, AlertTriangle, Check, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTripLanguages, LanguageStatus } from '@/hooks/useTranslation';

interface LanguageSelectorProps {
  tripId: number;
  sourceLanguage: string;
  currentPreviewLanguage: string | null;
  onLanguageSelect: (language: string) => void;
  onOpenTranslation?: (tripId: number) => void;
  isLoading?: boolean;
}

// Flag emojis for languages
const FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ja: '🇯🇵',
};

export function LanguageSelector({
  tripId,
  sourceLanguage,
  currentPreviewLanguage,
  onLanguageSelect,
  onOpenTranslation,
  isLoading = false,
}: LanguageSelectorProps) {
  const { data: languagesData, refetch } = useTripLanguages(tripId);
  const [isOpen, setIsOpen] = useState(false);

  // Refresh languages when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const activeLanguage = currentPreviewLanguage || sourceLanguage;
  const activeFlag = FLAGS[activeLanguage] || '🌐';
  const activeName = languagesData?.languages.find(l => l.code === activeLanguage)?.name || activeLanguage.toUpperCase();

  const getStatusIcon = (lang: LanguageStatus) => {
    if (lang.code === sourceLanguage) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    if (lang.has_independent_copy) {
      return <ExternalLink className="h-4 w-4 text-blue-500" />;
    }
    if (lang.has_cache && lang.is_stale) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    if (lang.has_cache && !lang.is_stale) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const getStatusLabel = (lang: LanguageStatus): string => {
    if (lang.code === sourceLanguage) {
      return 'original';
    }
    if (lang.has_independent_copy) {
      return 'copie indépendante';
    }
    if (lang.has_cache && lang.is_stale) {
      return 'obsolète';
    }
    if (lang.has_cache && !lang.is_stale) {
      return 'à jour';
    }
    return 'non généré';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="text-lg">{activeFlag}</span>
              <span className="font-medium">{activeLanguage.toUpperCase()}</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          <Globe className="inline-block h-4 w-4 mr-2" />
          Prévisualiser en
        </div>
        <DropdownMenuSeparator />

        {languagesData?.languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => {
              if (lang.has_independent_copy && onOpenTranslation && lang.independent_copy_id) {
                onOpenTranslation(lang.independent_copy_id);
              } else {
                onLanguageSelect(lang.code);
              }
              setIsOpen(false);
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(lang)}
              <Badge
                variant={
                  lang.code === sourceLanguage
                    ? 'default'
                    : lang.has_cache && !lang.is_stale
                    ? 'secondary'
                    : lang.is_stale
                    ? 'outline'
                    : 'outline'
                }
                className={`text-xs ${
                  lang.is_stale ? 'border-amber-400 text-amber-600' : ''
                }`}
              >
                {getStatusLabel(lang)}
              </Badge>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ========== Stale Warning Banner ==========

interface StaleWarningBannerProps {
  cachedAt?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function StaleWarningBanner({
  cachedAt,
  onRefresh,
  isRefreshing = false,
}: StaleWarningBannerProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-amber-800 font-medium">
            Prévisualisation obsolète
          </p>
          <p className="text-amber-700 text-sm mt-1">
            Cette traduction a été générée le {formatDate(cachedAt)}.
            Le contenu original a été modifié depuis.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Régénérer
        </Button>
      </div>
    </div>
  );
}

// ========== Preview Mode Indicator ==========

interface PreviewModeIndicatorProps {
  language: string;
  languageName: string;
  languageFlag: string;
  onExitPreview: () => void;
}

export function PreviewModeIndicator({
  language,
  languageName,
  languageFlag,
  onExitPreview,
}: PreviewModeIndicatorProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{languageFlag}</span>
          <span className="text-blue-800 font-medium">
            Mode prévisualisation : {languageName}
          </span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Lecture seule
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitPreview}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          Quitter la prévisualisation
        </Button>
      </div>
    </div>
  );
}
