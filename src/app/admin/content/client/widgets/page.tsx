'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, MessageSquare, Home, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useBatchUpsertSnippets, useResolvedSnippets } from '@/hooks/useCmsSnippets';
import type { CmsSnippet, SnippetBatchItem } from '@/lib/api/cms-snippets';

// ── Section definitions ──────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url';
  placeholder?: string;
}

interface SectionDef {
  id: string;
  title: string;
  icon: typeof MessageSquare;
  description: string;
  category: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'sidebar',
    title: 'Sidebar droite',
    icon: MessageSquare,
    description: 'Contenu de la sidebar droite de l\'espace voyageur (collectif, assurance, ambassadeur, réseaux sociaux)',
    category: 'sidebar',
    fields: [
      // Collectif
      { key: 'sidebar.collectif.title', label: 'Collectif — Titre', type: 'text', placeholder: 'Le collectif Nomadays' },
      { key: 'sidebar.collectif.tagline', label: 'Collectif — Tagline', type: 'text', placeholder: 'Vos agences locales s\'unissent et inventent' },
      { key: 'sidebar.collectif.description', label: 'Collectif — Description', type: 'textarea', placeholder: 'Nos hôtes locaux vous accueillent comme en famille...' },
      { key: 'sidebar.collectif.phone', label: 'Collectif — Téléphone', type: 'text', placeholder: '01 23 45 67 89' },
      { key: 'sidebar.collectif.whatsapp', label: 'Collectif — WhatsApp', type: 'text', placeholder: 'WhatsApp' },
      { key: 'sidebar.collectif.email', label: 'Collectif — Email', type: 'text', placeholder: 'contact@nomadays.fr' },
      // Insurance
      { key: 'sidebar.insurance.title', label: 'Assurance — Titre', type: 'text', placeholder: 'Assurance Chapka' },
      { key: 'sidebar.insurance.subtitle', label: 'Assurance — Sous-titre', type: 'text', placeholder: 'Notre partenaire' },
      { key: 'sidebar.insurance.description', label: 'Assurance — Description', type: 'textarea', placeholder: 'Voyagez l\'esprit tranquille...' },
      { key: 'sidebar.insurance.cta_text', label: 'Assurance — Bouton', type: 'text', placeholder: 'Découvrir les garanties' },
      { key: 'sidebar.insurance.cta_link', label: 'Assurance — Lien', type: 'url', placeholder: 'https://...' },
      // Ambassador
      { key: 'sidebar.ambassador.title', label: 'Ambassadeur — Titre', type: 'text', placeholder: 'Passeurs d\'Horizons' },
      { key: 'sidebar.ambassador.description', label: 'Ambassadeur — Description', type: 'textarea', placeholder: 'Chaque voyage partagé prépare le suivant.' },
      { key: 'sidebar.ambassador.cta_text', label: 'Ambassadeur — Bouton', type: 'text', placeholder: 'Passer le relais' },
      // Social
      { key: 'sidebar.social.instagram', label: 'Social — Instagram URL', type: 'url', placeholder: 'https://instagram.com/...' },
      { key: 'sidebar.social.facebook', label: 'Social — Facebook URL', type: 'url', placeholder: 'https://facebook.com/...' },
      { key: 'sidebar.social.youtube', label: 'Social — YouTube URL', type: 'url', placeholder: 'https://youtube.com/...' },
    ],
  },
  {
    id: 'welcome',
    title: 'Page d\'accueil',
    icon: Home,
    description: 'Textes de bienvenue affichés sur la page d\'accueil de l\'espace voyageur',
    category: 'welcome',
    fields: [
      { key: 'welcome.title_template', label: 'Titre de bienvenue', type: 'text', placeholder: 'Bienvenue chez vous, {firstName} 🏠' },
      { key: 'welcome.subtitle', label: 'Sous-titre', type: 'text', placeholder: 'Votre espace voyageur Nomadays' },
      { key: 'welcome.proverb', label: 'Citation / Proverbe', type: 'text', placeholder: 'Ici, nos hôtes locaux vous accueillent comme en famille' },
    ],
  },
  {
    id: 'fidelity',
    title: 'Programme fidélité',
    icon: Star,
    description: 'Configuration des tiers de fidélité (nom, emoji, seuil de voyages)',
    category: 'fidelity',
    fields: [
      { key: 'fidelity.tier.1', label: 'Tier 1 — Nom', type: 'text', placeholder: 'Explorateur' },
      { key: 'fidelity.tier.2', label: 'Tier 2 — Nom', type: 'text', placeholder: 'Grand Voyageur' },
      { key: 'fidelity.tier.3', label: 'Tier 3 — Nom', type: 'text', placeholder: 'Explorateur du Monde' },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function WidgetsEditorPage() {
  // Load all snippet categories we need
  const { data: sidebarSnippets, loading: loadingSidebar } = useResolvedSnippets('sidebar', 'fr');
  const { data: welcomeSnippets, loading: loadingWelcome } = useResolvedSnippets('welcome', 'fr');
  const { data: fidelitySnippets, loading: loadingFidelity } = useResolvedSnippets('fidelity', 'fr');

  const { mutate: batchSave, loading: saving } = useBatchUpsertSnippets();

  const [values, setValues] = useState<Record<string, string>>({});
  const [fidelityMeta, setFidelityMeta] = useState<Record<string, { emoji: string; min_trips: number }>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['sidebar']));
  const [saveMessages, setSaveMessages] = useState<Record<string, string>>({});

  const loading = loadingSidebar || loadingWelcome || loadingFidelity;

  // Load snippets into local state
  useEffect(() => {
    const allSnippets = [...(sidebarSnippets || []), ...(welcomeSnippets || []), ...(fidelitySnippets || [])];
    if (allSnippets.length === 0) return;

    const newValues: Record<string, string> = {};
    const newMeta: Record<string, { emoji: string; min_trips: number }> = {};

    for (const s of allSnippets) {
      newValues[s.snippet_key] = s.content_json?.fr || '';
      if (s.category === 'fidelity' && s.metadata_json) {
        newMeta[s.snippet_key] = {
          emoji: (s.metadata_json.emoji as string) || '',
          min_trips: (s.metadata_json.min_trips as number) || 0,
        };
      }
    }

    setValues(prev => ({ ...prev, ...newValues }));
    setFidelityMeta(prev => ({ ...prev, ...newMeta }));
  }, [sidebarSnippets, welcomeSnippets, fidelitySnippets]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveSection = async (section: SectionDef) => {
    const items: SnippetBatchItem[] = section.fields.map(field => {
      const base: SnippetBatchItem = {
        snippet_key: field.key,
        category: section.category,
        content_json: { fr: values[field.key] || '' },
        sort_order: section.fields.indexOf(field),
        is_active: true,
      };

      // Add fidelity metadata
      if (section.category === 'fidelity' && fidelityMeta[field.key]) {
        base.metadata_json = fidelityMeta[field.key];
      }

      return base;
    });

    try {
      await batchSave(items);
      setSaveMessages(prev => ({ ...prev, [section.id]: 'Enregistré ✓' }));
      setTimeout(() => setSaveMessages(prev => ({ ...prev, [section.id]: '' })), 3000);
    } catch {
      setSaveMessages(prev => ({ ...prev, [section.id]: 'Erreur' }));
      setTimeout(() => setSaveMessages(prev => ({ ...prev, [section.id]: '' })), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Widgets & textes</h1>
          <p className="text-muted-foreground mt-1">
            Personnalisez les textes affichés dans l'espace voyageur : sidebar, accueil, fidélité
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {SECTIONS.map(section => {
              const isExpanded = expandedSections.has(section.id);
              const SectionIcon = section.icon;

              return (
                <div key={section.id} className="border rounded-lg bg-white overflow-hidden">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <SectionIcon className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-sm">{section.title}</h2>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                    {saveMessages[section.id] ? (
                      <span className={`text-xs ${saveMessages[section.id]?.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMessages[section.id]}
                      </span>
                    ) : null}
                  </button>

                  {/* Section content */}
                  {isExpanded && (
                    <div className="border-t px-5 py-4 space-y-4">
                      {section.fields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                            {field.label}
                          </label>
                          {field.type === 'textarea' ? (
                            <Textarea
                              value={values[field.key] || ''}
                              onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              rows={2}
                            />
                          ) : (
                            <Input
                              type={field.type === 'url' ? 'url' : 'text'}
                              value={values[field.key] || ''}
                              onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                            />
                          )}

                          {/* Extra fidelity fields (emoji + min_trips) */}
                          {section.category === 'fidelity' && (
                            <div className="flex gap-3 mt-2">
                              <div className="w-32">
                                <label className="text-[10px] text-gray-400">Emoji</label>
                                <Input
                                  value={fidelityMeta[field.key]?.emoji || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFidelityMeta(prev => {
                                      const cur = prev[field.key] || { emoji: '', min_trips: 0 };
                                      return { ...prev, [field.key]: { ...cur, emoji: val } };
                                    });
                                  }}
                                  placeholder="🌍"
                                  className="text-center"
                                />
                              </div>
                              <div className="w-32">
                                <label className="text-[10px] text-gray-400">Min. voyages</label>
                                <Input
                                  type="number"
                                  value={fidelityMeta[field.key]?.min_trips || 0}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    setFidelityMeta(prev => {
                                      const cur = prev[field.key] || { emoji: '', min_trips: 0 };
                                      return { ...prev, [field.key]: { ...cur, min_trips: val } };
                                    });
                                  }}
                                  min={0}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Save button per section */}
                      <div className="pt-2 border-t flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSaveSection(section)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Enregistrer {section.title.toLowerCase()}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
