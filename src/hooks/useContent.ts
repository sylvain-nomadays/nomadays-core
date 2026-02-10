'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useApi, useMutation } from './useApi';
import * as contentApi from '@/lib/api/content';
import type {
  ContentEntity,
  ContentTranslation,
  ContentPhoto,
  ContentTag,
  ContentRelation,
  CreateContentEntityDTO,
  UpdateContentEntityDTO,
  CreateContentTranslationDTO,
  UpdateContentTranslationDTO,
  AIGenerateContentDTO,
  AIGenerationResult,
  ContentEntityFilters,
  PaginatedResponse,
  SupportedLanguage,
  ContentEntityType,
} from '@/lib/api/types';

// ============================================================================
// Content Entities Hooks
// ============================================================================

/**
 * Hook to fetch a paginated list of content entities with filters
 */
export function useContentEntities(filters: ContentEntityFilters = {}) {
  const fetcher = useCallback(async () => {
    return contentApi.getContentEntities(filters);
  }, [
    filters.entity_type,
    filters.status,
    filters.language_code,
    filters.location_id,
    filters.parent_id,
    filters.tag_ids?.join(','),
    filters.is_featured,
    filters.has_ai_content,
    filters.search,
    filters.page,
    filters.page_size,
    filters.sort_by,
    filters.sort_order,
  ]);

  return useApi(fetcher, {
    immediate: true,
    deps: [
      filters.entity_type,
      filters.status,
      filters.language_code,
      filters.location_id,
      filters.parent_id,
      filters.tag_ids?.join(','),
      filters.is_featured,
      filters.has_ai_content,
      filters.search,
      filters.page,
      filters.page_size,
      filters.sort_by,
      filters.sort_order,
    ],
  });
}

/**
 * Hook to fetch a single content entity by ID
 */
export function useContentEntity(
  id: string | null,
  options?: {
    language?: SupportedLanguage;
    include_relations?: boolean;
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled !== false && !!id;

  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Entity ID is required');
    return contentApi.getContentEntity(id, {
      language: options?.language,
      include_relations: options?.include_relations,
    });
  }, [id, options?.language, options?.include_relations]);

  return useApi(fetcher, {
    immediate: enabled,
    deps: [id, options?.language, options?.include_relations],
  });
}

/**
 * Hook to fetch a content entity by slug
 */
export function useContentEntityBySlug(
  slug: string | null,
  language: SupportedLanguage = 'fr'
) {
  const fetcher = useCallback(async () => {
    if (!slug) throw new Error('Slug is required');
    return contentApi.getContentEntityBySlug(slug, language);
  }, [slug, language]);

  return useApi(fetcher, {
    immediate: !!slug,
    deps: [slug, language],
  });
}

/**
 * Hook to create a content entity
 */
export function useCreateContentEntity() {
  return useMutation(async (data: CreateContentEntityDTO) => {
    return contentApi.createContentEntity(data);
  });
}

/**
 * Hook to update a content entity
 */
export function useUpdateContentEntity() {
  return useMutation(async ({ id, data }: { id: string; data: UpdateContentEntityDTO }) => {
    return contentApi.updateContentEntity(id, data);
  });
}

/**
 * Hook to delete a content entity
 */
export function useDeleteContentEntity() {
  return useMutation(async (id: string) => {
    return contentApi.deleteContentEntity(id);
  });
}

/**
 * Hook to publish a content entity
 */
export function usePublishContentEntity() {
  return useMutation(async (id: string) => {
    return contentApi.publishContentEntity(id);
  });
}

/**
 * Hook to unpublish a content entity
 */
export function useUnpublishContentEntity() {
  return useMutation(async (id: string) => {
    return contentApi.unpublishContentEntity(id);
  });
}

// ============================================================================
// Content Search Hook with Debounce
// ============================================================================

/**
 * Hook for searching content with debounce
 */
export function useContentSearch(
  filters: ContentEntityFilters,
  options?: { debounceMs?: number }
) {
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceMs = options?.debounceMs ?? 300;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce filter changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [filters, debounceMs]);

  return useContentEntities(debouncedFilters);
}

// ============================================================================
// Translations Hooks
// ============================================================================

/**
 * Hook to fetch translations for an entity
 */
export function useContentTranslations(entityId: string | null) {
  const fetcher = useCallback(async () => {
    if (!entityId) throw new Error('Entity ID is required');
    return contentApi.getContentTranslations(entityId);
  }, [entityId]);

  return useApi(fetcher, {
    immediate: !!entityId,
    deps: [entityId],
  });
}

/**
 * Hook to create a translation
 */
export function useCreateContentTranslation() {
  return useMutation(async (data: CreateContentTranslationDTO) => {
    return contentApi.createContentTranslation(data);
  });
}

/**
 * Hook to update a translation
 */
export function useUpdateContentTranslation() {
  return useMutation(
    async ({
      entityId,
      languageCode,
      data,
    }: {
      entityId: string;
      languageCode: SupportedLanguage;
      data: UpdateContentTranslationDTO;
    }) => {
      return contentApi.updateContentTranslation(entityId, languageCode, data);
    }
  );
}

/**
 * Hook to delete a translation
 */
export function useDeleteContentTranslation() {
  return useMutation(
    async ({ entityId, languageCode }: { entityId: string; languageCode: SupportedLanguage }) => {
      return contentApi.deleteContentTranslation(entityId, languageCode);
    }
  );
}

// ============================================================================
// AI Generation Hooks
// ============================================================================

/**
 * Hook to generate AI content
 */
export function useGenerateAIContent() {
  return useMutation(async (data: AIGenerateContentDTO) => {
    return contentApi.generateAIContent(data);
  });
}

/**
 * Hook to get AI generation status
 */
export function useAIGenerationStatus(entityId: string | null) {
  const fetcher = useCallback(async () => {
    if (!entityId) throw new Error('Entity ID is required');
    return contentApi.getAIGenerationStatus(entityId);
  }, [entityId]);

  return useApi(fetcher, {
    immediate: !!entityId,
    deps: [entityId],
  });
}

/**
 * Hook to suggest internal links
 */
export function useSuggestInternalLinks() {
  return useMutation(async ({ entityId, content }: { entityId: string; content: string }) => {
    return contentApi.suggestInternalLinks(entityId, content);
  });
}

// ============================================================================
// Photos Hooks
// ============================================================================

/**
 * Hook to fetch photos for an entity
 */
export function useContentPhotos(entityId: string | null) {
  const fetcher = useCallback(async () => {
    if (!entityId) throw new Error('Entity ID is required');
    return contentApi.getContentPhotos(entityId);
  }, [entityId]);

  return useApi(fetcher, {
    immediate: !!entityId,
    deps: [entityId],
  });
}

/**
 * Hook to upload a photo
 */
export function useUploadContentPhoto() {
  return useMutation(
    async ({
      entityId,
      file,
      options,
    }: {
      entityId: string;
      file: File;
      options?: { caption_json?: Record<SupportedLanguage, string>; is_cover?: boolean };
    }) => {
      return contentApi.uploadContentPhoto(entityId, file, options);
    }
  );
}

/**
 * Hook to update a photo
 */
export function useUpdateContentPhoto() {
  return useMutation(
    async ({
      entityId,
      photoId,
      data,
    }: {
      entityId: string;
      photoId: string;
      data: Partial<ContentPhoto>;
    }) => {
      return contentApi.updateContentPhoto(entityId, photoId, data);
    }
  );
}

/**
 * Hook to delete a photo
 */
export function useDeleteContentPhoto() {
  return useMutation(async ({ entityId, photoId }: { entityId: string; photoId: string }) => {
    return contentApi.deleteContentPhoto(entityId, photoId);
  });
}

/**
 * Hook to reorder photos
 */
export function useReorderContentPhotos() {
  return useMutation(async ({ entityId, photoIds }: { entityId: string; photoIds: string[] }) => {
    return contentApi.reorderContentPhotos(entityId, photoIds);
  });
}

// ============================================================================
// Tags Hooks
// ============================================================================

/**
 * Hook to fetch all content tags
 */
export function useContentTags() {
  const fetcher = useCallback(async () => {
    return contentApi.getContentTags();
  }, []);

  return useApi(fetcher, {
    immediate: true,
    deps: [],
  });
}

/**
 * Hook to create a tag
 */
export function useCreateContentTag() {
  return useMutation(
    async (data: Partial<ContentTag> & { slug: string; labels: Record<SupportedLanguage, string> }) => {
      return contentApi.createContentTag(data);
    }
  );
}

/**
 * Hook to update a tag
 */
export function useUpdateContentTag() {
  return useMutation(async ({ tagId, data }: { tagId: string; data: Partial<ContentTag> }) => {
    return contentApi.updateContentTag(tagId, data);
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteContentTag() {
  return useMutation(async (tagId: string) => {
    return contentApi.deleteContentTag(tagId);
  });
}

/**
 * Hook to update entity tags
 */
export function useUpdateEntityTags() {
  return useMutation(async ({ entityId, tagIds }: { entityId: string; tagIds: string[] }) => {
    return contentApi.updateEntityTags(entityId, tagIds);
  });
}

// ============================================================================
// Relations Hooks
// ============================================================================

/**
 * Hook to fetch relations for an entity
 */
export function useContentRelations(entityId: string | null, type?: string) {
  const fetcher = useCallback(async () => {
    if (!entityId) throw new Error('Entity ID is required');
    return contentApi.getContentRelations(entityId, type);
  }, [entityId, type]);

  return useApi(fetcher, {
    immediate: !!entityId,
    deps: [entityId, type],
  });
}

/**
 * Hook to create a relation
 */
export function useCreateContentRelation() {
  return useMutation(
    async ({
      sourceId,
      targetId,
      type,
      bidirectional,
    }: {
      sourceId: string;
      targetId: string;
      type: string;
      bidirectional?: boolean;
    }) => {
      return contentApi.createContentRelation(sourceId, targetId, type, bidirectional);
    }
  );
}

/**
 * Hook to delete a relation
 */
export function useDeleteContentRelation() {
  return useMutation(async ({ entityId, relationId }: { entityId: string; relationId: string }) => {
    return contentApi.deleteContentRelation(entityId, relationId);
  });
}

// ============================================================================
// Search Hooks
// ============================================================================

/**
 * Hook to search content
 */
export function useSearchContent() {
  return useMutation(
    async ({
      query,
      options,
    }: {
      query: string;
      options?: { types?: string[]; language?: SupportedLanguage; limit?: number };
    }) => {
      return contentApi.searchContent(query, options);
    }
  );
}

/**
 * Hook to get nearby content
 */
export function useNearbyContent(
  lat: number | null,
  lng: number | null,
  radiusKm: number = 50,
  options?: { types?: string[]; limit?: number }
) {
  const fetcher = useCallback(async () => {
    if (lat === null || lng === null) throw new Error('Coordinates are required');
    return contentApi.getNearbyContent(lat, lng, radiusKm, options);
  }, [lat, lng, radiusKm, options?.types?.join(','), options?.limit]);

  return useApi(fetcher, {
    immediate: lat !== null && lng !== null,
    deps: [lat, lng, radiusKm, options?.types?.join(','), options?.limit],
  });
}
