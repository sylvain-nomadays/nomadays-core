'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link,
  ImageIcon,
  Eye,
  Code,
} from 'lucide-react';
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
  const [content, setContent] = useState(translation?.content_markdown || '');
  const [metaTitle, setMetaTitle] = useState(translation?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(translation?.meta_description || '');
  const [seoOpen, setSeoOpen] = useState(false);

  // Update local state when translation changes
  useEffect(() => {
    setTitle(translation?.title || '');
    setSlug(translation?.slug || '');
    setExcerpt(translation?.excerpt || '');
    setContent(translation?.content_markdown || '');
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

  // Word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

  // Insert markdown formatting
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);
    onChange({ content_markdown: newContent });

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, label: 'Gras', action: () => insertMarkdown('**', '**') },
    { icon: Italic, label: 'Italique', action: () => insertMarkdown('*', '*') },
    { icon: Heading2, label: 'Titre', action: () => insertMarkdown('\n## ', '\n') },
    { icon: List, label: 'Liste', action: () => insertMarkdown('\n- ') },
    { icon: ListOrdered, label: 'Liste numerotee', action: () => insertMarkdown('\n1. ') },
    { icon: Quote, label: 'Citation', action: () => insertMarkdown('\n> ') },
    { icon: Link, label: 'Lien', action: () => insertMarkdown('[', '](url)') },
    { icon: Code, label: 'Code', action: () => insertMarkdown('`', '`') },
  ];

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
            {excerpt.length}/200 caracteres
          </span>
        </div>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => {
            setExcerpt(e.target.value);
            onChange({ excerpt: e.target.value });
          }}
          placeholder="Court resume du contenu (150-200 caracteres)"
          disabled={disabled}
          rows={2}
          maxLength={200}
          className="resize-none"
        />
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Contenu</Label>
          <span className="text-xs text-muted-foreground">
            {wordCount} mots | {charCount} caracteres | ~{readingTime} min de lecture
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-t-md border border-b-0">
          {toolbarButtons.map((btn) => (
            <Button
              key={btn.label}
              variant="ghost"
              size="sm"
              onClick={btn.action}
              disabled={disabled}
              className="h-8 w-8 p-0"
              title={btn.label}
            >
              <btn.icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="h-8 px-2 text-xs"
            title="Apercu (bientot)"
          >
            <Eye className="h-4 w-4 mr-1" />
            Apercu
          </Button>
        </div>

        {/* Textarea */}
        <Textarea
          id="content-editor"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onChange({ content_markdown: e.target.value });
          }}
          placeholder="Redigez votre contenu en Markdown...

## Exemple de titre

Votre texte ici. Vous pouvez utiliser **gras**, *italique*, et [liens](url).

- Liste a puces
- Autre element

> Citation importante"
          disabled={disabled}
          rows={15}
          className="font-mono text-sm rounded-t-none resize-none"
        />
      </div>

      {/* SEO Section (Collapsible) */}
      <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
            <span className="font-medium">Referencement (SEO)</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Meta Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta-title">Meta Title</Label>
              <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {metaTitle.length}/60 caracteres
              </span>
            </div>
            <Input
              id="meta-title"
              value={metaTitle}
              onChange={(e) => {
                setMetaTitle(e.target.value);
                onChange({ meta_title: e.target.value });
              }}
              placeholder={title || "Titre pour Google (60 caracteres max)"}
              disabled={disabled}
              maxLength={70}
            />
            {metaTitle.length > 60 && (
              <p className="text-xs text-amber-600">
                Le titre sera tronque dans les resultats Google
              </p>
            )}
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta-description">Meta Description</Label>
              <span className={`text-xs ${metaDescription.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {metaDescription.length}/160 caracteres
              </span>
            </div>
            <Textarea
              id="meta-description"
              value={metaDescription}
              onChange={(e) => {
                setMetaDescription(e.target.value);
                onChange({ meta_description: e.target.value });
              }}
              placeholder={excerpt || "Description pour Google (160 caracteres max)"}
              disabled={disabled}
              rows={2}
              maxLength={170}
              className="resize-none"
            />
          </div>

          {/* Google Preview */}
          <div className="border rounded-lg p-4 bg-white">
            <p className="text-xs text-muted-foreground mb-2">Apercu Google</p>
            <div className="space-y-1">
              <div className="text-blue-600 text-base hover:underline cursor-pointer truncate">
                {metaTitle || title || 'Titre non defini'}
              </div>
              <div className="text-green-700 text-xs">
                nomadays.fr/{language}/{slug || 'url'}
              </div>
              <div className="text-gray-600 text-sm line-clamp-2">
                {metaDescription || excerpt || 'Description non definie'}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
