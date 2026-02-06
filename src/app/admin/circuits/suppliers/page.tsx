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
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers';
import type { Supplier, SupplierStatus, SupplierType, CreateSupplierDTO } from '@/lib/api/types';
import { COUNTRIES, getCountryFlag } from '@/lib/constants/countries';

// Fallback mock data
const mockSuppliers: (Supplier & { contracts_count: number; rating: number })[] = [
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
    contracts_count: 3,
    rating: 4.5,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z',
  },
  {
    id: 2,
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
    contracts_count: 2,
    rating: 4.8,
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-11-15T09:00:00Z',
  },
  {
    id: 3,
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
    contracts_count: 1,
    rating: 4.9,
    created_at: '2024-03-10T10:00:00Z',
    updated_at: '2024-10-20T16:00:00Z',
  },
];

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
  const suppliers = useMemo(() => {
    if (apiData?.items) {
      return apiData.items.map(s => ({ ...s, contracts_count: 0, rating: 0 }));
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
    pending: suppliers.filter(s => s.status === 'pending').length,
    contracts: suppliers.reduce((sum, s) => sum + (s as typeof mockSuppliers[0]).contracts_count, 0),
  }), [suppliers]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/circuits"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux circuits
          </Link>
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
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-sm text-gray-500">Actifs</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">En attente</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.contracts}</div>
          <div className="text-sm text-gray-500">Contrats actifs</div>
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
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Contrats</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Note</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Statut</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.map(supplier => {
                  const StatusIcon = statusConfig[supplier.status].icon;
                  const extendedSupplier = supplier as typeof mockSuppliers[0];
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                            {getTypeIcon(supplier.type)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{supplier.name}</div>
                            <div className="text-sm text-gray-500">ID: {supplier.id}</div>
                          </div>
                        </div>
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
                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/admin/circuits/contracts?supplier=${supplier.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="font-medium">{extendedSupplier.contracts_count}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {extendedSupplier.rating > 0 ? (
                          <div className="inline-flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-medium">{extendedSupplier.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[supplier.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[supplier.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
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
