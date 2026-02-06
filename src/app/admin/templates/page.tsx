'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  MapPin,
  Clock,
  Building2,
  Truck,
  Users,
  UtensilsCrossed,
  Compass,
} from 'lucide-react';
import type { FormulaCategory } from '@/lib/api/types';

type TemplateTab = 'days' | 'formulas';

// Category configuration for formulas
const categoryConfig: Record<FormulaCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  accommodation: { label: 'Hébergement', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  activity: { label: 'Activité', icon: Compass, color: 'bg-amber-100 text-amber-700' },
  transport: { label: 'Transport', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  restaurant: { label: 'Restauration', icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-700' },
  guide: { label: 'Accompagnement', icon: Users, color: 'bg-emerald-100 text-emerald-700' },
  other: { label: 'Autre', icon: Package, color: 'bg-gray-100 text-gray-700' },
};

// Mock locations for Thaïlande
const mockLocations = [
  { id: 1, name: 'Bangkok', region: 'Centre' },
  { id: 2, name: 'Chiang Mai', region: 'Nord' },
  { id: 3, name: 'Chiang Rai', region: 'Nord' },
  { id: 4, name: 'Phuket', region: 'Sud' },
  { id: 5, name: 'Krabi', region: 'Sud' },
  { id: 6, name: 'Koh Samui', region: 'Golfe' },
  { id: 7, name: 'Ayutthaya', region: 'Centre' },
  { id: 8, name: 'Sukhothai', region: 'Nord' },
];

// Mock data pour les journées types
const mockDayTemplates = [
  {
    id: 1,
    name: 'Journée Bangkok Temples',
    description: 'Visite des temples majeurs de Bangkok avec guide francophone',
    location_id: 1,
    location: 'Bangkok',
    duration_hours: 8,
    tags: ['culture', 'temples', 'incontournable'],
    formulas_count: 3,
    is_active: true,
  },
  {
    id: 2,
    name: 'Journée Chiang Mai Nature',
    description: 'Découverte de la nature et des éléphants dans le nord de la Thaïlande',
    location_id: 2,
    location: 'Chiang Mai',
    duration_hours: 10,
    tags: ['nature', 'éléphants', 'famille'],
    formulas_count: 4,
    is_active: true,
  },
  {
    id: 3,
    name: 'Journée Ayutthaya Histoire',
    description: 'Visite du site historique d\'Ayutthaya, ancienne capitale du Siam',
    location_id: 7,
    location: 'Ayutthaya',
    duration_hours: 6,
    tags: ['histoire', 'UNESCO', 'temples'],
    formulas_count: 2,
    is_active: true,
  },
];

// Mock data pour les formules types avec catégories
const mockFormulaTemplates = [
  {
    id: 1,
    name: 'Transfert aéroport Bangkok',
    description: 'Transfert privé aéroport Suvarnabhumi - hôtel centre-ville',
    category: 'transport' as FormulaCategory,
    location_id: 1,
    location: 'Bangkok',
    supplier: 'Bangkok Limo Service',
    items_count: 1,
    unit_cost: 45,
    currency: 'EUR',
    tags: ['aéroport', 'transfert'],
    is_active: true,
  },
  {
    id: 2,
    name: 'Guide francophone journée',
    description: 'Guide professionnel francophone pour une journée complète',
    category: 'guide' as FormulaCategory,
    location_id: 1,
    location: 'Bangkok',
    supplier: 'Thai Guides Association',
    items_count: 2,
    unit_cost: 85,
    currency: 'EUR',
    tags: ['guide', 'francophone'],
    is_active: true,
  },
  {
    id: 3,
    name: 'Excursion temples Bangkok',
    description: 'Visite Wat Pho + Wat Arun avec entrées et bateau',
    category: 'activity' as FormulaCategory,
    location_id: 1,
    location: 'Bangkok',
    supplier: 'Bangkok Tours',
    items_count: 4,
    unit_cost: 65,
    currency: 'EUR',
    tags: ['temples', 'culture', 'incontournable'],
    is_active: true,
  },
  {
    id: 4,
    name: 'Déjeuner restaurant local',
    description: 'Repas dans un restaurant local typique',
    category: 'restaurant' as FormulaCategory,
    location_id: null,
    location: null,
    supplier: null,
    items_count: 1,
    unit_cost: 15,
    currency: 'EUR',
    tags: ['repas', 'local'],
    is_active: true,
  },
  {
    id: 5,
    name: 'Sanctuaire éléphants Chiang Mai',
    description: 'Journée dans un sanctuaire éthique avec repas',
    category: 'activity' as FormulaCategory,
    location_id: 2,
    location: 'Chiang Mai',
    supplier: 'Elephant Nature Park',
    items_count: 3,
    unit_cost: 95,
    currency: 'EUR',
    tags: ['éléphants', 'éthique', 'nature'],
    is_active: true,
  },
  {
    id: 6,
    name: 'Nuit Riad Boutique Chiang Mai',
    description: 'Hébergement boutique hôtel avec petit-déjeuner',
    category: 'accommodation' as FormulaCategory,
    location_id: 2,
    location: 'Chiang Mai',
    supplier: 'Rachamankha Hotel',
    items_count: 2,
    unit_cost: 120,
    currency: 'EUR',
    tags: ['boutique', 'charme'],
    is_active: true,
  },
  {
    id: 7,
    name: 'Cours de cuisine thaïe',
    description: 'Cours de cuisine incluant marché et repas',
    category: 'activity' as FormulaCategory,
    location_id: 2,
    location: 'Chiang Mai',
    supplier: 'Cooking School Chiang Mai',
    items_count: 2,
    unit_cost: 45,
    currency: 'EUR',
    tags: ['cuisine', 'authentique', 'famille'],
    is_active: true,
  },
  {
    id: 8,
    name: 'Transfert Chiang Mai - Chiang Rai',
    description: 'Transfert privé avec arrêt Temple Blanc',
    category: 'transport' as FormulaCategory,
    location_id: 2,
    location: 'Chiang Mai',
    supplier: 'Northern Thailand Transport',
    items_count: 2,
    unit_cost: 110,
    currency: 'EUR',
    tags: ['transfert', 'temple blanc'],
    is_active: true,
  },
];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateTab>('formulas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FormulaCategory | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  // Filter templates based on search, category and location
  const filteredDayTemplates = useMemo(() => {
    return mockDayTemplates.filter(template => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLocation = !selectedLocation || template.location_id === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [searchQuery, selectedLocation]);

  const filteredFormulaTemplates = useMemo(() => {
    return mockFormulaTemplates.filter(template => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || template.category === selectedCategory;
      const matchesLocation = !selectedLocation || template.location_id === selectedLocation;
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [searchQuery, selectedCategory, selectedLocation]);

  // Stats by category
  const statsByCategory = useMemo(() => {
    const stats: Record<FormulaCategory, number> = {
      accommodation: 0,
      activity: 0,
      transport: 0,
      restaurant: 0,
      guide: 0,
      other: 0,
    };
    mockFormulaTemplates.forEach(f => {
      stats[f.category]++;
    });
    return stats;
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500">
            Bibliothèque de formules et journées types réutilisables
          </p>
        </div>
        <button
          onClick={() => {/* TODO: Open create modal */}}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'days' ? 'Nouvelle journée type' : 'Nouvelle formule'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab('formulas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'formulas'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Formules types
          <span className="ml-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs">
            {mockFormulaTemplates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('days')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'days'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Journées types
          <span className="ml-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs">
            {mockDayTemplates.length}
          </span>
        </button>
      </div>

      {/* Category pills (only for formulas) */}
      {activeTab === 'formulas' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes ({mockFormulaTemplates.length})
          </button>
          {(Object.entries(categoryConfig) as [FormulaCategory, typeof categoryConfig[FormulaCategory]][]).map(([key, config]) => {
            const count = statsByCategory[key];
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? `${config.color.replace('100', '600').replace('700', 'white')} text-white`
                    : `${config.color} hover:opacity-80`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'days' ? "Rechercher par nom, lieu, tag..." : "Rechercher par nom, fournisseur, lieu, tag..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Location filter */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <select
              value={selectedLocation || ''}
              onChange={e => setSelectedLocation(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[160px]"
            >
              <option value="">Toutes les locations</option>
              <optgroup label="Nord">
                {mockLocations.filter(l => l.region === 'Nord').map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Centre">
                {mockLocations.filter(l => l.region === 'Centre').map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Sud">
                {mockLocations.filter(l => l.region === 'Sud').map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Golfe">
                {mockLocations.filter(l => l.region === 'Golfe').map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Clear filters */}
          {(searchQuery || selectedCategory || selectedLocation) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setSelectedLocation(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Day Templates List */}
      {activeTab === 'days' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDayTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {template.location}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === template.id ? null : template.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === template.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 w-36">
                          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                            <Eye className="w-4 h-4" />
                            Voir
                          </button>
                          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                            <Edit className="w-4 h-4" />
                            Modifier
                          </button>
                          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                            <Copy className="w-4 h-4" />
                            Dupliquer
                          </button>
                          <button className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {template.duration_hours}h
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {template.formulas_count} formules
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Utiliser →
                </button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {filteredDayTemplates.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune journée type trouvée</h3>
              <p className="text-gray-500">
                {searchQuery || selectedLocation
                  ? 'Essayez de modifier vos filtres'
                  : 'Créez votre première journée type'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Formula Templates List */}
      {activeTab === 'formulas' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Formule</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Catégorie</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Location</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fournisseur</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Coût</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFormulaTemplates.map(template => {
                const catConfig = categoryConfig[template.category];
                const CatIcon = catConfig.icon;
                return (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{template.description}</div>
                        {template.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {template.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${catConfig.color}`}>
                        <CatIcon className="w-3.5 h-3.5" />
                        {catConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {template.location ? (
                        <div className="flex items-center gap-1 text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {template.location}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {template.supplier ? (
                        <span className="text-gray-700 text-sm">{template.supplier}</span>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Non défini</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-medium text-gray-900">
                        {template.unit_cost} {template.currency}
                      </span>
                      <div className="text-xs text-gray-500">{template.items_count} item{template.items_count > 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Voir">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Modifier">
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Dupliquer">
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg" title="Supprimer">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {filteredFormulaTemplates.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune formule type trouvée</h3>
              <p className="text-gray-500">
                {searchQuery || selectedCategory || selectedLocation
                  ? 'Essayez de modifier vos filtres'
                  : 'Créez votre première formule type'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
