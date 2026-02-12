'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { RichTextEditor } from '@/components/editor';
import type { ContentTranslation, SupportedLanguage } from '@/lib/api/types';

interface ContentEditorProps {
  translation: ContentTranslation | null;
  language: SupportedLanguage;
  onChange: (updates: Partial<ContentTranslation>) => void;
  disabled?: boolean;
}

export function ContentEditor({
  translation,
  language,
  onChange,
  disabled = false,
}: ContentEditorProps) {
  // Local state for form fields
  const [title, setTitle] = useState(translation?.title || '');
  const [slug, setSlug] = useState(translation?.slug || '');
  const [excerpt, setExcerpt] = useState(translation?.excerpt || '');
  const [metaTitle, setMetaTitle] = useState(translation?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(translation?.meta_description || '');
  const [seoOpen, setSeoOpen] = useState(false);

  // Content HTML for Tiptap — use content_html, fall back to content_markdown
  const contentHtml = translation?.content_html || translation?.content_markdown || '';

  // Word count — computed from plain text extracted in the editor
  const wordCountRef = useRef(0);
  const [wordCount, setWordCount] = useState(0);

  // Update local state when translation changes
  useEffect(() => {
    setTitle(translation?.title || '');
    setSlug(translation?.slug || '');
    setExcerpt(translation?.excerpt || '');
    setMetaTitle(translation?.meta_title || '');
    setMetaDescription(translation?.meta_description || '');
  }, [translation]);

  // Generate slug from title
  const generateSlug = useCallback((text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  // Handle title change and auto-generate slug
  const handleTitleChange = (value: string) => {
    setTitle(value);
    onChange({ title: value });

    // Auto-generate slug if it's empty or was auto-generated before
    if (!slug || slug === generateSlug(title)) {
      const newSlug = generateSlug(value);
      setSlug(newSlug);
      onChange({ slug: newSlug });
    }
  };

  // Handle rich text content change
  const handleContentChange = (html: string) => {
    onChange({ content_html: html });

    // Estimate word count from HTML by stripping tags
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCountRef.current = count;
    setWordCount(count);
  };

  const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Titre <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Titre du contenu"
          disabled={disabled}
          className="text-lg font-medium"
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">
          URL (slug)
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/{language}/</span>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              onChange({ slug: e.target.value });
            }}
            placeholder="url-du-contenu"
            disabled={disabled}
            className="flex-1"
          />
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="excerpt">Extrait (pour les cards et previews)</Label>
          <span className="text-xs text-muted-foreground">
            {excerpt.length}/200 caractères
          </span>
        </div>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => {
            setExcerpt(e.target.value);
            onChange({ excerpt: e.target.value });
          }}
          placeholder="Court résumé du contenu (150-200 caractères)"
          disabled={disabled}
          rows={2}
          maxLength={200}
          className="resize-none"
        />
      </div>

      {/* Content Editor — Rich Text (Tiptap) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Contenu</Label>
          <span className="text-xs text-muted-foreground">
            {wordCount} mots | ~{readingTime} min de lecture
          </span>
        </div>

        <RichTextEditor
          content={contentHtml}
          onChange={handleContentChange}
          placeholder="Rédigez votre contenu..."
          enableContentRefs
          editable={!disabled}
        />
      </div>

      {/* SEO Section (Collapsible) */}
      <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
            <span className="font-medium">Référencement (SEO)</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Meta Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta-title">Meta Title</Label>
              <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {metaTitle.length}/60 caractères
              </span>
            </div>
            <Input
              id="meta-title"
              value={metaTitle}
              onChange={(e) => {
                setMetaTitle(e.target.value);
                onChange({ meta_title: e.target.value });
              }}
              placeholder={title || "Titre pour Google (60 caractères max)"}
              disabled={disabled}
              maxLength={70}
            />
            {metaTitle.length > 60 && (
              <p className="text-xs text-amber-600">
                Le titre sera tronqué dans les résultats Google
              </p>
            )}
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta-description">Meta Description</Label>
              <span className={`text-xs ${metaDescription.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {metaDescription.length}/160 caractères
              </span>
            </div>
            <Textarea
              id="meta-description"
              value={metaDescription}
              onChange={(e) => {
                setMetaDescription(e.target.value);
                onChange({ meta_description: e.target.value });
              }}
              placeholder={excerpt || "Description pour Google (160 caractères max)"}
              disabled={disabled}
              rows={2}
              maxLength={170}
              className="resize-none"
            />
          </div>

          {/* Google Preview */}
          <div className="border rounded-lg p-4 bg-white">
            <p className="text-xs text-muted-foreground mb-2">Aperçu Google</p>
            <div className="space-y-1">
              <div className="text-blue-600 text-base hover:underline cursor-pointer truncate">
                {metaTitle || title || 'Titre non défini'}
              </div>
              <div className="text-green-700 text-xs">
                nomadays.fr/{language}/{slug || 'url'}
              </div>
              <div className="text-gray-600 text-sm line-clamp-2">
                {metaDescription || excerpt || 'Description non définie'}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
