'use client';

import { GripVertical, X, FileText } from 'lucide-react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { Formula } from '@/lib/api/types';
import { RichTextEditor } from '@/components/editor';

interface TextBlockProps {
  block: Formula;
  onUpdate?: (data: { name?: string; description_html?: string }) => void;
  onDelete?: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
}

export function TextBlock({
  block,
  onUpdate,
  onDelete,
  dragListeners,
  dragAttributes,
}: TextBlockProps) {
  const handleChange = (html: string) => {
    // RichTextEditor already debounces internally (500ms)
    onUpdate?.({ description_html: html });
  };

  return (
    <div className="group relative flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors">
      {/* Drag handle */}
      <div
        className="flex-shrink-0 mt-1 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
        {...dragListeners}
        {...dragAttributes}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Texte</span>
        </div>
        <RichTextEditor
          content={block.description_html || ''}
          onChange={handleChange}
          placeholder="Description narrative..."
          inline
          enableContentRefs
        />
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
        title="Supprimer ce bloc"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
