'use client';

import { useMemo } from 'react';
import { QuoteRequestCTA } from './QuoteRequestCTA';
import { RelatedCircuitsBlock } from './RelatedCircuitsBlock';
import { RelatedContentBlock } from './RelatedContentBlock';
import type { SupportedLanguage, ContentEntity } from '@/lib/api/types';

interface ContentCTARendererProps {
  entity: ContentEntity;
  language: SupportedLanguage;
  position: 'inline' | 'sidebar' | 'bottom';
  locationName?: string;
  locationId?: number;
  onContactClick?: () => void;
  onNavigateToCircuit?: (circuitId: number) => void;
  onNavigateToContent?: (entityId: string) => void;
}

/**
 * Renders CTA blocks based on position and entity context.
 *
 * Positions:
 * - inline: Inserted within the content (after intro or middle)
 * - sidebar: Quote request CTA in the sidebar
 * - bottom: Related circuits and articles at the end
 */
export function ContentCTARenderer({
  entity,
  language,
  position,
  locationName,
  locationId,
  onContactClick,
  onNavigateToCircuit,
  onNavigateToContent,
}: ContentCTARendererProps) {
  // Get tag IDs for related content filtering
  const tagIds = useMemo(() => {
    return entity.tags?.map((tag) => tag.id) || [];
  }, [entity.tags]);

  // Derive location name from entity if not provided
  const derivedLocationName = locationName || entity.location?.name;

  // Sidebar position: Quote request CTA only
  if (position === 'sidebar') {
    return (
      <QuoteRequestCTA
        language={language}
        variant="sidebar"
        destinationName={derivedLocationName}
        onContactClick={onContactClick}
      />
    );
  }

  // Inline position: Banner-style CTA within content
  if (position === 'inline') {
    return (
      <QuoteRequestCTA
        language={language}
        variant="banner"
        destinationName={derivedLocationName}
        onContactClick={onContactClick}
        className="my-6"
      />
    );
  }

  // Bottom position: Related circuits + Related articles
  if (position === 'bottom') {
    return (
      <div className="space-y-8 mt-8 pt-8 border-t">
        {/* Related circuits passing through this location */}
        {locationId && (
          <RelatedCircuitsBlock
            locationId={locationId}
            language={language}
            maxCircuits={4}
          />
        )}

        {/* Related articles by type and tags */}
        <RelatedContentBlock
          entityId={entity.id}
          entityType={entity.entity_type}
          tagIds={tagIds}
          language={language}
          maxItems={8}
          onNavigate={onNavigateToContent}
        />

        {/* Final CTA card */}
        <QuoteRequestCTA
          language={language}
          variant="card"
          destinationName={derivedLocationName}
          onContactClick={onContactClick}
          className="max-w-md mx-auto"
        />
      </div>
    );
  }

  return null;
}

/**
 * Utility to insert inline CTA within markdown/HTML content.
 * Inserts CTA after approximately the specified word count.
 */
export function insertInlineCTA(
  content: string,
  ctaHtml: string,
  insertAfterWords: number = 400
): string {
  // Split content into words
  const words = content.split(/\s+/);

  if (words.length < insertAfterWords) {
    // Content too short, append at end
    return content + '\n\n' + ctaHtml;
  }

  // Find a good break point (end of paragraph) near the target word count
  let currentWordCount = 0;
  let insertIndex = 0;

  // Look for paragraph breaks (double newline or closing tags)
  const paragraphBreaks = [...content.matchAll(/(<\/p>|<\/div>|\n\n)/gi)];

  for (const match of paragraphBreaks) {
    const textBefore = content.slice(0, match.index);
    const wordsBefore = textBefore.split(/\s+/).length;

    if (wordsBefore >= insertAfterWords) {
      insertIndex = (match.index || 0) + match[0].length;
      break;
    }
  }

  // If no good break found, insert after target word count
  if (insertIndex === 0) {
    let wordCount = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char && /\s/.test(char)) {
        wordCount++;
        if (wordCount >= insertAfterWords) {
          insertIndex = i;
          break;
        }
      }
    }
  }

  // Insert CTA
  return content.slice(0, insertIndex) + '\n\n' + ctaHtml + '\n\n' + content.slice(insertIndex);
}

/**
 * Hook-friendly wrapper for inserting CTAs into rendered content
 */
export function useContentWithCTA(
  contentHtml: string | undefined,
  entity: ContentEntity,
  language: SupportedLanguage,
  options: {
    insertInlineCTA?: boolean;
    inlineCTAAfterWords?: number;
    locationName?: string;
  } = {}
): {
  contentBefore: string;
  contentAfter: string;
  hasInlineCTA: boolean;
} {
  const {
    insertInlineCTA: shouldInsertInline = false,
    inlineCTAAfterWords = 400,
    locationName,
  } = options;

  return useMemo(() => {
    if (!contentHtml) {
      return {
        contentBefore: '',
        contentAfter: '',
        hasInlineCTA: false,
      };
    }

    if (!shouldInsertInline) {
      return {
        contentBefore: contentHtml,
        contentAfter: '',
        hasInlineCTA: false,
      };
    }

    // Count words to determine if we should split
    const wordCount = contentHtml.split(/\s+/).length;

    if (wordCount < inlineCTAAfterWords * 1.5) {
      // Content not long enough for inline CTA
      return {
        contentBefore: contentHtml,
        contentAfter: '',
        hasInlineCTA: false,
      };
    }

    // Find split point
    let currentWordCount = 0;
    let splitIndex = 0;

    // Look for paragraph breaks near the target
    const paragraphBreaks = [...contentHtml.matchAll(/(<\/p>|<\/div>|\n\n)/gi)];

    for (const match of paragraphBreaks) {
      const textBefore = contentHtml.slice(0, match.index);
      const wordsBefore = textBefore.replace(/<[^>]*>/g, '').split(/\s+/).length;

      if (wordsBefore >= inlineCTAAfterWords) {
        splitIndex = (match.index || 0) + match[0].length;
        break;
      }
    }

    if (splitIndex === 0) {
      return {
        contentBefore: contentHtml,
        contentAfter: '',
        hasInlineCTA: false,
      };
    }

    return {
      contentBefore: contentHtml.slice(0, splitIndex),
      contentAfter: contentHtml.slice(splitIndex),
      hasInlineCTA: true,
    };
  }, [contentHtml, shouldInsertInline, inlineCTAAfterWords]);
}
