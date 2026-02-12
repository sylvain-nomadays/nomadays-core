'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  MapPin,
  Compass,
  Tent,
  Bed,
  UtensilsCrossed,
  Map,
  Link2,
  Loader2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { searchContent } from '@/lib/api/content';
import type { ContentEntity } from '@/lib/api/types';

// ─── Constants ──────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  attraction: MapPin,
  destination: Compass,
  activity: Tent,
  accommodation: Bed,
  eating: UtensilsCrossed,
  region: Map,
};

const TYPE_LABELS: Record<string, string> = {
  attraction: 'Attraction',
  destination: 'Destination',
  activity: 'Activité',
  accommodation: 'Hébergement',
  eating: 'Restaurant',
  region: 'Région',
};

// ─── ContentRefToolbarButton ────────────────────────────────────────

interface ContentRefToolbarButtonProps {
  editor: Editor;
}

export function ContentRefToolbarButton({ editor }: ContentRefToolbarButtonProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ContentEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search handler ──
  const handleSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await searchContent(query, { limit: 10 });
        setResults(searchResults);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ── Select a result ──
  const handleSelect = useCallback(
    (entity: ContentEntity) => {
      const title =
        entity.translations?.[0]?.title || entity.entity_type || entity.entity_type;
      const slug = entity.translations?.[0]?.slug || '';

      editor
        .chain()
        .focus()
        .insertContentRef({
          type: entity.entity_type,
          slug,
          title,
          entityId: String(entity.id),
        })
        .run();

      setOpen(false);
      setResults([]);
    },
    [editor]
  );

  // ── Group results by entity type ──
  const groupedResults = results.reduce<Record<string, ContentEntity[]>>(
    (acc, entity) => {
      const type = entity.entity_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(entity);
      return acc;
    },
    {}
  );

  return (
    <>
      {/* Toolbar button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Insérer une référence contenu ({{)"
      >
        <Link2 className="w-4 h-4" />
      </button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher un contenu (attraction, hôtel, activité...)"
          onValueChange={handleSearch}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recherche en cours...</span>
              </div>
            ) : (
              'Aucun contenu trouvé. Tapez pour rechercher.'
            )}
          </CommandEmpty>

          {Object.entries(groupedResults).map(([type, entities]) => {
            const Icon = TYPE_ICONS[type] || MapPin;
            const label = TYPE_LABELS[type] || type;

            return (
              <CommandGroup key={type} heading={label}>
                {entities.map((entity) => {
                  const title =
                    entity.translations?.[0]?.title ||
                    entity.entity_type ||
                    '—';
                  const slug = entity.translations?.[0]?.slug || '';

                  return (
                    <CommandItem
                      key={entity.id}
                      value={`${title} ${slug} ${type}`}
                      onSelect={() => handleSelect(entity)}
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{title}</span>
                        {slug && (
                          <span className="ml-2 text-xs text-gray-400">
                            {slug}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
