'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Edit,
  Eye,
  Loader2,
  Sparkles,
  MapPin,
  Star,
  Tag,
  Link2,
  Image,
  Globe,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentLanguageNav } from './ContentLanguageNav';
import { ContentEntityTypeBadge, ContentStatusBadge } from './ContentStatusBadge';
import { ContentEditor } from './ContentEditor';
import { ContentSEOPanel } from './ContentSEOPanel';
import { ContentCTARenderer, useContentWithCTA } from './ContentCTARenderer';
import type { ContentEntity, ContentTranslation, SupportedLanguage } from '@/lib/api/types';

interface ContentSidePanelProps {
  entity: ContentEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (entity: ContentEntity) => void;
  onNavigate?: (entityId: string) => void;
  onNavigateToCircuit?: (circuitId: number) => void;
  onContactClick?: () => void;
  initialMode?: 'view' | 'edit';
  initialLanguage?: SupportedLanguage;
  showCTAs?: boolean;
}

export function ContentSidePanel({
  entity,
  isOpen,
  onClose,
  onSave,
  onNavigate,
  onNavigateToCircuit,
  onContactClick,
  initialMode = 'view',
  initialLanguage = 'fr',
  showCTAs = true,
}: ContentSidePanelProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [activeTab, setActiveTab] = useState<'content' | 'photos' | 'relations' | 'seo'>('content');
  const [isLoading, setIsLoading] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<ContentTranslation>>({});

  const activeTranslation = entity?.translations?.find(
    (t) => t.language_code === activeLanguage
  );

  // Hook pour découper le contenu et insérer les CTAs inline
  // Note: On passe entity || un objet vide factice pour éviter les erreurs de type
  // Le hook gère le cas où contentHtml est undefined
  const { contentBefore, contentAfter, hasInlineCTA } = useContentWithCTA(
    activeTranslation?.content_html,
    entity || ({} as ContentEntity),
    activeLanguage,
    {
      insertInlineCTA: mode === 'view' && showCTAs && !!entity,
      inlineCTAAfterWords: 400,
    }
  );

  // Handle editor changes
  const handleEditorChange = useCallback((updates: Partial<ContentTranslation>) => {
    setPendingChanges((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    if (!entity) return;
    setIsLoading(true);
    try {
      // Save logic here
      onSave?.(entity);
    } finally {
      setIsLoading(false);
    }
  };

  if (!entity) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
        showCloseButton={false}
      >
        {/* Header with Cover Image */}
        <div className="flex-shrink-0 border-b bg-white">
          {/* Cover Image - only in view mode */}
          {entity.cover_image_url && mode === 'view' && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={entity.cover_image_url}
                alt={activeTranslation?.title || ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <ContentEntityTypeBadge type={entity.entity_type} size="sm" />
                <h2 className="text-xl font-bold text-white line-clamp-2 mt-2">
                  {activeTranslation?.title || 'Sans titre'}
                </h2>
              </div>
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Header without image or in edit mode */}
          {(!entity.cover_image_url || mode === 'edit') && (
            <SheetHeader className="p-4 pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <ContentEntityTypeBadge type={entity.entity_type} size="sm" />
                  <SheetTitle className="text-xl mt-2">
                    {activeTranslation?.title || 'Nouveau contenu'}
                  </SheetTitle>
                  {entity.location && (
                    <SheetDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {entity.location.name}
                    </SheetDescription>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </SheetHeader>
          )}

          {/* Language Navigation */}
          <div className="px-4 pt-3">
            <ContentLanguageNav
              translations={entity.translations || []}
              activeLanguage={activeLanguage}
              onLanguageChange={setActiveLanguage}
              entityId={entity.id}
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              {entity.rating && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{entity.rating}</span>
                </div>
              )}
              <ContentStatusBadge status={entity.status} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAIGenerator(true)}>
                <Sparkles className="h-4 w-4 mr-1" />
                IA
              </Button>
              <Button
                variant={mode === 'edit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              >
                {mode === 'edit' ? (
                  <Eye className="h-4 w-4 mr-1" />
                ) : (
                  <Edit className="h-4 w-4 mr-1" />
                )}
                {mode === 'edit' ? 'Apercu' : 'Modifier'}
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full justify-start px-4 bg-transparent border-b rounded-none h-auto pb-0">
              <TabsTrigger
                value="content"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Contenu
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Image className="h-4 w-4 mr-1" />
                Photos
              </TabsTrigger>
              <TabsTrigger
                value="relations"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Link2 className="h-4 w-4 mr-1" />
                Liens
              </TabsTrigger>
              <TabsTrigger
                value="seo"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Globe className="h-4 w-4 mr-1" />
                SEO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <Tabs value={activeTab}>
            <TabsContent value="content" className="p-4 m-0">
              {mode === 'view' ? (
                <div className="prose prose-sm max-w-none">
                  {/* Excerpt */}
                  {activeTranslation?.excerpt && (
                    <p className="lead text-muted-foreground italic border-l-4 border-primary pl-4">
                      {activeTranslation.excerpt}
                    </p>
                  )}

                  {/* Contenu avant CTA inline (ou contenu complet si pas de CTA) */}
                  {contentBefore ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: contentBefore }}
                      className="mt-4"
                    />
                  ) : activeTranslation?.content_markdown ? (
                    <div className="mt-4 whitespace-pre-wrap">{activeTranslation.content_markdown}</div>
                  ) : !activeTranslation?.content_html ? (
                    <p className="text-muted-foreground italic mt-4">
                      Aucun contenu pour cette langue. Cliquez sur Modifier pour ajouter du contenu.
                    </p>
                  ) : null}

                  {/* CTA inline (si contenu assez long) */}
                  {hasInlineCTA && showCTAs && (
                    <ContentCTARenderer
                      entity={entity}
                      language={activeLanguage}
                      position="inline"
                      onContactClick={onContactClick}
                    />
                  )}

                  {/* Contenu après CTA inline */}
                  {contentAfter && (
                    <div dangerouslySetInnerHTML={{ __html: contentAfter }} />
                  )}

                  {/* Tags Section */}
                  {entity.tags && entity.tags.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {entity.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.labels[activeLanguage] || tag.slug}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTAs bottom (circuits liés + articles connexes) */}
                  {showCTAs && (
                    <ContentCTARenderer
                      entity={entity}
                      language={activeLanguage}
                      position="bottom"
                      locationId={entity.location?.id}
                      onNavigateToCircuit={onNavigateToCircuit}
                      onNavigateToContent={onNavigate}
                      onContactClick={onContactClick}
                    />
                  )}
                </div>
              ) : (
                <ContentEditor
                  translation={activeTranslation || null}
                  language={activeLanguage}
                  onChange={handleEditorChange}
                  disabled={isLoading}
                />
              )}
            </TabsContent>

            <TabsContent value="photos" className="p-4 m-0">
              {entity.photos && entity.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {entity.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 relative ${
                        photo.is_cover ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                    >
                      <img
                        src={photo.thumbnail_url || photo.url}
                        alt={photo.alt_text_json?.[activeLanguage] || ''}
                        className="w-full h-full object-cover"
                      />
                      {photo.is_cover && (
                        <Badge className="absolute top-2 left-2 text-xs">Couverture</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucune photo. Cliquez sur Modifier pour ajouter des photos.
                </p>
              )}
            </TabsContent>

            <TabsContent value="relations" className="p-4 m-0">
              {entity.relations && entity.relations.length > 0 ? (
                <div className="space-y-4">
                  {/* Group by relation type */}
                  {['part_of', 'near', 'related', 'see_also', 'includes'].map((relationType) => {
                    const relations = entity.relations?.filter(
                      (r) => r.relation_type === relationType
                    );
                    if (!relations || relations.length === 0) return null;

                    const typeLabels: Record<string, string> = {
                      part_of: 'Fait partie de',
                      near: 'A proximite',
                      related: 'Contenu associe',
                      see_also: 'Voir aussi',
                      includes: 'Inclut',
                    };

                    return (
                      <div key={relationType}>
                        <h4 className="text-sm font-medium mb-2">{typeLabels[relationType]}</h4>
                        <div className="space-y-2">
                          {relations.map((relation) => (
                            <button
                              key={relation.id}
                              onClick={() => relation.target && onNavigate?.(relation.target.id)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                            >
                              {relation.target?.cover_image_url && (
                                <div className="w-10 h-10 rounded overflow-hidden bg-gray-100">
                                  <img
                                    src={relation.target.cover_image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {relation.target?.translations?.find(
                                    (t) => t.language_code === activeLanguage
                                  )?.title || 'Sans titre'}
                                </p>
                                {relation.target && (
                                  <ContentEntityTypeBadge
                                    type={relation.target.entity_type}
                                    size="sm"
                                  />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucune relation definie. Cliquez sur Modifier pour creer des liens.
                </p>
              )}
            </TabsContent>

            <TabsContent value="seo" className="m-0">
              {/* SEO Analysis Panel - Full height embedded */}
              <div className="min-h-[400px]">
                {/* Google Preview (static) */}
                <div className="p-4 border-b">
                  <h4 className="text-sm font-medium mb-3">Apercu Google</h4>
                  <div className="space-y-1 bg-white border rounded-lg p-3">
                    <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                      {activeTranslation?.meta_title || activeTranslation?.title || 'Titre non defini'}
                    </div>
                    <div className="text-green-700 text-sm">
                      nomadays.fr/{activeLanguage}/{activeTranslation?.slug || 'url-non-definie'}
                    </div>
                    <div className="text-gray-600 text-sm line-clamp-2">
                      {activeTranslation?.meta_description ||
                        activeTranslation?.excerpt ||
                        'Description non definie'}
                    </div>
                  </div>
                </div>

                {/* SEO Analysis - Dynamic */}
                <ContentSEOPanel
                  entityId={entity.id}
                  language={activeLanguage}
                />
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer */}
        {mode === 'edit' && (
          <div className="flex-shrink-0 border-t bg-gray-50 p-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setMode('view')}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
