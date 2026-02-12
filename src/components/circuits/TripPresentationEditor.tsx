'use client';

import * as React from 'react';
import { useState } from 'react';
import { FileText, Sparkles, Plus, X, Loader2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/editor';
import type { DescriptionTone, TripHighlight } from '@/lib/api/types';

interface TripPresentationEditorProps {
  descriptionShort?: string;
  descriptionHtml?: string;
  descriptionTone?: DescriptionTone;
  highlights?: TripHighlight[];
  onChange: (data: {
    description_short?: string;
    description_html?: string;
    description_tone?: DescriptionTone;
    highlights?: TripHighlight[];
  }) => void;
  onGenerateWithAI?: () => void;
  isGenerating?: boolean;
  className?: string;
  readOnly?: boolean;
}

const TONE_OPTIONS: { value: DescriptionTone; label: string; description: string }[] = [
  {
    value: 'marketing_emotionnel',
    label: 'Marketing émotionnel',
    description: 'Évoque les sensations et émotions du voyage',
  },
  {
    value: 'aventure',
    label: 'Aventure',
    description: 'Met l\'accent sur l\'exploration et la découverte',
  },
  {
    value: 'familial',
    label: 'Familial',
    description: 'Ton rassurant, idéal pour les familles',
  },
  {
    value: 'factuel',
    label: 'Factuel',
    description: 'Description objective et informative',
  },
];

const HIGHLIGHT_ICONS = ['⭐', '🏛️', '🌅', '🍜', '🐘', '🚣', '🏔️', '🌺', '🎭', '🛕'];

/**
 * Trip Presentation Editor component.
 * Manages the short description, tone, and highlights.
 */
export function TripPresentationEditor({
  descriptionShort = '',
  descriptionHtml = '',
  descriptionTone = 'factuel',
  highlights = [],
  onChange,
  onGenerateWithAI,
  isGenerating = false,
  className,
  readOnly = false,
}: TripPresentationEditorProps) {
  const [newHighlight, setNewHighlight] = useState('');

  const handleDescriptionHtmlChange = (html: string) => {
    onChange({ description_html: html, description_tone: descriptionTone, highlights });
  };

  const handleToneChange = (tone: DescriptionTone) => {
    onChange({ description_tone: tone, highlights });
  };

  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    const updatedHighlights = [
      ...highlights,
      { title: newHighlight.trim(), icon: HIGHLIGHT_ICONS[highlights.length % HIGHLIGHT_ICONS.length] },
    ];
    onChange({ description_tone: descriptionTone, highlights: updatedHighlights });
    setNewHighlight('');
  };

  const handleRemoveHighlight = (index: number) => {
    const updatedHighlights = highlights.filter((_, i) => i !== index);
    onChange({ description_tone: descriptionTone, highlights: updatedHighlights });
  };

  const handleHighlightChange = (index: number, value: string) => {
    const updatedHighlights = highlights.map((h, i) =>
      i === index ? { ...h, title: value } : h
    );
    onChange({ description_tone: descriptionTone, highlights: updatedHighlights });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHighlight();
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Présentation
          </CardTitle>
          {onGenerateWithAI && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateWithAI}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
              )}
              Générer avec l'IA
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tone selector */}
        <div className="space-y-2">
          <Label>Ton de la présentation</Label>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToneChange(option.value)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  descriptionTone === option.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'font-medium text-sm',
                  descriptionTone === option.value ? 'text-emerald-700' : 'text-gray-700'
                )}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description — Rich Text Editor */}
        <div className="space-y-2">
          <Label>
            Texte de présentation
            <span className="text-gray-400 font-normal ml-2">(7-10 lignes recommandées)</span>
          </Label>
          <RichTextEditor
            content={descriptionHtml || descriptionShort || ''}
            onChange={handleDescriptionHtmlChange}
            placeholder="Décrivez votre circuit en quelques lignes..."
            enableContentRefs
            editable={!readOnly}
          />
        </div>

        {/* Highlights */}
        <div className="space-y-3">
          <Label>Points forts du voyage</Label>
          <p className="text-xs text-gray-500">
            5 expériences marquantes ou lieux incontournables
          </p>

          {/* Existing highlights */}
          <div className="space-y-2">
            {highlights.map((highlight, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
              >
                <GripVertical className="h-4 w-4 text-gray-300" />
                <span className="text-lg">{highlight.icon || '⭐'}</span>
                <Input
                  value={highlight.title}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  className="flex-1 bg-transparent border-0 focus-visible:ring-1 h-8"
                  placeholder="Point fort..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(index)}
                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded"
                >
                  <X className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new highlight */}
          {highlights.length < 5 && (
            <div className="flex items-center gap-2">
              <Input
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ajouter un point fort..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddHighlight}
                disabled={!newHighlight.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {highlights.length >= 5 && (
            <p className="text-xs text-amber-600">
              Maximum 5 points forts atteint
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TripPresentationEditor;
