/**
 * API module for Content Article system
 * Handles CRUD operations for content entities, translations, photos, tags, and relations
 */

import { apiClient } from './client';
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
} from './types';

const BASE_PATH = '/content';

// ============================================================================
// Content Entities
// ============================================================================

/**
 * Get a paginated list of content entities with filters
 */
export async function getContentEntities(
  filters?: ContentEntityFilters
): Promise<PaginatedResponse<ContentEntity>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
  }
  const queryString = params.toString();
  return apiClient.get(`${BASE_PATH}/entities${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get a single content entity by ID
 */
export async function getContentEntity(
  id: string,
  options?: { language?: SupportedLanguage; include_relations?: boolean }
): Promise<ContentEntity> {
  const params = new URLSearchParams();
  if (options?.language) params.append('language', options.language);
  if (options?.include_relations) params.append('include_relations', 'true');
  const queryString = params.toString();
  return apiClient.get(`${BASE_PATH}/entities/${id}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get a content entity by its slug and language
 */
export async function getContentEntityBySlug(
  slug: string,
  language: SupportedLanguage
): Promise<ContentEntity> {
  return apiClient.get(`${BASE_PATH}/entities/by-slug/${language}/${slug}`);
}

/**
 * Create a new content entity with initial translation
 */
export async function createContentEntity(
  data: CreateContentEntityDTO
): Promise<ContentEntity> {
  return apiClient.post(`${BASE_PATH}/entities`, data);
}

/**
 * Update an existing content entity
 */
export async function updateContentEntity(
  id: string,
  data: UpdateContentEntityDTO
): Promise<ContentEntity> {
  return apiClient.patch(`${BASE_PATH}/entities/${id}`, data);
}

/**
 * Delete a content entity (soft delete - archived)
 */
export async function deleteContentEntity(id: string): Promise<void> {
  return apiClient.delete(`${BASE_PATH}/entities/${id}`);
}

/**
 * Publish a content entity (change status to published)
 */
export async function publishContentEntity(id: string): Promise<ContentEntity> {
  return apiClient.post(`${BASE_PATH}/entities/${id}/publish`, {});
}

/**
 * Unpublish a content entity (change status to draft)
 */
export async function unpublishContentEntity(id: string): Promise<ContentEntity> {
  return apiClient.post(`${BASE_PATH}/entities/${id}/unpublish`, {});
}

// ============================================================================
// Translations
// ============================================================================

/**
 * Get all translations for an entity
 */
export async function getContentTranslations(
  entityId: string
): Promise<ContentTranslation[]> {
  return apiClient.get(`${BASE_PATH}/entities/${entityId}/translations`);
}

/**
 * Create a new translation for an entity
 */
export async function createContentTranslation(
  data: CreateContentTranslationDTO
): Promise<ContentTranslation> {
  return apiClient.post(`${BASE_PATH}/entities/${data.entity_id}/translations`, data);
}

/**
 * Update an existing translation
 */
export async function updateContentTranslation(
  entityId: string,
  languageCode: SupportedLanguage,
  data: UpdateContentTranslationDTO
): Promise<ContentTranslation> {
  return apiClient.patch(
    `${BASE_PATH}/entities/${entityId}/translations/${languageCode}`,
    data
  );
}

/**
 * Delete a translation
 */
export async function deleteContentTranslation(
  entityId: string,
  languageCode: SupportedLanguage
): Promise<void> {
  return apiClient.delete(
    `${BASE_PATH}/entities/${entityId}/translations/${languageCode}`
  );
}

// ============================================================================
// AI Generation
// ============================================================================

/**
 * Generate content using AI for specified languages
 */
export async function generateAIContent(
  data: AIGenerateContentDTO
): Promise<AIGenerationResult[]> {
  return apiClient.post(`${BASE_PATH}/ai/generate`, data);
}

/**
 * Get the status of AI generation for an entity
 */
export async function getAIGenerationStatus(
  entityId: string
): Promise<{ status: string; results: AIGenerationResult[] }> {
  return apiClient.get(`${BASE_PATH}/ai/status/${entityId}`);
}

/**
 * Get AI suggestions for internal links in content
 */
export async function suggestInternalLinks(
  entityId: string,
  content: string
): Promise<{ suggestions: Array<{ text: string; entity_id: string; entity_type: string }> }> {
  return apiClient.post(`${BASE_PATH}/ai/suggest-links`, { entity_id: entityId, content });
}

// ============================================================================
// Photos
// ============================================================================

/**
 * Get all photos for a content entity
 */
export async function getContentPhotos(entityId: string): Promise<ContentPhoto[]> {
  return apiClient.get(`${BASE_PATH}/entities/${entityId}/photos`);
}

/**
 * Upload a photo for a content entity
 */
export async function uploadContentPhoto(
  entityId: string,
  file: File,
  options?: {
    caption_json?: Record<SupportedLanguage, string>;
    is_cover?: boolean;
  }
): Promise<ContentPhoto> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.caption_json) {
    formData.append('caption_json', JSON.stringify(options.caption_json));
  }
  if (options?.is_cover) {
    formData.append('is_cover', 'true');
  }
  return apiClient.upload(`${BASE_PATH}/entities/${entityId}/photos`, formData);
}

/**
 * Update a photo's metadata
 */
export async function updateContentPhoto(
  entityId: string,
  photoId: string,
  data: Partial<ContentPhoto>
): Promise<ContentPhoto> {
  return apiClient.patch(`${BASE_PATH}/entities/${entityId}/photos/${photoId}`, data);
}

/**
 * Delete a photo
 */
export async function deleteContentPhoto(entityId: string, photoId: string): Promise<void> {
  return apiClient.delete(`${BASE_PATH}/entities/${entityId}/photos/${photoId}`);
}

/**
 * Reorder photos
 */
export async function reorderContentPhotos(
  entityId: string,
  photoIds: string[]
): Promise<void> {
  return apiClient.post(`${BASE_PATH}/entities/${entityId}/photos/reorder`, { photo_ids: photoIds });
}

// ============================================================================
// Tags
// ============================================================================

/**
 * Get all content tags for the current tenant
 */
export async function getContentTags(): Promise<ContentTag[]> {
  return apiClient.get(`${BASE_PATH}/tags`);
}

/**
 * Create a new content tag
 */
export async function createContentTag(
  data: Partial<ContentTag> & { slug: string; labels: Record<SupportedLanguage, string> }
): Promise<ContentTag> {
  return apiClient.post(`${BASE_PATH}/tags`, data);
}

/**
 * Update a content tag
 */
export async function updateContentTag(
  tagId: string,
  data: Partial<ContentTag>
): Promise<ContentTag> {
  return apiClient.patch(`${BASE_PATH}/tags/${tagId}`, data);
}

/**
 * Delete a content tag
 */
export async function deleteContentTag(tagId: string): Promise<void> {
  return apiClient.delete(`${BASE_PATH}/tags/${tagId}`);
}

/**
 * Update tags for an entity
 */
export async function updateEntityTags(entityId: string, tagIds: string[]): Promise<void> {
  return apiClient.put(`${BASE_PATH}/entities/${entityId}/tags`, { tag_ids: tagIds });
}

// ============================================================================
// Relations
// ============================================================================

/**
 * Get relations for a content entity
 */
export async function getContentRelations(
  entityId: string,
  type?: string
): Promise<ContentRelation[]> {
  const params = type ? `?type=${type}` : '';
  return apiClient.get(`${BASE_PATH}/entities/${entityId}/relations${params}`);
}

/**
 * Create a relation between two entities
 */
export async function createContentRelation(
  sourceId: string,
  targetId: string,
  type: string,
  bidirectional?: boolean
): Promise<ContentRelation> {
  return apiClient.post(`${BASE_PATH}/entities/${sourceId}/relations`, {
    target_entity_id: targetId,
    relation_type: type,
    is_bidirectional: bidirectional,
  });
}

/**
 * Delete a relation
 */
export async function deleteContentRelation(
  entityId: string,
  relationId: string
): Promise<void> {
  return apiClient.delete(`${BASE_PATH}/entities/${entityId}/relations/${relationId}`);
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search content entities
 */
export async function searchContent(
  query: string,
  options?: {
    types?: string[];
    language?: SupportedLanguage;
    limit?: number;
  }
): Promise<ContentEntity[]> {
  const params = new URLSearchParams({ q: query });
  if (options?.types) params.append('types', options.types.join(','));
  if (options?.language) params.append('language', options.language);
  if (options?.limit) params.append('limit', String(options.limit));
  return apiClient.get(`${BASE_PATH}/search?${params.toString()}`);
}

/**
 * Get nearby content entities based on coordinates
 */
export async function getNearbyContent(
  lat: number,
  lng: number,
  radiusKm: number,
  options?: {
    types?: string[];
    limit?: number;
  }
): Promise<ContentEntity[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radiusKm),
  });
  if (options?.types) params.append('types', options.types.join(','));
  if (options?.limit) params.append('limit', String(options.limit));
  return apiClient.get(`${BASE_PATH}/nearby?${params.toString()}`);
}
