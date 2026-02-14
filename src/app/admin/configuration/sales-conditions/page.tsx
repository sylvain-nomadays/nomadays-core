'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from '@/hooks/useApi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceConfig {
  cgv_html?: string | null;
}

// ─── Default CGV placeholder ─────────────────────────────────────────────────

const DEFAULT_CGV_HTML = `<h2>Article 1 — Objet</h2>
<p>Les présentes conditions particulières de vente régissent les relations contractuelles entre l'Organisateur et le Voyageur dans le cadre de la prestation de voyage référencée.</p>

<h2>Article 2 — Inscription et paiement</h2>
<p>L'inscription est considérée comme ferme et définitive après le versement de l'acompte prévu et l'acceptation des présentes conditions. Le solde doit être réglé au plus tard 30 jours avant la date de départ.</p>

<h2>Article 3 — Annulation par le Voyageur</h2>
<p>En cas d'annulation par le Voyageur, des frais d'annulation seront appliqués selon le barème suivant : plus de 60 jours avant le départ : 30% du prix total ; de 60 à 31 jours : 50% ; de 30 à 15 jours : 75% ; moins de 15 jours : 100%.</p>

<h2>Article 4 — Modification par l'Organisateur</h2>
<p>L'Organisateur se réserve le droit de modifier les éléments non essentiels du voyage. En cas de modification substantielle, le Voyageur pourra choisir entre l'acceptation de la modification, un voyage de substitution ou le remboursement intégral.</p>

<h2>Article 5 — Assurance</h2>
<p>L'Organisateur propose une assurance voyage couvrant l'annulation et l'assistance rapatriement. Le Voyageur est libre de souscrire ou de décliner cette assurance, étant informé des risques encourus en cas de non-souscription.</p>

<h2>Article 6 — Responsabilité</h2>
<p>L'Organisateur est responsable de la bonne exécution des services prévus au contrat, conformément aux dispositions du Code du tourisme.</p>

<h2>Article 7 — Réclamation et médiation</h2>
<p>Toute réclamation doit être adressée par écrit dans les 30 jours suivant la fin du voyage. En cas de litige, le Voyageur peut recourir au médiateur du tourisme et du voyage (MTV).</p>

<h2>Article 8 — Protection des données</h2>
<p>Les données personnelles collectées sont traitées conformément au RGPD. Le Voyageur dispose d'un droit d'accès, de rectification et de suppression de ses données.</p>

<h2>Article 9 — Droit applicable</h2>
<p>Les présentes conditions sont régies par le droit français.</p>`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function SalesConditionsPage() {
  const [cgvHtml, setCgvHtml] = useState('');
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch current config
  const fetcher = useCallback(async () => {
    return apiClient.get<InvoiceConfig>('/tenants/current/invoice-config');
  }, []);

  const { data, loading, error } = useApi(fetcher, { immediate: true, deps: [] });

  // Sync form when data loads
  useEffect(() => {
    if (data?.cgv_html) {
      setCgvHtml(data.cgv_html);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation(async (payload: { cgv_html: string }) => {
    return apiClient.patch<InvoiceConfig>('/tenants/current/invoice-config', payload);
  });

  const handleSave = async () => {
    try {
      const result = await saveMutation.mutate({ cgv_html: cgvHtml });
      if (result?.cgv_html) setCgvHtml(result.cgv_html);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[SalesConditions] Save error:', err);
    }
  };

  const handleUseDefault = () => {
    setCgvHtml(DEFAULT_CGV_HTML);
    setSaved(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Erreur de chargement</p>
          <p className="text-red-600 text-sm mt-1">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/configuration"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Configuration
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary-500" />
          Conditions particulières de vente
        </h1>
        <p className="text-gray-500 mt-1">
          Ce texte sera présenté aux clients avant le paiement et généré en PDF dans leurs documents de voyage.
        </p>
      </div>

      {/* Editor Section */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Contenu HTML des conditions</h2>
            <div className="flex items-center gap-2">
              {!cgvHtml && (
                <button
                  onClick={handleUseDefault}
                  className="text-xs text-[#0FB6BC] hover:text-[#0C9296] font-medium transition-colors"
                >
                  Utiliser le modèle par défaut
                </button>
              )}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Masquer l&apos;aperçu
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Aperçu
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-6">
            <textarea
              value={cgvHtml}
              onChange={(e) => {
                setCgvHtml(e.target.value);
                setSaved(false);
              }}
              placeholder="Collez ici le contenu HTML de vos conditions particulières de vente..."
              rows={20}
              className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
            />
            <p className="mt-2 text-xs text-gray-400">
              Utilisez les balises HTML standard : &lt;h2&gt; pour les titres, &lt;p&gt; pour les paragraphes, &lt;ul&gt;&lt;li&gt; pour les listes.
            </p>
          </div>
        </div>

        {/* Preview */}
        {showPreview && cgvHtml && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Aperçu</h2>
            </div>
            <div className="p-6">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: cgvHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t mt-8 -mx-4 px-4 py-4 flex items-center justify-end gap-3">
        {saveMutation.error && (
          <p className="text-sm text-red-600 mr-auto">
            Erreur : {String(saveMutation.error)}
          </p>
        )}
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600 mr-auto">
            <Check className="w-4 h-4" />
            Enregistré
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saveMutation.loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#0FB6BC' }}
        >
          {saveMutation.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
