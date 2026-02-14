'use client';

import { useState, useEffect } from 'react';
import {
  HelpCircle, Plus, Trash2, GripVertical, Save, Loader2,
  Map, MessageSquare, FileText, Calendar, Edit3, Phone, Users, Briefcase, RefreshCw, CreditCard, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useResolvedSnippets, useBatchUpsertSnippets, useDeleteSnippet } from '@/hooks/useCmsSnippets';
import type { CmsSnippet, SnippetBatchItem } from '@/lib/api/cms-snippets';

// ── Icon mapping ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Map> = {
  Map, MessageSquare, FileText, Calendar, Edit3, Phone, Users, Briefcase, RefreshCw, CreditCard, Search, HelpCircle,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

// ── Types ────────────────────────────────────────────────────────────────────

interface FaqItemLocal {
  id: string; // snippet_key suffix (e.g. "programme")
  snippet_key: string;
  question: string;
  answer: string;
  icon: string;
  keywords: string[];
  sort_order: number;
  isNew?: boolean;
}

function snippetToLocal(s: CmsSnippet): FaqItemLocal {
  const meta = (s.metadata_json || {}) as Record<string, unknown>;
  const questionObj = (meta.question || {}) as Record<string, string>;
  return {
    id: s.snippet_key.replace('faq.', ''),
    snippet_key: s.snippet_key,
    question: questionObj.fr || '',
    answer: s.content_json?.fr || '',
    icon: (meta.icon as string) || 'HelpCircle',
    keywords: (meta.keywords as string[]) || [],
    sort_order: s.sort_order,
  };
}

function localToSnippetBatch(item: FaqItemLocal): SnippetBatchItem {
  return {
    snippet_key: item.snippet_key,
    category: 'faq',
    content_json: { fr: item.answer },
    metadata_json: {
      question: { fr: item.question },
      icon: item.icon,
      keywords: item.keywords,
    },
    sort_order: item.sort_order,
    is_active: true,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FaqEditorPage() {
  const { data: snippets, loading, refetch } = useResolvedSnippets('faq', 'fr');
  const { mutate: batchSave, loading: saving } = useBatchUpsertSnippets();
  const { mutate: deleteSnippet } = useDeleteSnippet();

  const [items, setItems] = useState<FaqItemLocal[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load snippets into local state
  useEffect(() => {
    if (snippets && snippets.length > 0) {
      const mapped = snippets
        .filter(s => s.snippet_key.startsWith('faq.'))
        .map(snippetToLocal)
        .sort((a, b) => a.sort_order - b.sort_order);
      setItems(mapped);
      setHasChanges(false);
    }
  }, [snippets]);

  const updateItem = (index: number, field: keyof FaqItemLocal, value: unknown) => {
    setItems(prev => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, [field]: value } as FaqItemLocal;
      return next;
    });
    setHasChanges(true);
  };

  const addItem = () => {
    const newId = `custom-${Date.now()}`;
    setItems(prev => [
      ...prev,
      {
        id: newId,
        snippet_key: `faq.${newId}`,
        question: '',
        answer: '',
        icon: 'HelpCircle',
        keywords: [],
        sort_order: prev.length,
        isNew: true,
      },
    ]);
    setHasChanges(true);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (!item) return;
    if (!item.isNew) {
      try {
        await deleteSnippet(item.snippet_key);
      } catch {
        // Item may not exist in DB yet
      }
    }
    setItems(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    setItems(prev => {
      const next = [...prev];
      const fromItem = next[fromIndex]!;
      const toItem = next[toIndex]!;
      next[fromIndex] = toItem;
      next[toIndex] = fromItem;
      return next.map((item, i) => ({ ...item, sort_order: i }));
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const batchItems = items.map((item, i) => localToSnippetBatch({ ...item, sort_order: i }));
    try {
      await batchSave(batchItems);
      setSaveMessage('FAQ enregistrées avec succès');
      setHasChanges(false);
      setTimeout(() => setSaveMessage(''), 3000);
      refetch();
    } catch (err) {
      setSaveMessage('Erreur lors de la sauvegarde');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const updateKeywords = (index: number, value: string) => {
    const kw = value.split(',').map(k => k.trim()).filter(Boolean);
    updateItem(index, 'keywords', kw);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FAQ Espace Client</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les questions fréquentes affichées dans l'espace voyageur
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('succès') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </span>
            )}
            <Button variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une question
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HelpCircle className="h-12 w-12 text-gray-200 mb-4" />
            <p className="text-muted-foreground mb-4">Aucune FAQ configurée</p>
            <Button variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Créer la première question
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {items.map((item, index) => {
              const IconComponent = ICON_MAP[item.icon] || HelpCircle;
              return (
                <div
                  key={item.snippet_key}
                  className="border rounded-lg p-5 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Drag handle + order controls */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Monter"
                      >
                        ▲
                      </button>
                      <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
                      <button
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Descendre"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 space-y-3">
                      {/* Question */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Question</label>
                        <Input
                          value={item.question}
                          onChange={(e) => updateItem(index, 'question', e.target.value)}
                          placeholder="Comment consulter mon programme de voyage ?"
                          className="font-medium"
                        />
                      </div>

                      {/* Answer */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Réponse</label>
                        <Textarea
                          value={item.answer}
                          onChange={(e) => updateItem(index, 'answer', e.target.value)}
                          placeholder="Rendez-vous dans la section..."
                          rows={3}
                        />
                      </div>

                      {/* Icon + Keywords row */}
                      <div className="flex gap-4">
                        <div className="w-48">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Icône</label>
                          <select
                            value={item.icon}
                            onChange={(e) => updateItem(index, 'icon', e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                          >
                            {ICON_OPTIONS.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            Mots-clés <span className="text-gray-400">(séparés par des virgules)</span>
                          </label>
                          <Input
                            value={item.keywords.join(', ')}
                            onChange={(e) => updateKeywords(index, e.target.value)}
                            placeholder="programme, voyage, itinéraire"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Icon preview + delete */}
                    <div className="flex flex-col items-center gap-3 pt-1">
                      <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-purple-500" />
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
