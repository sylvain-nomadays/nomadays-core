'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { SupportedLanguage, ContentEntity } from '@/lib/api/types';

interface RelatedContentBlockProps {
  entityId: string;
  entityType: string;
  tagIds?: string[];
  language?: SupportedLanguage;
  maxItems?: number;
  className?: string;
  onNavigate?: (entityId: string) => void;
}

// Labels by language
const LABELS = {
  fr: {
    title: 'Autres articles qui pourraient vous interesser',
    loading: 'Chargement...',
    noContent: 'Aucun article lie',
  },
  en: {
    title: 'Other articles you might like',
    loading: 'Loading...',
    noContent: 'No related articles',
  },
  it: {
    title: 'Altri articoli che potrebbero interessarti',
    loading: 'Caricamento...',
    noContent: 'Nessun articolo correlato',
  },
  es: {
    title: 'Otros articulos que podrian interesarte',
    loading: 'Cargando...',
    noContent: 'No hay articulos relacionados',
  },
  de: {
    title: 'Andere Artikel, die Sie interessieren konnten',
    loading: 'Laden...',
    noContent: 'Keine verwandten Artikel',
  },
};

interface RelatedItem {
  id: string;
  entity_type: string;
  cover_image_url?: string;
  title: string;
  slug: string;
}

export function RelatedContentBlock({
  entityId,
  entityType,
  tagIds,
  language = 'fr',
  maxItems = 8,
  className = '',
  onNavigate,
}: RelatedContentBlockProps) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const labels = LABELS[language] || LABELS.fr;

  useEffect(() => {
    const fetchRelatedContent = async () => {
      try {
        // Fetch content entities with same type or tags, excluding current
        const params = new URLSearchParams({
          language_code: language,
          page_size: String(maxItems + 1), // +1 to account for excluding self
        });

        if (entityType) {
          params.append('entity_type', entityType);
        }

        if (tagIds && tagIds.length > 0) {
          params.append('tag_ids', tagIds.join(','));
        }

        const response = await apiClient.get<{
          items: Array<{
            id: string;
            entity_type: string;
            cover_image_url?: string;
            translations: Array<{
              language_code: string;
              title: string;
              slug: string;
            }>;
          }>;
        }>(`/content/entities?${params.toString()}`);

        // Filter out current entity and get translations
        const related = response.items
          .filter((item) => item.id !== entityId)
          .slice(0, maxItems)
          .map((item) => {
            const translation = item.translations?.find(
              (t) => t.language_code === language
            ) || item.translations?.[0];

            return {
              id: item.id,
              entity_type: item.entity_type,
              cover_image_url: item.cover_image_url,
              title: translation?.title || 'Sans titre',
              slug: translation?.slug || item.id,
            };
          });

        setItems(related);
      } catch (err) {
        setError('Impossible de charger les articles lies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedContent();
  }, [entityId, entityType, tagIds, language, maxItems]);

  if (isLoading) {
    return (
      <div className={`py-8 text-center text-muted-foreground ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        {labels.loading}
      </div>
    );
  }

  if (error || items.length === 0) {
    return null; // Don't show block if no related content
  }

  return (
    <section className={`py-8 ${className}`}>
      <h2 className="text-xl font-semibold mb-6">{labels.title}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <RelatedCard
            key={item.id}
            item={item}
            onClick={() => onNavigate?.(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

// Card with image overlay
function RelatedCard({
  item,
  onClick,
}: {
  item: RelatedItem;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 text-left"
    >
      {/* Image */}
      {item.cover_image_url ? (
        <img
          src={item.cover_image_url}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 drop-shadow-lg">
          {item.title}
        </h3>
      </div>

      {/* Hover effect */}
      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
