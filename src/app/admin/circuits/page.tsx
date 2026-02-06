'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Map,
  Globe,
  Calendar,
  BookOpen,
  Sparkles,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  Trash2,
  Users,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTrips, useDeleteTrip, useDuplicateTrip } from '@/hooks/useTrips';
import { Trip, TripType } from '@/lib/api/types';

// Tab configuration
const tabs: { id: TripType | 'all'; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    id: 'all',
    label: 'Tous les circuits',
    icon: Map,
    description: 'GIR et sur mesure avec clients'
  },
  {
    id: 'online',
    label: 'Circuits en ligne',
    icon: Globe,
    description: 'Circuits publiés sur le site web'
  },
  {
    id: 'gir',
    label: 'Circuits GIR',
    icon: Calendar,
    description: 'Départs groupés avec dates fixes'
  },
  {
    id: 'template',
    label: 'Bibliothèque',
    icon: BookOpen,
    description: 'Templates réutilisables'
  },
  {
    id: 'custom',
    label: 'Sur mesure',
    icon: Sparkles,
    description: 'Circuits personnalisés'
  },
];

// Status badge colors
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  quoted: 'bg-blue-100 text-blue-700',
  sent: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
  operating: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  quoted: 'Devis',
  sent: 'Envoyé',
  confirmed: 'Confirmé',
  operating: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

// Country flags (simple emoji mapping)
const countryFlags: Record<string, string> = {
  TH: '🇹🇭',
  VN: '🇻🇳',
  JP: '🇯🇵',
  ID: '🇮🇩',
  MY: '🇲🇾',
  KH: '🇰🇭',
  LA: '🇱🇦',
  MM: '🇲🇲',
  PH: '🇵🇭',
  CN: '🇨🇳',
  IN: '🇮🇳',
  NP: '🇳🇵',
  LK: '🇱🇰',
  MA: '🇲🇦',
  EG: '🇪🇬',
  ZA: '🇿🇦',
  KE: '🇰🇪',
  TZ: '🇹🇿',
};

export default function CircuitsPage() {
  const [activeTab, setActiveTab] = useState<TripType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all trips to calculate counts
  const { data: allTripsData } = useTrips({});

  // Fetch filtered trips based on active tab
  const filterType = activeTab === 'all' ? undefined : activeTab;
  const { data, loading, error, refetch } = useTrips({
    type: filterType,
    search: searchQuery || undefined,
  });

  // Mutations
  const { mutate: deleteTrip, loading: deleting } = useDeleteTrip();
  const { mutate: duplicateTrip, loading: duplicating } = useDuplicateTrip();

  // Calculate counts from all trips (excluding translations)
  const counts = useMemo(() => {
    // Exclude translated copies (they have a source_trip_id)
    const items = (allTripsData?.items || []).filter(t => !t.source_trip_id);
    return {
      all: items.filter(t => t.type === 'gir' || t.type === 'custom').length,
      online: items.filter(t => t.type === 'online').length,
      gir: items.filter(t => t.type === 'gir').length,
      template: items.filter(t => t.type === 'template').length,
      custom: items.filter(t => t.type === 'custom').length,
    };
  }, [allTripsData]);

  // Filter trips based on active tab and search
  const filteredTrips = useMemo(() => {
    let items = data?.items || [];

    // Exclude translated copies (they have a source_trip_id)
    // These are shown as linked versions under their source circuit
    items = items.filter(t => !t.source_trip_id);

    // For 'all' tab, show only gir + custom
    if (activeTab === 'all') {
      items = items.filter(t => t.type === 'gir' || t.type === 'custom');
    }

    // Apply search filter (client-side for better UX)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      items = items.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.reference?.toLowerCase().includes(searchLower) ||
        t.client_name?.toLowerCase().includes(searchLower)
      );
    }

    return items;
  }, [data, activeTab, searchQuery]);

  const activeTabConfig = tabs.find(t => t.id === activeTab);

  const handleDelete = async (trip: Trip) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${trip.name}" ?`)) {
      return;
    }
    await deleteTrip(trip.id);
    refetch();
  };

  const handleDuplicate = async (trip: Trip) => {
    await duplicateTrip(trip.id);
    refetch();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Map className="w-7 h-7 text-emerald-600" />
            Circuits
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez vos circuits, templates et départs
          </p>
        </div>
        <Link
          href="/admin/circuits/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau circuit
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id] || 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors
                  ${isActive
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`
                  px-2 py-0.5 rounded-full text-xs
                  ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab description */}
      <div className="mb-4 text-sm text-gray-500">
        {activeTabConfig?.description}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un circuit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error.detail || 'Une erreur est survenue'}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      )}

      {/* Circuits list */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredTrips.length === 0 ? (
            <div className="p-12 text-center">
              <Map className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun circuit trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? 'Aucun résultat pour votre recherche'
                  : 'Commencez par créer votre premier circuit'}
              </p>
              <Link
                href="/admin/circuits/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer un circuit
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Circuit
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  {(activeTab === 'all' || activeTab === 'gir' || activeTab === 'custom') && (
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  )}
                  {(activeTab === 'all' || activeTab === 'custom') && (
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                  )}
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/admin/circuits/${trip.id}`}
                          className="font-medium text-gray-900 hover:text-emerald-600 transition-colors"
                        >
                          {trip.name}
                        </Link>
                        <div className="text-sm text-gray-500">{trip.reference}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {countryFlags[trip.destination_country || ''] || '🌍'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {trip.destination_country}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {trip.duration_days} jours
                      </div>
                    </td>
                    {(activeTab === 'all' || activeTab === 'gir' || activeTab === 'custom') && (
                      <td className="px-6 py-4">
                        {trip.start_date ? (
                          <div className="text-sm text-gray-600">
                            {new Date(trip.start_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    {(activeTab === 'all' || activeTab === 'custom') && (
                      <td className="px-6 py-4">
                        {trip.client_name ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{trip.client_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex px-2 py-1 rounded-full text-xs font-medium
                        ${statusColors[trip.status] || 'bg-gray-100 text-gray-700'}
                      `}>
                        {statusLabels[trip.status] || trip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/circuits/${trip.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/circuits/${trip.id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(trip)}
                          disabled={duplicating}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(trip)}
                          disabled={deleting}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
