'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, Loader2, MessageSquare, Home, Star, ChevronDown, ChevronRight,
  ImageIcon, Upload, Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  uploadCmsImage,
  saveCmsSnippets,
  loadCmsSnippets,
  type CmsSnippetInput,
  type CmsSnippetRow,
} from '@/lib/actions/cms-images';

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

// ── Image field definitions ──────────────────────────────────────────────────

interface ImageFieldDef {
  key: string;
  label: string;
  description: string;
  aspect: string;        // e.g. "16:9", "4:5"
  dimensions: string;    // e.g. "1920×1080"
  purpose: string;       // used for storage path
}

const IMAGE_FIELDS: ImageFieldDef[] = [
  {
    key: 'images.hero_destination',
    label: 'Photo Header Destination',
    description: 'Image de fond du header dans l\'espace voyageur (page dossier). Format paysage recommandé.',
    aspect: '16/9',
    dimensions: '1920 × 600 px',
    purpose: 'hero-destination',
  },
  {
    key: 'images.salon_de_the_aquarelle',
    label: 'Aquarelle Salon de Thé',
    description: 'Illustration aquarelle affichée en bannière du Salon de Thé (chat voyageur).',
    aspect: '16/9',
    dimensions: '1456 × 816 px',
    purpose: 'salon-de-the',
  },
];

// ── ImageUploadField component ───────────────────────────────────────────────

function ImageUploadField({
  field,
  currentUrl,
  onUrlChange,
}: {
  field: ImageFieldDef;
  currentUrl: string;
  onUrlChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadMessage('Seules les images sont acceptées');
      setTimeout(() => setUploadMessage(''), 3000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage('10 MB maximum');
      setTimeout(() => setUploadMessage(''), 3000);
      return;
    }

    setUploading(true);
    setUploadMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', field.purpose);

      const result = await uploadCmsImage(formData);

      if (result.success && result.url) {
        onUrlChange(result.url);
        setUploadMessage('Image uploadée ✓');
        setTimeout(() => setUploadMessage(''), 3000);
      } else {
        setUploadMessage(result.error || 'Erreur');
        setTimeout(() => setUploadMessage(''), 4000);
      }
    } catch {
      setUploadMessage('Erreur réseau');
      setTimeout(() => setUploadMessage(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
        {field.label}
      </label>
      <p className="text-[11px] text-gray-400 mb-2">
        {field.description} — Dimensions idéales : {field.dimensions}
      </p>

      {/* Preview + Upload zone */}
      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div
          className="relative flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
          style={{ width: 220, aspectRatio: field.aspect }}
        >
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt={field.label}
              fill
              className="object-cover"
              sizes="220px"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
              <ImageIcon className="h-8 w-8 mb-1" />
              <span className="text-[10px]">Pas d&apos;image</span>
            </div>
          )}
        </div>

        {/* Upload area */}
        <div className="flex-1 space-y-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer
              transition-colors
              ${dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleInputChange}
              className="hidden"
            />

            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Upload en cours…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Glisser-déposer ou <span className="text-blue-600 underline">parcourir</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  JPEG, PNG, WebP · 10 MB max
                </span>
              </div>
            )}
          </div>

          {/* URL manual input */}
          <div className="flex gap-2">
            <Input
              type="url"
              value={currentUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://... (ou uploader ci-dessus)"
              className="text-xs h-8"
            />
            {currentUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-gray-400 hover:text-red-500"
                onClick={() => onUrlChange('')}
                title="Supprimer l'image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Upload message */}
          {uploadMessage && (
            <span className={`text-xs ${uploadMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {uploadMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

// All categories to load
const ALL_CATEGORIES = ['sidebar', 'welcome', 'fidelity', 'images'];

export default function WidgetsEditorPage() {
  const [allSnippets, setAllSnippets] = useState<CmsSnippetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState<Record<string, string>>({});
  const [fidelityMeta, setFidelityMeta] = useState<Record<string, { emoji: string; min_trips: number }>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['images', 'sidebar']));
  const [saveMessages, setSaveMessages] = useState<Record<string, string>>({});

  // Image state
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageSaveMessage, setImageSaveMessage] = useState('');

  // ── Load all snippets via server action ─────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        ALL_CATEGORIES.map(cat => loadCmsSnippets(cat))
      );
      const flat = results.flat();
      setAllSnippets(flat);

      // Populate local state
      const newValues: Record<string, string> = {};
      const newMeta: Record<string, { emoji: string; min_trips: number }> = {};
      const newImageUrls: Record<string, string> = {};

      for (const s of flat) {
        if (s.category === 'images') {
          newImageUrls[s.snippet_key] = s.content_json?.fr || '';
        } else {
          newValues[s.snippet_key] = s.content_json?.fr || '';
        }
        if (s.category === 'fidelity' && s.metadata_json) {
          newMeta[s.snippet_key] = {
            emoji: (s.metadata_json.emoji as string) || '',
            min_trips: (s.metadata_json.min_trips as number) || 0,
          };
        }
      }

      setValues(prev => ({ ...prev, ...newValues }));
      setFidelityMeta(prev => ({ ...prev, ...newMeta }));
      setImageUrls(prev => ({ ...prev, ...newImageUrls }));
    } catch (err) {
      console.error('[WidgetsEditor] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Save section via server action ──────────────────────────────────────

  const handleSaveSection = async (section: SectionDef) => {
    setSaving(true);
    const items: CmsSnippetInput[] = section.fields.map((field, i) => {
      const base: CmsSnippetInput = {
        snippet_key: field.key,
        category: section.category,
        content_json: { fr: values[field.key] || '' },
        sort_order: i,
        is_active: true,
      };

      // Add fidelity metadata
      if (section.category === 'fidelity' && fidelityMeta[field.key]) {
        base.metadata_json = fidelityMeta[field.key];
      }

      return base;
    });

    try {
      const result = await saveCmsSnippets(items);
      if (result.success) {
        setSaveMessages(prev => ({ ...prev, [section.id]: 'Enregistré ✓' }));
        setTimeout(() => setSaveMessages(prev => ({ ...prev, [section.id]: '' })), 3000);
      } else {
        setSaveMessages(prev => ({ ...prev, [section.id]: result.error || 'Erreur' }));
        setTimeout(() => setSaveMessages(prev => ({ ...prev, [section.id]: '' })), 4000);
      }
    } catch {
      setSaveMessages(prev => ({ ...prev, [section.id]: 'Erreur réseau' }));
      setTimeout(() => setSaveMessages(prev => ({ ...prev, [section.id]: '' })), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImages = async () => {
    setSaving(true);
    const items: CmsSnippetInput[] = IMAGE_FIELDS.map((field, i) => ({
      snippet_key: field.key,
      category: 'images',
      content_json: { fr: imageUrls[field.key] || '' },
      sort_order: i,
      is_active: true,
    }));

    try {
      const result = await saveCmsSnippets(items);
      if (result.success) {
        setImageSaveMessage('Enregistré ✓');
        setTimeout(() => setImageSaveMessage(''), 3000);
      } else {
        setImageSaveMessage(result.error || 'Erreur');
        setTimeout(() => setImageSaveMessage(''), 4000);
      }
    } catch {
      setImageSaveMessage('Erreur réseau');
      setTimeout(() => setImageSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const isImagesExpanded = expandedSections.has('images');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Widgets & textes</h1>
          <p className="text-muted-foreground mt-1">
            Personnalisez les textes et visuels affichés dans l&apos;espace voyageur
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

            {/* ── Images section ────────────────────────────────────────── */}
            <div className="border rounded-lg bg-white overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection('images')}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                {isImagesExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-sm">Images</h2>
                  <p className="text-xs text-muted-foreground">
                    Photo header destination et aquarelle du Salon de Thé
                  </p>
                </div>
                {imageSaveMessage ? (
                  <span className={`text-xs ${imageSaveMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                    {imageSaveMessage}
                  </span>
                ) : null}
              </button>

              {/* Section content */}
              {isImagesExpanded && (
                <div className="border-t px-5 py-4 space-y-6">
                  {IMAGE_FIELDS.map(field => (
                    <ImageUploadField
                      key={field.key}
                      field={field}
                      currentUrl={imageUrls[field.key] || ''}
                      onUrlChange={(url) => setImageUrls(prev => ({ ...prev, [field.key]: url }))}
                    />
                  ))}

                  {/* Save button */}
                  <div className="pt-2 border-t flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSaveImages}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer les images
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Text sections ─────────────────────────────────────────── */}
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
