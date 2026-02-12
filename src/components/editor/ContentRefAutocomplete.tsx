'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import {
  MapPin,
  Compass,
  Tent,
  Bed,
  UtensilsCrossed,
  Map,
  Search,
  Loader2,
} from 'lucide-react';
import { searchContent } from '@/lib/api/content';
import type { ContentEntity, ContentEntityType } from '@/lib/api/types';

// ─── Constants ──────────────────────────────────────────────────────

const TRIGGER = '{{';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  attraction: MapPin,
  destination: Compass,
  activity: Tent,
  accommodation: Bed,
  eating: UtensilsCrossed,
  region: Map,
};

const TYPE_LABELS: Record<string, string> = {
  attraction: 'Attraction',
  destination: 'Destination',
  activity: 'Activité',
  accommodation: 'Hébergement',
  eating: 'Restaurant',
  region: 'Région',
};

// ─── Types ──────────────────────────────────────────────────────────

interface AutocompleteState {
  isOpen: boolean;
  query: string;
  from: number; // Position in doc where trigger started
  to: number;   // Current cursor position
}

interface ContentRefAutocompleteProps {
  editor: Editor;
}

// ─── Plugin Key ─────────────────────────────────────────────────────

export const contentRefPluginKey = new PluginKey('contentRefAutocomplete');

// ─── Autocomplete Component ─────────────────────────────────────────

export function ContentRefAutocomplete({ editor }: ContentRefAutocompleteProps) {
  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    query: '',
    from: 0,
    to: 0,
  });
  const [results, setResults] = useState<ContentEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detect {{ trigger in editor ──
  useEffect(() => {
    if (!editor) return;

    const plugin = new Plugin({
      key: contentRefPluginKey,
      props: {
        handleTextInput(view: EditorView, from: number, to: number, text: string) {
          const { state: editorState } = view;
          const $from = editorState.doc.resolve(from);
          const textBefore = $from.parent.textBetween(
            Math.max(0, $from.parentOffset - 1),
            $from.parentOffset,
            undefined,
            '\ufffc'
          );

          // Check if we're completing a {{ trigger
          if (text === '{' && textBefore === '{') {
            // Found {{ — open autocomplete
            setState({
              isOpen: true,
              query: '',
              from: from - 1, // Start of the first {
              to: to + 1,     // After the second {
            });
            return false; // Let the character be inserted
          }

          return false;
        },
      },
    });

    // Register the plugin
    const { state: editorState } = editor.view;
    const tr = editorState.tr.setMeta('addPlugin', plugin);
    editor.view.dispatch(tr);

    // Also listen for updates to track the query after {{ is typed
    const handleUpdate = () => {
      setState((prev) => {
        if (!prev.isOpen) return prev;

        const { state: currentState } = editor.view;
        const { from: cursorPos } = currentState.selection;

        // Extract text between trigger position and cursor
        const triggerEnd = prev.from + 2; // After {{
        if (cursorPos < triggerEnd) {
          // Cursor moved before the trigger — close
          return { ...prev, isOpen: false };
        }

        const query = currentState.doc.textBetween(triggerEnd, cursorPos, ' ');

        // Close if user typed }} or moved far away
        if (query.includes('}}') || cursorPos - triggerEnd > 50) {
          return { ...prev, isOpen: false };
        }

        return { ...prev, query, to: cursorPos };
      });
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor]);

  // ── Search when query changes ──
  useEffect(() => {
    if (!state.isOpen) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (state.query.length < 1) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await searchContent(state.query, {
          limit: 8,
        });
        setResults(searchResults);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [state.isOpen, state.query]);

  // ── Handle keyboard navigation ──
  useEffect(() => {
    if (!state.isOpen || !editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) selectResult(selected);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
      }
    };

    // Use capture to intercept before ProseMirror
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [state.isOpen, results, selectedIndex, editor]);

  // ── Select a result ──
  const selectResult = useCallback(
    (entity: ContentEntity) => {
      if (!editor) return;

      // Get the display title from the first translation
      const title =
        entity.translations?.[0]?.title || entity.entity_type || entity.entity_type;
      const slug = entity.translations?.[0]?.slug || '';

      // Delete the {{ + query text and insert the node
      editor
        .chain()
        .focus()
        .deleteRange({ from: state.from, to: state.to })
        .insertContentRef({
          type: entity.entity_type,
          slug,
          title,
          entityId: String(entity.id),
        })
        .run();

      closeAutocomplete();
    },
    [editor, state.from, state.to]
  );

  const closeAutocomplete = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // ── Position the popup ──
  const getPopupPosition = useCallback(() => {
    if (!editor) return { top: 0, left: 0 };

    const { view } = editor;
    const coords = view.coordsAtPos(state.from);
    const editorRect = view.dom.getBoundingClientRect();

    return {
      top: coords.bottom - editorRect.top + 4,
      left: coords.left - editorRect.left,
    };
  }, [editor, state.from]);

  // ── Render ──
  if (!state.isOpen) return null;

  const position = getPopupPosition();

  return (
    <div
      ref={popupRef}
      className="absolute z-50 w-72 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Search header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500 truncate">
          {state.query ? `Recherche : "${state.query}"` : 'Tapez pour rechercher...'}
        </span>
        {isSearching && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin ml-auto" />}
      </div>

      {/* Results */}
      <div className="max-h-48 overflow-y-auto">
        {results.length === 0 && state.query.length >= 1 && !isSearching ? (
          <div className="px-3 py-4 text-center text-sm text-gray-400">
            Aucun contenu trouvé
          </div>
        ) : (
          results.map((entity, index) => {
            const Icon = TYPE_ICONS[entity.entity_type] || MapPin;
            const typeLabel = TYPE_LABELS[entity.entity_type] || entity.entity_type;
            const title =
              entity.translations?.[0]?.title || entity.entity_type || '—';
            const slug = entity.translations?.[0]?.slug || '';

            return (
              <button
                key={entity.id}
                type="button"
                onClick={() => selectResult(entity)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{title}</div>
                  <div className="text-xs text-gray-400 truncate">{slug}</div>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0 uppercase tracking-wide">
                  {typeLabel}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
        <span className="text-[10px] text-gray-400">
          ↑↓ naviguer · Entrée sélectionner · Échap fermer
        </span>
      </div>
    </div>
  );
}
