'use client';

import { useState } from 'react';
import {
  Globe,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api/client';
import type { ContentEntityType, SupportedLanguage } from '@/lib/api/types';

// Types matching backend
interface ExtractedContent {
  title: string;
  slug: string;
  original_url: string;
  excerpt?: string;
  content_markdown?: string;
  content_html?: string;
  meta_title?: string;
  meta_description?: string;
  location_name?: string;
  country?: string;
  city?: string;
  rating?: number;
  images?: string[];
  tags?: string[];
}

interface ImportPreview {
  source_url: string;
  entity_type: string;
  language: string;
  extracted: ExtractedContent;
  raw_text_length: number;
  // Note: analysis is done post-import via /content/{id}/analyze-seo
}

interface ContentImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entityId: string) => void;
}

const ENTITY_TYPES: { value: ContentEntityType; label: string }[] = [
  { value: 'attraction', label: 'Attraction' },
  { value: 'destination', label: 'Destination' },
  { value: 'activity', label: 'Activité' },
  { value: 'accommodation', label: 'Hébergement' },
  { value: 'eating', label: 'Restaurant' },
  { value: 'region', label: 'Région' },
];

const LANGUAGES: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function ContentImporter({ isOpen, onClose, onSuccess }: ContentImporterProps) {
  // Step state
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Form state
  const [url, setUrl] = useState('');
  const [entityType, setEntityType] = useState<ContentEntityType>('attraction');
  const [language, setLanguage] = useState<SupportedLanguage>('fr');

  // Loading states
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Preview data with analysis
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  // Editable fields
  const [editedContent, setEditedContent] = useState<ExtractedContent | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Reset state
  const resetState = () => {
    setStep('input');
    setUrl('');
    setPreview(null);
    setEditedContent(null);
    setSelectedImage(null);
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    resetState();
    onClose();
  };

  // Step 1: Extract content from URL
  const handleExtract = async () => {
    if (!url.trim()) return;

    setIsExtracting(true);
    setError(null);
    try {
      const response = await apiClient.post<ImportPreview>('/content/import/preview', {
        url,
        entity_type: entityType,
        language,
      });

      setPreview(response);
      setEditedContent(response.extracted);
      setSelectedImage(response.extracted.images?.[0] || null);
      setStep('preview');
    } catch (err: any) {
      setError(err.detail || err.message || 'Impossible d\'extraire le contenu de cette URL');
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 2: Create content entity
  const handleCreate = async () => {
    if (!editedContent || !preview) return;

    setIsCreating(true);
    try {
      const response = await apiClient.post<{ id: string }>('/content/import/confirm', {
        source_url: preview.source_url,
        entity_type: entityType,
        language,
        title: editedContent.title,
        slug: editedContent.slug,
        excerpt: editedContent.excerpt,
        content_markdown: editedContent.content_markdown,
        meta_title: editedContent.meta_title,
        meta_description: editedContent.meta_description,
        cover_image_url: selectedImage,
        rating: editedContent.rating,
        tags: editedContent.tags,
      });

      handleClose();
      onSuccess?.(response.id);
    } catch (err: any) {
      setError(err.detail || err.message || 'Impossible de créer le contenu');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Importer du contenu depuis une URL
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Entrez l\'URL de la page à importer. Le contenu sera extrait tel quel.'}
            {step === 'preview' && 'Vérifiez et modifiez le contenu avant de l\'importer. L\'analyse SEO sera disponible après import.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: URL Input */}
          {step === 'input' && (
            <div className="space-y-6 py-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="url">URL de la page</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://voyagethailande.fr/temple-wat-pho"
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Entity Type & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de contenu</Label>
                  <Select value={entityType} onValueChange={(v) => setEntityType(v as ContentEntityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Langue du contenu</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguage)}>
                    <SelectTrigger>
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
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">Comment ça marche ?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Le contenu est importé <strong>tel quel</strong> (pas de réécriture)</li>
                  <li>L'URL/slug est préservé pour garder le même référencement</li>
                  <li>Après import, l'analyse SEO sera disponible dans le panneau dédié</li>
                  <li>Vous pouvez modifier le contenu avant d'importer</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Preview Content */}
          {step === 'preview' && editedContent && (
            <div className="space-y-6 py-4">
              {/* Info banner */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>Contenu extrait avec succès. Vérifiez et modifiez si nécessaire avant d'importer.</span>
              </div>

              {/* Source URL */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-gray-50 rounded">
                <Globe className="h-4 w-4" />
                <a
                  href={preview?.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-1 truncate"
                >
                  {preview?.source_url}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={editedContent.title}
                    onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    URL (slug)
                    <span className="text-xs text-green-600 ml-2">✓ Préservé depuis l'URL source</span>
                  </Label>
                  <Input
                    id="slug"
                    value={editedContent.slug}
                    onChange={(e) => setEditedContent({ ...editedContent, slug: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="excerpt">Extrait</Label>
                  <span className="text-xs text-muted-foreground">
                    {editedContent.excerpt?.length || 0}/200
                  </span>
                </div>
                <Textarea
                  id="excerpt"
                  value={editedContent.excerpt || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, excerpt: e.target.value })}
                  rows={2}
                  maxLength={200}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Contenu (Markdown)</Label>
                <Textarea
                  id="content"
                  value={editedContent.content_markdown || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, content_markdown: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {/* Images */}
              {editedContent.images && editedContent.images.length > 0 && (
                <div className="space-y-2">
                  <Label>Image de couverture</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {editedContent.images.slice(0, 10).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(img)}
                        className={`aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 relative border-2 transition-all ${
                          selectedImage === img
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        {selectedImage === img && (
                          <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">SEO</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="meta_title">Meta Title</Label>
                      <span className={`text-xs ${(editedContent.meta_title?.length || 0) > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {editedContent.meta_title?.length || 0}/60
                      </span>
                    </div>
                    <Input
                      id="meta_title"
                      value={editedContent.meta_title || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, meta_title: e.target.value })}
                      maxLength={70}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="meta_description">Meta Description</Label>
                      <span className={`text-xs ${(editedContent.meta_description?.length || 0) > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {editedContent.meta_description?.length || 0}/160
                      </span>
                    </div>
                    <Textarea
                      id="meta_description"
                      value={editedContent.meta_description || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, meta_description: e.target.value })}
                      rows={2}
                      maxLength={170}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleExtract}
                disabled={!url.trim() || isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraction en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extraire le contenu
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Retour
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Importer le contenu
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
