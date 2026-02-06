'use client';

import * as React from 'react';
import { useState } from 'react';
import { CheckCircle, XCircle, Plus, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { InclusionItem } from '@/lib/api/types';

interface InclusionExclusionEditorProps {
  inclusions: InclusionItem[];
  exclusions: InclusionItem[];
  onChange: (data: { inclusions: InclusionItem[]; exclusions: InclusionItem[] }) => void;
  onLoadDefaults?: () => void;
  isLoadingDefaults?: boolean;
  className?: string;
}

/**
 * Inclusion/Exclusion Editor component.
 * Manages what's included and not included in the trip.
 */
export function InclusionExclusionEditor({
  inclusions = [],
  exclusions = [],
  onChange,
  onLoadDefaults,
  isLoadingDefaults = false,
  className,
}: InclusionExclusionEditorProps) {
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  // Inclusions handlers
  const handleAddInclusion = () => {
    if (!newInclusion.trim()) return;
    const updated = [...inclusions, { text: newInclusion.trim(), default: false }];
    onChange({ inclusions: updated, exclusions });
    setNewInclusion('');
  };

  const handleRemoveInclusion = (index: number) => {
    const updated = inclusions.filter((_, i) => i !== index);
    onChange({ inclusions: updated, exclusions });
  };

  const handleInclusionChange = (index: number, text: string) => {
    const updated = inclusions.map((item, i) =>
      i === index ? { ...item, text } : item
    );
    onChange({ inclusions: updated, exclusions });
  };

  // Exclusions handlers
  const handleAddExclusion = () => {
    if (!newExclusion.trim()) return;
    const updated = [...exclusions, { text: newExclusion.trim(), default: false }];
    onChange({ inclusions, exclusions: updated });
    setNewExclusion('');
  };

  const handleRemoveExclusion = (index: number) => {
    const updated = exclusions.filter((_, i) => i !== index);
    onChange({ inclusions, exclusions: updated });
  };

  const handleExclusionChange = (index: number, text: string) => {
    const updated = exclusions.map((item, i) =>
      i === index ? { ...item, text } : item
    );
    onChange({ inclusions, exclusions: updated });
  };

  const handleInclusionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInclusion();
    }
  };

  const handleExclusionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddExclusion();
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Inclus / Exclus
          </CardTitle>
          {onLoadDefaults && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadDefaults}
              disabled={isLoadingDefaults}
            >
              {isLoadingDefaults ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Charger template
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inclusions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <h3 className="font-medium text-emerald-700">Ce qui est inclus</h3>
            </div>

            <div className="space-y-2">
              {inclusions.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg group"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <Input
                    value={item.text}
                    onChange={(e) => handleInclusionChange(index, e.target.value)}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-1 h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveInclusion(index)}
                    className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={handleInclusionKeyDown}
                placeholder="Ajouter un élément inclus..."
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInclusion}
                disabled={!newInclusion.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Exclusions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-red-600">Ce qui n'est pas inclus</h3>
            </div>

            <div className="space-y-2">
              {exclusions.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-red-50 rounded-lg group"
                >
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <Input
                    value={item.text}
                    onChange={(e) => handleExclusionChange(index, e.target.value)}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-1 h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExclusion(index)}
                    className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={handleExclusionKeyDown}
                placeholder="Ajouter un élément non inclus..."
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExclusion}
                disabled={!newExclusion.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InclusionExclusionEditor;
