'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  MoreVertical,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  XCircle,
  Send,
  Zap,
  Globe,
} from 'lucide-react';
import { useSuppliers, useCreateSupplier, useDeleteSupplier, getContractStatusDisplay } from '@/hooks/useSuppliers';
import { useLocations } from '@/hooks/useLocations';
import { COUNTRIES, getCountryFlag } from '@/lib/constants/countries';
import type { Supplier, SupplierStatus, SupplierType, CreateSupplierDTO, ContractValidityStatus } from '@/lib/api/types';


// Unified status config - combines supplier status and contract status
// "Archivé" is shown when is_active=false, otherwise we show contract status
const contractStatusConfig: Record<ContractValidityStatus | 'archived', {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>
}> = {
  valid: { label: 'Contrat OK', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expiring_soon: { label: 'Expire bientôt', color: 'bg-amber-100 text-amber-700', icon: Clock },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_contract: { label: 'Sans contrat', color: 'bg-orange-100 text-orange-700', icon: FileText },
  contract_requested: { label: 'Contrat demandé', color: 'bg-blue-100 text-blue-700', icon: Send },
  dynamic_pricing: { label: 'Tarif dynamique', color: 'bg-purple-100 text-purple-700', icon: Zap },
  ota_only: { label: 'OTA uniquement', color: 'bg-cyan-100 text-cyan-700', icon: Globe },
  archived: { label: 'Archivé', color: 'bg-gray-200 text-gray-500', icon: XCircle },
};

// Unified status filter options
const statusFilterOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'valid', label: '✅ Contrat OK' },
  { value: 'expiring_soon', label: '⏰ Expire bientôt' },
  { value: 'expired', label: '❌ Expiré' },
  { value: 'no_contract', label: '📄 Sans contrat' },
  { value: 'contract_requested', label: '📨 Contrat demandé' },
  { value: 'dynamic_pricing', label: '⚡ Tarif dynamique' },
  { value: 'ota_only', label: '🌐 OTA uniquement' },
  { value: 'archived', label: '📦 Archivés' },
];

const supplierTypes: { value: SupplierType; label: string; icon: string }[] = [
  { value: 'accommodation', label: 'Hébergement', icon: '🏨' },
  { value: 'transport', label: 'Transport', icon: '🚐' },
  { value: 'activity', label: 'Activité', icon: '🎯' },
  { value: 'guide', label: 'Guide', icon: '👤' },
  { value: 'restaurant', label: 'Restauration', icon: '🍽️' },
  { value: 'other', label: 'Autre', icon: '📦' },
];

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SupplierType | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // Unified status filter

  // Load locations for filter dropdown
  const { locations, isLoading: locationsLoading } = useLocations({ is_active: true });
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState<Partial<CreateSupplierDTO>>({
    type: 'accommodation',
    country_code: 'TH',
  });
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  // API hooks
  const {
    data: apiData,
    loading,
    error,
    refetch,
  } = useSuppliers({
    type: selectedType || undefined,
    // For 'archived' filter, we pass is_active=false to backend
    // For contract statuses, we pass contract_status
    status: selectedStatus === 'archived' ? 'inactive' : undefined,
    search: searchQuery || undefined,
    location_id: selectedLocation || undefined,
    contract_status: selectedStatus && selectedStatus !== 'archived' ? selectedStatus as ContractValidityStatus : undefined,
  });

  const { mutate: createSupplier, loading: creating } = useCreateSupplier();
  const { mutate: deleteSupplier, loading: deleting } = useDeleteSupplier();

  // Use API data only - no mock data
  const suppliers = useMemo(() => {
    // If we have API data (even empty array), use it
    if (apiData?.items !== undefined) {
      return apiData.items;
    }
    // Return empty array while loading or on error
    return [];
  }, [apiData]);

  // Client-side filtering for search (API handles type and status filters)
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchQuery ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = !selectedType || supplier.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [suppliers, searchQuery, selectedType]);

  // Helper to get unified status for a supplier
  const getUnifiedStatus = (supplier: Supplier): keyof typeof contractStatusConfig => {
    // If archived (inactive), show that first
    if (supplier.status === 'inactive') {
      return 'archived';
    }
    // Otherwise show contract status
    return supplier.contract_validity_status || 'no_contract';
  };

  const getTypeLabel = (type: string) => {
    return supplierTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: string) => {
    return supplierTypes.find(t => t.value === type)?.icon || '📦';
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('[handleCreateSupplier] Submitting:', JSON.stringify(newSupplierData, null, 2));
      await createSupplier(newSupplierData as CreateSupplierDTO);
      setShowNewSupplier(false);
      setNewSupplierData({ type: 'accommodation', country_code: 'TH' });
      refetch();
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string; status?: number };
      console.error('Failed to create supplier:', JSON.stringify(error, null, 2));
      console.error('Error detail:', error.detail);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      alert(`Erreur: ${error.detail || error.message || 'Échec de la création'}`);
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier, permanent: boolean = false) => {
    const message = permanent
      ? `⚠️ SUPPRESSION DÉFINITIVE ⚠️\n\nÊtes-vous sûr de vouloir supprimer définitivement "${supplier.name}" ?\n\nCette action est IRRÉVERSIBLE et supprimera aussi tous les contrats, hébergements et tarifs associés.`
      : `Voulez-vous désactiver "${supplier.name}" ?\n\nLe fournisseur sera masqué mais pourra être réactivé plus tard.`;

    if (!confirm(message)) {
      return;
    }

    try {
      await deleteSupplier({ id: supplier.id, permanent });
      setMenuOpen(null);
      refetch();
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      alert(`Erreur: ${error.detail || error.message || 'Échec de la suppression'}`);
    }
  };

  // Stats - focus on contract status only
  const stats = useMemo(() => ({
    total: suppliers.length,
    contractsOk: suppliers.filter(s => s.contract_validity_status === 'valid').length,
    needsAction: suppliers.filter(s =>
      s.contract_validity_status === 'no_contract' ||
      s.contract_validity_status === 'expired' ||
      s.contract_validity_status === 'expiring_soon'
    ).length,
    archived: suppliers.filter(s => s.status === 'inactive').length,
  }), [suppliers]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500">
            Gérez vos prestataires et partenaires
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={() => setShowNewSupplier(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5" />
            Nouveau fournisseur
          </button>
        </div>
      </div>

      {/* API Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Erreur de connexion</p>
            <p className="text-red-700 text-sm">
              {typeof error === 'object' && 'detail' in error
                ? (error as { detail: string }).detail
                : 'Impossible de se connecter à l\'API. Vérifiez que le backend est démarré.'}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total fournisseurs</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div className="text-2xl font-bold text-emerald-600">{stats.contractsOk}</div>
          </div>
          <div className="text-sm text-gray-500">Contrats OK</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <div className="text-2xl font-bold text-orange-600">{stats.needsAction}</div>
          </div>
          <div className="text-sm text-gray-500">Action requise</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-400" />
            <div className="text-2xl font-bold text-gray-500">{stats.archived}</div>
          </div>
          <div className="text-sm text-gray-500">Archivés</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedType || ''}
              onChange={e => setSelectedType((e.target.value as SupplierType) || null)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Tous les types</option>
              {supplierTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Unified Status filter */}
          <select
            value={selectedStatus || ''}
            onChange={e => setSelectedStatus(e.target.value || null)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {statusFilterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Location filter */}
          <select
            value={selectedLocation || ''}
            onChange={e => setSelectedLocation(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            disabled={locationsLoading}
          >
            <option value="">Toutes les localisations</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {/* Suppliers List */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Localisation</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Contact</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Statut</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.map((supplier) => {
                  // Unified status: archived if inactive, otherwise contract status
                  const unifiedStatus = getUnifiedStatus(supplier);
                  const StatusIcon = contractStatusConfig[unifiedStatus].icon;
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Link href={`/admin/suppliers/${supplier.id}`} className="flex items-center gap-3 group">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                            {getTypeIcon(supplier.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 group-hover:text-emerald-600">{supplier.name}</span>
                              {supplier.star_rating && (
                                <div className="flex items-center gap-0.5">
                                  {[...Array(supplier.star_rating)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">ID: {supplier.id}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">
                          {getTypeLabel(supplier.type)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {supplier.location_id
                              ? locations.find(l => l.id === supplier.location_id)?.name || supplier.city || '-'
                              : supplier.city || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">{supplier.contact_name}</div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {supplier.contact_email && (
                              <a href={`mailto:${supplier.contact_email}`} className="hover:text-emerald-600">
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                            {supplier.contact_phone && (
                              <a href={`tel:${supplier.contact_phone}`} className="hover:text-emerald-600">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/admin/suppliers/${supplier.id}?tab=contracts`}
                          className="block"
                        >
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${contractStatusConfig[unifiedStatus].color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {contractStatusConfig[unifiedStatus].label}
                          </span>
                          {supplier.contract_valid_to && unifiedStatus !== 'no_contract' && unifiedStatus !== 'archived' && (
                            <div className="text-xs text-gray-500 mt-1">
                              {unifiedStatus === 'expired' ? 'Expiré le ' : 'Expire le '}
                              {new Date(supplier.contract_valid_to).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setMenuOpen(menuOpen === supplier.id ? null : supplier.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                          {menuOpen === supplier.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px] z-50">
                              <Link
                                href={`/admin/suppliers/${supplier.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" />
                                Voir détails
                              </Link>
                              <Link
                                href={`/admin/suppliers/${supplier.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Modifier
                              </Link>
                              <button
                                onClick={() => handleDeleteSupplier(supplier, false)}
                                disabled={deleting}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 w-full text-left disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                {deleting ? 'En cours...' : 'Désactiver'}
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(supplier, true)}
                                disabled={deleting}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                {deleting ? 'En cours...' : 'Supprimer définitivement'}
                              </button>
                              {/* Link to contracts tab for contract management */}
                              {(supplier.contract_validity_status === 'no_contract' || supplier.contract_validity_status === 'expired') && (
                                <>
                                  <div className="border-t border-gray-100 my-1" />
                                  <Link
                                    href={`/admin/suppliers/${supplier.id}?tab=contracts`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                  >
                                    Gérer contrats
                                  </Link>
                                </>
                              )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun fournisseur trouvé</h3>
              <p className="text-gray-500">
                {searchQuery || selectedType || selectedStatus
                  ? 'Essayez de modifier vos filtres'
                  : 'Commencez par ajouter votre premier fournisseur'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau fournisseur</h2>
              <button
                onClick={() => setShowNewSupplier(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du fournisseur *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSupplierData.name || ''}
                    onChange={e => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                    placeholder="Ex: Bangkok Palace Hotel"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={newSupplierData.type || 'accommodation'}
                    onChange={e => setNewSupplierData({ ...newSupplierData, type: e.target.value as SupplierType })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {supplierTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays
                  </label>
                  <select
                    value={newSupplierData.country_code || 'TH'}
                    onChange={e => setNewSupplierData({ ...newSupplierData, country_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={newSupplierData.city || ''}
                    onChange={e => setNewSupplierData({ ...newSupplierData, city: e.target.value })}
                    placeholder="Ex: Bangkok"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du contact
                  </label>
                  <input
                    type="text"
                    value={newSupplierData.contact_name || ''}
                    onChange={e => setNewSupplierData({ ...newSupplierData, contact_name: e.target.value })}
                    placeholder="Ex: Somchai Prasert"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newSupplierData.contact_email || ''}
                    onChange={e => setNewSupplierData({ ...newSupplierData, contact_email: e.target.value })}
                    placeholder="contact@supplier.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newSupplierData.contact_phone || ''}
                    onChange={e => setNewSupplierData({ ...newSupplierData, contact_phone: e.target.value })}
                    placeholder="+66 XX XXX XXXX"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewSupplier(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer le fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
