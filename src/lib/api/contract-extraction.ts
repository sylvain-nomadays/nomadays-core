/**
 * Contract Rate Extraction API
 * AI-powered extraction of rates from PDF contracts
 */

import { apiClient } from './client';
import type { RoomBedType, MealPlan } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedRoomCategory {
  name: string;
  code?: string;
  max_occupancy?: number;
  max_adults?: number;
  max_children?: number;
  available_bed_types?: RoomBedType[];
  description?: string;
  // Validation (added by frontend)
  isValid?: boolean;
  validationErrors?: string[];
}

export interface ExtractedSeason {
  name: string;
  code?: string;
  start_date?: string;  // MM-DD format
  end_date?: string;    // MM-DD format
  year?: string;        // "2024" or "2024-2025"
  season_level?: 'low' | 'high' | 'peak';  // low = basse, high = haute (référence), peak = fêtes
  original_name?: string;  // Original name from the contract before harmonization
  // Validation (added by frontend)
  isValid?: boolean;
  validationErrors?: string[];
}

export interface ExtractedRate {
  room_code: string;
  season_code?: string;
  bed_type: RoomBedType;
  meal_plan: MealPlan;
  cost: number;
  currency: string;
  single_supplement?: number;
  extra_adult?: number;
  extra_child?: number;
  // Validation (added by frontend)
  isValid?: boolean;
  validationErrors?: string[];
}

export interface ExtractedContractInfo {
  name?: string;
  reference?: string;
  valid_from?: string;  // YYYY-MM-DD
  valid_to?: string;    // YYYY-MM-DD
  currency?: string;
}

export interface ExtractionResult {
  contract_info?: ExtractedContractInfo;
  room_categories: ExtractedRoomCategory[];
  seasons: ExtractedSeason[];
  rates: ExtractedRate[];
  source_file?: string;
  extracted_at?: string;
  confidence_score?: number;
  warnings?: string[];
}

export interface ImportResult {
  success: boolean;
  accommodation_id: number;
  accommodation_created: boolean;
  contract_id?: number;
  contract_created: boolean;
  created: {
    categories: number;
    seasons: number;
    rates: number;
  };
  reused: {
    categories: number;
    seasons: number;
  };
}

export interface ImportExtractedRatesParams {
  supplierId: number;
  accommodationId?: number;
  accommodationName?: string;
  contractInfo?: ExtractedContractInfo;
  categories: ExtractedRoomCategory[];
  seasons: ExtractedSeason[];
  rates: ExtractedRate[];
  warnings?: string[];  // AI-extracted warnings to store with contract
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Extract rates from a PDF contract using AI
 */
export async function extractRatesFromPdf(
  file: File,
  supplierId: number,
  accommodationId?: number
): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('supplier_id', String(supplierId));
  if (accommodationId) {
    formData.append('accommodation_id', String(accommodationId));
  }

  return apiClient.upload<ExtractionResult>('/api/contracts/extract-rates', formData);
}

/**
 * Import extracted rates into the database
 * If no accommodationId is provided, a new accommodation will be created automatically
 */
export async function importExtractedRates(
  params: ImportExtractedRatesParams
): Promise<ImportResult> {
  return apiClient.post<ImportResult>('/api/contracts/import-extracted-rates', {
    supplier_id: params.supplierId,
    contract_info: params.contractInfo,
    accommodation_id: params.accommodationId,
    accommodation_name: params.accommodationName,
    categories: params.categories,
    seasons: params.seasons,
    rates: params.rates,
    warnings: params.warnings,  // Pass AI warnings to be stored with contract
  });
}
