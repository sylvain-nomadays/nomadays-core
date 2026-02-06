'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Building2,
  Pencil,
  Trash2,
  Eye,
  Search,
  MoreVertical,
  ExternalLink,
  Mail,
  Phone,
  Palette,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { usePartnerAgencies, useDeletePartnerAgency } from '@/hooks/usePartnerAgencies';
import type { PartnerAgency } from '@/lib/api/types';

export default function PartnerAgenciesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<PartnerAgency | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { agencies, loading, error, refetch } = usePartnerAgencies({
    includeInactive: showInactive
  });
  const { deleteAgency, loading: deleting } = useDeletePartnerAgency();

  // Filter agencies by search
  const filteredAgencies = agencies.filter(agency => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agency.name.toLowerCase().includes(query) ||
      agency.code?.toLowerCase().includes(query) ||
      agency.contact_name?.toLowerCase().includes(query) ||
      agency.contact_email?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (id: number) => {
    try {
      await deleteAgency(id);
      setShowDeleteConfirm(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete agency:', err);
    }
  };

  const handleEdit = (agency: PartnerAgency) => {
    setSelectedAgency(agency);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux paramètres
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-emerald-600" />
              Agences partenaires
            </h1>
            <p className="text-gray-500 mt-1">
              Gérez vos partenaires B2B et leur branding pour les documents white-label
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau partenaire
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, code, contact..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">Afficher les inactifs</span>
          </label>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">Erreur lors du chargement des partenaires</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredAgencies.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'Aucun résultat' : 'Aucune agence partenaire'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? 'Essayez avec d\'autres termes de recherche'
              : 'Créez votre première agence partenaire pour commencer'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Créer une agence
            </button>
          )}
        </div>
      )}

      {/* Agencies list */}
      {filteredAgencies.length > 0 && (
        <div className="grid gap-4">
          {filteredAgencies.map((agency) => (
            <div
              key={agency.id}
              className={`bg-white rounded-xl shadow-sm border ${
                agency.is_active ? 'border-gray-100' : 'border-gray-200 bg-gray-50'
              } p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-4">
                {/* Logo/Avatar */}
                <div className="flex-shrink-0">
                  {agency.logo_url ? (
                    <img
                      src={agency.logo_url}
                      alt={agency.name}
                      className="w-16 h-16 object-contain rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: agency.primary_color || '#e5e7eb' }}
                    >
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {agency.name}
                    </h3>
                    {agency.code && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">
                        {agency.code}
                      </span>
                    )}
                    {agency.is_active ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                        <CheckCircle className="w-3 h-3" />
                        Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                        <XCircle className="w-3 h-3" />
                        Inactif
                      </span>
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    {agency.contact_name && (
                      <span>{agency.contact_name}</span>
                    )}
                    {agency.contact_email && (
                      <a
                        href={`mailto:${agency.contact_email}`}
                        className="flex items-center gap-1 hover:text-emerald-600"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {agency.contact_email}
                      </a>
                    )}
                    {agency.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {agency.contact_phone}
                      </span>
                    )}
                    {agency.website && (
                      <a
                        href={agency.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-emerald-600"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Site web
                      </a>
                    )}
                  </div>

                  {/* Features badges */}
                  <div className="flex flex-wrap gap-2">
                    {agency.primary_color && (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                        <Palette className="w-3 h-3" />
                        Branding personnalisé
                        <span
                          className="w-3 h-3 rounded-full border border-purple-200"
                          style={{ backgroundColor: agency.primary_color }}
                        />
                      </span>
                    )}
                    {(agency.template_booking_conditions || agency.template_cancellation_policy) && (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        <FileText className="w-3 h-3" />
                        Templates personnalisés
                      </span>
                    )}
                    {agency.pdf_header_html && (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                        En-tête PDF
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(agency)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(agency.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delete confirmation */}
              {showDeleteConfirm === agency.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      Supprimer <strong>{agency.name}</strong> ? Cette action est irréversible.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDelete(agency.id)}
                        disabled={deleting}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <PartnerAgencyModal
          agency={showEditModal ? selectedAgency : null}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedAgency(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedAgency(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Partner Agency Modal Component
// ============================================================================

interface PartnerAgencyModalProps {
  agency: PartnerAgency | null;
  onClose: () => void;
  onSave: () => void;
}

function PartnerAgencyModal({ agency, onClose, onSave }: PartnerAgencyModalProps) {
  const isEditing = !!agency;
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'templates'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: agency?.name || '',
    code: agency?.code || '',
    is_active: agency?.is_active ?? true,
    // Contact
    contact_name: agency?.contact_name || '',
    contact_email: agency?.contact_email || '',
    contact_phone: agency?.contact_phone || '',
    website: agency?.website || '',
    address: agency?.address || '',
    // Branding
    logo_url: agency?.logo_url || '',
    primary_color: agency?.primary_color || '#1a5f4a',
    secondary_color: agency?.secondary_color || '#f0f9f4',
    accent_color: agency?.accent_color || '#10b981',
    font_family: agency?.font_family || '',
    pdf_style: agency?.pdf_style || 'modern',
    pdf_header_html: agency?.pdf_header_html || '',
    pdf_footer_html: agency?.pdf_footer_html || '',
    // Templates
    template_booking_conditions: agency?.template_booking_conditions?.content || '',
    template_cancellation_policy: agency?.template_cancellation_policy?.content || '',
    template_general_info: agency?.template_general_info?.content || '',
    template_legal_mentions: agency?.template_legal_mentions?.content || '',
    // Meta
    notes: agency?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code || undefined,
        is_active: formData.is_active,
        contact_name: formData.contact_name || undefined,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        logo_url: formData.logo_url || undefined,
        primary_color: formData.primary_color || undefined,
        secondary_color: formData.secondary_color || undefined,
        accent_color: formData.accent_color || undefined,
        font_family: formData.font_family || undefined,
        pdf_style: formData.pdf_style as 'modern' | 'classic' | 'minimal',
        pdf_header_html: formData.pdf_header_html || undefined,
        pdf_footer_html: formData.pdf_footer_html || undefined,
        template_booking_conditions: formData.template_booking_conditions
          ? { content: formData.template_booking_conditions }
          : undefined,
        template_cancellation_policy: formData.template_cancellation_policy
          ? { content: formData.template_cancellation_policy }
          : undefined,
        template_general_info: formData.template_general_info
          ? { content: formData.template_general_info }
          : undefined,
        template_legal_mentions: formData.template_legal_mentions
          ? { content: formData.template_legal_mentions }
          : undefined,
        notes: formData.notes || undefined,
      };

      if (isEditing && agency) {
        const { updatePartnerAgency } = await import('@/lib/api/partner-agencies');
        await updatePartnerAgency(agency.id, payload);
      } else {
        const { createPartnerAgency } = await import('@/lib/api/partner-agencies');
        await createPartnerAgency(payload);
      }

      onSave();
    } catch (err: unknown) {
      console.error('Failed to save agency:', err);
      // L'API client lance un objet avec { detail, status }
      const errorMessage = (err as { detail?: string })?.detail || 'Erreur lors de l\'enregistrement';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Modifier le partenaire' : 'Nouveau partenaire'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100">
          <div className="flex gap-6">
            {[
              { id: 'general', label: 'Informations', icon: Building2 },
              { id: 'branding', label: 'Branding', icon: Palette },
              { id: 'templates', label: 'Templates', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'agence *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Trace Directe"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code court
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: TD"
                      maxLength={10}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Partenaire actif
                  </label>
                </div>

                <hr className="my-4" />

                <h3 className="font-medium text-gray-900 mb-3">Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du contact
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="Ex: Marie Martin"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="contact@partenaire.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+33 1 23 45 67 89"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site web
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://www.partenaire.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    placeholder="123 rue Example, 75001 Paris"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes internes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Notes sur ce partenaire..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL du logo
                  </label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formData.logo_url && (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="max-h-20 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                <h3 className="font-medium text-gray-900 mt-6 mb-3">Couleurs</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Couleur principale
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        placeholder="#1a5f4a"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Couleur secondaire
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        placeholder="#f0f9f4"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Couleur d'accent
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                        className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.accent_color}
                        onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                        placeholder="#10b981"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 rounded-lg border-2" style={{ borderColor: formData.primary_color }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: formData.primary_color }}
                    />
                    <span className="font-semibold" style={{ color: formData.primary_color }}>
                      {formData.name || 'Nom du partenaire'}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: formData.secondary_color !== '#f0f9f4' ? formData.secondary_color : '#666' }}>
                    Aperçu des couleurs du partenaire
                  </p>
                </div>

                <h3 className="font-medium text-gray-900 mt-6 mb-3">Configuration PDF</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Police
                    </label>
                    <input
                      type="text"
                      value={formData.font_family}
                      onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                      placeholder="Inter, Montserrat..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style PDF
                    </label>
                    <select
                      value={formData.pdf_style}
                      onChange={(e) => setFormData({ ...formData, pdf_style: e.target.value as 'modern' | 'classic' | 'minimal' })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="modern">Moderne</option>
                      <option value="classic">Classique</option>
                      <option value="minimal">Minimaliste</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    En-tête PDF (HTML)
                  </label>
                  <textarea
                    value={formData.pdf_header_html}
                    onChange={(e) => setFormData({ ...formData, pdf_header_html: e.target.value })}
                    rows={3}
                    placeholder="<div>...</div>"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pied de page PDF (HTML)
                  </label>
                  <textarea
                    value={formData.pdf_footer_html}
                    onChange={(e) => setFormData({ ...formData, pdf_footer_html: e.target.value })}
                    rows={3}
                    placeholder="<div>...</div>"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-500">
                  Ces templates seront utilisés automatiquement lors de la génération de documents pour les dossiers liés à ce partenaire.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions de réservation
                  </label>
                  <textarea
                    value={formData.template_booking_conditions}
                    onChange={(e) => setFormData({ ...formData, template_booking_conditions: e.target.value })}
                    rows={5}
                    placeholder="Conditions de réservation spécifiques au partenaire..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions d'annulation
                  </label>
                  <textarea
                    value={formData.template_cancellation_policy}
                    onChange={(e) => setFormData({ ...formData, template_cancellation_policy: e.target.value })}
                    rows={5}
                    placeholder="Politique d'annulation spécifique au partenaire..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Informations générales
                  </label>
                  <textarea
                    value={formData.template_general_info}
                    onChange={(e) => setFormData({ ...formData, template_general_info: e.target.value })}
                    rows={5}
                    placeholder="Informations générales spécifiques au partenaire..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mentions légales
                  </label>
                  <textarea
                    value={formData.template_legal_mentions}
                    onChange={(e) => setFormData({ ...formData, template_legal_mentions: e.target.value })}
                    rows={5}
                    placeholder="Mentions légales spécifiques au partenaire..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isEditing ? 'Enregistrer' : 'Créer le partenaire'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
