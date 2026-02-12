'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import UnderlineExtension from '@tiptap/extension-underline';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar';
import { CalloutExtension } from './CalloutExtension';
import { ContentRefExtension } from './ContentRefExtension';
import { ContentRefAutocomplete } from './ContentRefAutocomplete';
import { ContentRefToolbarButton } from './ContentRefToolbarButton';
import './editor-styles.css';

// ─── Types ──────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  /** HTML initial content */
  content: string;
  /** Called when content changes (debounced). Receives HTML string */
  onChange: (html: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Compact toolbar (bold/italic/underline/link/list only) */
  compact?: boolean;
  /** Inline mode — no border, toolbar appears on focus only. Best for block editors (Transport, Activity) */
  inline?: boolean;
  /** Enable content slug references — {{type:slug}} autocomplete + toolbar button */
  enableContentRefs?: boolean;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Additional CSS classes on the wrapper */
  className?: string;
}

// ─── RichTextEditor ─────────────────────────────────────────────────

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Rédigez votre contenu...',
  compact = false,
  inline = false,
  enableContentRefs = false,
  editable = true,
  className,
}: RichTextEditorProps) {
  // Inline mode: track focus to show/hide toolbar
  const [isFocused, setIsFocused] = useState(false);
  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced onChange
  const debouncedOnChange = useCallback(
    (html: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(html);
      }, 500);
    },
    [onChange]
  );

  // Configure extensions — memoize to avoid re-creating on every render
  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        // Disable built-in code blocks (not needed for travel content)
        codeBlock: false,
        code: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: false,
      }),
      UnderlineExtension,
      CalloutExtension,
    ];

    // Add content reference extension when enabled
    if (enableContentRefs) {
      exts.push(ContentRefExtension);
    }

    return exts;
  }, [placeholder, enableContentRefs]);

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      debouncedOnChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose-nomadays',
      },
    },
    // Avoid hydration mismatch in Next.js
    immediatelyRender: false,
  });

  // Cleanup debounce on unmount is handled by React ref lifecycle

  if (!editor) {
    // Loading state while editor initializes
    if (inline) {
      return (
        <div className={cn('h-6 bg-gray-50 rounded animate-pulse', className)} />
      );
    }
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-white',
          className
        )}
      >
        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="h-7 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="p-4">
          <div className="h-20 bg-gray-50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Inline mode: borderless, toolbar on focus ──
  if (inline) {
    return (
      <div
        className={cn(
          'tiptap-editor tiptap-editor--inline relative',
          !editable && 'tiptap-editor--disabled',
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          // Only hide toolbar if focus leaves the entire editor wrapper
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
          }
        }}
      >
        {/* Editor content area (inline, no border) */}
        <EditorContent editor={editor} />

        {/* Floating compact toolbar — appears on focus */}
        {editable && isFocused && (
          <div className="absolute left-0 bottom-full mb-1 z-20 shadow-md rounded-lg border border-gray-200 bg-white">
            <EditorToolbar
              editor={editor}
              compact
              enableContentRefs={enableContentRefs}
            />
          </div>
        )}

        {/* Content ref autocomplete popup ({{ trigger) */}
        {enableContentRefs && editable && (
          <ContentRefAutocomplete editor={editor} />
        )}
      </div>
    );
  }

  // ── Standard mode: bordered with top toolbar ──
  return (
    <div
      className={cn(
        'tiptap-editor relative rounded-lg border border-gray-200 bg-white transition-colors',
        'focus-within:ring-2 focus-within:ring-primary focus-within:border-primary',
        compact && 'tiptap-editor--compact',
        !editable && 'tiptap-editor--disabled',
        className
      )}
    >
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center">
          <EditorToolbar
            editor={editor}
            compact={compact}
            enableContentRefs={enableContentRefs}
          />
        </div>
      )}

      {/* Editor content area */}
      <EditorContent editor={editor} />

      {/* Content ref autocomplete popup ({{ trigger) */}
      {enableContentRefs && editable && (
        <ContentRefAutocomplete editor={editor} />
      )}
    </div>
  );
}
