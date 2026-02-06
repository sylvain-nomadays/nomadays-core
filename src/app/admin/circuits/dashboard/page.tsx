'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Users,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

interface DashboardStats {
  total_trips: number;
  template_count: number;
  client_trips_count: number;
  draft_trips: number;
  confirmed_trips: number;
  total_suppliers: number;
  active_suppliers: number;
  total_contracts: number;
  expiring_soon_contracts: number;
  unacknowledged_alerts: number;
  critical_alerts: number;
}

export default function CircuitsDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    // For now, use mock data
    setStats({
      total_trips: 12,
      template_count: 5,
      client_trips_count: 7,
      draft_trips: 3,
      confirmed_trips: 4,
      total_suppliers: 24,
      active_suppliers: 20,
      total_contracts: 15,
      expiring_soon_contracts: 2,
      unacknowledged_alerts: 3,
      critical_alerts: 1,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/circuits"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux circuits
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500">Vue d'ensemble des circuits et cotations</p>
        </div>
        <Link
          href="/admin/circuits/new"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau circuit
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Circuits */}
        <Link href="/admin/circuits" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Circuits</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_trips || 0}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-gray-500">
                <span className="font-medium text-gray-900">{stats?.template_count}</span> templates
              </span>
              <span className="text-gray-500">
                <span className="font-medium text-gray-900">{stats?.client_trips_count}</span> clients
              </span>
            </div>
          </div>
        </Link>

        {/* Fournisseurs */}
        <Link href="/admin/circuits/suppliers" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fournisseurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_suppliers || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <span className="font-medium text-green-600">{stats?.active_suppliers}</span> actifs
            </div>
          </div>
        </Link>

        {/* Contrats */}
        <Link href="/admin/circuits/contracts" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Contrats</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_contracts || 0}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            {stats?.expiring_soon_contracts ? (
              <div className="mt-4 text-sm text-amber-600 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {stats.expiring_soon_contracts} expirent bientôt
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">Tous à jour</div>
            )}
          </div>
        </Link>

        {/* Alertes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alertes IA</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.unacknowledged_alerts || 0}</p>
            </div>
            <div className={`p-3 rounded-lg ${stats?.critical_alerts ? 'bg-red-50' : 'bg-gray-50'}`}>
              <AlertTriangle className={`w-6 h-6 ${stats?.critical_alerts ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
          </div>
          {stats?.critical_alerts ? (
            <div className="mt-4 text-sm text-red-600 font-medium">
              {stats.critical_alerts} critique{stats.critical_alerts > 1 ? 's' : ''}
            </div>
          ) : (
            <div className="mt-4 text-sm text-green-600">Aucune alerte critique</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/circuits?tab=template"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-emerald-50 rounded-lg">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Bibliothèque</h3>
            <p className="text-sm text-gray-500">Gérer les circuits modèles</p>
          </div>
        </Link>

        <Link
          href="/admin/circuits?tab=custom"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-blue-50 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sur mesure</h3>
            <p className="text-sm text-gray-500">Voir les devis clients</p>
          </div>
        </Link>

        <Link
          href="/admin/circuits/suppliers"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-purple-50 rounded-lg">
            <Plus className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Fournisseurs</h3>
            <p className="text-sm text-gray-500">Gérer les prestataires</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h2>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Les dernières modifications apparaîtront ici</p>
        </div>
      </div>
    </div>
  );
}
