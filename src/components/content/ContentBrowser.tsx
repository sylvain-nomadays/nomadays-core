'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Grid, List, Plus, RefreshCw, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentCard } from './ContentCard';
import { ContentSidePanel } from './ContentSidePanel';
import { useContentSearch } from '@/hooks/useContent';
import type {
  ContentEntity,
  ContentEntityType,
  ContentStatus,
  SupportedLanguage,
  ContentEntityFilters,
} from '@/lib/api/types';

const ENTITY_TYPES: { value: ContentEntityType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les types' },
  { value: 'attraction', label: 'Attractions' },
  { value: 'destination', label: 'Destinations' },
  { value: 'activity', label: 'Activites' },
  { value: 'accommodation', label: 'Hebergements' },
  { value: 'eating', label: 'Restaurants' },
  { value: 'region', label: 'Regions' },
];

const STATUS_OPTIONS: { value: ContentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'review', label: 'En revision' },
  { value: 'published', label: 'Publie' },
  { value: 'archived', label: 'Archive' },
];

const LANGUAGES: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'fr', label: 'Francais', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'es', label: 'Espanol', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

interface ContentBrowserProps {
  defaultType?: ContentEntityType;
  onSelect?: (entity: ContentEntity) => void;
  selectionMode?: boolean;
  onCreate?: () => void;
}

export function ContentBrowser({
  defaultType,
  onSelect,
  selectionMode = false,
  onCreate,
}: ContentBrowserProps) {
  // Filters state
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<ContentEntityType | 'all'>(defaultType || 'all');
  const [status, setStatus] = useState<ContentStatus | 'all'>('all');
  const [language, setLanguage] = useState<SupportedLanguage>('fr');

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selected entity for side panel
  const [selectedEntity, setSelectedEntity] = useState<ContentEntity | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Build filters object
  const filters: ContentEntityFilters = useMemo(
    () => ({
      search: search || undefined,
      entity_type: entityType === 'all' ? undefined : entityType,
      status: status === 'all' ? undefined : status,
      language_code: language,
      page_size: 50,
    }),
    [search, entityType, status, language]
  );

  // Search with debounce
  const { data, loading: isLoading, error, refetch } = useContentSearch(filters, { debounceMs: 300 });

  const handleEntityClick = (entity: ContentEntity) => {
    if (selectionMode && onSelect) {
      onSelect(entity);
    } else {
      setSelectedEntity(entity);
      setIsPanelOpen(true);
    }
  };

  const handleNavigate = (entityId: string) => {
    const entity = data?.items.find((e) => e.id === entityId);
    if (entity) {
      setSelectedEntity(entity);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setEntityType(defaultType || 'all');
    setStatus('all');
  };

  const hasActiveFilters = search || entityType !== 'all' || status !== 'all';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher du contenu..."
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nouveau
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <Select
            value={entityType}
            onValueChange={(v) => setEntityType(v as ContentEntityType | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Language */}
          <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguage)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}

          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Results count */}
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total} resultat{data.total > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content Grid/List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-2">Erreur lors du chargement</p>
              <Button variant="outline" onClick={() => refetch()}>
                Reessayer
              </Button>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Aucun contenu trouve</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
              )}
              {onCreate && !hasActiveFilters && (
                <Button onClick={onCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Creer un contenu
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.items.map((entity) => (
                <ContentCard
                  key={entity.id}
                  entity={entity}
                  language={language}
                  onClick={() => handleEntityClick(entity)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data?.items.map((entity) => (
                <ContentCard
                  key={entity.id}
                  entity={entity}
                  language={language}
                  onClick={() => handleEntityClick(entity)}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Side Panel */}
      <ContentSidePanel
        entity={selectedEntity}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onNavigate={handleNavigate}
        initialLanguage={language}
      />
    </div>
  );
}
