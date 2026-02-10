'use client';

import { MapPin, Star, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentEntityTypeBadge, ContentStatusBadge } from './ContentStatusBadge';
import type { ContentEntity, SupportedLanguage } from '@/lib/api/types';

interface ContentCardProps {
  entity: ContentEntity;
  language?: SupportedLanguage;
  onClick?: () => void;
  showType?: boolean;
  showStatus?: boolean;
  compact?: boolean;
}

export function ContentCard({
  entity,
  language = 'fr',
  onClick,
  showType = true,
  showStatus = true,
  compact = false,
}: ContentCardProps) {
  const translation = entity.translations?.find((t) => t.language_code === language);

  if (compact) {
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
        onClick={onClick}
      >
        <CardContent className="p-3 flex items-center gap-3">
          {entity.cover_image_url && (
            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
              <img
                src={entity.cover_image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{translation?.title || 'Sans titre'}</h4>
            {entity.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {entity.location.name}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 overflow-hidden group"
      onClick={onClick}
    >
      {/* Cover Image */}
      {entity.cover_image_url && (
        <div className="aspect-[16/10] overflow-hidden bg-gray-100 relative">
          <img
            src={entity.cover_image_url}
            alt={translation?.title || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {showType && (
            <div className="absolute top-2 left-2">
              <ContentEntityTypeBadge type={entity.entity_type} size="sm" />
            </div>
          )}
          {entity.is_featured && (
            <Badge className="absolute top-2 right-2 bg-primary">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Mis en avant
            </Badge>
          )}
        </div>
      )}

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {translation?.title || 'Sans titre'}
        </h3>

        {/* Location */}
        {entity.location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3.5 w-3.5" />
            {entity.location.name}
          </p>
        )}

        {/* Excerpt */}
        {translation?.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {translation.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {entity.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{entity.rating}</span>
              </div>
            )}
            {entity.view_count > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{entity.view_count.toLocaleString()}</span>
              </div>
            )}
          </div>
          {showStatus && <ContentStatusBadge status={entity.status} size="sm" />}
        </div>

        {/* Tags */}
        {entity.tags && entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entity.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.labels[language] || tag.slug}
              </Badge>
            ))}
            {entity.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{entity.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
