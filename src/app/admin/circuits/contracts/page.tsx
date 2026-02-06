'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Building2,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Euro,
  ArrowLeft,
} from 'lucide-react';
import type { Contract, ContractStatus } from '@/lib/api/types';

// Mock data
const mockContracts: (Contract & { supplier_name: string; rates_count: number })[] = [
  {
    id: 1,
    tenant_id: '123',
    supplier_id: 1,
    supplier_name: 'Bangkok Palace Hotel',
    reference: 'CTR-2025-001',
    name: 'Contrat Saison 2025',
    valid_from: '2025-01-01',
    valid_to: '2025-12-31',
    status: 'active',
    currency: 'THB',
    rates_count: 12,
    notes: 'Tarifs préférentiels négociés',
    created_at: '2024-11-15T10:00:00Z',
    updated_at: '2024-11-15T10:00:00Z',
  },
  {
    id: 2,
    tenant_id: '123',
    supplier_id: 2,
    supplier_name: 'Thai Transport Co.',
    reference: 'CTR-2025-002',
    name: 'Contrat Transport 2025',
    valid_from: '2025-01-01',
    valid_to: '2025-06-30',
    status: 'active',
    currency: 'THB',
    rates_count: 8,
    notes: null,
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
  },
  {
    id: 3,
    tenant_id: '123',
    supplier_id: 3,
    supplier_name: 'Elephant Haven Sanctuary',
    reference: 'CTR-2025-003',
    name: 'Activités Éléphants 2025',
    valid_from: '2025-02-01',
    valid_to: '2025-12-31',
    status: 'pending',
    currency: 'THB',
    rates_count: 5,
    notes: 'En attente de validation',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
];

// Mock rates for expanded view
const mockRates = [
  { id: 1, contract_id: 1, room_type: 'Chambre Deluxe', season: 'Basse saison', price: 2500, unit: 'par nuit' },
  { id: 2, contract_id: 1, room_type: 'Chambre Deluxe', season: 'Haute saison', price: 3800, unit: 'par nuit' },
  { id: 3, contract_id: 1, room_type: 'Suite', season: 'Basse saison', price: 4500, unit: 'par nuit' },
  { id: 4, contract_id: 1, room_type: 'Suite', season: 'Haute saison', price: 6500, unit: 'par nuit' },
];

const statusConfig: Record<ContractStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-700', icon: Clock },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  draft: { label: 'Brouillon', color: 'bg-blue-100 text-blue-700', icon: FileText },
  renewed: { label: 'Renouvelé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  archived: { label: 'Archivé', color: 'bg-gray-100 text-gray-500', icon: Clock },
};

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | null>(null);
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  const [showNewContract, setShowNewContract] = useState(false);

  // Filter contracts
  const filteredContracts = mockContracts.filter(contract => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.reference?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      contract.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !selectedStatus || contract.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getDaysUntilExpiry = (validTo: string) => {
    const today = new Date();
    const expiry = new Date(validTo);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryWarning = (contract: typeof mockContracts[0]) => {
    if (contract.status !== 'active') return null;
    const days = getDaysUntilExpiry(contract.valid_to);
    if (days <= 0) return { type: 'error', message: 'Expiré' };
    if (days <= 30) return { type: 'warning', message: `Expire dans ${days}j` };
    if (days <= 90) return { type: 'info', message: `${days}j restants` };
    return null;
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-500">Gérez vos contrats et grilles tarifaires</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={() => setShowNewContract(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5" />
            Nouveau contrat
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{mockContracts.length}</div>
          <div className="text-sm text-gray-500">Total contrats</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-emerald-600">
            {mockContracts.filter(c => c.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">Actifs</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-amber-600">
            {mockContracts.filter(c => {
              if (c.status !== 'active') return false;
              const days = getDaysUntilExpiry(c.valid_to);
              return days > 0 && days <= 30;
            }).length}
          </div>
          <div className="text-sm text-gray-500">Expirent bientôt</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {mockContracts.reduce((sum, c) => sum + c.rates_count, 0)}
          </div>
          <div className="text-sm text-gray-500">Tarifs configurés</div>
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
              placeholder="Rechercher un contrat..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedStatus || ''}
              onChange={e => setSelectedStatus((e.target.value as ContractStatus) || null)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="pending">En attente</option>
              <option value="expired">Expirés</option>
              <option value="draft">Brouillons</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        {filteredContracts.map(contract => {
          const StatusIcon = statusConfig[contract.status].icon;
          const expiryWarning = getExpiryWarning(contract);
          const isExpanded = expandedContract === contract.id;

          return (
            <div
              key={contract.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Contract Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{contract.name}</span>
                        <span className="text-sm text-gray-400">{contract.reference}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {contract.supplier_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(contract.valid_from).toLocaleDateString('fr-FR')} →{' '}
                          {new Date(contract.valid_to).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="w-4 h-4" />
                          {contract.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {expiryWarning && (
                      <span className={`
                        text-sm px-2 py-1 rounded-full
                        ${expiryWarning.type === 'error' ? 'bg-red-100 text-red-700' : ''}
                        ${expiryWarning.type === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
                        ${expiryWarning.type === 'info' ? 'bg-blue-100 text-blue-700' : ''}
                      `}>
                        {expiryWarning.message}
                      </span>
                    )}

                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[contract.status].color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig[contract.status].label}
                    </span>

                    <span className="text-sm text-gray-500">
                      {contract.rates_count} tarif{contract.rates_count > 1 ? 's' : ''}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content - Rates */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Grille tarifaire</h4>
                      <button className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
                        <Plus className="w-4 h-4" />
                        Ajouter un tarif
                      </button>
                    </div>

                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500">
                          <th className="pb-2">Type / Prestation</th>
                          <th className="pb-2">Saison</th>
                          <th className="pb-2 text-right">Tarif</th>
                          <th className="pb-2 text-right">Unité</th>
                          <th className="pb-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {mockRates.map(rate => (
                          <tr key={rate.id} className="bg-white">
                            <td className="py-2 font-medium text-gray-900">{rate.room_type}</td>
                            <td className="py-2 text-gray-600">{rate.season}</td>
                            <td className="py-2 text-right font-semibold text-gray-900">
                              {rate.price.toLocaleString()} ฿
                            </td>
                            <td className="py-2 text-right text-gray-500 text-sm">{rate.unit}</td>
                            <td className="py-2 text-right">
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {contract.notes && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-amber-50">
                      <p className="text-sm text-amber-800">
                        <strong>Notes:</strong> {contract.notes}
                      </p>
                    </div>
                  )}

                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                      Dupliquer
                    </button>
                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                      Modifier
                    </button>
                    {contract.status === 'active' && (
                      <button className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                        Renouveler
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredContracts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun contrat trouvé</h3>
            <p className="text-gray-500">
              {searchQuery || selectedStatus
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par créer votre premier contrat fournisseur'}
            </p>
          </div>
        )}
      </div>

      {/* New Contract Modal */}
      {showNewContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau contrat</h2>
              <button
                onClick={() => setShowNewContract(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fournisseur *
                </label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">Sélectionner un fournisseur...</option>
                  <option value="1">Bangkok Palace Hotel</option>
                  <option value="2">Thai Transport Co.</option>
                  <option value="3">Elephant Haven Sanctuary</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du contrat *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Contrat Saison 2025"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence
                  </label>
                  <input
                    type="text"
                    placeholder="CTR-2025-XXX"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="THB">THB (฿)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="Notes ou conditions particulières..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewContract(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Créer le contrat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
