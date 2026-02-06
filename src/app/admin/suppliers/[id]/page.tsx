'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  FileText,
  Package,
  History,
  Info,
  Plus,
  MoreVertical,
  ExternalLink,
  Calendar,
  DollarSign,
  Bed,
  Users,
  Camera,
  CreditCard,
} from 'lucide-react';
import { useSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import {
  useSupplierPaymentTerms,
  useCreatePaymentTerms,
  useUpdatePaymentTerms,
  useDeletePaymentTerms,
  useSetDefaultPaymentTerms,
} from '@/hooks/usePaymentTerms';
import {
  useAccommodationBySupplier,
  useCreateAccommodation,
  useUpdateAccommodation,
  useCreateRoomCategory,
  useUpdateRoomCategory,
  useDeleteRoomCategory,
  useCreateAccommodationSeason,
  useUpdateAccommodationSeason,
  useDeleteAccommodationSeason,
} from '@/hooks/useAccommodations';
import PaymentTermsEditor from '@/components/suppliers/PaymentTermsEditor';
import AccommodationEditor from '@/components/suppliers/AccommodationEditor';
import RoomCategoryEditor from '@/components/suppliers/RoomCategoryEditor';
import SeasonEditor from '@/components/suppliers/SeasonEditor';
import type {
  Supplier,
  SupplierStatus,
  SupplierType,
  Contract,
  ContractStatus,
  Accommodation,
  RoomCategory,
  AccommodationSeason,
  PaymentTerms,
  CreatePaymentTermsDTO,
  CreateAccommodationDTO,
  UpdateAccommodationDTO,
  CreateRoomCategoryDTO,
  UpdateRoomCategoryDTO,
  CreateAccommodationSeasonDTO,
  UpdateAccommodationSeasonDTO,
} from '@/lib/api/types';
import { COUNTRIES, getCountryFlag } from '@/lib/constants/countries';

// Tabs configuration
type TabId = 'info' | 'products' | 'contracts' | 'payments' | 'history';

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'info', label: 'Informations', icon: Info },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'history', label: 'Historique', icon: History },
];

const supplierTypes: Record<SupplierType, { label: string; icon: string }> = {
  accommodation: { label: 'Hébergement', icon: '🏨' },
  transport: { label: 'Transport', icon: '🚐' },
  activity: { label: 'Activité', icon: '🎯' },
  guide: { label: 'Guide', icon: '👤' },
  restaurant: { label: 'Restauration', icon: '🍽️' },
  other: { label: 'Autre', icon: '📦' },
};

const statusConfig: Record<SupplierStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
};

const contractStatusConfig: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-700' },
  renewed: { label: 'Renouvelé', color: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archivé', color: 'bg-gray-100 text-gray-600' },
};

// Mock data for demonstration
const mockSupplier: Supplier & { rating: number; contracts_count: number } = {
  id: 1,
  tenant_id: '123',
  name: 'Riad Jnane Mogador',
  type: 'accommodation',
  country_code: 'MA',
  city: 'Marrakech',
  address: '16 Derb Sidi Bouloukat, Médina, 40000 Marrakech',
  contact_name: 'Mohamed Alami',
  contact_email: 'reservation@riadjnane.com',
  contact_phone: '+212 524 123 456',
  tax_id: 'MA123456789',
  payment_terms_text: 'Net 30',
  default_currency: 'MAD',
  status: 'active',
  rating: 4.5,
  contracts_count: 3,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-12-01T14:30:00Z',
};

const mockContracts: Contract[] = [
  {
    id: 1,
    tenant_id: '123',
    supplier_id: 1,
    name: 'Contrat Haute Saison 2024-2025',
    reference: 'CTR-2024-001',
    valid_from: '2024-10-01',
    valid_to: '2025-04-30',
    status: 'active',
    currency: 'MAD',
    notes: 'Tarifs négociés pour la haute saison',
    created_at: '2024-09-15T10:00:00Z',
    updated_at: '2024-09-15T10:00:00Z',
  },
  {
    id: 2,
    tenant_id: '123',
    supplier_id: 1,
    name: 'Contrat Basse Saison 2025',
    reference: 'CTR-2024-002',
    valid_from: '2025-05-01',
    valid_to: '2025-09-30',
    status: 'pending',
    currency: 'MAD',
    notes: 'En attente de validation',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
  },
];

const mockPaymentTerms: PaymentTerms[] = [
  {
    id: 1,
    supplier_id: 1,
    name: '30% confirmation / 70% J-14',
    description: 'Acompte 30% à la confirmation, solde 14 jours avant départ',
    installments: [
      { id: 1, percentage: 30, reference: 'confirmation', days_offset: 0, label: 'Acompte' },
      { id: 2, percentage: 70, reference: 'departure', days_offset: -14, label: 'Solde' },
    ],
    is_default: true,
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    supplier_id: 1,
    name: '100% à J-30',
    description: 'Paiement intégral 30 jours avant le départ',
    installments: [
      { id: 3, percentage: 100, reference: 'departure', days_offset: -30, label: 'Paiement intégral' },
    ],
    is_default: false,
    is_active: true,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
];

const mockAccommodation: Accommodation = {
  id: 1,
  tenant_id: '123',
  supplier_id: 1,
  name: 'Riad Jnane Mogador',
  description: 'Magnifique riad traditionnel au coeur de la médina de Marrakech',
  star_rating: 4,
  check_in_time: '14:00',
  check_out_time: '11:00',
  address: '16 Derb Sidi Bouloukat, Médina',
  amenities: ['wifi', 'piscine', 'spa', 'restaurant', 'parking', 'climatisation'],
  reservation_email: 'reservation@riadjnane.com',
  reservation_phone: '+212 524 123 456',
  external_provider: 'manual',
  status: 'active',
  is_active: true,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-12-01T14:30:00Z',
  room_categories: [
    {
      id: 1,
      accommodation_id: 1,
      name: 'Chambre Standard',
      code: 'STD',
      description: 'Chambre confortable avec décoration traditionnelle',
      min_occupancy: 1,
      max_occupancy: 2,
      max_adults: 2,
      max_children: 1,
      available_bed_types: ['DBL', 'TWN'],
      size_sqm: 25,
      amenities: ['wifi', 'climatisation', 'coffre'],
      is_active: true,
      sort_order: 1,
    },
    {
      id: 2,
      accommodation_id: 1,
      name: 'Suite Junior',
      code: 'JRS',
      description: 'Suite spacieuse avec salon privatif',
      min_occupancy: 1,
      max_occupancy: 3,
      max_adults: 2,
      max_children: 2,
      available_bed_types: ['DBL', 'TWN', 'TPL'],
      size_sqm: 40,
      amenities: ['wifi', 'climatisation', 'coffre', 'minibar', 'terrasse'],
      is_active: true,
      sort_order: 2,
    },
    {
      id: 3,
      accommodation_id: 1,
      name: 'Suite Royale',
      code: 'ROY',
      description: 'Notre plus belle suite avec vue sur la piscine',
      min_occupancy: 1,
      max_occupancy: 4,
      max_adults: 2,
      max_children: 2,
      available_bed_types: ['DBL', 'FAM'],
      size_sqm: 65,
      amenities: ['wifi', 'climatisation', 'coffre', 'minibar', 'terrasse', 'jacuzzi'],
      is_active: true,
      sort_order: 3,
    },
  ],
  seasons: [
    {
      id: 1,
      accommodation_id: 1,
      name: 'Basse Saison',
      code: 'BS',
      season_type: 'fixed',
      start_date: '2025-05-01',
      end_date: '2025-09-30',
      priority: 1,
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      accommodation_id: 1,
      name: 'Haute Saison',
      code: 'HS',
      season_type: 'fixed',
      start_date: '2024-10-01',
      end_date: '2025-04-30',
      priority: 2,
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 3,
      accommodation_id: 1,
      name: 'Noël / Nouvel An',
      code: 'XMAS',
      season_type: 'recurring',
      start_date: '12-20',
      end_date: '01-05',
      priority: 10,
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
  ],
};

const mockHistory = [
  { id: 1, date: '2024-12-01 14:30', action: 'Mise à jour', user: 'Marie L.', details: 'Contact téléphone modifié' },
  { id: 2, date: '2024-11-15 10:00', action: 'Contrat ajouté', user: 'Jean D.', details: 'Contrat Basse Saison 2025' },
  { id: 3, date: '2024-09-15 09:30', action: 'Contrat ajouté', user: 'Marie L.', details: 'Contrat Haute Saison 2024-2025' },
  { id: 4, date: '2024-01-15 10:00', action: 'Création', user: 'Admin', details: 'Fournisseur créé' },
];

export default function SupplierDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const supplierId = params.id as string;

  // Get active tab from URL or default to 'info'
  const initialTab = (searchParams.get('tab') as TabId) || 'info';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [isEditing, setIsEditing] = useState(false);

  // API hooks
  const {
    data: apiSupplier,
    loading,
    error,
  } = useSupplier(supplierId);

  const { mutate: updateSupplier, loading: updating } = useUpdateSupplier();
  const { mutate: deleteSupplier, loading: deleting } = useDeleteSupplier();

  // Payment terms hooks
  const supplierIdNum = parseInt(supplierId, 10);
  const {
    data: apiPaymentTerms,
    loading: loadingPaymentTerms,
    refetch: refetchPaymentTerms,
  } = useSupplierPaymentTerms(isNaN(supplierIdNum) ? null : supplierIdNum);
  const { mutate: createPaymentTerms, loading: creatingTerms } = useCreatePaymentTerms();
  const { mutate: updatePaymentTerms, loading: updatingTerms } = useUpdatePaymentTerms();
  const { mutate: deletePaymentTerms, loading: deletingTerms } = useDeletePaymentTerms();
  const { mutate: setDefaultPaymentTerms } = useSetDefaultPaymentTerms();

  // Accommodation hooks
  const {
    data: apiAccommodation,
    loading: loadingAccommodation,
    refetch: refetchAccommodation,
  } = useAccommodationBySupplier(isNaN(supplierIdNum) ? null : supplierIdNum);
  const { mutate: createAccommodation, loading: creatingAccommodation } = useCreateAccommodation();
  const { mutate: updateAccommodation, loading: updatingAccommodation } = useUpdateAccommodation();
  const { mutate: createRoomCategory, loading: creatingCategory } = useCreateRoomCategory();
  const { mutate: updateRoomCategory, loading: updatingCategory } = useUpdateRoomCategory();
  const { mutate: deleteRoomCategory, loading: deletingCategory } = useDeleteRoomCategory();
  const { mutate: createSeason, loading: creatingSeason } = useCreateAccommodationSeason();
  const { mutate: updateSeason, loading: updatingSeason } = useUpdateAccommodationSeason();
  const { mutate: deleteSeason, loading: deletingSeason } = useDeleteAccommodationSeason();

  // Use API data or fallback to mock
  const supplier = useMemo(() => {
    if (apiSupplier) {
      return { ...apiSupplier, rating: 0, contracts_count: 0 };
    }
    return mockSupplier;
  }, [apiSupplier]);

  const contracts = mockContracts;
  const accommodation = useMemo(() => {
    if (supplier.type !== 'accommodation') return null;
    if (apiAccommodation) return apiAccommodation;
    return mockAccommodation;
  }, [supplier.type, apiAccommodation]);
  const history = mockHistory;

  // Payment terms data
  const paymentTerms = useMemo(() => {
    if (apiPaymentTerms) return apiPaymentTerms;
    return mockPaymentTerms;
  }, [apiPaymentTerms]);

  // Payment terms handlers
  const handleSavePaymentTerms = async (data: CreatePaymentTermsDTO) => {
    await createPaymentTerms(data);
    refetchPaymentTerms();
  };

  const handleUpdatePaymentTerms = async (id: number, data: Partial<PaymentTerms>) => {
    await updatePaymentTerms({ id, data });
    refetchPaymentTerms();
  };

  const handleDeletePaymentTerms = async (id: number) => {
    await deletePaymentTerms(id);
    refetchPaymentTerms();
  };

  const handleSetDefaultPaymentTerms = async (paymentTermsId: number) => {
    await setDefaultPaymentTerms({ supplierId: supplierIdNum, paymentTermsId });
    refetchPaymentTerms();
  };

  // Accommodation handlers
  const handleAccommodationSave = async (data: CreateAccommodationDTO | UpdateAccommodationDTO) => {
    if (accommodation) {
      await updateAccommodation({ id: accommodation.id, data: data as UpdateAccommodationDTO });
    } else {
      await createAccommodation(data as CreateAccommodationDTO);
    }
  };

  const handleRoomCategorySave = async (
    data: CreateRoomCategoryDTO | { id: number; data: UpdateRoomCategoryDTO }
  ) => {
    if ('id' in data) {
      await updateRoomCategory({
        accommodationId: accommodation!.id,
        categoryId: data.id,
        data: data.data,
      });
    } else {
      await createRoomCategory(data);
    }
  };

  const handleRoomCategoryDelete = async (id: number) => {
    await deleteRoomCategory({ accommodationId: accommodation!.id, categoryId: id });
  };

  const handleSeasonSave = async (
    data: CreateAccommodationSeasonDTO | { id: number; data: UpdateAccommodationSeasonDTO }
  ) => {
    if ('id' in data) {
      await updateSeason({
        accommodationId: accommodation!.id,
        seasonId: data.id,
        data: data.data,
      });
    } else {
      await createSeason(data);
    }
  };

  const handleSeasonDelete = async (id: number) => {
    await deleteSeason({ accommodationId: accommodation!.id, seasonId: id });
  };

  const accommodationLoading =
    creatingAccommodation || updatingAccommodation ||
    creatingCategory || updatingCategory || deletingCategory ||
    creatingSeason || updatingSeason || deletingSeason;

  const StatusIcon = statusConfig[supplier.status].icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Render Tab Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <InfoTab supplier={supplier} accommodation={accommodation} />;
      case 'products':
        return (
          <ProductsTab
            supplierId={supplierIdNum}
            supplier={supplier}
            accommodation={accommodation}
            onAccommodationSave={handleAccommodationSave}
            onRoomCategorySave={handleRoomCategorySave}
            onRoomCategoryDelete={handleRoomCategoryDelete}
            onSeasonSave={handleSeasonSave}
            onSeasonDelete={handleSeasonDelete}
            loading={accommodationLoading}
            onRefresh={refetchAccommodation}
          />
        );
      case 'contracts':
        return <ContractsTab contracts={contracts} />;
      case 'payments':
        return (
          <PaymentTermsEditor
            supplierId={supplierIdNum}
            paymentTerms={paymentTerms}
            defaultPaymentTermsId={supplier.default_payment_terms_id}
            onSave={handleSavePaymentTerms}
            onUpdate={handleUpdatePaymentTerms}
            onDelete={handleDeletePaymentTerms}
            onSetDefault={handleSetDefaultPaymentTerms}
            loading={creatingTerms || updatingTerms || deletingTerms}
          />
        );
      case 'history':
        return <HistoryTab history={history} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux fournisseurs
        </Link>
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

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-3xl">
              {supplierTypes[supplier.type].icon}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[supplier.status].color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig[supplier.status].label}
                </span>
              </div>

              <div className="flex items-center gap-4 text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-sm rounded">
                  {supplierTypes[supplier.type].label}
                </span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{supplier.city}, {getCountryFlag(supplier.country_code || '')} {supplier.country_code}</span>
                </div>
                {supplier.type === 'accommodation' && accommodation?.star_rating && (
                  <div className="flex items-center gap-1">
                    {[...Array(accommodation.star_rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                {supplier.contact_name && (
                  <span className="text-gray-700 font-medium">{supplier.contact_name}</span>
                )}
                {supplier.contact_email && (
                  <a href={`mailto:${supplier.contact_email}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                    <Mail className="w-4 h-4" />
                    {supplier.contact_email}
                  </a>
                )}
                {supplier.contact_phone && (
                  <a href={`tel:${supplier.contact_phone}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                    <Phone className="w-4 h-4" />
                    {supplier.contact_phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{(supplier as typeof mockSupplier).contracts_count}</div>
            <div className="text-sm text-gray-500">Contrats actifs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(supplier as typeof mockSupplier).rating > 0 ? (supplier as typeof mockSupplier).rating.toFixed(1) : '-'}
            </div>
            <div className="text-sm text-gray-500">Note moyenne</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {accommodation?.room_categories?.length || '-'}
            </div>
            <div className="text-sm text-gray-500">Catégories chambres</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {supplier.default_currency || '-'}
            </div>
            <div className="text-sm text-gray-500">Devise</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">{renderTabContent()}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function InfoTab({
  supplier,
  accommodation,
}: {
  supplier: Supplier & { rating: number; contracts_count: number };
  accommodation: Accommodation | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Contact Information */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de contact</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nom du contact</dt>
              <dd className="text-gray-900 font-medium">{supplier.contact_name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900">
                {supplier.contact_email ? (
                  <a href={`mailto:${supplier.contact_email}`} className="text-emerald-600 hover:underline">
                    {supplier.contact_email}
                  </a>
                ) : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Téléphone</dt>
              <dd className="text-gray-900">{supplier.contact_phone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Adresse</dt>
              <dd className="text-gray-900 text-right max-w-xs">{supplier.address || '-'}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations commerciales</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">N° Fiscal</dt>
              <dd className="text-gray-900 font-mono">{supplier.tax_id || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Conditions de paiement</dt>
              <dd className="text-gray-900">{supplier.payment_terms_text || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Devise par défaut</dt>
              <dd className="text-gray-900">{supplier.default_currency || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Accommodation-specific info */}
      {accommodation && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails hébergement</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Classification</dt>
                <dd className="flex items-center gap-1">
                  {accommodation.star_rating ? (
                    <>
                      {[...Array(accommodation.star_rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </>
                  ) : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Check-in</dt>
                <dd className="text-gray-900">{accommodation.check_in_time || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Check-out</dt>
                <dd className="text-gray-900">{accommodation.check_out_time || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Fournisseur externe</dt>
                <dd className="text-gray-900">
                  {accommodation.external_provider === 'manual' ? 'Gestion manuelle' : accommodation.external_provider || '-'}
                </dd>
              </div>
            </dl>
          </div>

          {accommodation.amenities && accommodation.amenities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipements & Services</h3>
              <div className="flex flex-wrap gap-2">
                {accommodation.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full capitalize"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {accommodation.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-600">{accommodation.description}</p>
            </div>
          )}
        </div>
      )}

      {!accommodation && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métadonnées</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Créé le</dt>
                <dd className="text-gray-900">{new Date(supplier.created_at).toLocaleDateString('fr-FR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Dernière modification</dt>
                <dd className="text-gray-900">{new Date(supplier.updated_at).toLocaleDateString('fr-FR')}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsTab({
  supplierId,
  supplier,
  accommodation,
  onAccommodationSave,
  onRoomCategorySave,
  onRoomCategoryDelete,
  onSeasonSave,
  onSeasonDelete,
  loading,
  onRefresh,
}: {
  supplierId: number;
  supplier: Supplier & { rating: number; contracts_count: number };
  accommodation: Accommodation | null;
  onAccommodationSave: (data: CreateAccommodationDTO | UpdateAccommodationDTO) => Promise<void>;
  onRoomCategorySave: (data: CreateRoomCategoryDTO | { id: number; data: UpdateRoomCategoryDTO }) => Promise<void>;
  onRoomCategoryDelete: (id: number) => Promise<void>;
  onSeasonSave: (data: CreateAccommodationSeasonDTO | { id: number; data: UpdateAccommodationSeasonDTO }) => Promise<void>;
  onSeasonDelete: (id: number) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [editingAccommodation, setEditingAccommodation] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<AccommodationSeason | null>(null);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'season'; id: number } | null>(null);

  // Handle no accommodation for non-accommodation suppliers
  if (supplier.type !== 'accommodation') {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Pas de produits configurés</h3>
        <p className="text-gray-500">
          La gestion des produits est disponible pour les hébergements.
        </p>
      </div>
    );
  }

  // Show accommodation creation form if no accommodation exists
  if (!accommodation) {
    if (editingAccommodation) {
      return (
        <div className="bg-white rounded-lg">
          <AccommodationEditor
            supplierId={supplierId}
            accommodation={null}
            onSave={async (data) => {
              await onAccommodationSave(data);
              setEditingAccommodation(false);
              onRefresh();
            }}
            onCancel={() => setEditingAccommodation(false)}
            loading={loading}
          />
        </div>
      );
    }

    return (
      <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun hébergement configuré</h3>
        <p className="text-gray-500 mb-4">
          Configurez les informations de votre hébergement pour commencer.
        </p>
        <button
          onClick={() => setEditingAccommodation(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Configurer l'hébergement
        </button>
      </div>
    );
  }

  // Show room category editor
  if (showCategoryForm || editingCategory) {
    return (
      <div className="bg-white rounded-lg">
        <RoomCategoryEditor
          accommodationId={accommodation.id}
          category={editingCategory}
          existingCategories={accommodation.room_categories || []}
          onSave={async (data) => {
            await onRoomCategorySave(data);
            setShowCategoryForm(false);
            setEditingCategory(null);
            onRefresh();
          }}
          onCancel={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
          }}
          loading={loading}
        />
      </div>
    );
  }

  // Show season editor
  if (showSeasonForm || editingSeason) {
    return (
      <div className="bg-white rounded-lg">
        <SeasonEditor
          accommodationId={accommodation.id}
          season={editingSeason}
          existingSeasons={accommodation.seasons || []}
          onSave={async (data) => {
            await onSeasonSave(data);
            setShowSeasonForm(false);
            setEditingSeason(null);
            onRefresh();
          }}
          onCancel={() => {
            setShowSeasonForm(false);
            setEditingSeason(null);
          }}
          loading={loading}
        />
      </div>
    );
  }

  // Show accommodation editor
  if (editingAccommodation) {
    return (
      <div className="bg-white rounded-lg">
        <AccommodationEditor
          supplierId={supplierId}
          accommodation={accommodation}
          onSave={async (data) => {
            await onAccommodationSave(data);
            setEditingAccommodation(false);
            onRefresh();
          }}
          onCancel={() => setEditingAccommodation(false)}
          loading={loading}
        />
      </div>
    );
  }

  // Delete confirmation modal
  const DeleteConfirmModal = () => {
    if (!deleteConfirm) return null;

    const isCategory = deleteConfirm.type === 'category';
    const itemName = isCategory
      ? accommodation.room_categories?.find((c) => c.id === deleteConfirm.id)?.name
      : accommodation.seasons?.find((s) => s.id === deleteConfirm.id)?.name;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la suppression</h3>
          <p className="text-gray-600 mb-4">
            Êtes-vous sûr de vouloir supprimer {isCategory ? 'la catégorie' : 'la saison'}{' '}
            <strong>{itemName}</strong> ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (isCategory) {
                  await onRoomCategoryDelete(deleteConfirm.id);
                } else {
                  await onSeasonDelete(deleteConfirm.id);
                }
                setDeleteConfirm(null);
                onRefresh();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <DeleteConfirmModal />

      {/* Accommodation Info Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Informations hébergement</h3>
          <button
            onClick={() => setEditingAccommodation(true)}
            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Classification</span>
            <div className="flex items-center gap-1 mt-1">
              {accommodation.star_rating ? (
                [...Array(accommodation.star_rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))
              ) : (
                <span className="text-gray-400">Non défini</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Check-in / Check-out</span>
            <div className="font-medium text-gray-900 mt-1">
              {accommodation.check_in_time || '14:00'} / {accommodation.check_out_time || '11:00'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Contact réservation</span>
            <div className="font-medium text-gray-900 mt-1 truncate">
              {accommodation.reservation_email || '-'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Source dispo</span>
            <div className="font-medium text-gray-900 mt-1 capitalize">
              {accommodation.external_provider === 'manual' ? 'Manuelle' : accommodation.external_provider || 'Manuelle'}
            </div>
          </div>
        </div>
      </div>

      {/* Room Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Catégories de chambres ({accommodation.room_categories?.length || 0})
          </h3>
          <button
            onClick={() => setShowCategoryForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Ajouter une catégorie
          </button>
        </div>

        {(!accommodation.room_categories || accommodation.room_categories.length === 0) ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <Bed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucune catégorie de chambre définie</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {accommodation.room_categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera className="w-6 h-6 text-gray-400" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{category.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">
                          {category.code}
                        </span>
                        {!category.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{category.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{category.min_occupancy}-{category.max_occupancy} pers.</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{category.available_bed_types.join(', ')}</span>
                        </div>
                        {category.size_sqm && <span>{category.size_sqm} m²</span>}
                      </div>

                      {category.amenities && category.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {category.amenities.slice(0, 5).map((amenity) => (
                            <span
                              key={amenity}
                              className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded"
                            >
                              {amenity}
                            </span>
                          ))}
                          {category.amenities.length > 5 && (
                            <span className="text-xs px-2 py-0.5 text-gray-500">
                              +{category.amenities.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'category', id: category.id })}
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seasons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Saisons tarifaires ({accommodation.seasons?.length || 0})
          </h3>
          <button
            onClick={() => setShowSeasonForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Ajouter une saison
          </button>
        </div>

        {(!accommodation.seasons || accommodation.seasons.length === 0) ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucune saison tarifaire définie</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Saison</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Période</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Priorité</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Statut</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accommodation.seasons.map((season) => (
                  <tr key={season.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{season.name}</div>
                      {season.code && (
                        <div className="text-xs text-gray-500 font-mono">{season.code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm px-2 py-0.5 rounded ${
                          season.season_type === 'fixed'
                            ? 'bg-blue-50 text-blue-700'
                            : season.season_type === 'recurring'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {season.season_type === 'fixed'
                          ? 'Dates fixes'
                          : season.season_type === 'recurring'
                          ? 'Récurrent'
                          : 'Jours'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {season.start_date && season.end_date ? (
                        <>
                          {season.start_date} → {season.end_date}
                        </>
                      ) : season.weekdays && season.weekdays.length > 0 ? (
                        season.weekdays.map((d) => ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d]).join(', ')
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">{season.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          season.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {season.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingSeason(season)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'season', id: season.id })}
                          className="p-1.5 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ContractsTab({ contracts }: { contracts: Contract[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contrats ({contracts.length})</h3>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          Nouveau contrat
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun contrat</h3>
          <p className="text-gray-500">Ajoutez votre premier contrat pour ce fournisseur.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{contract.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contractStatusConfig[contract.status].color}`}>
                      {contractStatusConfig[contract.status].label}
                    </span>
                  </div>
                  {contract.reference && (
                    <div className="text-sm text-gray-500 font-mono mb-2">{contract.reference}</div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(contract.valid_from).toLocaleDateString('fr-FR')} - {new Date(contract.valid_to).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {contract.currency && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{contract.currency}</span>
                      </div>
                    )}
                  </div>

                  {contract.notes && (
                    <p className="text-sm text-gray-500 mt-2">{contract.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history }: { history: typeof mockHistory }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des modifications</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>

        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative flex items-start gap-4 pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                index === 0 ? 'bg-emerald-500' : 'bg-gray-300'
              }`}></div>

              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{entry.action}</span>
                  <span className="text-sm text-gray-500">{entry.date}</span>
                </div>
                <p className="text-sm text-gray-600">{entry.details}</p>
                <p className="text-xs text-gray-400 mt-1">par {entry.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
