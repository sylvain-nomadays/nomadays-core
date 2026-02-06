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
} from 'lucide-react';
import { useSuppliers, useCreateSupplier, getContractStatusDisplay } from '@/hooks/useSuppliers';
import type { Supplier, SupplierStatus, SupplierType, CreateSupplierDTO, ContractValidityStatus } from '@/lib/api/types';
import { COUNTRIES, getCountryFlag } from '@/lib/constants/countries';

// Extended mock type with contract info
type MockSupplier = Supplier & {
  star_rating?: number;
};

// Fallback mock data with contract status
const mockSuppliers: MockSupplier[] = [
  {
    id: 1,
    tenant_id: '123',
    name: 'Riad Jnane Mogador',
    type: 'accommodation',
    country_code: 'MA',
    city: 'Marrakech',
    address: '16 Derb Sidi Bouloukat, Médina',
    contact_name: 'Mohamed Alami',
    contact_email: 'reservation@riadjnane.com',
    contact_phone: '+212 524 123 456',
    status: 'active',
    star_rating: 4,
    // Contract info
    active_contract_id: 1,
    active_contract_name: 'Contrat 2024-2025',
    contract_valid_to: '2025-04-30',
    contract_validity_status: 'valid',
    days_until_contract_expiry: 83,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z',
  },
  {
    id: 2,
    tenant_id: '123',
    name: 'Bangkok Palace Hotel',
    type: 'accommodation',
    country_code: 'TH',
    city: 'Bangkok',
    address: 'Sukhumvit Road',
    contact_name: 'Somchai Prasert',
    contact_email: 'reservation@bkkpalace.com',
    contact_phone: '+66 2 123 4567',
    status: 'active',
    star_rating: 5,
    // Contract info - expiring soon
    active_contract_id: 2,
    active_contract_name: 'Contrat Haute Saison',
    contract_valid_to: '2026-02-28',
    contract_validity_status: 'expiring_soon',
    days_until_contract_expiry: 22,
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-11-15T09:00:00Z',
  },
  {
    id: 3,
    tenant_id: '123',
    name: 'Atlas Voyages Transport',
    type: 'transport',
    country_code: 'MA',
    city: 'Casablanca',
    address: 'Zone industrielle Ain Sebaâ',
    contact_name: 'Karim Benjelloun',
    contact_email: 'contact@atlasvoyages.ma',
    contact_phone: '+212 522 987 654',
    status: 'active',
    // Contract info - expired!
    active_contract_id: 3,
    active_contract_name: 'Contrat 2024',
    contract_valid_to: '2025-12-31',
    contract_validity_status: 'expired',
    days_until_contract_expiry: -37,
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-11-15T09:00:00Z',
  },
  {
    id: 4,
    tenant_id: '123',
    name: 'Désert Aventures',
    type: 'activity',
    country_code: 'MA',
    city: 'Merzouga',
    address: 'Erg Chebbi',
    contact_name: 'Hassan Oubaha',
    contact_email: 'info@desertaventures.com',
    contact_phone: '+212 661 234 567',
    status: 'active',
    // Contract info
    active_contract_id: 4,
    active_contract_name: 'Contrat annuel',
    contract_valid_to: '2026-12-31',
    contract_validity_status: 'valid',
    days_until_contract_expiry: 328,
    created_at: '2024-03-10T10:00:00Z',
    updated_at: '2024-10-20T16:00:00Z',
  },
  {
    id: 5,
    tenant_id: '123',
    name: 'Thai Elephant Sanctuary',
    type: 'activity',
    country_code: 'TH',
    city: 'Chiang Mai',
    address: 'Mae Taeng District',
    contact_name: 'Nattaya Sriwan',
    contact_email: 'booking@elephantsanctuary.th',
    contact_phone: '+66 53 456 789',
    status: 'pending',
    // No contract
    contract_validity_status: 'no_contract',
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
  },
];

// Contract status display config
const contractStatusConfig: Record<ContractValidityStatus, {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>
}> = {
  valid: { label: 'Contrat OK', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expiring_soon: { label: 'Expire bientôt', color: 'bg-amber-100 text-amber-700', icon: Clock },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_contract: { label: 'Sans contrat', color: 'bg-gray-100 text-gray-500', icon: FileText },
};

const supplierTypes: { value: SupplierType; label: string; icon: string }[] = [
  { value: 'accommodation', label: 'Hébergement', icon: '🏨' },
  { value: 'transport', label: 'Transport', icon: '🚐' },
  { value: 'activity', label: 'Activité', icon: '🎯' },
  { value: 'guide', label: 'Guide', icon: '👤' },
  { value: 'restaurant', label: 'Restauration', icon: '🍽️' },
  { value: 'other', label: 'Autre', icon: '📦' },
];

const statusConfig: Record<SupplierStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SupplierType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SupplierStatus | null>(null);
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
    status: selectedStatus || undefined,
    search: searchQuery || undefined,
  });

  const { mutate: createSupplier, loading: creating } = useCreateSupplier();

  // Use API data or fallback to mock
  // Use API data or fallback to mock
  const suppliers = useMemo(() => {
    if (apiData?.items) {
      return apiData.items;
    }
    return mockSuppliers;
  }, [apiData]);

  // Client-side filtering (for mock data)
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchQuery ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = !selectedType || supplier.type === selectedType;
      const matchesStatus = !selectedStatus || supplier.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [suppliers, searchQuery, selectedType, selectedStatus]);

  const getTypeLabel = (type: string) => {
    return supplierTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: string) => {
    return supplierTypes.find(t => t.value === type)?.icon || '📦';
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSupplier(newSupplierData as CreateSupplierDTO);
      setShowNewSupplier(false);
      setNewSupplierData({ type: 'accommodation', country_code: 'TH' });
      refetch();
    } catch (err) {
      console.error('Failed to create supplier:', err);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    contractsOk: suppliers.filter(s => s.contract_validity_status === 'valid').length,
    contractsExpiring: suppliers.filter(s => s.contract_validity_status === 'expiring_soon').length,
    contractsExpired: suppliers.filter(s => s.contract_validity_status === 'expired').length,
  }), [suppliers]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500">
            Gérez vos prestataires et partenaires
            {error && <span className="ml-2 text-amber-600 text-sm">(mode démonstration)</span>}
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">Mode démonstration</p>
            <p className="text-amber-700 text-sm">
              Impossible de se connecter à l'API. Les données affichées sont des exemples.
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
          <div className="text-sm text-gray-500">Contrats à jour</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <div className="text-2xl font-bold text-amber-600">{stats.contractsExpiring}</div>
          </div>
          <div className="text-sm text-gray-500">Expirent bientôt</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div className="text-2xl font-bold text-red-600">{stats.contractsExpired}</div>
          </div>
          <div className="text-sm text-gray-500">Contrats expirés</div>
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

          {/* Status filter */}
          <select
            value={selectedStatus || ''}
            onChange={e => setSelectedStatus((e.target.value as SupplierStatus) || null)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="pending">En attente</option>
            <option value="inactive">Inactifs</option>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Localisation</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Contact</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Contrat</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Statut</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.map(supplier => {
                  const StatusIcon = statusConfig[supplier.status].icon;
                  const contractStatus = supplier.contract_validity_status || 'no_contract';
                  const ContractIcon = contractStatusConfig[contractStatus].icon;
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
                          <span>{supplier.city}, {getCountryFlag(supplier.country_code || '')} {supplier.country_code}</span>
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
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/suppliers/${supplier.id}?tab=contracts`}
                          className="block"
                        >
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${contractStatusConfig[contractStatus].color}`}>
                            <ContractIcon className="w-3 h-3" />
                            {contractStatusConfig[contractStatus].label}
                          </span>
                          {supplier.contract_valid_to && contractStatus !== 'no_contract' && (
                            <div className="text-xs text-gray-500 mt-1">
                              {contractStatus === 'expired' ? 'Expiré le ' : 'Expire le '}
                              {new Date(supplier.contract_valid_to).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[supplier.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[supplier.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === supplier.id ? null : supplier.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpen === supplier.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 w-40">
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
                              <button className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
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
