'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
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
  Sparkles,
  Upload,
  Receipt,
  Save,
  Zap,
} from 'lucide-react';
import { useSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import {
  useContracts,
  useCreateContract,
  useDeleteContract,
} from '@/hooks/useContracts';
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
  useRoomRates,
  useCreateRoomRate,
  useUpdateRoomRate,
  useDeleteRoomRate,
  useBulkUpsertRates,
  useEarlyBirdDiscounts,
  useCreateEarlyBirdDiscount,
  useUpdateEarlyBirdDiscount,
  useDeleteEarlyBirdDiscount,
  useAccommodationPhotos,
  useUpdateAccommodationPhoto,
  useDeleteAccommodationPhoto,
  useReorderAccommodationPhotos,
} from '@/hooks/useAccommodations';
import {
  useAccommodationExtras,
  useAccommodationExtrasMutations,
} from '@/hooks/useAccommodationExtras';
import PaymentTermsEditor from '@/components/suppliers/PaymentTermsEditor';
import AccommodationEditor from '@/components/suppliers/AccommodationEditor';
import RoomCategoryEditor from '@/components/suppliers/RoomCategoryEditor';
import SeasonEditor from '@/components/suppliers/SeasonEditor';
import RateGridEditor from '@/components/suppliers/RateGridEditor';
import EarlyBirdEditor from '@/components/suppliers/EarlyBirdEditor';
import ExtrasEditor from '@/components/suppliers/ExtrasEditor';
import ContractRateExtractor from '@/components/suppliers/ContractRateExtractor';
import SupplierEditor from '@/components/suppliers/SupplierEditor';
import PhotoUploader from '@/components/suppliers/PhotoUploader';
import PhotoGallery from '@/components/suppliers/PhotoGallery';
import type {
  Supplier,
  SupplierStatus,
  SupplierType,
  Contract,
  ContractStatus,
  Accommodation,
  RoomCategory,
  AccommodationSeason,
  RoomRate,
  PaymentTerms,
  CreatePaymentTermsDTO,
  CreateAccommodationDTO,
  UpdateAccommodationDTO,
  CreateRoomCategoryDTO,
  UpdateRoomCategoryDTO,
  CreateAccommodationSeasonDTO,
  UpdateAccommodationSeasonDTO,
  CreateRoomRateDTO,
  UpdateRoomRateDTO,
  EarlyBirdDiscount,
  CreateEarlyBirdDiscountDTO,
  UpdateEarlyBirdDiscountDTO,
  AccommodationExtra,
  CreateAccommodationExtraDTO,
  ContractWorkflowStatus,
  AccommodationPhoto,
  UpdateAccommodationPhotoDTO,
} from '@/lib/api/types';
import { COUNTRIES, getCountryFlag } from '@/lib/constants/countries';

// Tabs configuration
type TabId = 'info' | 'products' | 'contracts' | 'payments' | 'history';

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'info', label: 'Informations', icon: Info },
  { id: 'products', label: 'Produits', icon: Package },  // Catégories de chambres + Saisons
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'history', label: 'Historique', icon: History },
];

// Tabs pour les fournisseurs de type "accommodation"
const accommodationTabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'info', label: 'Hébergements', icon: Building2 },  // Gestion des hébergements
  { id: 'products', label: 'Produits', icon: Package },    // Catégories + Saisons
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

// Types for internal use
type SupplierWithMeta = Supplier & { rating: number; contracts_count: number };

export default function SupplierDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const supplierId = params.id as string;

  // Get active tab from URL or default to 'info'
  const initialTab = (searchParams.get('tab') as TabId) || 'info';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [updatingSupplier, setUpdatingSupplier] = useState(false);
  const [fiscalData, setFiscalData] = useState<{
    tax_id?: string;
    is_vat_registered?: boolean;
    default_currency?: string;
  }>({});

  // API hooks
  const {
    data: apiSupplier,
    loading,
    error,
    refetch: refetchSupplier,
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

  // Room rates hooks
  const accommodationId = apiAccommodation?.id ?? null;
  const {
    data: apiRoomRates,
    loading: loadingRates,
    refetch: refetchRates,
  } = useRoomRates(accommodationId);
  const { mutate: createRoomRate, loading: creatingRate } = useCreateRoomRate();
  const { mutate: updateRoomRate, loading: updatingRate } = useUpdateRoomRate();
  const { mutate: deleteRoomRate, loading: deletingRate } = useDeleteRoomRate();
  const { mutate: bulkUpsertRates, loading: bulkSavingRates } = useBulkUpsertRates();

  // Early Bird discounts hooks
  const {
    data: apiEarlyBirdDiscounts,
    loading: loadingEarlyBird,
    refetch: refetchEarlyBird,
  } = useEarlyBirdDiscounts(accommodationId);
  const { mutate: createEarlyBird, loading: creatingEarlyBird } = useCreateEarlyBirdDiscount();
  const { mutate: updateEarlyBird, loading: updatingEarlyBird } = useUpdateEarlyBirdDiscount();
  const { mutate: deleteEarlyBird, loading: deletingEarlyBird } = useDeleteEarlyBirdDiscount();

  // Extras hooks
  const {
    extras: apiExtras,
    isLoading: loadingExtras,
    refetch: refetchExtras,
  } = useAccommodationExtras(accommodationId);
  const {
    create: createExtra,
    update: updateExtra,
    remove: deleteExtra,
    isCreating: creatingExtra,
    isUpdating: updatingExtra,
    isDeleting: deletingExtra,
  } = useAccommodationExtrasMutations(accommodationId);

  // Photos hooks
  const {
    data: apiPhotos,
    loading: loadingPhotos,
    refetch: refetchPhotos,
  } = useAccommodationPhotos(accommodationId);
  const { mutate: updatePhoto, loading: updatingPhoto } = useUpdateAccommodationPhoto();
  const { mutate: deletePhoto, loading: deletingPhoto } = useDeleteAccommodationPhoto();
  const { mutate: reorderPhotos, loading: reorderingPhotos } = useReorderAccommodationPhotos();

  // Contracts hooks
  const {
    data: apiContractsData,
    loading: loadingContracts,
    refetch: refetchContracts,
  } = useContracts({ supplier_id: isNaN(supplierIdNum) ? undefined : supplierIdNum });
  const { mutate: createContract, loading: creatingContract } = useCreateContract();
  const { mutate: deleteContract, loading: deletingContract } = useDeleteContract();

  // Use API data only - no mock fallback
  const supplier = useMemo(() => {
    if (apiSupplier) {
      return { ...apiSupplier, rating: 0, contracts_count: apiContractsData?.items?.length || 0 };
    }
    return null;
  }, [apiSupplier, apiContractsData]);

  // Contracts: use API data only
  const contracts = useMemo(() => {
    if (apiContractsData?.items) return apiContractsData.items;
    return [];
  }, [apiContractsData]);

  // Accommodation: use API data only
  const accommodation = useMemo(() => {
    if (!supplier || supplier.type !== 'accommodation') return null;
    if (apiAccommodation) return apiAccommodation;
    return null;
  }, [supplier, apiAccommodation]);

  // History: empty for now (could be fetched from API later)
  const history: { id: number; date: string; action: string; user: string; details: string }[] = [];

  // Payment terms: use API data only
  const paymentTerms = useMemo(() => {
    if (apiPaymentTerms) return apiPaymentTerms;
    return [];
  }, [apiPaymentTerms]);

  // Sync fiscal data when supplier changes
  useEffect(() => {
    if (apiSupplier) {
      setFiscalData({
        tax_id: apiSupplier.tax_id || '',
        is_vat_registered: apiSupplier.is_vat_registered || false,
        default_currency: apiSupplier.default_currency || 'THB',
      });
    }
  }, [apiSupplier]);

  // Fiscal info handlers
  const handleFiscalChange = useCallback((field: 'tax_id' | 'is_vat_registered' | 'default_currency', value: string | boolean) => {
    setFiscalData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveFiscalInfo = useCallback(async () => {
    if (!supplier?.id) return;
    setUpdatingSupplier(true);
    try {
      await updateSupplier({
        id: supplier.id,
        data: {
          tax_id: fiscalData.tax_id || undefined,
          is_vat_registered: fiscalData.is_vat_registered,
          default_currency: fiscalData.default_currency,
        },
      });
      refetchSupplier();
    } catch (err) {
      console.error('Error saving fiscal info:', err);
    } finally {
      setUpdatingSupplier(false);
    }
  }, [supplier?.id, fiscalData, updateSupplier, refetchSupplier]);

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
    try {
      if (accommodation) {
        await updateAccommodation({ id: accommodation.id, data: data as UpdateAccommodationDTO });
      } else {
        await createAccommodation(data as CreateAccommodationDTO);
      }
      // Refresh after successful save
      refetchAccommodation();
    } catch (err) {
      console.error('Error saving accommodation:', err);
      throw err; // Re-throw so the UI can handle it
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

  // Room rate handlers
  const handleRateSave = async (
    data: CreateRoomRateDTO | { id: number; data: UpdateRoomRateDTO }
  ) => {
    if ('id' in data) {
      await updateRoomRate({
        accommodationId: accommodation!.id,
        rateId: data.id,
        data: data.data,
      });
    } else {
      await createRoomRate(data);
    }
    refetchRates();
  };

  const handleRateDelete = async (id: number) => {
    await deleteRoomRate({ accommodationId: accommodation!.id, rateId: id });
    refetchRates();
  };

  const handleBulkSaveRates = async (rates: CreateRoomRateDTO[]) => {
    await bulkUpsertRates({ accommodationId: accommodation!.id, rates });
    refetchRates();
  };

  // Early Bird handlers
  const handleEarlyBirdAdd = async (data: CreateEarlyBirdDiscountDTO) => {
    await createEarlyBird(data);
    refetchEarlyBird();
  };

  const handleEarlyBirdUpdate = async (id: number, data: Partial<EarlyBirdDiscount>) => {
    await updateEarlyBird({
      accommodationId: accommodation!.id,
      discountId: id,
      data,
    });
    refetchEarlyBird();
  };

  const handleEarlyBirdDelete = async (id: number) => {
    await deleteEarlyBird({ accommodationId: accommodation!.id, discountId: id });
    refetchEarlyBird();
  };

  // Extras handlers
  const handleExtraAdd = async (data: CreateAccommodationExtraDTO) => {
    await createExtra(data);
    refetchExtras();
  };

  const handleExtraUpdate = async (id: number, data: Partial<AccommodationExtra>) => {
    await updateExtra(id, data);
    refetchExtras();
  };

  const handleExtraDelete = async (id: number) => {
    await deleteExtra(id);
    refetchExtras();
  };

  // Photo handlers
  const handlePhotoSetMain = async (photoId: number) => {
    if (!accommodation) return;
    await updatePhoto({
      accommodationId: accommodation.id,
      photoId,
      data: { is_main: true },
    });
    refetchPhotos();
  };

  const handlePhotoUpdate = async (photoId: number, data: UpdateAccommodationPhotoDTO) => {
    if (!accommodation) return;
    await updatePhoto({
      accommodationId: accommodation.id,
      photoId,
      data,
    });
    refetchPhotos();
  };

  const handlePhotoDelete = async (photoId: number) => {
    if (!accommodation) return;
    await deletePhoto({
      accommodationId: accommodation.id,
      photoId,
    });
    refetchPhotos();
  };

  const handlePhotoReorder = async (photoIds: number[]) => {
    if (!accommodation) return;
    await reorderPhotos({
      accommodationId: accommodation.id,
      photoIds,
    });
    refetchPhotos();
  };

  const accommodationLoading =
    creatingAccommodation || updatingAccommodation ||
    creatingCategory || updatingCategory || deletingCategory ||
    creatingSeason || updatingSeason || deletingSeason ||
    creatingRate || updatingRate || deletingRate || bulkSavingRates;

  // Supplier edit handler
  const handleSupplierSave = async (data: Parameters<typeof updateSupplier>[0]['data']) => {
    try {
      await updateSupplier({ id: parseInt(supplierId, 10), data });
      setIsEditing(false);
      refetchSupplier();
    } catch (err) {
      console.error('Error updating supplier:', err);
      throw err;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Render Tab Content
  const renderTabContent = () => {
    if (!supplier) return null;

    switch (activeTab) {
      case 'info':
        // Pour les fournisseurs de type accommodation, afficher l'onglet Hébergements
        if (supplier.type === 'accommodation') {
          return (
            <AccommodationsTab
              supplierId={supplierIdNum}
              supplier={supplier}
              accommodation={accommodation}
              onAccommodationSave={handleAccommodationSave}
              loading={accommodationLoading}
              onRefresh={refetchAccommodation}
            />
          );
        }
        // Pour les autres types, afficher les infos générales
        return <InfoTab supplier={supplier} accommodation={accommodation} />;
      case 'products':
        return (
          <ProductsTab
            supplierId={supplierIdNum}
            supplier={supplier}
            accommodation={accommodation}
            contracts={contracts}
            rates={apiRoomRates ?? []}
            earlyBirdDiscounts={apiEarlyBirdDiscounts ?? []}
            extras={apiExtras ?? []}
            onRoomCategorySave={handleRoomCategorySave}
            onRoomCategoryDelete={handleRoomCategoryDelete}
            onSeasonSave={handleSeasonSave}
            onSeasonDelete={handleSeasonDelete}
            onRateSave={handleRateSave}
            onRateDelete={handleRateDelete}
            onBulkSaveRates={handleBulkSaveRates}
            onEarlyBirdAdd={handleEarlyBirdAdd}
            onEarlyBirdUpdate={handleEarlyBirdUpdate}
            onEarlyBirdDelete={handleEarlyBirdDelete}
            onExtraAdd={handleExtraAdd}
            onExtraUpdate={handleExtraUpdate}
            onExtraDelete={handleExtraDelete}
            photos={apiPhotos || []}
            onPhotoSetMain={handlePhotoSetMain}
            onPhotoUpdate={handlePhotoUpdate}
            onPhotoDelete={handlePhotoDelete}
            onPhotoReorder={handlePhotoReorder}
            onPhotoUploadComplete={refetchPhotos}
            loading={accommodationLoading || loadingEarlyBird || creatingEarlyBird || updatingEarlyBird || deletingEarlyBird || loadingExtras || creatingExtra || updatingExtra || deletingExtra || loadingPhotos || updatingPhoto || deletingPhoto || reorderingPhotos}
            onRefresh={() => { refetchAccommodation(); refetchRates(); refetchEarlyBird(); refetchExtras(); refetchPhotos(); }}
          />
        );
      case 'contracts':
        return (
          <ContractsTab
            contracts={contracts}
            supplierId={supplierIdNum}
            supplierName={supplier.name}
            accommodationId={accommodation?.id}
            accommodationName={accommodation?.name}
            existingCategories={accommodation?.room_categories}
            existingSeasons={accommodation?.seasons}
            onCreateContract={async (data) => {
              await createContract({ ...data, supplier_id: supplierIdNum });
              refetchContracts();
            }}
            onDeleteContract={async (id) => {
              await deleteContract(id);
              refetchContracts();
            }}
            onImportComplete={async (result) => {
              // After import, refresh accommodation data to show new categories/seasons/rates
              refetchAccommodation();
              refetchRates();
              refetchContracts(); // Refresh contracts list to show the new contract

              // Build success message
              if (result) {
                // Use snake_case as that's what the API returns
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const importResult = result as any;
                const { created, reused, accommodation_created, contract_created } = importResult;
                const parts: string[] = [];

                if (accommodation_created) {
                  parts.push('Hébergement créé');
                }

                if (contract_created) {
                  parts.push('Contrat créé');
                }

                // Categories - add null checks
                const createdCategories = created?.categories ?? 0;
                const reusedCategories = reused?.categories ?? 0;
                if (createdCategories > 0 && reusedCategories > 0) {
                  parts.push(`${createdCategories} catégorie(s) créée(s), ${reusedCategories} réutilisée(s)`);
                } else if (createdCategories > 0) {
                  parts.push(`${createdCategories} catégorie(s) créée(s)`);
                } else if (reusedCategories > 0) {
                  parts.push(`${reusedCategories} catégorie(s) existante(s) réutilisée(s)`);
                }

                // Seasons - add null checks
                const createdSeasons = created?.seasons ?? 0;
                const reusedSeasons = reused?.seasons ?? 0;
                if (createdSeasons > 0 && reusedSeasons > 0) {
                  parts.push(`${createdSeasons} saison(s) créée(s), ${reusedSeasons} réutilisée(s)`);
                } else if (createdSeasons > 0) {
                  parts.push(`${createdSeasons} saison(s) créée(s)`);
                } else if (reusedSeasons > 0) {
                  parts.push(`${reusedSeasons} saison(s) existante(s) réutilisée(s)`);
                }

                // Rates - add null checks
                const createdRates = created?.rates ?? 0;
                if (createdRates > 0) {
                  parts.push(`${createdRates} tarif(s) importé(s)`);
                }

                toast.success('Import terminé avec succès', {
                  description: parts.join(' • '),
                  duration: 5000,
                });
              }
            }}
            onSetWorkflowStatus={async (status) => {
              await updateSupplier({
                id: supplier.id,
                data: {
                  contract_workflow_status: status,
                },
              });
              refetchSupplier();
            }}
            contractWorkflowStatus={supplier.contract_workflow_status}
            loading={creatingContract || deletingContract}
          />
        );
      case 'payments':
        return (
          <div className="space-y-8">
            {/* Section Paramètres fiscaux */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-600" />
                Paramètres fiscaux
              </h3>

              <div className="grid grid-cols-3 gap-6">
                {/* N° TVA / Fiscal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° TVA / Fiscal
                  </label>
                  <input
                    type="text"
                    value={fiscalData.tax_id || ''}
                    onChange={(e) => handleFiscalChange('tax_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ex: TH123456789"
                  />
                </div>

                {/* Assujetti à la TVA */}
                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fiscalData.is_vat_registered || false}
                      onChange={(e) => handleFiscalChange('is_vat_registered', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Assujetti à la TVA</span>
                      <p className="text-xs text-gray-500">Facture TTC, TVA récupérable</p>
                    </div>
                  </label>
                </div>

                {/* Devise */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise par défaut
                  </label>
                  <select
                    value={fiscalData.default_currency || 'THB'}
                    onChange={(e) => handleFiscalChange('default_currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="THB">THB - Baht thaïlandais</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Dollar US</option>
                    <option value="GBP">GBP - Livre sterling</option>
                    <option value="JPY">JPY - Yen japonais</option>
                    <option value="CNY">CNY - Yuan chinois</option>
                    <option value="KRW">KRW - Won coréen</option>
                    <option value="VND">VND - Dong vietnamien</option>
                    <option value="MYR">MYR - Ringgit malaisien</option>
                    <option value="SGD">SGD - Dollar singapourien</option>
                    <option value="IDR">IDR - Roupie indonésienne</option>
                    <option value="PHP">PHP - Peso philippin</option>
                    <option value="INR">INR - Roupie indienne</option>
                    <option value="AED">AED - Dirham émirati</option>
                    <option value="MAD">MAD - Dirham marocain</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveFiscalInfo}
                  disabled={updatingSupplier}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updatingSupplier ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>

            {/* Section Conditions de paiement */}
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
          </div>
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

  if (!supplier) {
    return (
      <div className="p-6">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux fournisseurs
        </Link>
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Fournisseur non trouvé</h3>
          <p className="text-gray-500">Ce fournisseur n&apos;existe pas ou a été supprimé.</p>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[supplier.status].icon;

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

      {/* Supplier Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SupplierEditor
              supplier={apiSupplier || null}
              onSave={handleSupplierSave}
              onCancel={() => setIsEditing(false)}
              loading={updating}
            />
          </div>
        </div>
      )}

      {/* API Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Erreur de chargement</p>
            <p className="text-red-700 text-sm">
              Impossible de charger les données du fournisseur. Vérifiez que le backend est démarré.
            </p>
          </div>
        </div>
      )}

      {/* Supplier not found */}
      {!loading && !supplier && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Fournisseur non trouvé</h2>
          <p className="text-gray-600 mb-4">
            Le fournisseur avec l'ID {supplierId} n'existe pas ou vous n'avez pas les droits pour y accéder.
          </p>
          <Link
            href="/admin/suppliers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>
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
            <div className="text-2xl font-bold text-gray-900">{supplier.contracts_count}</div>
            <div className="text-sm text-gray-500">Contrats actifs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {supplier.rating > 0 ? supplier.rating.toFixed(1) : '-'}
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
          {(supplier.type === 'accommodation' ? accommodationTabs : tabs).map((tab) => {
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

// Onglet Hébergements (pour les fournisseurs de type accommodation)
function AccommodationsTab({
  supplierId,
  supplier,
  accommodation,
  onAccommodationSave,
  loading,
  onRefresh,
}: {
  supplierId: number;
  supplier: Supplier & { rating: number; contracts_count: number };
  accommodation: Accommodation | null;
  onAccommodationSave: (data: CreateAccommodationDTO | UpdateAccommodationDTO) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [editingAccommodation, setEditingAccommodation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (data: CreateAccommodationDTO | UpdateAccommodationDTO) => {
    setSaveError(null);
    try {
      await onAccommodationSave(data);
      setEditingAccommodation(false);
      onRefresh();
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? (err as { detail: string }).detail
        : err instanceof Error
          ? err.message
          : 'Erreur lors de la sauvegarde de l\'hébergement';
      setSaveError(errorMessage);
      console.error('Save accommodation error:', err);
    }
  };

  // Show accommodation creation form if no accommodation exists
  if (!accommodation) {
    if (editingAccommodation) {
      return (
        <div className="bg-white rounded-lg">
          {saveError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}
          <AccommodationEditor
            supplierId={supplierId}
            accommodation={null}
            onSave={handleSave}
            onCancel={() => { setEditingAccommodation(false); setSaveError(null); }}
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
          Configurez les informations de votre hébergement pour commencer à gérer les produits.
        </p>
        <button
          onClick={() => setEditingAccommodation(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Ajouter un hébergement
        </button>
      </div>
    );
  }

  // Show accommodation editor
  if (editingAccommodation) {
    return (
      <div className="bg-white rounded-lg">
        {saveError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}
        <AccommodationEditor
          supplierId={supplierId}
          accommodation={accommodation}
          onSave={handleSave}
          onCancel={() => { setEditingAccommodation(false); setSaveError(null); }}
          loading={loading}
        />
      </div>
    );
  }

  // Display accommodation details with edit option
  return (
    <div className="space-y-6">
      {/* Header avec bouton d'édition */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{accommodation.name}</h3>
            <p className="text-sm text-gray-500">
              {accommodation.star_rating && (
                <span className="inline-flex items-center gap-1 mr-3">
                  {[...Array(accommodation.star_rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                </span>
              )}
              {accommodation.external_provider === 'manual' ? 'Gestion manuelle' : accommodation.external_provider}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditingAccommodation(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          Modifier
        </button>
      </div>

      {/* Informations détaillées en grille */}
      <div className="grid grid-cols-2 gap-6">
        {/* Colonne 1: Informations générales */}
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Classification</dt>
                <dd className="flex items-center gap-1">
                  {accommodation.star_rating ? (
                    [...Array(accommodation.star_rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))
                  ) : (
                    <span className="text-gray-400">Non définie</span>
                  )}
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
                <dt className="text-gray-500">Source disponibilité</dt>
                <dd className="text-gray-900 capitalize">
                  {accommodation.external_provider === 'manual' ? 'Manuelle' : accommodation.external_provider || '-'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Localisation */}
          {(accommodation.lat || accommodation.lng || supplier.address) && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Localisation</h4>
              <dl className="space-y-2 text-sm">
                {supplier.address && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Adresse</dt>
                    <dd className="text-gray-900 text-right max-w-xs">{supplier.address}</dd>
                  </div>
                )}
                {(accommodation.lat && accommodation.lng) && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Coordonnées</dt>
                    <dd className="text-gray-900 font-mono text-xs">
                      {accommodation.lat.toFixed(6)}, {accommodation.lng.toFixed(6)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Colonne 2: Équipements et description */}
        <div className="space-y-6">
          {accommodation.amenities && accommodation.amenities.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Équipements & Services</h4>
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
              <h4 className="font-medium text-gray-900 mb-3">Description</h4>
              <p className="text-gray-600 text-sm">{accommodation.description}</p>
            </div>
          )}

          {/* Statistiques rapides */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Résumé</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {accommodation.room_categories?.length || 0}
                </p>
                <p className="text-xs text-blue-600">Catégories</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {accommodation.seasons?.length || 0}
                </p>
                <p className="text-xs text-amber-600">Saisons</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTab({
  supplierId,
  supplier,
  accommodation,
  contracts,
  rates,
  earlyBirdDiscounts,
  extras,
  photos,
  onRoomCategorySave,
  onRoomCategoryDelete,
  onSeasonSave,
  onSeasonDelete,
  onRateSave,
  onRateDelete,
  onBulkSaveRates,
  onEarlyBirdAdd,
  onEarlyBirdUpdate,
  onEarlyBirdDelete,
  onExtraAdd,
  onExtraUpdate,
  onExtraDelete,
  onPhotoSetMain,
  onPhotoUpdate,
  onPhotoDelete,
  onPhotoReorder,
  onPhotoUploadComplete,
  loading,
  onRefresh,
}: {
  supplierId: number;
  supplier: Supplier & { rating: number; contracts_count: number };
  accommodation: Accommodation | null;
  contracts: Contract[];
  rates: RoomRate[];
  earlyBirdDiscounts: EarlyBirdDiscount[];
  extras: AccommodationExtra[];
  photos: AccommodationPhoto[];
  onRoomCategorySave: (data: CreateRoomCategoryDTO | { id: number; data: UpdateRoomCategoryDTO }) => Promise<void>;
  onRoomCategoryDelete: (id: number) => Promise<void>;
  onSeasonSave: (data: CreateAccommodationSeasonDTO | { id: number; data: UpdateAccommodationSeasonDTO }) => Promise<void>;
  onSeasonDelete: (id: number) => Promise<void>;
  onRateSave: (data: CreateRoomRateDTO | { id: number; data: UpdateRoomRateDTO }) => Promise<void>;
  onRateDelete: (id: number) => Promise<void>;
  onBulkSaveRates: (rates: CreateRoomRateDTO[]) => Promise<void>;
  onEarlyBirdAdd: (data: CreateEarlyBirdDiscountDTO) => Promise<void>;
  onEarlyBirdUpdate: (id: number, data: Partial<EarlyBirdDiscount>) => Promise<void>;
  onEarlyBirdDelete: (id: number) => Promise<void>;
  onExtraAdd: (data: CreateAccommodationExtraDTO) => Promise<void>;
  onExtraUpdate: (id: number, data: Partial<AccommodationExtra>) => Promise<void>;
  onExtraDelete: (id: number) => Promise<void>;
  onPhotoSetMain: (photoId: number) => Promise<void>;
  onPhotoUpdate: (photoId: number, data: UpdateAccommodationPhotoDTO) => Promise<void>;
  onPhotoDelete: (photoId: number) => Promise<void>;
  onPhotoReorder: (photoIds: number[]) => Promise<void>;
  onPhotoUploadComplete: () => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<AccommodationSeason | null>(null);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'season'; id: number } | null>(null);
  // Delete modal state - MUST be before any conditional returns
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find active contract to get notes and warnings for display in rate grid
  const activeContract = useMemo(() => {
    if (!contracts || contracts.length === 0) return null;
    // Find the most recent active contract
    return contracts
      .filter(c => c.status === 'active')
      .sort((a, b) => new Date(b.valid_to).getTime() - new Date(a.valid_to).getTime())[0] || null;
  }, [contracts]);

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

  // No accommodation yet - redirect to Hébergements tab
  if (!accommodation) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Hébergement requis</h3>
        <p className="text-gray-500 mb-4">
          Vous devez d'abord configurer un hébergement dans l'onglet "Hébergements"<br />
          avant de pouvoir gérer les catégories de chambres et les saisons.
        </p>
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

  // Delete confirmation modal
  const DeleteConfirmModal = () => {
    if (!deleteConfirm) return null;

    const isCategory = deleteConfirm.type === 'category';
    const itemName = isCategory
      ? accommodation.room_categories?.find((c) => c.id === deleteConfirm.id)?.name
      : accommodation.seasons?.find((s) => s.id === deleteConfirm.id)?.name;

    const handleDelete = async () => {
      setIsDeleting(true);
      setDeleteError(null);
      try {
        if (isCategory) {
          await onRoomCategoryDelete(deleteConfirm.id);
        } else {
          await onSeasonDelete(deleteConfirm.id);
        }
        setDeleteConfirm(null);
        onRefresh();
      } catch (err: unknown) {
        const errorMessage =
          err && typeof err === 'object' && 'detail' in err
            ? (err as { detail: string }).detail
            : err instanceof Error
              ? err.message
              : 'Une erreur est survenue lors de la suppression';
        setDeleteError(errorMessage);
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la suppression</h3>
          <p className="text-gray-600 mb-4">
            Êtes-vous sûr de vouloir supprimer {isCategory ? 'la catégorie' : 'la saison'}{' '}
            <strong>{itemName}</strong> ? Cette action est irréversible.
          </p>
          {deleteError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setDeleteConfirm(null);
                setDeleteError(null);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={isDeleting}
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <DeleteConfirmModal />

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
                {[...accommodation.seasons]
                  .sort((a, b) => {
                    // Sort by year (descending: 2026-2027 before 2025-2026)
                    const yearA = a.year || '0000';
                    const yearB = b.year || '0000';
                    if (yearA !== yearB) {
                      const lastYearA = yearA.split('-').pop() || '0000';
                      const lastYearB = yearB.split('-').pop() || '0000';
                      const yearCompare = lastYearB.localeCompare(lastYearA);
                      if (yearCompare !== 0) return yearCompare;
                    }
                    // Then by season_level (peak first, then high, then low)
                    const levelOrder: Record<string, number> = { peak: 0, high: 1, low: 2 };
                    const levelA = levelOrder[a.season_level || 'high'] ?? 1;
                    const levelB = levelOrder[b.season_level || 'high'] ?? 1;
                    if (levelA !== levelB) return levelA - levelB;
                    // Then by start_date
                    const startA = a.start_date || '';
                    const startB = b.start_date || '';
                    return startA.localeCompare(startB);
                  })
                  .map((season) => (
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
                        <div>
                          <div>{season.start_date} → {season.end_date}</div>
                          {season.year && (
                            <div className="text-xs text-gray-400">{season.year}</div>
                          )}
                        </div>
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

      {/* Rate Grid */}
      {accommodation.room_categories && accommodation.room_categories.length > 0 &&
       accommodation.seasons && accommodation.seasons.length > 0 && (
        <div>
          <RateGridEditor
            accommodationId={accommodation.id}
            roomCategories={accommodation.room_categories}
            seasons={accommodation.seasons}
            rates={rates}
            currency={supplier.default_currency || 'EUR'}
            contractNotes={activeContract?.notes}
            contractWarnings={activeContract?.ai_warnings}
            onSaveRate={onRateSave}
            onDeleteRate={onRateDelete}
            onBulkSaveRates={onBulkSaveRates}
            loading={loading}
          />
        </div>
      )}

      {/* Early Bird Discounts */}
      <div className="border-t border-gray-200 pt-6">
        <EarlyBirdEditor
          accommodationId={accommodation.id}
          discounts={earlyBirdDiscounts}
          seasons={accommodation.seasons || []}
          onAdd={onEarlyBirdAdd}
          onUpdate={onEarlyBirdUpdate}
          onDelete={onEarlyBirdDelete}
          loading={loading}
        />
      </div>

      {/* Extras / Supplements */}
      <div className="border-t border-gray-200 pt-6">
        <ExtrasEditor
          extras={extras}
          currency={supplier.default_currency || 'EUR'}
          onAdd={onExtraAdd}
          onUpdate={onExtraUpdate}
          onDelete={onExtraDelete}
          loading={loading}
        />
      </div>

      {/* Photos de l'hébergement */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-600" />
            Photos de l'hébergement ({photos.filter(p => !p.room_category_id).length})
          </h3>
        </div>

        {/* Uploader */}
        <div className="mb-6">
          <PhotoUploader
            accommodationId={accommodation.id}
            onUploadComplete={onPhotoUploadComplete}
            disabled={loading}
          />
        </div>

        {/* Gallery */}
        <PhotoGallery
          photos={photos}
          accommodationId={accommodation.id}
          onSetMain={onPhotoSetMain}
          onDelete={onPhotoDelete}
          onUpdate={onPhotoUpdate}
          onReorder={onPhotoReorder}
          loading={loading}
        />
      </div>

      {/* Photos par catégorie de chambre */}
      {accommodation.room_categories && accommodation.room_categories.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-600" />
            Photos par catégorie de chambre
          </h3>

          <div className="space-y-6">
            {accommodation.room_categories.map((category) => {
              const categoryPhotos = photos.filter(p => p.room_category_id === category.id);
              return (
                <div key={category.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {category.name}
                      <span className="ml-2 text-sm text-gray-500">
                        ({categoryPhotos.length} photo{categoryPhotos.length !== 1 ? 's' : ''})
                      </span>
                    </h4>
                  </div>

                  {/* Uploader pour cette catégorie */}
                  <div className="mb-4">
                    <PhotoUploader
                      accommodationId={accommodation.id}
                      roomCategoryId={category.id}
                      onUploadComplete={onPhotoUploadComplete}
                      disabled={loading}
                      maxFiles={5}
                    />
                  </div>

                  {/* Gallery de la catégorie */}
                  <PhotoGallery
                    photos={photos}
                    accommodationId={accommodation.id}
                    roomCategoryId={category.id}
                    onSetMain={onPhotoSetMain}
                    onDelete={onPhotoDelete}
                    onUpdate={onPhotoUpdate}
                    onReorder={onPhotoReorder}
                    loading={loading}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateContractFormData {
  name: string;
  reference: string;
  valid_from: string;
  valid_to: string;
  currency: string;
  notes: string;
}

function ContractsTab({
  contracts,
  supplierId,
  supplierName,
  accommodationId,
  accommodationName,
  existingCategories,
  existingSeasons,
  onCreateContract,
  onDeleteContract,
  onImportComplete,
  onSetWorkflowStatus,
  contractWorkflowStatus,
  loading,
}: {
  contracts: Contract[];
  supplierId: number;
  supplierName?: string;
  accommodationId?: number;
  accommodationName?: string;
  existingCategories?: RoomCategory[];
  existingSeasons?: AccommodationSeason[];
  onCreateContract: (data: Omit<CreateContractFormData, ''>) => Promise<void>;
  onDeleteContract: (id: number) => Promise<void>;
  onImportComplete?: (result?: { accommodationId: number; accommodationCreated: boolean }) => void;
  onSetWorkflowStatus?: (status: ContractWorkflowStatus) => Promise<void>;
  contractWorkflowStatus?: ContractWorkflowStatus;
  loading?: boolean;
}) {
  const [showExtractor, setShowExtractor] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [settingWorkflowStatus, setSettingWorkflowStatus] = useState(false);
  const [formData, setFormData] = useState<CreateContractFormData>({
    name: '',
    reference: '',
    valid_from: '',
    valid_to: '',
    currency: 'EUR',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.valid_from || !formData.valid_to) {
      setFormError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await onCreateContract({
        name: formData.name,
        reference: formData.reference || undefined,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
        currency: formData.currency,
        notes: formData.notes || undefined,
      } as CreateContractFormData);
      setShowCreateForm(false);
      setFormData({ name: '', reference: '', valid_from: '', valid_to: '', currency: 'EUR', notes: '' });
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? (err as { detail: string }).detail
        : 'Erreur lors de la création du contrat';
      setFormError(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDeleteContract(id);
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      console.error('Erreur suppression contrat:', err);
    }
  };

  return (
    <div>
      {/* AI Extractor Modal */}
      {showExtractor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ContractRateExtractor
            supplierId={supplierId}
            supplierName={supplierName}
            accommodationId={accommodationId}
            accommodationName={accommodationName}
            existingCategories={existingCategories}
            existingSeasons={existingSeasons}
            onImportComplete={(result) => {
              onImportComplete?.({
                accommodationId: result.accommodationId,
                accommodationCreated: result.accommodationCreated,
              });
              setShowExtractor(false);
            }}
            onClose={() => setShowExtractor(false)}
          />
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau contrat</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du contrat *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: Contrat Haute Saison 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: CTR-2025-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin *</label>
                  <input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollar US</option>
                  <option value="MAD">MAD - Dirham marocain</option>
                  <option value="THB">THB - Baht thaïlandais</option>
                  <option value="VND">VND - Dong vietnamien</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Notes ou commentaires..."
                />
              </div>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer le contrat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer ce contrat ?</h3>
            <p className="text-gray-600 mb-4">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CAS 1: Options alternatives actives ET pas de contrats ========== */}
      {/* Note: Si des contrats existent, on affiche toujours le CAS 3 même si workflow_status est dynamic_pricing/ota_only */}
      {contracts.length === 0 && (contractWorkflowStatus === 'dynamic_pricing' || contractWorkflowStatus === 'ota_only') ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Mode de tarification</h3>
          </div>

          {/* Box active avec option de revenir */}
          {contractWorkflowStatus === 'dynamic_pricing' && (
            <div className="p-6 bg-purple-50 border-2 border-purple-300 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-purple-900">Tarifs dynamiques uniquement</h4>
                  <p className="text-purple-700 mt-1">
                    Ce fournisseur n&apos;accepte pas les contrats tarifaires. Les tarifs sont demandés au cas par cas selon disponibilité.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSettingWorkflowStatus(true);
                    try {
                      await onSetWorkflowStatus?.('needs_contract');
                    } finally {
                      setSettingWorkflowStatus(false);
                    }
                  }}
                  disabled={settingWorkflowStatus}
                  className="px-4 py-2 text-purple-600 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors"
                >
                  {settingWorkflowStatus ? 'Annulation...' : 'Revenir aux contrats'}
                </button>
              </div>
            </div>
          )}

          {contractWorkflowStatus === 'ota_only' && (
            <div className="p-6 bg-orange-50 border-2 border-orange-300 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Globe className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-orange-900">Réservation via OTA uniquement</h4>
                  <p className="text-orange-700 mt-1">
                    Ce fournisseur n&apos;accepte pas les réservations directes. Réservation via plateformes OTA (Booking, Expedia, Agoda...) uniquement.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSettingWorkflowStatus(true);
                    try {
                      await onSetWorkflowStatus?.('needs_contract');
                    } finally {
                      setSettingWorkflowStatus(false);
                    }
                  }}
                  disabled={settingWorkflowStatus}
                  className="px-4 py-2 text-orange-600 hover:bg-orange-100 rounded-lg text-sm font-medium transition-colors"
                >
                  {settingWorkflowStatus ? 'Annulation...' : 'Revenir aux contrats'}
                </button>
              </div>
            </div>
          )}

          {/* Contrats existants (si il y en a malgré le mode alternatif) */}
          {contracts.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Contrats archivés ({contracts.length})</h4>
              <div className="space-y-3 opacity-60">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{contract.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${contractStatusConfig[contract.status].color}`}>
                          {contractStatusConfig[contract.status].label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(contract.valid_from).toLocaleDateString('fr-FR')} - {new Date(contract.valid_to).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      ) : contracts.length === 0 ? (
        /* ========== CAS 2: Aucun contrat - État vide avec workflow ========== */
        <div className="space-y-6">

          {/* ===== ÉTAT: En attente de réponse du fournisseur ===== */}
          {contractWorkflowStatus === 'contract_requested' && (
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-blue-900">Contrat demandé</h4>
                  <p className="text-blue-700 mt-1">
                    La demande de contrat a été envoyée au fournisseur. En attente de sa réponse.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowExtractor(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      Importer le contrat reçu
                    </button>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Créer manuellement
                    </button>
                  </div>
                </div>
              </div>

              {/* Options si le fournisseur ne peut pas fournir de contrat */}
              <div className="mt-6 pt-6 border-t border-blue-200">
                <p className="text-sm text-blue-800 mb-3 font-medium">
                  Le fournisseur ne peut pas fournir de contrat ?
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg hover:border-purple-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        setSettingWorkflowStatus(true);
                        try {
                          await onSetWorkflowStatus?.('dynamic_pricing');
                        } finally {
                          setSettingWorkflowStatus(false);
                        }
                      }}
                      disabled={settingWorkflowStatus}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <Zap className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-700">Tarifs dynamiques</span>
                  </label>
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg hover:border-orange-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        setSettingWorkflowStatus(true);
                        try {
                          await onSetWorkflowStatus?.('ota_only');
                        } finally {
                          setSettingWorkflowStatus(false);
                        }
                      }}
                      disabled={settingWorkflowStatus}
                      className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <Globe className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-700">Réservation OTA uniquement</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ===== ÉTAT: Nouveau fournisseur, besoin de contrat ===== */}
          {(contractWorkflowStatus === 'needs_contract' || !contractWorkflowStatus) && (
            <>
              {/* Zone principale d'action */}
              <div className="text-center py-16 px-8 bg-gradient-to-b from-gray-50 to-white border-2 border-dashed border-gray-200 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
                  <FileText className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun contrat</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Importez un contrat PDF ou créez-en un manuellement pour configurer les tarifs de cet hébergement.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => setShowExtractor(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-200"
                  >
                    <Sparkles className="w-5 h-5" />
                    Import IA depuis PDF
                  </button>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Créer manuellement
                  </button>
                </div>

                {/* Bouton pour marquer la demande comme envoyée */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      setSettingWorkflowStatus(true);
                      try {
                        await onSetWorkflowStatus?.('contract_requested');
                        toast.success('Demande de contrat marquée comme envoyée');
                      } finally {
                        setSettingWorkflowStatus(false);
                      }
                    }}
                    disabled={settingWorkflowStatus}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Clock className="w-4 h-4" />
                    {settingWorkflowStatus ? 'Enregistrement...' : 'Marquer la demande comme envoyée au fournisseur'}
                  </button>
                </div>
              </div>

              {/* Options alternatives - En bas, discret */}
              <div className="border border-gray-100 rounded-xl p-6 bg-gray-50/50">
                <h4 className="text-sm font-medium text-gray-500 mb-4">
                  Alternatives (si contrat non disponible)
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Option Tarifs dynamiques */}
                  <label className="relative flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-white hover:border-purple-300 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        setSettingWorkflowStatus(true);
                        try {
                          await onSetWorkflowStatus?.('dynamic_pricing');
                        } finally {
                          setSettingWorkflowStatus(false);
                        }
                      }}
                      disabled={settingWorkflowStatus}
                      className="mt-0.5 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-500 opacity-50 group-hover:opacity-100" />
                        <span className="font-medium text-gray-700">Tarifs dynamiques</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Tarifs demandés au cas par cas selon disponibilité
                      </p>
                    </div>
                  </label>

                  {/* Option OTA */}
                  <label className="relative flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-white hover:border-orange-300 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        setSettingWorkflowStatus(true);
                        try {
                          await onSetWorkflowStatus?.('ota_only');
                        } finally {
                          setSettingWorkflowStatus(false);
                        }
                      }}
                      disabled={settingWorkflowStatus}
                      className="mt-0.5 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-orange-500 opacity-50 group-hover:opacity-100" />
                        <span className="font-medium text-gray-700">Réservation OTA uniquement</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Via Booking, Expedia, Agoda... Pas de contrat direct.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

      ) : (
        /* ========== CAS 3: Contrats existants ========== */
        <div className="space-y-6">
          {/* Alerte si workflow status incohérent avec les contrats existants */}
          {(contractWorkflowStatus === 'dynamic_pricing' || contractWorkflowStatus === 'ota_only') && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    <strong>Incohérence détectée :</strong> Ce fournisseur est marqué comme &quot;{contractWorkflowStatus === 'dynamic_pricing' ? 'Tarifs dynamiques' : 'OTA uniquement'}&quot; mais possède {contracts.length} contrat{contracts.length > 1 ? 's' : ''}.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSettingWorkflowStatus(true);
                    try {
                      await onSetWorkflowStatus?.('needs_contract');
                      toast.success('Mode de tarification corrigé');
                    } finally {
                      setSettingWorkflowStatus(false);
                    }
                  }}
                  disabled={settingWorkflowStatus}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium underline whitespace-nowrap"
                >
                  Corriger
                </button>
              </div>
            </div>
          )}

          {/* Header avec actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Contrats ({contracts.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExtractor(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Import IA
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Nouveau contrat
              </button>
            </div>
          </div>

          {/* Liste des contrats */}
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
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
                    <button
                      onClick={() => setShowExtractor(true)}
                      className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                      title="Extraire les tarifs avec l'IA"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(contract.id)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                      title="Supprimer ce contrat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Options alternatives - En bas, très discret */}
          <div className="pt-6 border-t border-gray-100">
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Options alternatives (désactivera les contrats)
              </summary>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-purple-200 cursor-pointer transition-colors opacity-60 hover:opacity-100">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={async () => {
                      setSettingWorkflowStatus(true);
                      try {
                        await onSetWorkflowStatus?.('dynamic_pricing');
                      } finally {
                        setSettingWorkflowStatus(false);
                      }
                    }}
                    disabled={settingWorkflowStatus}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-600">Tarifs dynamiques uniquement</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-200 cursor-pointer transition-colors opacity-60 hover:opacity-100">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={async () => {
                      setSettingWorkflowStatus(true);
                      try {
                        await onSetWorkflowStatus?.('ota_only');
                      } finally {
                        setSettingWorkflowStatus(false);
                      }
                    }}
                    disabled={settingWorkflowStatus}
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <Globe className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-600">Réservation OTA uniquement</span>
                </label>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history }: { history: { id: number; date: string; action: string; user: string; details: string }[] }) {
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
